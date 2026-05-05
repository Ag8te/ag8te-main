"""
Dashboard Routes
"""
import uuid
from datetime import datetime, timezone
from flask import Blueprint, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import Schema, fields, ValidationError
from sqlalchemy import or_, and_, func
from backend.models import User, Wallet, WalletTransaction, Order, ServiceRequest, Payment, AppSetting, WithdrawalRequest
from backend.services.payment_service import PaymentService
from backend.services.wallet_service import WalletService
from backend.services.agent_service import AgentService
from backend.services.recon_service import run_recon_for_user
from backend.utils.response import success_response, error_response
from backend.utils.decorators import require_auth
from backend.utils.url import get_public_backend_base_url, get_request_frontend_base_url
from backend.extensions import db
from backend.services.request_service import RequestService

bp = Blueprint('dashboard', __name__)

@bp.route('', methods=['GET'])
@require_auth
def get_dashboard():
    """Get role-based dashboard data"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        # Recon check: transfer any month-end earnings to wallet (triggered on dashboard access)
        try:
            run_recon_for_user(user_id)
        except Exception as e:
            current_app.logger.warning(f"Recon check on dashboard: {e}")
        # Get wallet balance
        wallet = Wallet.query.filter_by(user_id=user_id).first()
        wallet_balance = float(wallet.balance) if wallet and wallet.balance else 0.0
        
        # Get recent orders (3 most recent)
        recent_orders = Order.query.filter_by(customer_id=user_id)\
            .order_by(Order.placed_at.desc()).limit(3).all()
        
        # Get recent service requests (3 most recent)
        recent_requests = ServiceRequest.query.filter_by(requester_id=user_id)\
            .order_by(ServiceRequest.created_at.desc()).limit(3).all()
        
        recent_rides = []
        available_ride_requests = []
        available_ride_requests_payload = []
        driver_earnings = None
        professional_earnings = None
        service_provider_earnings = None
        available_professional_requests = []
        available_service_provider_requests = []
        recent_professional_jobs = []
        recent_service_provider_jobs = []

        def _ride_request_with_client(r):
            d = r.to_dict()
            if r.requester_id and r.requester:
                requester = r.requester
                pdata = requester.data or {}
                first = (pdata.get('full_name') or '').strip()
                last = (pdata.get('surname') or '').strip()
                d['client_name'] = f"{first} {last}".strip() or 'Client'
                d['client_profile_image_url'] = requester.profile_image_url
                d['client_id'] = str(requester.id)
            return d
        
        if user.role == 'driver':
            # Get recent service rides requests (3 most recent) - rides driver has accepted
            request_type = 'cab'
            provider_id = user.id
            recent_rides = ServiceRequest.query.filter_by(request_type=request_type, provider_id=provider_id, status='completed')\
                .order_by(ServiceRequest.created_at.desc()).limit(5).all()
            
            # Active rides (accepted but not completed)
            active_rides = ServiceRequest.query.filter(
                ServiceRequest.request_type == 'cab',
                ServiceRequest.provider_id == user.id,
                ServiceRequest.status == 'accepted'
            ).all()
            
            # Driver earnings: sum of payment_amount for completed cab rides (current month to date), minus admin fee
            # Get admin fee rate from settings (default to 10% if not set)
            admin_fee_setting = AppSetting.query.get('driver_admin_fee_rate')
            admin_fee_rate = float(admin_fee_setting.value) if admin_fee_setting else 0.10
            
            now_utc = datetime.now(timezone.utc)
            start_of_month = now_utc.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            gross_earnings_row = db.session.query(func.coalesce(func.sum(ServiceRequest.payment_amount), 0)).filter(
                ServiceRequest.request_type == 'cab',
                ServiceRequest.provider_id == user.id,
                ServiceRequest.status == 'completed',
                ServiceRequest.updated_at >= start_of_month,
                ServiceRequest.updated_at <= now_utc
            ).first()
            gross_earnings = float(gross_earnings_row[0]) if gross_earnings_row and gross_earnings_row[0] else 0.0
            
            # Calculate net earnings after admin fee deduction
            # Net = Gross * (1 - admin_fee_rate)
            driver_earnings = gross_earnings * (1.0 - admin_fee_rate)
            
            # Get available ride requests (pending cab requests that match driver's car type)
            user_data = user.data or {}
            driver_services = user_data.get('driver_services', [])
            
            # Get driver's car types
            driver_car_types = set()
            for service in driver_services:
                car_type = service.get('car_type')
                if car_type:
                    driver_car_types.add(car_type.lower())
            
            # Get pending cab requests currently dispatched to this driver
            pending_cab_requests = ServiceRequest.query.filter(
                and_(
                    ServiceRequest.request_type == 'cab',
                    ServiceRequest.status == 'pending',
                    ServiceRequest.provider_id.is_(None)  # Not yet accepted
                )
            ).order_by(ServiceRequest.created_at.desc()).limit(10).all()
            
            dispatch_changed = False

            # Filter by current targeted dispatch state
            for req in pending_cab_requests:
                if not driver_car_types:
                    continue
                if RequestService.refresh_expired_cab_dispatch_if_needed(req):
                    dispatch_changed = True
                if RequestService.can_driver_view_cab_offer(req, user):
                    available_ride_requests.append(req)

            if dispatch_changed:
                db.session.commit()


            available_ride_requests_payload = [_ride_request_with_client(r) for r in available_ride_requests]
            
            driver_services = (user.data or {}).get('driver_services', [])
        
        elif user.role == 'professional':
            # Get recent professional jobs (3 most recent) - jobs professional has accepted
            recent_professional_jobs = ServiceRequest.query.filter(
                ServiceRequest.request_type == 'professional',
                ServiceRequest.provider_id == user.id,
                or_(
                    ServiceRequest.status == 'completed',
                    ServiceRequest.details['professional_rating'].is_not(None)
                )
            ).order_by(ServiceRequest.created_at.desc()).limit(5).all()

            # Active professional jobs
            active_professional_jobs = ServiceRequest.query.filter_by(
                request_type='professional',
                provider_id=user.id,
                status='accepted'
            ).all()
            
            # Professional earnings: sum of payment_amount for completed professional jobs, minus admin fee
            admin_fee_setting = AppSetting.query.get('professional_admin_fee_rate')  # professional admin fee rate
            admin_fee_rate = float(admin_fee_setting.value) if admin_fee_setting else 0.10
            
            # Current month to date: from 1st of month 00:00 UTC through now
            now_utc = datetime.now(timezone.utc)
            start_of_month = now_utc.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            gross_earnings_row = db.session.query(func.coalesce(func.sum(ServiceRequest.payment_amount), 0)).filter(
                ServiceRequest.request_type == 'professional',
                ServiceRequest.provider_id == user.id,
                ServiceRequest.status == 'completed',
                ServiceRequest.updated_at >= start_of_month,
                ServiceRequest.updated_at <= now_utc
            ).first()
            gross_earnings = float(gross_earnings_row[0]) if gross_earnings_row and gross_earnings_row[0] else 0.0
            professional_earnings = gross_earnings * (1.0 - admin_fee_rate)
            
            # Get available professional requests (pending professional requests that match professional's gender)
            user_data = user.data or {}
            provider_gender = user_data.get('gender')
            
            pending_professional_requests = ServiceRequest.query.filter(
                and_(
                    ServiceRequest.request_type == 'professional',
                    ServiceRequest.status == 'pending',
                or_(
                    ServiceRequest.provider_id.is_(None),
                    ServiceRequest.provider_id == user.id
                    #directly booked for this specific professional
                )
              ) 
            ).order_by(ServiceRequest.created_at.desc()).limit(10).all()
            
            # Filter by gender matching
            for req in pending_professional_requests:
                if req.provider_id and str(req.provider_id) == str(user.id):
                    available_professional_requests.append(req)
                    continue

                request_details = req.details or {}
                request_gender_pref = request_details.get('gender')
                
                if request_gender_pref:
                    if provider_gender and provider_gender.lower() != request_gender_pref.lower():
                        continue  # Skip - doesn't match
                # If no gender preference, show to all professionals
                
                available_professional_requests.append(req)
            
            professional_services = (user.data or {}).get('professional_services') or []
        
        elif user.role == 'service-provider':
            # Get recent service provider jobs (3 most recent) - jobs service provider has accepted
            recent_service_provider_jobs = ServiceRequest.query.filter(
                ServiceRequest.request_type == 'provider',
                ServiceRequest.provider_id == user.id,
                or_(
                    ServiceRequest.status == 'completed',
                    ServiceRequest.details['provider_rating'].is_not(None)
                )
            ).order_by(ServiceRequest.created_at.desc()).limit(5).all()

            # Active provider jobs
            active_service_provider_jobs = ServiceRequest.query.filter_by(
                request_type='provider',
                provider_id=user.id,
                status='accepted'
            ).all()
            
            # Service provider earnings: sum of payment_amount for completed provider jobs (current month to date), minus admin fee
            admin_fee_setting = AppSetting.query.get('driver_admin_fee_rate')  # Reuse driver admin fee rate
            admin_fee_rate = float(admin_fee_setting.value) if admin_fee_setting else 0.10
            
            now_utc = datetime.now(timezone.utc)
            start_of_month = now_utc.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            gross_earnings_row = db.session.query(func.coalesce(func.sum(ServiceRequest.payment_amount), 0)).filter(
                ServiceRequest.request_type == 'provider',
                ServiceRequest.provider_id == user.id,
                ServiceRequest.status == 'completed',
                ServiceRequest.updated_at >= start_of_month,
                ServiceRequest.updated_at <= now_utc
            ).first()
            gross_earnings = float(gross_earnings_row[0]) if gross_earnings_row and gross_earnings_row[0] else 0.0
            service_provider_earnings = gross_earnings * (1.0 - admin_fee_rate)
            
            # Get available service provider requests (pending provider requests that match provider's gender)
            user_data = user.data or {}
            provider_gender = user_data.get('gender')
            
            pending_provider_requests = ServiceRequest.query.filter(
                and_(
                    ServiceRequest.request_type == 'provider',
                    ServiceRequest.status == 'pending',
                    or_(
                        ServiceRequest.provider_id.is_(None),
                        ServiceRequest.provider_id == user.id
                    )
                    
                )
            ).order_by(ServiceRequest.created_at.desc()).limit(10).all()
            
            # Filter by gender matching
            for req in pending_provider_requests:
                if req.provider_id and str(req.provider_id) == str(user.id):
                    available_service_provider_requests.append(req)
                    continue
                    
                request_details = req.details or {}
                request_gender_pref = request_details.get('gender')
                
                if request_gender_pref:
                    if provider_gender and provider_gender.lower() != request_gender_pref.lower():
                        continue  # Skip - doesn't match
                # If no gender preference, show to all service providers
                
                available_service_provider_requests.append(req)
            
            provider_services = (user.data or {}).get('provider_services') or []
        
        payload = {
            'current_user': user.to_dict(),
            'wallet': {
                'balance': wallet_balance,
                'currency': wallet.currency if wallet else 'ZAR'
            },
            'recent_orders': [o.to_dict() for o in recent_orders],
            'recent_rides': [r.to_dict() for r in recent_rides],
            'recent_requests': [r.to_dict() for r in recent_requests],
            'available_ride_requests': available_ride_requests_payload if user.role == 'driver' else [r.to_dict() for r in available_ride_requests],
            'available_professional_requests': [r.to_dict() for r in available_professional_requests],
            'available_service_provider_requests': [r.to_dict() for r in available_service_provider_requests],
            'recent_professional_jobs': [r.to_dict() for r in recent_professional_jobs],
            'recent_service_provider_jobs': [r.to_dict() for r in recent_service_provider_jobs],
            'active_rides': [_ride_request_with_client(r) for r in active_rides] if user.role == 'driver' else [],
            'active_professional_jobs': [_ride_request_with_client(r) for r in active_professional_jobs] if user.role == 'professional' else [],
            'active_service_provider_jobs': [_ride_request_with_client(r) for r in active_service_provider_jobs] if user.role == 'service-provider' else []
        }
        if driver_earnings is not None:
            payload['driver_earnings'] = driver_earnings
            payload['driver_services'] = driver_services
        if professional_earnings is not None:
            payload['professional_earnings'] = professional_earnings
            payload['professional_services'] = professional_services
        if service_provider_earnings is not None:
            payload['service_provider_earnings'] = service_provider_earnings
            payload['service_provider_services'] = provider_services
            
        if user.role == 'agent':
            payload['agent_stats'] = AgentService.get_agent_stats(user.id)
            
        return success_response(payload)
        
    except Exception as e:
        current_app.logger.error(f"Get dashboard error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to get dashboard', None, 500)

@bp.route('/wallet', methods=['GET'])
@require_auth
def get_wallet():
    """Get wallet balance and transaction history"""
    try:
        user_id = get_jwt_identity()
        # Recon check: transfer any month-end earnings to wallet (triggered on wallet access)
        try:
            run_recon_for_user(user_id)
        except Exception as e:
            current_app.logger.warning(f"Recon check on wallet: {e}")
        wallet = Wallet.query.filter_by(user_id=user_id).first()
        
        if not wallet:
            return error_response('NOT_FOUND', 'Wallet not found', None, 404)
        
        user = User.query.get(user_id)
        can_request_withdrawal = user and user.role in ('driver', 'professional', 'service-provider')
        
        # Get transactions
        transactions = WalletTransaction.query.filter_by(wallet_id=wallet.id)\
            .order_by(WalletTransaction.created_at.desc()).limit(50).all()
        
        return success_response({
            'balance': float(wallet.balance) if wallet.balance else 0.0,
            'currency': wallet.currency,
            'can_request_withdrawal': can_request_withdrawal,
            'transactions': [t.to_dict() for t in transactions]
        })
        
    except Exception as e:
        current_app.logger.error(f"Get wallet error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to get wallet', None, 500)

@bp.route('/requests', methods=['GET'])
@require_auth
def get_requests():
    """Get user's service requests"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        status = request.args.get('status')
        limit = int(request.args.get('limit', 10))
        offset = int(request.args.get('offset', 0))
        
        query = ServiceRequest.query.filter_by(requester_id=user_id)
        
        if status:
            query = query.filter_by(status=status)
        
        total = query.count()
        requests = query.order_by(ServiceRequest.created_at.desc()).limit(limit).offset(offset).all()
        
        return success_response({
            'requests': [r.to_dict() for r in requests],
            'total': total,
            'limit': limit,
            'offset': offset
        })
        
    except Exception as e:
        current_app.logger.error(f"Get requests error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to get requests', None, 500)

@bp.route('/orders', methods=['GET'])
@require_auth
def get_orders():
    """Get user's order history"""
    try:
        user_id = get_jwt_identity()
        limit = int(request.args.get('limit', 10))
        offset = int(request.args.get('offset', 0))
        
        query = Order.query.filter_by(customer_id=user_id)
        total = query.count()
        orders = query.order_by(Order.placed_at.desc()).limit(limit).offset(offset).all()
        
        return success_response({
            'orders': [o.to_dict() for o in orders],
            'total': total,
            'limit': limit,
            'offset': offset
        })
        
    except Exception as e:
        current_app.logger.error(f"Get orders error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to get orders', None, 500)

class TopUpSchema(Schema):
    amount = fields.Float(required=True, validate=lambda x: x >= 10.0)
    currency = fields.Str(required=True)

@bp.route('/wallet/top-up', methods=['POST'])
@require_auth
def wallet_top_up():
    """Initiate wallet top-up payment"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return error_response('USER_NOT_FOUND', 'User not found', None, 404)
        
        # Validate request
        schema = TopUpSchema()
        data = schema.load(request.json)
        
        amount = float(data['amount'])
        currency = data['currency']
        
        # Validate minimum amount
        if amount < 10.0:
            return error_response('INVALID_AMOUNT', 'Minimum top-up amount is R10.00', None, 400)
        
        # Convert amount to cents for Yoco
        amount_cents = int(amount * 100)
        
        # Generate external_id for tracking this payment
        # Format: topup_{user_id_hex}_{random_hex}
        user_id_hex = str(user.id).replace('-', '')
        external_id = f"topup_{user_id_hex}_{uuid.uuid4().hex[:8]}"
        
        # Get or create wallet
        wallet = WalletService.get_or_create_wallet(user_id)
        
        # Create checkout session
        backend_url = get_public_backend_base_url()
        frontend_url = get_request_frontend_base_url()
        checkout_result = PaymentService.create_checkout(
            amount=amount_cents,
            currency=currency,
            external_id=external_id,
            success_url=f"{backend_url}/api/payments/wallet-topup-callback?callback_status=success&external_id={external_id}&frontend_url={frontend_url}",
            cancel_url=f"{backend_url}/api/payments/wallet-topup-callback?callback_status=cancel&external_id={external_id}&frontend_url={frontend_url}",
            failure_url=f"{backend_url}/api/payments/wallet-topup-callback?callback_status=failure&external_id={external_id}&frontend_url={frontend_url}"
        )
        
        # Update payment metadata with wallet info
        payment = Payment.query.filter_by(external_id=external_id).first()
        if payment:
            payment.meta_data.update({
                'wallet_id': str(wallet.id),
                'transaction_type': 'top-up'
            })
            db.session.commit()
        
        return success_response({
            'redirect_url': checkout_result['redirect_url'],
            'checkout_id': checkout_result['checkout_id'],
            'external_id': external_id
        })
        
    except ValidationError as e:
        return error_response('VALIDATION_ERROR', 'Invalid input data', e.messages, 400)
    except ValueError as e:
        return error_response('INVALID_REQUEST', str(e), None, 400)
    except Exception as e:
        current_app.logger.error(f"Wallet top-up error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to create checkout', None, 500)


@bp.route('/recon-check', methods=['GET'])
@require_auth
def recon_check():
    """Run recon for current user (transfer month-end earnings to wallet). Call on login, dashboard, wallet."""
    try:
        user_id = get_jwt_identity()
        transferred = run_recon_for_user(user_id)
        return success_response({'transferred': transferred})
    except Exception as e:
        current_app.logger.warning(f"Recon check error: {e}")
        return success_response({'transferred': []})


@bp.route('/wallet/withdrawal-request', methods=['POST'])
@require_auth
def create_withdrawal_request():
    """Earner requests withdrawal; amount is deducted from wallet (suspense)."""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user or user.role not in ('driver', 'professional', 'service-provider'):
            return error_response('FORBIDDEN', 'Only earners can request withdrawal', None, 403)
        data = request.json or {}
        amount = data.get('amount')
        if amount is None:
            return error_response('MISSING_FIELDS', 'amount is required', None, 400)
        try:
            amount = float(amount)
        except (TypeError, ValueError):
            return error_response('INVALID_AMOUNT', 'amount must be a number', None, 400)
        if amount <= 0:
            return error_response('INVALID_AMOUNT', 'amount must be positive', None, 400)
        wallet = WalletService.get_or_create_wallet(user_id)
        balance = float(wallet.balance) if wallet.balance else 0.0
        if amount > balance:
            return error_response('INSUFFICIENT_BALANCE', f'Balance is R{balance:.2f}', None, 400)
        wr = WithdrawalRequest(user_id=user_id, amount=amount, status='pending')
        db.session.add(wr)
        db.session.flush()
        WalletService.add_transaction(
            wallet_id=wallet.id,
            user_id=user_id,
            transaction_type='withdrawal',
            amount=amount,
            currency=wallet.currency or 'ZAR',
            external_id=str(wr.id),
            description='Withdrawal request',
            metadata={'withdrawal_request_id': str(wr.id)},
        )
        db.session.commit()
        return success_response(wr.to_dict(), 'Withdrawal request submitted', 201)
    except ValueError as e:
        return error_response('INVALID_REQUEST', str(e), None, 400)
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Withdrawal request error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to create withdrawal request', None, 500)


@bp.route('/wallet/withdrawal-requests', methods=['GET'])
@require_auth
def list_withdrawal_requests():
    """List current user's withdrawal requests."""
    try:
        user_id = get_jwt_identity()
        requests = WithdrawalRequest.query.filter_by(user_id=user_id).order_by(WithdrawalRequest.created_at.desc()).all()
        return success_response({'withdrawal_requests': [r.to_dict() for r in requests]})
    except Exception as e:
        current_app.logger.error(f"List withdrawal requests error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to list withdrawal requests', None, 500)
