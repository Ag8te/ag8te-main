import logging
import requests
from flask import current_app
from typing import Dict, Any, Optional
from datetime import datetime

from backend.models import Payment, Subscription, SubscriptionPlan
from backend.extensions import db
from backend.utils.logging import log_external_api
from backend.services.payment_providers.base import PaymentProvider

logger = logging.getLogger(__name__)

class PayPalProvider(PaymentProvider):
    def __init__(self):
        from backend.models import AppSetting
        setting = AppSetting.query.get('payment_paypal')
        settings = setting.value if setting else {}
        
        self.enabled = settings.get('enabled', False)
        self.client_id = settings.get('client_id') or current_app.config.get('PAYPAL_CLIENT_ID')
        self.client_secret = settings.get('client_secret') or current_app.config.get('PAYPAL_CLIENT_SECRET')
        self.mode = settings.get('mode') or current_app.config.get('PAYPAL_MODE', 'sandbox')
        
        if self.mode == 'live':
            self.api_url = 'https://api-m.paypal.com'
        else:
            self.api_url = 'https://api-m.sandbox.paypal.com'
            
        self._access_token = None
        self._token_expires = 0

    def _get_access_token(self) -> str:
        """Get or refresh PayPal OAuth2 access token"""
        now = datetime.utcnow().timestamp()
        if self._access_token and now < self._token_expires:
            return self._access_token

        if not self.client_id or not self.client_secret:
            logger.error("PayPalProvider: Missing credentials")
            raise ValueError("PayPal credentials not configured")

        logger.debug("PayPalProvider: Refreshing access token")
        response = requests.post(
            f"{self.api_url}/v1/oauth2/token",
            auth=(self.client_id, self.client_secret),
            data={'grant_type': 'client_credentials'},
            headers={'Accept': 'application/json', 'Accept-Language': 'en_US'},
            timeout=30
        )

        log_external_api(
            provider='paypal',
            endpoint='/v1/oauth2/token',
            method='POST',
            request_payload={'grant_type': 'client_credentials'},
            response_payload=response.json() if response.ok else response.text,
            status_code=response.status_code
        )

        if response.ok:
            data = response.json()
            self._access_token = data['access_token']
            # Set expiry with a 60s buffer
            self._token_expires = now + data['expires_in'] - 60
            return self._access_token
        else:
            logger.error("PayPalProvider: Failed to get access token: %s", response.text)
            raise Exception(f"PayPal Auth Failed: {response.text}")

    def create_checkout(
        self,
        amount: int,
        currency: str,
        external_id: str,
        success_url: Optional[str] = None,
        cancel_url: Optional[str] = None,
        failure_url: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        token = self._get_access_token()
        
        # PayPal uses decimal strings for amount (e.g. "100.00")
        decimal_amount = f"{amount / 100.0:.2f}"
        
        order_payload = {
            "intent": "CAPTURE",
            "purchase_units": [{
                "reference_id": external_id,
                "amount": {
                    "currency_code": currency,
                    "value": decimal_amount
                },
                "description": metadata.get('description', 'AG8TE Payment') if metadata else 'AG8TE Payment'
            }],
            "application_context": {
                "return_url": success_url or f"{current_app.config.get('FRONTEND_URL')}/api/payments/paypal-callback?status=success&external_id={external_id}",
                "cancel_url": cancel_url or f"{current_app.config.get('FRONTEND_URL')}/api/payments/paypal-callback?status=cancel&external_id={external_id}",
                "brand_name": "AG8TE",
                "user_action": "PAY_NOW"
            }
        }

        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {token}',
            'PayPal-Request-Id': external_id
        }

        logger.info("PayPalProvider.create_checkout: external_id=%s amount=%s", external_id, decimal_amount)
        
        response = requests.post(
            f"{self.api_url}/v2/checkout/orders",
            json=order_payload,
            headers=headers,
            timeout=30
        )

        log_external_api(
            provider='paypal',
            endpoint='/v2/checkout/orders',
            method='POST',
            request_payload=order_payload,
            response_payload=response.json() if response.ok else response.text,
            status_code=response.status_code
        )

        if response.ok:
            response_data = response.json()
            approval_url = next(link['href'] for link in response_data['links'] if link['rel'] == 'approve')
            
            # Create payment record
            payment = Payment(
                external_id=external_id,
                amount=amount / 100.0,
                currency=currency,
                status='pending',
                payment_method='paypal',
                payment_provider_id=response_data['id'],
                meta_data=response_data
            )
            db.session.add(payment)
            db.session.commit()

            return {
                'checkout_id': response_data['id'],
                'redirect_url': approval_url,
                'payment_id': str(payment.id)
            }
        else:
            logger.error("PayPalProvider.create_checkout: Failed: %s", response.text)
            raise Exception(f"PayPal Order Creation Failed: {response.text}")

    def handle_webhook(self, data: Dict[str, Any], headers: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        # Webhook validation logic should go here (checking PayPal-Auth-Algo, etc.)
        # For now, we'll process the data if it looks valid
        event_type = data.get('event_type')
        resource = data.get('resource', {})
        
        logger.info("PayPalProvider.handle_webhook: event_type=%s", event_type)
        
        if event_type == 'CHECKOUT.ORDER.APPROVED':
            # This is where we would automatically capture the order if needed
            pass
        elif event_type == 'PAYMENT.CAPTURE.COMPLETED':
            # Order successfully paid
            external_id = resource.get('custom_id') or resource.get('reference_id')
            if external_id:
                from backend.services.payment_service import PaymentService
                PaymentService.update_payment_status(external_id, 'completed', metadata=data)
        
        return data

    def create_subscription(
        self,
        user_id: str,
        plan_id: str,
        success_url: str,
        cancel_url: str,
        external_id: Optional[str] = None
    ) -> Dict[str, Any]:
        token = self._get_access_token()
        
        subscription_payload = {
            "plan_id": plan_id,
            "application_context": {
                "return_url": success_url,
                "cancel_url": cancel_url,
                "brand_name": "AG8TE",
                "user_action": "SUBSCRIBE_NOW"
            },
            "custom_id": f"sub_{user_id}_{datetime.utcnow().timestamp()}",
        }
        if external_id:
            subscription_payload["custom_id"] = external_id

        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {token}'
        }

        logger.info("PayPalProvider.create_subscription: user_id=%s plan_id=%s", user_id, plan_id)
        
        response = requests.post(
            f"{self.api_url}/v1/billing/subscriptions",
            json=subscription_payload,
            headers=headers,
            timeout=30
        )

        log_external_api(
            provider='paypal',
            endpoint='/v1/billing/subscriptions',
            method='POST',
            request_payload=subscription_payload,
            response_payload=response.json() if response.ok else response.text,
            status_code=response.status_code
        )

        if response.ok:
            response_data = response.json()
            approve_link = next(link['href'] for link in response_data['links'] if link['rel'] == 'approve')
            
            # Create Subscription record
            from backend.models import Subscription, SubscriptionPlan
            plan = SubscriptionPlan.query.filter_by(paypal_plan_id=plan_id).first()
            if plan:
                sub = Subscription(
                    user_id=user_id,
                    plan_id=plan.id,
                    provider='paypal',
                    provider_subscription_id=response_data['id'],
                    status='pending',
                    meta_data=response_data
                )
                db.session.add(sub)
                db.session.commit()

            return {
                'subscription_id': response_data['id'],
                'redirect_url': approve_link,
                'status': response_data['status']
            }
        else:
            logger.error("PayPalProvider.create_subscription: Failed: %s", response.text)
            raise Exception(f"PayPal Subscription Failed: {response.text}")

    def create_subscription_plan(
        self,
        name: str,
        description: str,
        price: float,
        currency: str,
        interval: str
    ) -> Dict[str, Any]:
        token = self._get_access_token()
        
        # 1. Create Product
        product_payload = {
            "name": name,
            "description": description,
            "type": "SERVICE",
            "category": "SOFTWARE"
        }
        
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {token}'
        }
        
        prod_res = requests.post(f"{self.api_url}/v1/catalogs/products", json=product_payload, headers=headers, timeout=30)
        if not prod_res.ok:
            raise Exception(f"PayPal Product Creation Failed: {prod_res.text}")
        product_id = prod_res.json()['id']
        
        # 2. Create Plan
        plan_payload = {
            "product_id": product_id,
            "name": name,
            "description": description,
            "status": "ACTIVE",
            "billing_cycles": [{
                "frequency": {
                    "interval_unit": interval.upper(), # MONTH, YEAR
                    "interval_count": 1
                },
                "tenure_type": "REGULAR",
                "sequence": 1,
                "total_cycles": 0, # Infinite
                "pricing_scheme": {
                    "fixed_price": {
                        "value": f"{price:.2f}",
                        "currency_code": currency
                    }
                }
            }],
            "payment_preferences": {
                "auto_bill_outstanding": True,
                "setup_fee": {
                    "value": "0.00",
                    "currency_code": currency
                },
                "setup_fee_failure_action": "CONTINUE",
                "payment_failure_threshold": 3
            }
        }
        
        plan_res = requests.post(f"{self.api_url}/v1/billing/plans", json=plan_payload, headers=headers, timeout=30)
        if not plan_res.ok:
            raise Exception(f"PayPal Plan Creation Failed: {plan_res.text}")
            
        plan_data = plan_res.json()
        return {
            'plan_id': plan_data['id'],
            'product_id': product_id,
            'status': plan_data['status']
        }

    def get_payment_status(self, external_id: str) -> str:
        """Get payment status, verifying with PayPal API if pending"""
        payment = Payment.query.filter_by(external_id=external_id).first()
        if not payment:
            return 'not_found'
            
        if payment.status == 'pending' and payment.payment_provider_id:
            logger.info("PayPalProvider.get_payment_status: verifying pending payment %s with PayPal API", external_id)
            try:
                token = self._get_access_token()
                headers = {
                    'Authorization': f'Bearer {token}',
                    'Content-Type': 'application/json'
                }
                response = requests.get(
                    f"{self.api_url}/v2/checkout/orders/{payment.payment_provider_id}",
                    headers=headers,
                    timeout=20
                )
                if response.ok:
                    data = response.json()
                    paypal_status = data.get('status') # 'CREATED', 'SAVED', 'APPROVED', 'VOIDED', 'COMPLETED', 'PAYER_ACTION_REQUIRED'
                    
                    # 'APPROVED' means the user authorized it, but we might still need to capture it.
                    # However, in our flow, we usually CAPTURE immediately on redirect or webhook.
                    # If it's COMPLETED, it's definitely paid.
                    
                    status_map = {
                        'COMPLETED': 'completed',
                        'VOIDED': 'failed',
                        'APPROVED': 'completed', # Treat as completed if we see it approved during callback
                    }
                    new_status = status_map.get(paypal_status, 'pending')
                    
                    if new_status != payment.status:
                        logger.info("PayPalProvider.get_payment_status: updating %s from %s to %s", external_id, payment.status, new_status)
                        payment.status = new_status
                        db.session.commit()
                    return payment.status
            except Exception as e:
                logger.error("PayPalProvider.get_payment_status: failed to verify with PayPal: %s", str(e))
                
        return payment.status

    def get_subscription_status(self, subscription_id: str) -> str:
        """Get subscription status from PayPal API"""
        try:
            token = self._get_access_token()
            headers = {
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
            response = requests.get(
                f"{self.api_url}/v1/billing/subscriptions/{subscription_id}",
                headers=headers,
                timeout=20
            )
            if response.ok:
                data = response.json()
                status = data.get('status')
                
                from backend.models import Subscription
                sub = Subscription.query.filter_by(provider_subscription_id=subscription_id).first()
                if sub:
                    status_map = {
                        'ACTIVE': 'active',
                        'APPROVED': 'approved',
                        'CANCELLED': 'cancelled',
                        'SUSPENDED': 'suspended',
                        'EXPIRED': 'expired'
                    }
                    new_status = status_map.get(status, 'pending')
                    if new_status != sub.status:
                        logger.info("PayPalProvider.get_subscription_status: updating %s from %s to %s", subscription_id, sub.status, new_status)
                        sub.status = new_status
                        db.session.commit()
                    return new_status
                return status.lower()
            return 'not_found'
        except Exception as e:
            logger.error("PayPalProvider.get_subscription_status: failed to verify with PayPal: %s", str(e))
            return 'error'
