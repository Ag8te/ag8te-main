"""
Service Request Service - Encapsulates logic for cab and professional services.
"""
import math
import secrets
import logging
import uuid
from datetime import datetime
from flask import current_app
from backend.extensions import db
from backend.models import ServiceRequest, User, AppSetting, Payment, Wallet, ClientRating, DriverRating, ProfessionalRating, ProviderRating
from backend.services.wallet_service import WalletService
from backend.services.payment_service import PaymentService
from backend.utils.url import get_request_frontend_base_url

logger = logging.getLogger(__name__)

CAR_TYPE_BASE_RATE_PER_KM = {
    'small_hatchback': 8.12,
    'sedan': 8.44,
    'suv': 8.92,
    'bakkie': 9.40,
    'luxury': 11.80,
    'hybrid': 7.80,
    'electric': 6.52,
}

class RequestService:
    @staticmethod
    def calculate_quote(pickup, dropoff, preferences=None):
        """Calculate cab quote based on distance and car type"""
        preferences = preferences or {}
        distance_km = RequestService._haversine_distance_km(pickup, dropoff)
        
        if distance_km is None or distance_km <= 0:
            return None, "INVALID_DISTANCE"
            
        rate_per_km = RequestService._get_rate_per_km(preferences)
        quote_amount = round(float(distance_km) * float(rate_per_km), 2)
        
        return {
            'distance_km': float(distance_km),
            'rate_per_km': float(rate_per_km),
            'payment_amount': quote_amount
        }, None

    @staticmethod
    def create_request(data, user_id):
        """Create a service request with wallet deduction if applicable"""
        request_id = f"REQ-{secrets.token_hex(8).upper()}"
        location_data = {}
        
        if data.get('pickup') and data.get('dropoff'):
            location_data = {'pickup': data['pickup'], 'dropoff': data['dropoff']}
        elif data.get('location'):
            location_data = {'location': data['location']}
            
        payment_amount = RequestService._resolve_payment_amount(data)
        
        service_request = ServiceRequest(
            id=request_id,
            request_type=data['type'],
            requester_id=user_id,
            scheduled_date=data['date'],
            scheduled_time=data['time'],
            location_data=location_data,
            details=data.get('preferences', {}),
            payment_amount=payment_amount,
            payment_status='pending'
        )
        
        if data.get('notes'):
            service_request.details['notes'] = data['notes']
            
        # Wallet logic for providers
        if data['type'] == 'provider':
            wallet = WalletService.get_or_create_wallet(user_id)
            if float(wallet.balance or 0) < payment_amount:
                return None, "INSUFFICIENT_FUNDS"
                
            WalletService.add_transaction(
                wallet_id=wallet.id,
                user_id=user_id,
                transaction_type='payment',
                amount=payment_amount,
                external_id=request_id,
                description=f"Call-out fee for {data['type']} request {request_id}"
            )
            service_request.payment_status = 'paid'
            service_request.status = 'pending'
        else:
            service_request.payment_status = 'pending'
            service_request.status = 'unpaid'
            
        db.session.add(service_request)
        db.session.commit()
        
        return service_request, None

    @staticmethod
    def create_checkout(request_type, data, user_id, host_url):
        """Standardized checkout flow for cab and professional requests"""
        request_id = f"REQ-{secrets.token_hex(8).upper()}"
        
        if request_type == 'cab':
            location_data = {'pickup': data['pickup'], 'dropoff': data['dropoff']}
            payment_amount = float(data['payment_amount'])
            distance_km = data.get('distance_km') or RequestService._haversine_distance_km(data['pickup'], data['dropoff'])
            
            service_request = ServiceRequest(
                id=request_id,
                request_type='cab',
                requester_id=user_id,
                scheduled_date=data['date'],
                scheduled_time=data['time'],
                location_data=location_data,
                distance_km=distance_km,
                details=data.get('preferences', {}),
                payment_amount=payment_amount,
                payment_status='pending',
                status='unpaid'
            )
        else: # professional or provider
            location_data = {'location': data['location']}
            payment_amount = RequestService._resolve_payment_amount(data)
            
            # For RFQ, no upfront payment
            is_rfq = data.get('is_rfq', False)
            if is_rfq:
                payment_amount = 0
                
            service_request = ServiceRequest(
                id=request_id,
                request_type=request_type,
                requester_id=user_id,
                scheduled_date=data['date'],
                scheduled_time=data['time'],
                location_data=location_data,
                details=dict(data.get('preferences', {})),
                payment_amount=payment_amount,
                payment_status='pending',
                status='pending' if is_rfq else 'unpaid'
            )
            
            if is_rfq:
                service_request.details['is_rfq'] = True
            else:
                pid = service_request.details.get('professional_id') or service_request.details.get('provider_id')
                if pid:
                    service_request.provider_id = uuid.UUID(pid)
                    # Availability check
                    available, error = RequestService.check_provider_availability(service_request.provider_id, data['date'], data['time'])
                    if not available:
                        return None, error

        if data.get('notes'):
            service_request.details['notes'] = data['notes']
            
        db.session.add(service_request)
        db.session.flush()
        
        if data.get('is_rfq'):
            db.session.commit()
            return service_request, None
            
        # Create payment session
        amount_cents = int(round(payment_amount * 100))
        external_id = f"request_{request_id}_{secrets.token_hex(6)}"
        base_url = host_url.rstrip('/')
        frontend_url = get_request_frontend_base_url()
        
        success_url = f"{base_url}/api/payments/request-callback?callback_status=success&external_id={external_id}&request_id={request_id}&frontend_url={frontend_url}"
        cancel_url = f"{base_url}/api/payments/request-callback?callback_status=cancel&external_id={external_id}&request_id={request_id}&frontend_url={frontend_url}"
        failure_url = f"{base_url}/api/payments/request-callback?callback_status=failure&external_id={external_id}&request_id={request_id}&frontend_url={frontend_url}"
        
        checkout = PaymentService.create_checkout(
            amount=amount_cents,
            currency='ZAR',
            external_id=external_id,
            success_url=success_url,
            cancel_url=cancel_url,
            failure_url=failure_url,
            provider=data.get('provider', 'yoco')
        )
        
        payment = Payment.query.filter_by(external_id=external_id).first()
        if payment:
            service_request.details['payment_id'] = str(payment.id)
            
        db.session.commit()
        return {
            'request_id': request_id,
            'checkout_id': checkout['checkout_id'],
            'redirect_url': checkout['redirect_url'],
            'external_id': external_id
        }, None

    @staticmethod
    def check_provider_availability(provider_id, date_str, time_str):
        """Check if a provider is available at a given time"""
        provider = User.query.get(provider_id)
        if not provider or not provider.data or 'availability' not in provider.data:
            return True, None
            
        availability = provider.data['availability']
        
        # Blocked dates
        if date_str in (availability.get('blocked_dates') or []):
            return False, "PROV_DATE_BLOCKED"
            
        # Regular hours
        try:
            dt = datetime.strptime(date_str, '%Y-%m-%d')
            day_name = dt.strftime('%A').lower()
            day_config = availability.get('regular_hours', {}).get(day_name, {})
            if not day_config.get('enabled'):
                return False, f"PROV_NOT_WORKING_{day_name.upper()}"
                
            start = day_config.get('start', '08:00')
            end = day_config.get('end', '17:00')
            if not (start <= time_str < end):
                return False, "PROV_OUT_OF_HOURS"
        except Exception:
            pass
            
        # Busy slots
        busy = ServiceRequest.query.filter(
            ServiceRequest.provider_id == provider_id,
            ServiceRequest.scheduled_date == date_str,
            ServiceRequest.scheduled_time == time_str,
            ServiceRequest.status.in_(['accepted', 'completed', 'paid'])
        ).first()
        
        if busy:
            return False, "TIME_SLOT_TAKEN"
            
        return True, None

    @staticmethod
    def _get_rate_per_km(preferences):
        car_type = (preferences.get('car_type') or '').lower().strip()
        return CAR_TYPE_BASE_RATE_PER_KM.get(car_type, CAR_TYPE_BASE_RATE_PER_KM['sedan'])

    @staticmethod
    def _haversine_distance_km(pickup, dropoff):
        try:
            lat1, lon1 = float(pickup.get('lat')), float(pickup.get('lng'))
            lat2, lon2 = float(dropoff.get('lat')), float(dropoff.get('lng'))
        except (TypeError, ValueError, AttributeError):
            return None
        R = 6371.0
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        d_phi = math.radians(lat2 - lat1)
        d_lambda = math.radians(lon2 - lon1)
        a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    @staticmethod
    def _resolve_payment_amount(data):
        payment_amount = float(data.get('payment_amount', 0))
        if data['type'] in ('professional', 'provider'):
            setting_key = f"{data['type']}_callout_fee_amount"
            setting = AppSetting.query.get(setting_key) or AppSetting.query.get('callout_fee_amount')
            if setting:
                payment_amount = float(setting.value)
            elif not payment_amount:
                payment_amount = 150.0
        return payment_amount
