"""
Payment Service - Abstraction Layer for Multiple Providers
"""
import logging
import uuid
from flask import current_app
from typing import Dict, Any, Optional

from backend.models import Payment, Subscription, SubscriptionPlan
from backend.extensions import db
from backend.services.payment_providers.yoco import YocoProvider
from backend.services.payment_providers.paypal import PayPalProvider

logger = logging.getLogger(__name__)

class PaymentService:
    """Service for payment processing with multiple providers"""

    STATUS_MAP = {
        'paid': 'completed',
        'complete': 'completed',
        'completed': 'completed',
        'success': 'completed',
        'successful': 'completed',
        'succeeded': 'completed',
        'processing': 'processing',
        'pending': 'pending',
        'cancel': 'cancelled',
        'cancelled': 'cancelled',
        'canceled': 'cancelled',
        'failure': 'failed',
        'failed': 'failed',
        'error': 'failed',
        'refunded': 'refunded',
    }
    
    @staticmethod
    def _get_provider(provider_name: str = 'yoco'):
        """Factory method to get the correct payment provider"""
        provider = None
        if provider_name == 'yoco':
            provider = YocoProvider()
        elif provider_name == 'paypal':
            provider = PayPalProvider()
        else:
            raise ValueError(f"Unsupported payment provider: {provider_name}")
            
        if not getattr(provider, 'enabled', False):
            logger.warning(f"Payment provider {provider_name} is disabled.")
            raise ValueError(f"Payment provider {provider_name} is currently disabled.")
            
        return provider

    @staticmethod
    def create_checkout(amount, currency, external_id, success_url=None, cancel_url=None, failure_url=None, provider='yoco'):
        """
        Create a checkout session using the specified provider
        """
        p = PaymentService._get_provider(provider)
        return p.create_checkout(
            amount=amount,
            currency=currency,
            external_id=external_id,
            success_url=success_url,
            cancel_url=cancel_url,
            failure_url=failure_url
        )
    
    @staticmethod
    def get_payment_status(external_id: str) -> str:
        """Get payment status from the correct provider"""
        payment = Payment.query.filter_by(external_id=external_id).first()
        if not payment:
            logger.warning("get_payment_status: payment not found external_id=%s", external_id)
            return 'not_found'
            
        provider_name = payment.payment_method or 'yoco'
        try:
            p = PaymentService._get_provider(provider_name)
            return p.get_payment_status(external_id)
        except Exception as e:
            logger.error("get_payment_status: error with provider %s: %s", provider_name, str(e))
            return payment.status

    @staticmethod
    def get_subscription_status(subscription_id: str, provider_name: str = 'paypal') -> str:
        """Get subscription status from the correct provider"""
        try:
            p = PaymentService._get_provider(provider_name)
            if hasattr(p, 'get_subscription_status'):
                return p.get_subscription_status(subscription_id)
            return 'not_found'
        except Exception as e:
            logger.error("get_subscription_status: error with provider %s: %s", provider_name, str(e))
            return 'error'

    @staticmethod
    def normalize_status(status: Optional[str]) -> str:
        """Map provider-specific payment statuses to the local enum."""
        normalized = (status or '').strip().lower()
        return PaymentService.STATUS_MAP.get(normalized, normalized or 'pending')

    @staticmethod
    def _should_trust_success_callback(payment: Optional[Payment], callback_status: Optional[str]) -> bool:
        """Allow Yoco redirects to complete local state before provider polling catches up."""
        return (
            payment is not None
            and payment.payment_method == 'yoco'
            and (callback_status or '').strip().lower() == 'success'
        )

    @staticmethod
    def update_payment_status(external_id, status, metadata=None):
        """Update payment status in database"""
        payment = Payment.query.filter_by(external_id=external_id).first()
        if payment:
            payment.status = PaymentService.normalize_status(status)
            if metadata:
                payment.meta_data = metadata
            db.session.commit()
            logger.info(f"Payment {external_id} updated to {payment.status}")
            return True
        return False

    @staticmethod
    def handle_order_payment(order_id, external_id, callback_status=None):
        """Process order completion after payment"""
        from backend.models import Order, Payment
        from backend.services.shipping_service import ShiplogicService
        order = Order.query.get(order_id)
        payment = Payment.query.filter_by(external_id=external_id).first()
        
        if not order:
            return False, "ORDER_NOT_FOUND"
            
        verified_status = PaymentService.normalize_status(PaymentService.get_payment_status(external_id))
        if verified_status != 'completed' and PaymentService._should_trust_success_callback(payment, callback_status):
            logger.info("handle_order_payment: trusting Yoco success callback for %s", external_id)
            verified_status = 'completed'
            payment.status = 'completed'

        if verified_status == 'completed':
            newly_paid = order.status != 'paid'
            shipping = dict(order.shipping or {})
            shipping_status = (shipping.get('shipment_status') or '').strip().lower()
            shipping_status_updated = False

            if shipping and shipping_status in ('', 'awaiting_payment', 'quoted'):
                shipping['shipment_status'] = 'awaiting_shipment'
                if shipping.get('shipment_error') in (None, '', 'Shipping service is disabled'):
                    shipping['shipment_error'] = None
                order.shipping = shipping
                shipping_status_updated = True

            if newly_paid:
                order.status = 'paid'
                if payment:
                    payment.status = 'completed'
                    order.payment_id = str(payment.id)
            elif payment and payment.status != 'completed':
                payment.status = 'completed'

            if newly_paid or shipping_status_updated:
                db.session.commit()
                
            if newly_paid:
                # Update inventory
                try:
                    from backend.services.inventory_service import update_inventory_on_order_payment
                    update_inventory_on_order_payment(order)
                except Exception as e:
                    logger.error(f"Inventory update failed for order {order_id}: {e}")

                # Create shipment automatically for paid shop orders when Courier Guy is configured.
                shiplogic_settings = ShiplogicService.get_settings()
                if ShiplogicService.is_enabled(shiplogic_settings) and shiplogic_settings.get('automatic_shipment_creation', True):
                    try:
                        shipment_success, shipment_error = ShiplogicService.create_shipment_for_order(order)
                        if not shipment_success and shipment_error:
                            ShiplogicService.mark_shipment_error(order, shipment_error)
                    except Exception as e:
                        logger.error(f"Shipment creation failed for order {order_id}: {e}")
                        try:
                            ShiplogicService.mark_shipment_error(order, str(e))
                        except Exception:
                            logger.exception("Could not persist shipment error state for %s", order_id)
                
                # Send email
                try:
                    from backend.services.email_service import EmailService
                    from backend.models import User
                    user = User.query.get(order.customer_id)
                    if user:
                        EmailService.send_shop_purchase_confirmation(user, order)
                except Exception as e:
                    logger.error(f"Email notification failed for order {order_id}: {e}")
                    
            return True, None
        return False, "VERIFICATION_FAILED"

    @staticmethod
    def handle_wallet_topup(external_id, callback_status=None):
        """Process wallet top-up after payment"""
        from backend.models import Payment, User, Wallet
        from backend.services.wallet_service import WalletService
        
        payment = Payment.query.filter_by(external_id=external_id).first()
        if not payment:
            return False, "PAYMENT_NOT_FOUND"
            
        verified_status = PaymentService.normalize_status(PaymentService.get_payment_status(external_id))
        if verified_status != 'completed' and PaymentService._should_trust_success_callback(payment, callback_status):
            logger.info("handle_wallet_topup: trusting Yoco success callback for %s", external_id)
            verified_status = 'completed'
        if verified_status != 'completed':
            return False, "VERIFICATION_FAILED"
            
        if not external_id.startswith('topup_'):
            return False, "INVALID_EXTERNAL_ID"
            
        parts = external_id.split('_')
        if len(parts) < 3:
            return False, "INVALID_EXTERNAL_ID"
            
        user_id_hex = parts[1].replace('-', '')
        if len(user_id_hex) != 32:
            return False, "INVALID_EXTERNAL_ID"
            
        user_id_str = f"{user_id_hex[:8]}-{user_id_hex[8:12]}-{user_id_hex[12:16]}-{user_id_hex[16:20]}-{user_id_hex[20:32]}"
        user_id = uuid.UUID(user_id_str)
        
        if payment.status == 'pending' and payment.amount > 0:
            wallet = Wallet.query.filter_by(user_id=user_id).first()
            if not wallet:
                wallet = WalletService.get_or_create_wallet(user_id)
            
            top_up_amount = float(payment.amount)
            WalletService.add_transaction(
                wallet_id=wallet.id,
                user_id=user_id,
                transaction_type='top-up',
                amount=top_up_amount,
                currency=payment.currency,
                external_id=external_id,
                description=f'Wallet top-up of R{top_up_amount:.2f}',
                metadata={'payment_id': str(payment.id)}
            )
            
            payment.status = 'completed'
            db.session.commit()
            return True, None
            
        return payment.status == 'completed', "ALREADY_PROCESSED"

    @staticmethod
    def handle_service_request_payment(request_id, external_id, callback_status=None):
        """Process service request payment"""
        from backend.models import ServiceRequest, Payment, User
        from backend.services.email_service import EmailService
        from backend.services.request_service import RequestService
        
        service_request = ServiceRequest.query.get(request_id)
        payment = Payment.query.filter_by(external_id=external_id).first()
        
        if not service_request:
            return False, "REQUEST_NOT_FOUND"
            
        verified_status = PaymentService.normalize_status(PaymentService.get_payment_status(external_id))
        if verified_status != 'completed' and PaymentService._should_trust_success_callback(payment, callback_status):
            logger.info("handle_service_request_payment: trusting Yoco success callback for %s", external_id)
            verified_status = 'completed'
            payment.status = 'completed'

        if verified_status == 'completed':
            if service_request.payment_status != 'paid':
                service_request.payment_status = 'paid'
                service_request.status = 'pending'
                if service_request.request_type == 'cab':
                    RequestService.assign_initial_cab_dispatch(service_request)
                if payment:
                    payment.status = 'completed'
                db.session.commit()
                
                # Send email
                try:
                    user = User.query.get(service_request.requester_id)
                    if user:
                        EmailService.send_callout_payment_confirmation(user, service_request, float(payment.amount))
                except Exception as e:
                    logger.error(f"Email notification failed for request {request_id}: {e}")
                    
            return True, None
        return False, "VERIFICATION_FAILED"

    @staticmethod
    def create_subscription(user_id, plan_id, success_url, cancel_url, provider='paypal'):
        """
        Create a recurring subscription
        """
        p = PaymentService._get_provider(provider)
        return p.create_subscription(
            user_id=user_id,
            plan_id=plan_id,
            success_url=success_url,
            cancel_url=cancel_url
        )

    @staticmethod
    def create_subscription_plan(name, description, price, currency, interval, provider='paypal'):
        """
        Create a subscription plan
        """
        p = PaymentService._get_provider(provider)
        return p.create_subscription_plan(
            name=name,
            description=description,
            price=price,
            currency=currency,
            interval=interval
        )
