import logging
import time
import requests
from flask import current_app
from typing import Dict, Any, Optional

from backend.models import Payment
from backend.extensions import db
from backend.utils.logging import log_external_api
from backend.services.payment_providers.base import PaymentProvider

logger = logging.getLogger(__name__)

class YocoProvider(PaymentProvider):
    def __init__(self):
        from backend.models import AppSetting
        setting = AppSetting.query.get('payment_yoco')
        settings = setting.value if setting else {}
        
        self.enabled = settings.get('enabled', False)
        self.secret_key = settings.get('secret_key') or current_app.config.get('YOCO_SECRET_KEY')
        self.api_url = settings.get('api_url') or current_app.config.get('YOCO_API_URL', 'https://payments.yoco.com')

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
        if not self.secret_key:
            logger.error("YocoProvider.create_checkout: YOCO_SECRET_KEY not configured")
            raise ValueError("YOCO_SECRET_KEY not configured")

        logger.info("YocoProvider.create_checkout: external_id=%s amount=%s currency=%s", external_id, amount, currency)

        # Prepare checkout data
        checkout_data = {
            'amount': amount,
            'currency': currency,
            'externalId': external_id
        }
        
        # Set callback URLs
        base_url = current_app.config.get('FRONTEND_URL', 'http://localhost').rstrip('/')
        checkout_data['successUrl'] = success_url or f"{base_url}/api/payments/callback?callback_status=success"
        checkout_data['cancelUrl'] = cancel_url or f"{base_url}/api/payments/callback?callback_status=cancel"
        checkout_data['failureUrl'] = failure_url or f"{base_url}/api/payments/callback?callback_status=failure"
        
        headers = {
            'Authorization': f'Bearer {self.secret_key}',
            'Content-Type': 'application/json'
        }
        
        last_error = None
        for attempt in range(3):
            if attempt > 0:
                delay = 2 ** attempt
                logger.debug("YocoProvider.create_checkout: retry attempt %s after %ss sleep", attempt + 1, delay)
                time.sleep(delay)
            
            try:
                response = requests.post(
                    f"{self.api_url}/api/checkouts",
                    json=checkout_data,
                    headers=headers,
                    timeout=30
                )
                
                # Log the API call
                try:
                    resp_json = response.json()
                except:
                    resp_json = {'text': response.text}
                    
                log_external_api(
                    provider='yoco',
                    endpoint='/api/checkouts',
                    method='POST',
                    request_payload=checkout_data,
                    response_payload=resp_json,
                    status_code=response.status_code
                )

                if response.ok:
                    response_data = resp_json
                    if response_data.get('redirectUrl') is not None:
                        # Create payment record
                        payment = Payment(
                            external_id=external_id,
                            amount=amount / 100.0,
                            currency=currency,
                            status='pending',
                            payment_method='yoco',
                            payment_provider_id=response_data.get('id'),
                            meta_data=response_data
                        )
                        db.session.add(payment)
                        db.session.commit()

                        return {
                            'checkout_id': response_data.get('id'),
                            'redirect_url': response_data.get('redirectUrl'),
                            'payment_id': str(payment.id)
                        }
                    last_error = "Yoco API response missing redirectUrl"
                else:
                    try:
                        err_body = response.json()
                        last_error = f"Yoco error ({response.status_code}): {err_body.get('message', 'No message')}"
                    except:
                        last_error = f"Yoco error ({response.status_code}): {response.text or 'Unknown error'}"
            except requests.RequestException as e:
                last_error = f"Request failed: {str(e)}"

        logger.error("YocoProvider.create_checkout: failed after 3 attempts: %s", last_error)
        raise Exception(last_error)

    def handle_webhook(self, data: Dict[str, Any], headers: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        # Handle Yoco webhooks if needed. Currently, status updates are done via update_payment_status
        # which is usually triggered by direct API calls or simple webhooks.
        return data

    def create_subscription(
        self,
        user_id: str,
        plan_id: str,
        success_url: str,
        cancel_url: str
    ) -> Dict[str, Any]:
        raise NotImplementedError("YocoProvider does not support subscriptions yet.")

    def get_payment_status(self, external_id: str) -> str:
        """Get payment status, verifying with Yoco API if pending"""
        payment = Payment.query.filter_by(external_id=external_id).first()
        if not payment:
            return 'not_found'
            
        if payment.status == 'pending' and payment.payment_provider_id:
            logger.info("YocoProvider.get_payment_status: verifying pending payment %s with Yoco API", external_id)
            try:
                headers = {
                    'Authorization': f'Bearer {self.secret_key}',
                    'Content-Type': 'application/json'
                }
                response = requests.get(
                    f"{self.api_url}/api/checkouts/{payment.payment_provider_id}",
                    headers=headers,
                    timeout=20
                )
                if response.ok:
                    data = response.json()
                    yoco_status = data.get('status') # 'paid', 'cancelled', 'failed', 'pending'
                    
                    status_map = {
                        'paid': 'completed',
                        'successful': 'completed',
                        'succeeded': 'completed',
                        'cancelled': 'cancelled',
                        'failed': 'failed',
                        'pending': 'pending'
                    }
                    new_status = status_map.get(yoco_status, 'pending')
                    
                    if new_status != payment.status:
                        logger.info("YocoProvider.get_payment_status: updating %s from %s to %s", external_id, payment.status, new_status)
                        payment.status = new_status
                        db.session.commit()
                    return payment.status
            except Exception as e:
                logger.error("YocoProvider.get_payment_status: failed to verify with Yoco: %s", str(e))
                
        return payment.status

    def create_subscription_plan(
        self,
        name: str,
        description: str,
        price: float,
        currency: str,
        interval: str
    ) -> Dict[str, Any]:
        raise NotImplementedError("YocoProvider does not support subscription plans yet.")
