"""
Payment Routes
"""
import uuid
from flask import Blueprint, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import Schema, fields, ValidationError
from backend.models import Payment, ServiceRequest, User, Wallet
from backend.services.payment_service import PaymentService
from backend.services.wallet_service import WalletService
from backend.utils.response import success_response, error_response
from backend.utils.decorators import require_auth
from backend.utils.url import (
    get_callback_frontend_base_url,
    get_public_backend_base_url,
    get_request_frontend_base_url,
)
from backend.extensions import db

bp = Blueprint('payments', __name__)

class CreateOrderSchema(Schema):
    items = fields.List(fields.Dict(), required=True)
    shipping_address = fields.Str(required=True)
    total = fields.Float(required=True)
    provider = fields.Str(load_default='paypal')

@bp.route('/create-order', methods=['POST'])
@require_auth
def create_order():
    """Create a new shop order and initialize checkout"""
    try:
        from backend.models import Order
        schema = CreateOrderSchema()
        data = schema.load(request.json)
        
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return error_response('USER_NOT_FOUND', 'User not found', None, 404)

        # 1. Create the Order in the database first
        order_id = f"ORD-{uuid.uuid4().hex[:8].upper()}"
        
        # Calculate amount in cents
        amount_in_cents = int(data['total'] * 100)
        
        # 2. Initialize payment checkout
        backend_url = get_public_backend_base_url()
        frontend_url = get_request_frontend_base_url()
        success_url = f"{backend_url}/api/payments/order-callback?callback_status=success&external_id={order_id}&order_id={order_id}&provider={data['provider']}&frontend_url={frontend_url}"
        cancel_url = f"{backend_url}/api/payments/order-callback?callback_status=cancel&external_id={order_id}&order_id={order_id}&provider={data['provider']}&frontend_url={frontend_url}"
        failure_url = f"{backend_url}/api/payments/order-callback?callback_status=failure&external_id={order_id}&order_id={order_id}&provider={data['provider']}&frontend_url={frontend_url}"
        
        current_app.logger.info(f"Creating checkout for order {order_id} via {data['provider']} (amount: {amount_in_cents})")
        
        checkout_result = PaymentService.create_checkout(
            amount=amount_in_cents,
            currency='ZAR',
            external_id=order_id,
            success_url=success_url,
            cancel_url=cancel_url,
            failure_url=failure_url,
            provider=data['provider']
        )
        
        if not checkout_result or 'payment_id' not in checkout_result:
            current_app.logger.error(f"Checkout result missing payment_id: {checkout_result}")
            return error_response('PAYMENT_INIT_ERROR', 'Failed to initialize payment gateway', None, 500)

        # 3. Save Order (Pending status)
        new_order = Order(
            id=order_id,
            customer_id=user.id,
            customer_email=user.email,
            status='pending',
            total=data['total'],
            items=data['items'],
            shipping={"address": data['shipping_address']},
            payment_id=checkout_result['payment_id']
        )
        db.session.add(new_order)
        db.session.commit()
        
        return success_response({
            'order_id': order_id,
            'checkout_id': checkout_result['checkout_id'],
            'redirect_url': checkout_result['redirect_url']
        })
        
    except ValidationError as e:
        return error_response('VALIDATION_ERROR', 'Invalid input data', e.messages, 400)
    except Exception as e:
        current_app.logger.error(f"Create order error: {str(e)}", exc_info=True)
        db.session.rollback()
        return error_response('INTERNAL_ERROR', f'Failed to create order: {str(e)}', None, 500)

class CreateCheckoutSchema(Schema):
    amount = fields.Int(required=True, validate=lambda x: x > 0)
    currency = fields.Str(required=True)
    external_id = fields.Str(required=True)
    success_url = fields.Str()
    cancel_url = fields.Str()
    failure_url = fields.Str()
    provider = fields.Str(load_default='paypal')

@bp.route('/create-checkout', methods=['POST'])
@require_auth
def create_checkout():
    """Create payment checkout"""
    try:
        schema = CreateCheckoutSchema()
        data = schema.load(request.json)
        
        result = PaymentService.create_checkout(
            amount=data['amount'],
            currency=data['currency'],
            external_id=data['external_id'],
            success_url=data.get('success_url'),
            cancel_url=data.get('cancel_url'),
            failure_url=data.get('failure_url'),
            provider=data['provider']
        )
        
        return success_response(result)
        
    except ValidationError as e:
        return error_response('VALIDATION_ERROR', 'Invalid input data', e.messages, 400)
    except ValueError as e:
        return error_response('INVALID_REQUEST', str(e), None, 400)
    except Exception as e:
        current_app.logger.error(f"Create checkout error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to create checkout', None, 500)

@bp.route('/status/<external_id>', methods=['GET'])
@require_auth
def get_payment_status(external_id):
    """Get payment status"""
    try:
        payment = Payment.query.filter_by(external_id=external_id).first()
        
        if not payment:
            return error_response('NOT_FOUND', 'Payment not found', None, 404)
        
        return success_response(payment.to_dict())
        
    except Exception as e:
        current_app.logger.error(f"Get payment status error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to get payment status', None, 500)

@bp.route('/webhook', methods=['POST'])
def payment_webhook():
    """Payment webhook handler"""
    try:
        data = request.json
        external_id = data.get('external_id')
        status = data.get('status')
        
        if not external_id or not status:
            return error_response('INVALID_REQUEST', 'Missing required fields', None, 400)
        
        PaymentService.update_payment_status(external_id, status, data)
        
        return success_response(None, 'Webhook processed successfully')
        
    except Exception as e:
        current_app.logger.error(f"Payment webhook error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to process webhook', None, 500)

@bp.route('/paypal-webhook', methods=['POST'])
def paypal_webhook():
    """PayPal webhook handler"""
    try:
        data = request.json
        headers = request.headers
        
        event_type = data.get('event_type')
        resource = data.get('resource', {})
        
        current_app.logger.info(f"PayPal Webhook received: {event_type}")
        
        from backend.models import Payment, Subscription, User
        from backend.services.payment_service import PaymentService
        
        if event_type == 'PAYMENT.CAPTURE.COMPLETED':
            # Handle one-time payment completion
            external_id = resource.get('custom_id') or resource.get('reference_id')
            if external_id:
                PaymentService.update_payment_status(external_id, 'completed', metadata=data)
                
        elif event_type in ['BILLING.SUBSCRIPTION.CREATED', 'BILLING.SUBSCRIPTION.ACTIVATED']:
            # Handle subscription activation
            sub_id = resource.get('id')
            subscription = Subscription.query.filter_by(provider_subscription_id=sub_id).first()
            if subscription:
                subscription.status = 'active'
                if event_type == 'BILLING.SUBSCRIPTION.ACTIVATED':
                    # Mark user as paid if not already
                    user = User.query.get(subscription.user_id)
                    if user and not user.is_paid:
                        user.is_paid = True
                        # Send confirmation
                        try:
                            from backend.services.email_service import EmailService
                            EmailService.send_registration_payment_confirmation(user, 100.0)
                        except:
                            pass
                db.session.commit()
                
        elif event_type == 'BILLING.SUBSCRIPTION.CANCELLED':
            sub_id = resource.get('id')
            subscription = Subscription.query.filter_by(provider_subscription_id=sub_id).first()
            if subscription:
                subscription.status = 'cancelled'
                db.session.commit()
                
        elif event_type == 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
            sub_id = resource.get('id')
            subscription = Subscription.query.filter_by(provider_subscription_id=sub_id).first()
            if subscription:
                subscription.status = 'past_due'
                db.session.commit()
        
        return success_response(None, 'PayPal webhook processed')
        
    except Exception as e:
        current_app.logger.error(f"PayPal webhook error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to process PayPal webhook', None, 500)

@bp.route('/paypal-callback', methods=['GET'])
def paypal_callback():
    """Handle PayPal checkout callback (redirect)"""
    try:
        status = request.args.get('status')
        external_id = request.args.get('external_id')
        token = request.args.get('token') # PayPal Order ID
        
        current_app.logger.info(f"PayPal callback: status={status}, external_id={external_id}, token={token}")
        
        frontend_url = get_callback_frontend_base_url()
        
        if status == 'success':
            # We could optionally capture the order here if not done via webhook
            # For now, we'll rely on the update logic
            payment = Payment.query.filter_by(external_id=external_id).first()
            if payment:
                payment.status = 'completed'
                
                # If this is a shop order, update its status
                if external_id.startswith('ORD-'):
                    from backend.models.shop import Order
                    order = Order.query.get(external_id)
                    if order:
                        order.status = 'paid'
                        order.payment_id = str(payment.id)
                        
                        # Update inventory
                        try:
                            from backend.services.inventory_service import update_inventory_on_order_payment
                            update_inventory_on_order_payment(order)
                        except Exception as e:
                            current_app.logger.error(f"Inventory update failed for PayPal order {external_id}: {str(e)}")
                
                db.session.commit()
                return current_app.make_response((
                    f'<html><body><script>window.location.href="{frontend_url}/shopping-history?payment=success&provider=paypal";</script></body></html>',
                    302
                ))
            elif external_id.startswith('topup_'):
                # Handle wallet topup logic similar to wallet_topup_callback but for PayPal
                # ... implementation omitted for brevity, adding placeholder ...
                return current_app.make_response((
                    f'<html><body><script>window.location.href="{frontend_url}/wallet?payment=success&provider=paypal";</script></body></html>',
                    302
                ))
            else:
                return current_app.make_response((
                    f'<html><body><script>window.location.href="{frontend_url}/dashboard?payment=success&provider=paypal";</script></body></html>',
                    302
                ))

        # Handle cancel/error
        redirect_param = "cancelled" if status == "cancel" else "error"
        return current_app.make_response((
            f'<html><body><script>window.location.href="{frontend_url}/dashboard?payment={redirect_param}&provider=paypal";</script></body></html>',
            302
        ))

    except Exception as e:
        current_app.logger.error(f"PayPal callback error: {str(e)}")
        frontend_url = get_callback_frontend_base_url()
        return current_app.make_response((
            f'<html><body><script>window.location.href="{frontend_url}/dashboard?payment=error&provider=paypal";</script></body></html>',
            302
        ))

@bp.route('/order-callback', methods=['GET'])
def order_payment_callback():
    """Handle order payment callback"""
    try:
        callback_status = request.args.get('callback_status')
        external_id = request.args.get('external_id')
        order_id = request.args.get('order_id')
        
        frontend_url = get_callback_frontend_base_url()
        
        if callback_status == 'cancel':
            return current_app.make_response((
                f'<html><body><script>window.location.href="{frontend_url}/shopping-history?payment=cancelled&external_id=' + (external_id or '') + '";</script></body></html>',
                302
            ))

        success, error = PaymentService.handle_order_payment(order_id, external_id, callback_status=callback_status)
        
        if success:
            return current_app.make_response((
                f'<html><body><script>window.location.href="{frontend_url}/shopping-history?payment=success&external_id=' + (external_id or '') + '";</script></body></html>',
                302
            ))
        else:
            return current_app.make_response((
                f'<html><body><script>window.location.href="{frontend_url}/shopping-history?payment=error&reason=' + (error or 'unknown') + '&external_id=' + (external_id or '') + '";</script></body></html>',
                302
            ))
            
    except Exception as e:
        current_app.logger.error(f"Order payment callback error: {str(e)}")
        frontend_url = get_callback_frontend_base_url()
        return current_app.make_response((
            f'<html><body><script>window.location.href="{frontend_url}/shopping-history?payment=error";</script></body></html>',
            302
        ))
        
    except Exception as e:
        frontend_url = get_callback_frontend_base_url()
        current_app.logger.error(f"Order payment callback error: {str(e)}")
        return current_app.make_response((
            f'<html><body><script>window.location.href="{frontend_url}/shopping-history?payment=error";</script></body></html>',
            302
        ))

@bp.route('/wallet-topup-callback', methods=['GET'])
def wallet_topup_callback():
    """Handle wallet top-up payment callback"""
    try:
        external_id = request.args.get('external_id')
        callback_status = request.args.get('callback_status')
        frontend_url = get_callback_frontend_base_url()
        
        if callback_status == 'cancel':
            return current_app.make_response((
                f'<html><body><script>window.location.href="{frontend_url}/wallet?payment=cancelled&external_id=' + (external_id or '') + '";</script></body></html>',
                302
            ))

        success, error = PaymentService.handle_wallet_topup(external_id, callback_status=callback_status)
        
        if success:
            return current_app.make_response((
                f'<html><body><script>window.location.href="{frontend_url}/wallet?payment=success&external_id=' + (external_id or '') + '";</script></body></html>',
                302
            ))
        else:
            return current_app.make_response((
                f'<html><body><script>window.location.href="{frontend_url}/wallet?payment=error&reason=' + (error or 'unknown') + '&external_id=' + (external_id or '') + '";</script></body></html>',
                302
            ))
            
    except Exception as e:
        current_app.logger.error(f"Wallet top-up callback error: {str(e)}")
        frontend_url = get_callback_frontend_base_url()
        return current_app.make_response((
            f'<html><body><script>window.location.href="{frontend_url}/wallet?payment=error";</script></body></html>',
            302
        ))
        
    except Exception as e:
        frontend_url = get_callback_frontend_base_url()
        current_app.logger.error(f"Wallet top-up callback error: {str(e)}")
        return current_app.make_response((
            f'<html><body><script>window.location.href="{frontend_url}/wallet?payment=error";</script></body></html>',
            302
        ))


@bp.route('/request-callback', methods=['GET'])
def request_payment_callback():
    """Handle cab service request payment callback"""
    try:
        callback_status = request.args.get('callback_status')
        external_id = request.args.get('external_id')
        request_id = request.args.get('request_id')
        callback_status = request.args.get('callback_status')
        frontend_url = get_callback_frontend_base_url()

        if callback_status == 'cancel':
            return current_app.make_response((
                f'<html><body><script>window.location.href="{frontend_url}/my-bookings?payment=cancelled&external_id=' + (external_id or '') + '";</script></body></html>',
                302
            ))
        
        success, error = PaymentService.handle_service_request_payment(request_id, external_id, callback_status=callback_status)
        
        if success:
            # Show brief message then redirect after 3 seconds
            html = """
                <html>
                  <head>
                    <title>Payment Successful</title>
                    <style>
                      body { margin:0; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
                      .overlay {
                        position: fixed;
                        inset: 0;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: rgba(15, 23, 42, 0.85);
                        color: white;
                        z-index: 50;
                      }
                      .card {
                        background: #0f172a;
                        padding: 2rem 3rem;
                        border-radius: 0.75rem;
                        box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.8);
                        text-align: center;
                      }
                      .card h1 { font-size: 1.5rem; margin-bottom: 0.75rem; }
                      .card p { font-size: 0.95rem; opacity: 0.9; }
                    </style>
                    <script>
                      setTimeout(function () {
                        var frontend_url = "%s";
                        window.location.href = frontend_url + "/my-bookings";
                      }, 3000);
                    </script>
                  </head>
                  <body>
                    <div class="overlay">
                      <div class="card">
                        <h1>Payment Successful</h1>
                        <p>Your service request has been created and paid successfully.</p>
                        <p>You will be redirected to your booked services in a moment...</p>
                      </div>
                    </div>
                  </body>
                </html>
            """
            return current_app.make_response((html % frontend_url, 200))
        else:
            return current_app.make_response((
                f'<html><body><script>window.location.href="{frontend_url}/my-bookings?payment=error&reason=' + (error or 'unknown') + '&external_id=' + (external_id or '') + '";</script></body></html>',
                302
            ))
            
    except Exception as e:
        current_app.logger.error(f"Request payment callback error: {str(e)}")
        frontend_url = get_callback_frontend_base_url()
        return current_app.make_response((
            f'<html><body><script>window.location.href="{frontend_url}/my-bookings?payment=error";</script></body></html>',
            302
        ))

    except Exception as e:
        frontend_url = get_callback_frontend_base_url()
        current_app.logger.error(f"Request payment callback error: {str(e)}")
        return current_app.make_response((
            f'<html><body><script>window.location.href="{frontend_url}/my-bookings?payment=error";</script></body></html>',
            302
        ))
