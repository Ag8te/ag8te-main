"""
Service Request Routes
"""
import math
import secrets
from datetime import datetime
from urllib.parse import quote

from flask import Blueprint, request, current_app
from flask_jwt_extended import get_jwt_identity
from marshmallow import Schema, ValidationError, fields, validate
from sqlalchemy import and_, or_, func

from backend.services.email_service import EmailService
from backend.extensions import db
from backend.models import AppSetting, Payment, ServiceRequest, User, Wallet, DriverRating, ClientRating, ProfessionalRating, ProviderRating, Order
from backend.services.wallet_service import WalletService
from backend.services.notification_service import NotificationService
from backend.services.email_service import EmailService
from backend.services.payment_service import PaymentService
from backend.utils.decorators import require_auth, require_role
from backend.utils.response import error_response, success_response
from backend.utils.url import get_public_backend_base_url, get_request_frontend_base_url, get_request_frontend_return_path

bp = Blueprint('requests', __name__)


from backend.services.request_service import RequestService


class QuoteRequestSchema(Schema):
    """
    Schema for cab quote calculation.

    This does NOT create a service request in the database.
    It simply returns a distance and price quote based on the provided data.
    """

    type = fields.Str(required=True, validate=validate.Equal('cab'))
    pickup = fields.Dict(required=True)
    dropoff = fields.Dict(required=True)
    preferences = fields.Dict()
    # Optional pre-calculated distance in km (e.g. from frontend using Google Maps)
    distance_km = fields.Float()


class CreateRequestSchema(Schema):
    type = fields.Str(required=True, validate=validate.OneOf(['cab', 'professional', 'provider']))
    pickup = fields.Dict()  # For cab requests
    dropoff = fields.Dict()  # For cab requests
    location = fields.Dict()  # For service provider/professional requests
    date = fields.Str(required=True)
    time = fields.Str(required=True)
    preferences = fields.Dict()
    payment_amount = fields.Decimal(required=True)
    notes = fields.Str()


class CabCheckoutSchema(Schema):
    """Schema for creating a cab request and Yoco checkout in one step."""

    pickup = fields.Dict(required=True)
    dropoff = fields.Dict(required=True)
    date = fields.Str(required=True)
    time = fields.Str(required=True)
    preferences = fields.Dict()
    payment_amount = fields.Decimal(required=True)
    distance_km = fields.Float()
    provider = fields.Str(validate=validate.OneOf(['yoco', 'paypal']), load_default='yoco')
    notes = fields.Str()
    schedule_type = fields.Str(validate=validate.OneOf(['now', 'later']), load_default='now')
    selected_driver_id = fields.UUID(load_default=None)


class ProfessionalCheckoutSchema(Schema):
    """Schema for creating a professional or service provider request and Yoco checkout (call-out fee)."""

    type = fields.Str(validate=validate.OneOf(['professional', 'provider']), load_default='professional')
    location = fields.Dict(required=True)  # { lat, lng, address }
    date = fields.Str(required=True)
    time = fields.Str(required=True)
    payment_amount = fields.Decimal(required=True)  # call-out fee or service rate
    preferences = fields.Dict()
    provider = fields.Str(validate=validate.OneOf(['yoco', 'paypal']), load_default='yoco')
    notes = fields.Str()
    is_rfq = fields.Bool(load_default=False)


@bp.route('/quote', methods=['POST'])
@require_auth
def get_cab_quote():
    """
    Calculate a cab quote based on pick-up/drop-off and car preferences.

    This endpoint does NOT persist anything to the database. It simply returns:
      - distance_km
      - calculated payment_amount (quote) in Rands
    """
    try:
        schema = QuoteRequestSchema()
        data = schema.load(request.json or {})

        pickup = data['pickup']
        dropoff = data['dropoff']
        preferences = data.get('preferences') or {}

        # If data already has distance_km, we skip calc
        if data.get('distance_km'):
             # We still want to use service for amount resolution if possible, 
             # but calculate_quote does distance too. Let's use it.
             pass

        quote, error = RequestService.calculate_quote(pickup, dropoff, preferences)
        if error:
            return error_response(error, 'Failed to calculate quote', None, 400)

        return success_response(quote, 'Quote calculated successfully')

    except ValidationError as e:
        return error_response('VALIDATION_ERROR', 'Invalid input data', e.messages, 400)
    except Exception as e:
        current_app.logger.error(f"Get cab quote error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to calculate quote', None, 500)

@bp.route('', methods=['POST'])
@require_auth
def create_request():
    """Create service request"""
    try:
        schema = CreateRequestSchema()
        data = schema.load(request.json)
        user_id = get_jwt_identity()

        service_request, error = RequestService.create_request(data, user_id)
        
        provider = None
        if service_request and service_request.request_type in ("professional", "provider") and service_request.provider_id:
            provider = User.query.get(service_request.provider_id)
            requester = User.query.get(service_request.requester_id)
            if provider and provider.email:
                try:
                    EmailService.send_booking_notification(provider, service_request, requester)
                except Exception as e:
                    current_app.logger.error(f"Error sending booking notification: {str(e)}")

        if error:
            return error_response(error, 'Failed to create request', None, 400)
        
        db.session.commit()

        wallet = Wallet.query.filter_by(user_id=user_id).first()
        return success_response({
            'id': service_request.id,
            'status': service_request.status,
            'payment_status': service_request.payment_status,
            'payment_amount': float(service_request.payment_amount),
            'wallet_balance': float(wallet.balance) if wallet else 0.0
        }, 'Service request created successfully', 201)

    except ValidationError as e:
        return error_response('VALIDATION_ERROR', 'Invalid input data', e.messages, 400)
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Create request error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to create request', None, 500)


@bp.route('/cab-checkout', methods=['POST'])
@require_auth
def create_cab_checkout():
    """
    Create a cab service request and initiate Yoco checkout in one step.

    This corresponds to the \"Accept Quote & Create Request\" action on the
    Request Cab page. The user is redirected to Yoco for payment, and
    on success the service request payment_status is updated via callback.
    """
    try:
        schema = CabCheckoutSchema()
        data = schema.load(request.json or {})
        user_id = get_jwt_identity()

        checkout_data, error = RequestService.create_checkout(
            'cab',
            data,
            user_id,
            get_public_backend_base_url(),
        )
        if error:
            return error_response(error, 'Failed to create cab checkout', None, 400)

        return success_response(checkout_data, 'Cab request created. Redirect to checkout.')

    except ValidationError as e:
        db.session.rollback()
        return error_response('VALIDATION_ERROR', 'Invalid input data', e.messages, 400)
    except ValueError as e:
        db.session.rollback()
        return error_response('INVALID_REQUEST', str(e), None, 400)
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Create cab checkout error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to create cab checkout', None, 500)


@bp.route('/professional-checkout', methods=['POST'])
@require_auth
def create_professional_checkout():
    """
    Create a professional service request and initiate Yoco checkout for the call-out fee.

    The user is redirected to Yoco for payment. On success, the service request
    payment_status is updated via the same request-callback used for cab.
    """
    try:
        schema = ProfessionalCheckoutSchema()
        data = schema.load(request.json or {})
        user_id = get_jwt_identity()

        request_type = data.get('type', 'professional')
        checkout_data, error = RequestService.create_checkout(
            request_type,
            data,
            user_id,
            get_public_backend_base_url(),
        )
        
        if error:
            return error_response(error, 'Failed to create checkout', None, 400)
            
        if data.get('is_rfq'):
             return success_response({
                'request_id': checkout_data.id,
                'status': 'pending',
                'is_rfq': True
            }, 'Request for quote submitted successfully.')

        return success_response(checkout_data, 'Service request created. Redirect to checkout.')
    except ValidationError as e:
        db.session.rollback()
        return error_response('VALIDATION_ERROR', 'Invalid input data', e.messages, 400)
    except ValueError as e:
        db.session.rollback()
        return error_response('INVALID_REQUEST', str(e), None, 400)
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Create professional checkout error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to create checkout', None, 500)


@bp.route('/recent-rides-made', methods=['GET'])
@require_auth
def get_recent_rides_made():
    """Get recent rides made"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if user.role != 'driver' and user.role != 'admin':
            return error_response('FORBIDDEN', 'Only drivers and admins can view recent rides made', None, 403)
        request_params = request.args
        limit = int(request_params.get('limit', 3))
        offset = int(request_params.get('offset', 0))
        query = ServiceRequest.query.filter_by(request_type='cab', provider_id=user_id).order_by(ServiceRequest.created_at.desc())
        total = query.count()
        paginated = query.limit(limit).offset(offset).all()
        ride_ids = [r.id for r in paginated]
        rated_ids = set(
            row[0] for row in
            db.session.query(ClientRating.service_request_id).filter(
                ClientRating.service_request_id.in_(ride_ids)
            ).all()
        )

        def _ride_with_client(r):
            d = r.to_dict()
            d['has_client_rating'] = r.id in rated_ids
            if r.requester_id and r.requester:
                requester = r.requester
                pdata = requester.data or {}
                first = (pdata.get('full_name') or '').strip()
                last = (pdata.get('surname') or '').strip()
                d['client_name'] = f"{first} {last}".strip() or 'Client'
                d['client_profile_image_url'] = requester.profile_image_url
                d['client_id'] = str(requester.id)
            return d

        return success_response({
            'rides': [_ride_with_client(r) for r in paginated],
            'total': total,
            'limit': limit,
            'offset': offset
        })
    except Exception as e:
        current_app.logger.error(f"Get recent rides made error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to get recent rides made', None, 500)

@bp.route('', methods=['GET'])
@require_auth
def list_requests():
    """List service requests with preference matching"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        request_type = request.args.get('type')
        status = request.args.get('status')
        limit = int(request.args.get('limit', 50))
        offset = int(request.args.get('offset', 0))
        
        # Filter by role
        if user.role == 'client':
            # Clients see only their own requests
            query = ServiceRequest.query.filter_by(requester_id=user_id)
        elif user.role in ('driver', 'professional', 'service-provider'):
            # Providers see:
            # 1. Requests they've accepted (provider_id matches)
            # 2. Pending requests that match their profile preferences
            
            # Map request_type to role
            role_to_request_type = {
                'driver': 'cab',
                'professional': 'professional',
                'service-provider': 'provider'
            }
            expected_request_type = role_to_request_type.get(user.role)
            
            # Get all relevant requests (accepted by this provider OR pending of correct type)
            from sqlalchemy import or_
            query = ServiceRequest.query.filter(
                or_(
                    ServiceRequest.provider_id == user_id,  # Already accepted
                    and_(
                        ServiceRequest.request_type == expected_request_type,
                        ServiceRequest.status == 'pending',
                        ServiceRequest.provider_id.is_(None)  # Not yet accepted
                    )
                )
            )
        else:
            # Admin or other roles - show all requests
            query = ServiceRequest.query
        
        if request_type:
            # Map role to request_type for filtering
            if request_type == 'cab':
                query = query.filter_by(request_type='cab')
            elif request_type == 'professional':
                query = query.filter_by(request_type='professional')
            elif request_type == 'provider':
                query = query.filter_by(request_type='provider')
        
        if status:
            query = query.filter_by(status=status)
        
        # Get all matching requests
        all_requests = query.order_by(ServiceRequest.created_at.desc()).all()
        dispatch_changed = False
        
        # Apply preference matching in Python (for JSONB fields)
        filtered_requests = []
        user_data = user.data or {}
        
        for req in all_requests:
            # Clients always see their own requests
            if user.role == 'client':
                if req.request_type == 'cab' and RequestService.refresh_pending_cab_dispatch_if_needed(req):
                    dispatch_changed = True
                if req.requester_id and str(req.requester_id) == str(user.id):
                    filtered_requests.append(req)
                continue
            
            # For providers (driver, professional, service-provider)
            # If already accepted by this provider, always include
            if req.provider_id and str(req.provider_id) == str(user.id):
                filtered_requests.append(req)
                continue
            
            # For pending requests not yet accepted, apply matching logic
            if req.status == 'pending' and (req.provider_id is None or str(req.provider_id) != str(user.id)):
                request_details = req.details or {}
                if req.request_type == 'cab' and RequestService.refresh_pending_cab_dispatch_if_needed(req):
                    dispatch_changed = True
                
                if user.role == 'driver':
                    if not RequestService.can_driver_view_cab_offer(req, user):
                        continue
                    filtered_requests.append(req)
                
                elif user.role in ('professional', 'service-provider'):
                    # Match by gender
                    provider_gender = user_data.get('gender')
                    
                    # Check if request has gender preference
                    request_gender_pref = request_details.get('gender')
                    if request_gender_pref:
                        # Request has gender preference - must match provider's gender
                        if provider_gender and provider_gender.lower() != request_gender_pref.lower():
                            continue  # Skip - doesn't match
                    # If no gender preference in request, show to all providers
                    
                    filtered_requests.append(req)
                else:
                    # For other roles, include all
                    filtered_requests.append(req)

        if dispatch_changed:
            db.session.commit()
        
        # Apply pagination
        total = len(filtered_requests)
        paginated_requests = filtered_requests[offset:offset + limit]
        request_ids = [r.id for r in paginated_requests]
        rated_driver_ids = set(
            row[0] for row in
            db.session.query(DriverRating.service_request_id).filter(
                DriverRating.service_request_id.in_(request_ids)
            ).all()
        )
        rated_professional_ids = set(
            row[0] for row in
            db.session.query(ProfessionalRating.service_request_id).filter(
                ProfessionalRating.service_request_id.in_(request_ids)
            ).all()
        )
        rated_provider_ids = set(
            row[0] for row in
            db.session.query(ProviderRating.service_request_id).filter(
                ProviderRating.service_request_id.in_(request_ids)
            ).all()
        )
        requests_data = []
        for r in paginated_requests:
            d = RequestService.serialize_request(r)
            d['has_driver_rating'] = r.id in rated_driver_ids
            d['has_professional_rating'] = r.id in rated_professional_ids
            d['has_provider_rating'] = r.id in rated_provider_ids
            details = d.get('details') or {}
            # For cab requests with an accepted driver, include driver display info
            if r.provider_id and r.provider:
                provider_user = r.provider
                pdata = provider_user.data or {}
                first = (pdata.get('full_name') or '').strip()
                last = (pdata.get('surname') or '').strip()
                name = f"{first} {last}".strip() or 'Provider'
                
                if r.request_type in ('professional', 'provider'):
                    # Use business name for service providers if available
                    if r.request_type == 'provider' and pdata.get('business_name'):
                        name = pdata.get('business_name')
                    d['provider_name'] = name
                    d['provider_profile_image_url'] = provider_user.profile_image_url
                    d['provider_banner_url'] = provider_user.banner_url if hasattr(provider_user, 'banner_url') else None
                    d['provider_id_assigned'] = str(provider_user.id)

            # Also attach service images if they exist in preferences
            if details and 'service_image_url' in details:
                d['service_image_url'] = details['service_image_url']
            
            requests_data.append(d)
        return success_response({
            'requests': requests_data,
            'total': total,
            'limit': limit,
            'offset': offset
        })
        
    except Exception as e:
        current_app.logger.error(f"List requests error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to list requests', None, 500)

@bp.route('/<request_id>', methods=['GET'])
@require_auth
def get_request(request_id):
    """Get service request details"""
    try:
        service_request = ServiceRequest.query.get(request_id)
        
        if not service_request:
            return error_response('NOT_FOUND', 'Service request not found', None, 404)

        if RequestService.refresh_pending_cab_dispatch_if_needed(service_request):
            db.session.commit()
        
        return success_response(RequestService.serialize_request(service_request))
        
    except Exception as e:
        current_app.logger.error(f"Get request error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to get request', None, 500)

@bp.route('/provider/<uuid:provider_id>/busy-slots', methods=['GET'])
def get_busy_slots(provider_id):
    """Get busy time slots for a provider on a specific date"""
    date_str = request.args.get('date')
    if not date_str:
        return error_response('MISSING_DATE', 'Date is required', None, 400)
    
    # Query accepted/paid/completed requests for this provider on this date
    busy_requests = ServiceRequest.query.filter(
        ServiceRequest.provider_id == provider_id,
        ServiceRequest.scheduled_date == date_str,
        ServiceRequest.status.in_(['accepted', 'completed', 'paid'])
    ).all()
    
    slots = [r.scheduled_time for r in busy_requests]
    return success_response({'busy_slots': slots})

@bp.route('/<request_id>/accept', methods=['POST'])
@require_auth
def accept_request(request_id):
    """Accept service request (provider)"""
    try:
        user_id = get_jwt_identity()
        service_request = ServiceRequest.query.filter_by(id=request_id).with_for_update().first()
        
        if not service_request:
            return error_response('NOT_FOUND', 'Service request not found', None, 404)
        
        if service_request.status != 'pending':
            return error_response('INVALID_STATUS', 'Request cannot be accepted', None, 400)

        user = User.query.get(user_id)
        if service_request.request_type == 'cab':
            if RequestService.refresh_expired_cab_dispatch_if_needed(service_request):
                db.session.flush()
            if service_request.provider_id:
                return error_response('INVALID_STATUS', 'This ride has already been assigned to another driver', None, 400)
            if service_request.status != 'pending':
                return error_response('INVALID_STATUS', 'This ride is no longer available for acceptance', None, 400)
            if not RequestService.can_driver_view_cab_offer(service_request, user):
                return error_response('FORBIDDEN', 'This ride offer is not currently assigned to you', None, 403)
            details = dict(service_request.details or {})
            details['dispatch_state'] = 'driver_assigned'
            details['accepted_at'] = datetime.utcnow().isoformat()
            details['accepted_driver_id'] = user_id
            details['assigned_driver'] = RequestService._build_driver_snapshot(user)
            service_request.details = details
        
        service_request.provider_id = user_id
        provider = User.query.get(user_id)
        
        if provider and provider.email:
            try:
                EmailService.send_request_accepted_email(provider, service_request)
            except Exception as e:
                current_app.logger.error(f"Error sending request accepted email: {str(e)}")
        
        service_request.status = 'accepted'
        db.session.commit()

        try:
            NotificationService.notify(
                user_id=service_request.requester_id,
                type='request_accepted',
                title='Your booking has been accepted',
                body='A provider has accepted your booking request',
                entity_type='service_request',
                entity_id=service_request.id
            )
        except Exception as notif_err:
            current_app.logger.error(f"Notification error on accept: {str(notif_err)}")
        
        try:
            client = User.query.get(service_request.requester_id)
            if client:
                EmailService.send_booking_accepted_email(client, service_request)
        except Exception as email_err:
            current_app.logger.error(f"Email error on accept: {str(email_err)}")
        
        payload = RequestService.serialize_request(service_request) if service_request.request_type == 'cab' else service_request.to_dict()
        return success_response(payload, 'Request accepted successfully')
        
    except Exception as e:
        current_app.logger.error(f"Accept request error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to accept request', None, 500)

@bp.route('/<request_id>/quote', methods=['POST'])
@require_auth
def submit_quote(request_id):
    """Submit a quote for an RFQ request (provider)"""
    try:
        user_id = get_jwt_identity()
        service_request = ServiceRequest.query.get(request_id)
        
        if not service_request:
            return error_response('NOT_FOUND', 'Service request not found', None, 404)
        
        # Only pending/unpaid requests can be quoted (or maybe custom logic)
        # For now, allow quoting if status is pending and it's an RFQ
        
        data = request.json or {}
        quote_amount = data.get('quote_amount')
        
        if quote_amount is None:
            return error_response('VALIDATION_ERROR', 'quote_amount is required', None, 400)
            
        service_request.quote_amount = float(quote_amount)
        # Store who quoted it if we want to track multiple quotes, 
        # but for now, the first one who quotes might "own" it or we just store the amount.
        # Usually, the first one to accept/quote gets it in this simple model.
        
        # If it's an RFQ, the status stays pending until client accepts quote.
        
        db.session.commit()
        return success_response(service_request.to_dict(), 'Quote submitted successfully')
        
    except Exception as e:
        current_app.logger.error(f"Submit quote error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to submit quote', None, 500)

@bp.route('/<request_id>/pay-quote', methods=['POST'])
@require_auth
def pay_quote(request_id):
    """Initiate payment for an accepted quote"""
    try:
        user_id = get_jwt_identity()
        service_request = ServiceRequest.query.get(request_id)
        
        if not service_request:
            return error_response('NOT_FOUND', 'Service request not found', None, 404)
        
        if str(service_request.requester_id) != user_id:
            return error_response('FORBIDDEN', 'Only the requester can pay for the quote', None, 403)
            
        if not service_request.quote_amount or service_request.quote_amount <= 0:
            return error_response('INVALID_STATE', 'No valid quote amount found for this request', None, 400)
            
        # Update payment_amount to the quoted amount
        service_request.payment_amount = service_request.quote_amount
        db.session.flush()

        amount_cents = int(round(float(service_request.payment_amount) * 100))
        external_id = f"quote_pay_{request_id}_{secrets.token_hex(6)}"
        base_url = request.host_url.rstrip('/')
        frontend_url = get_request_frontend_base_url()
        return_path = quote(get_request_frontend_return_path('/my-bookings?tab=services'), safe='')
        success_url = f"{base_url}/api/payments/request-callback?callback_status=success&external_id={external_id}&request_id={request_id}&frontend_url={frontend_url}&return_path={return_path}"
        cancel_url = f"{base_url}/api/payments/request-callback?callback_status=cancel&external_id={external_id}&request_id={request_id}&frontend_url={frontend_url}&return_path={return_path}"
        failure_url = f"{base_url}/api/payments/request-callback?callback_status=failure&external_id={external_id}&request_id={request_id}&frontend_url={frontend_url}&return_path={return_path}"

        checkout = PaymentService.create_checkout(
            amount=amount_cents,
            currency='ZAR',
            external_id=external_id,
            success_url=success_url,
            cancel_url=cancel_url,
            failure_url=failure_url,
        )

        db.session.commit()

        return success_response(
            {
                'request_id': request_id,
                'checkout_id': checkout['checkout_id'],
                'redirect_url': checkout['redirect_url'],
                'external_id': external_id,
            },
            'Quote payment initiated. Redirect to checkout.',
        )
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Pay quote error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to initiate quote payment', None, 500)

@bp.route('/<request_id>/cancel', methods=['POST'])
@require_auth
def cancel_request(request_id):
    """Cancel service request"""
    try:
        user_id = get_jwt_identity()
        service_request = ServiceRequest.query.get(request_id)
        
        if not service_request:
            return error_response('NOT_FOUND', 'Service request not found', None, 404)
        
        # Only requester can cancel
        if str(service_request.requester_id) != user_id:
            return error_response('FORBIDDEN', 'Only requester can cancel', None, 403)

        if service_request.status in ('completed', 'cancelled'):
            return error_response('INVALID_STATUS', 'This request can no longer be cancelled', None, 400)

        data = request.get_json(silent=True) or {}
        cancellation_reason = (data.get('reason') or '').strip()
        
        cancellation_charge = 0.0
        refund_amount = 0.0
        details = dict(service_request.details or {})
        
        if service_request.request_type == 'cab' and service_request.status == 'accepted':
            trip_started = bool(details.get('cab_trip_started'))
            driver_arrived = bool(details.get('cab_driver_arrived'))

            if trip_started:
                return error_response('INVALID_STATUS', 'You cannot cancel a ride once the trip has started', None, 400)

            fee_rate = 0.2 if driver_arrived else 0.1
            cancellation_charge = float(service_request.payment_amount) * fee_rate
            refund_amount = float(service_request.payment_amount) - cancellation_charge

            if service_request.requester_id:
                wallet = Wallet.query.filter_by(user_id=service_request.requester_id).first()
                if wallet:
                    WalletService.add_transaction(
                        wallet_id=wallet.id,
                        user_id=service_request.requester_id,
                        transaction_type='cancellation_refund',
                        amount=refund_amount,
                        external_id=request_id,
                        description='Cancellation refund'
                    )
        elif service_request.status == 'accepted':
            cancellation_charge = float(service_request.payment_amount) * 0.2
            refund_amount = float(service_request.payment_amount) - cancellation_charge
            if service_request.requester_id:
                wallet = Wallet.query.filter_by(user_id=service_request.requester_id).first()
                if wallet:
                    WalletService.add_transaction(
                        wallet_id=wallet.id,
                        user_id=service_request.requester_id,
                        transaction_type='cancellation_refund',
                        amount=refund_amount,
                        external_id=request_id,
                        description='Cancellation refund'
                    )
        
        details['cancelled_at'] = datetime.utcnow().isoformat()
        if cancellation_reason:
            details['cancellation_reason'] = cancellation_reason
        details['dispatch_state'] = 'cancelled'
        service_request.details = details
        service_request.status = 'cancelled'
        service_request.cancellation_charge = cancellation_charge
        service_request.provider_id = None
        db.session.commit()
        
        wallet = Wallet.query.filter_by(user_id=user_id).first()
        wallet_balance = float(wallet.balance) if wallet and wallet.balance else 0.0
        
        return success_response({
            'request_id': request_id,
            'status': 'cancelled',
            'refund_amount': refund_amount,
            'cancellation_charge': cancellation_charge,
            'cancellation_reason': cancellation_reason,
            'wallet_balance': wallet_balance
        }, 'Request cancelled successfully')
        
    except Exception as e:
        current_app.logger.error(f"Cancel request error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to cancel request', None, 500)


def _require_cab_requester(service_request, user_id):
    """Ensure request is cab, accepted, and user is the requester."""
    if not service_request:
        return 'NOT_FOUND', 'Service request not found', 404
    if service_request.request_type != 'cab':
        return 'INVALID_REQUEST', 'Not a cab request', 400
    if service_request.status != 'accepted':
        return 'INVALID_REQUEST', 'Request must be accepted', 400
    if str(service_request.requester_id) != user_id:
        return 'FORBIDDEN', 'Only the requester can perform this action', 403
    return None, None, None


def _require_cab_requester_can_rate(service_request, user_id):
    """Ensure request is cab, requester is current user, and ride is at 'arrived at location' (accepted or completed)."""
    if not service_request:
        return 'NOT_FOUND', 'Service request not found', 404
    if service_request.request_type != 'cab':
        return 'INVALID_REQUEST', 'Not a cab request', 400
    if service_request.status not in ('accepted', 'completed'):
        return 'INVALID_REQUEST', 'Request must be at arrived-at-location stage', 400
    if str(service_request.requester_id) != user_id:
        return 'FORBIDDEN', 'Only requester can rate the driver', 403
    details = service_request.details or {}
    if not details.get('cab_arrived_at_location'):
        return 'INVALID_REQUEST', 'Must mark arrived at location before rating', 400
    return None, None, None


@bp.route('/<request_id>/cab-driver-arrived', methods=['PATCH'])
@require_auth
def cab_driver_arrived(request_id):
    """Mark that the driver has arrived (assigned driver only)."""
    try:
        user_id = get_jwt_identity()
        service_request = ServiceRequest.query.get(request_id)
        err_code, err_msg, status = _require_cab_driver(service_request, user_id)
        if err_code:
            return error_response(err_code, err_msg, None, status)
        # Reassign details so SQLAlchemy detects JSONB change
        details = dict(service_request.details or {})
        details['cab_driver_arrived'] = True
        details['dispatch_state'] = 'driver_arrived'
        details['driver_arrived_at'] = datetime.utcnow().isoformat()
        details['assigned_driver'] = RequestService._build_driver_snapshot(service_request.provider)
        service_request.details = details
        db.session.commit()
        return success_response(RequestService.serialize_request(service_request), 'Driver marked as arrived')
    except Exception as e:
        current_app.logger.error(f"Cab driver arrived error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to update', None, 500)


@bp.route('/<request_id>/cab-start-trip', methods=['PATCH'])
@require_auth
def cab_start_trip(request_id):
    """Mark that the trip has started (assigned driver only)."""
    try:
        user_id = get_jwt_identity()
        service_request = ServiceRequest.query.get(request_id)
        err_code, err_msg, status = _require_cab_driver(service_request, user_id)
        if err_code:
            return error_response(err_code, err_msg, None, status)

        details = dict(service_request.details or {})
        if not details.get('cab_driver_arrived'):
            return error_response('INVALID_REQUEST', 'Driver must arrive before starting trip', None, 400)

        details['cab_trip_started'] = True
        details['trip_started_at'] = datetime.utcnow().isoformat()
        details['dispatch_state'] = 'on_trip'
        details['assigned_driver'] = RequestService._build_driver_snapshot(service_request.provider)
        service_request.details = details
        db.session.commit()
        return success_response(RequestService.serialize_request(service_request), 'Trip started successfully')
    except Exception as e:
        current_app.logger.error(f"Cab start trip error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to update', None, 500)


@bp.route('/<request_id>/cab-arrived-at-location', methods=['PATCH'])
@require_auth
def cab_arrived_at_location(request_id):
    """Mark that the trip has ended at the dropoff location (assigned driver only)."""
    try:
        user_id = get_jwt_identity()
        service_request = ServiceRequest.query.get(request_id)
        err_code, err_msg, status = _require_cab_driver(service_request, user_id)
        if err_code:
            return error_response(err_code, err_msg, None, status)
        details = service_request.details or {}
        if not details.get('cab_driver_arrived'):
            return error_response('INVALID_REQUEST', 'Driver must be marked as arrived first', None, 400)
        details = dict(details)
        if not details.get('cab_trip_started'):
            return error_response('INVALID_REQUEST', 'Trip must be started before completing drop off', None, 400)
        details['cab_arrived_at_location'] = True
        details['dispatch_state'] = 'completed'
        details['trip_completed_at'] = datetime.utcnow().isoformat()
        details['assigned_driver'] = RequestService._build_driver_snapshot(service_request.provider)
        service_request.details = details
        service_request.status = 'completed'
        db.session.commit()
        return success_response(RequestService.serialize_request(service_request), 'Arrived at location. You can rate your driver.')
    except Exception as e:
        current_app.logger.error(f"Cab arrived at location error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to update', None, 500)


@bp.route('/<request_id>/cab-mark-no-show', methods=['POST'])
@require_auth
def cab_mark_no_show(request_id):
    """Mark driver as no-show: release request so another driver can accept (requester only)."""
    try:
        user_id = get_jwt_identity()
        service_request = ServiceRequest.query.get(request_id)
        err_code, err_msg, status = _require_cab_requester(service_request, user_id)
        if err_code:
            return error_response(err_code, err_msg, None, status)
        details = dict(service_request.details or {})
        details['cab_driver_no_show'] = True
        service_request.details = details
        service_request.status = 'pending'
        previous_driver_id = service_request.provider_id
        service_request.provider_id = None
        RequestService.refresh_cab_dispatch(service_request, declined_driver_id=previous_driver_id)
        db.session.commit()
        return success_response(RequestService.serialize_request(service_request), 'Driver marked as no-show. Request is available for another driver.')
    except Exception as e:
        current_app.logger.error(f"Cab mark no-show error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to update', None, 500)


@bp.route('/<request_id>/rate-driver', methods=['POST'])
@require_auth
def rate_driver(request_id):
    """Submit driver rating and review (requester only). Request is already completed when arrived at location."""
    try:
        user_id = get_jwt_identity()
        service_request = ServiceRequest.query.get(request_id)
        err_code, err_msg, status = _require_cab_requester_can_rate(service_request, user_id)
        if err_code:
            return error_response(err_code, err_msg, None, status)
        data = request.json or {}
        rating = data.get('rating')
        if rating is None:
            return error_response('MISSING_FIELDS', 'Rating is required', None, 400)
        try:
            rating = int(rating)
        except (TypeError, ValueError):
            rating = None
        if not (1 <= rating <= 5):
            return error_response('INVALID_REQUEST', 'Rating must be between 1 and 5', None, 400)
        review_text = (data.get('review_text') or '').strip() or None
        existing = DriverRating.query.filter_by(service_request_id=request_id).first()
        if existing:
            return error_response('INVALID_REQUEST', 'This ride has already been rated', None, 400)
        driver_id = service_request.provider_id
        if not driver_id:
            # Fallback for cases where provider_id might be stored in details (though less likely for cabs)
            pid = (service_request.details or {}).get('driver_id')
            if pid:
                try:
                    from uuid import UUID as PUUID
                    driver_id = PUUID(pid)
                except:
                    pass

        if not driver_id:
            return error_response('INVALID_REQUEST', 'No driver assigned to this ride can be rated', 400)

        driver_rating = DriverRating(
            service_request_id=request_id,
            driver_id=driver_id,
            requester_id=service_request.requester_id,
            rating=rating,
            review_text=review_text,
        )
        db.session.add(driver_rating)
        if service_request.status != 'completed':
            service_request.status = 'completed'
        db.session.commit()
        return success_response({
            'request': service_request.to_dict(),
            'rating': driver_rating.to_dict(),
        }, 'Thank you for your rating. Ride marked as completed.')
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Rate driver error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to submit rating', None, 500)


@bp.route('/<request_id>/driver-info', methods=['GET'])
@require_auth
def get_driver_info(request_id):
    """Get driver profile and rating summary for a cab request (requester only)."""
    try:
        user_id = get_jwt_identity()
        service_request = ServiceRequest.query.get(request_id)
        if not service_request:
            return error_response('NOT_FOUND', 'Service request not found', None, 404)
        if service_request.request_type != 'cab':
            return error_response('INVALID_REQUEST', 'Not a cab request', 400)
        if str(service_request.requester_id) != user_id:
            return error_response('FORBIDDEN', 'Only the requester can view driver info', 403)
        driver = service_request.provider
        if not driver:
            return error_response('INVALID_REQUEST', 'No driver assigned to this request', 400)
        pdata = driver.data or {}
        first = (pdata.get('full_name') or '').strip()
        last = (pdata.get('surname') or '').strip()
        driver_name = f"{first} {last}".strip() or 'Driver'
        # Average rating and review count for this driver
        agg = db.session.query(
            func.coalesce(func.avg(DriverRating.rating), 0),
            func.count(DriverRating.id)
        ).filter(DriverRating.driver_id == driver.id).first()
        avg_rating = round(float(agg[0]), 1) if agg and agg[0] is not None else None
        reviews_count = int(agg[1]) if agg and agg[1] is not None else 0
        return success_response({
            'driver': {
                'id': str(driver.id),
                'name': driver_name,
                'profile_image_url': driver.profile_image_url,
                'average_rating': avg_rating,
                'reviews_count': reviews_count,
            },
            'request_id': request_id,
        })
    except Exception as e:
        current_app.logger.error(f"Driver info error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to get driver info', None, 500)


@bp.route('/<request_id>/request-another-driver', methods=['POST'])
@require_auth
def request_another_driver(request_id):
    """Request a different driver: set status back to pending and clear provider (requester only)."""
    try:
        user_id = get_jwt_identity()
        service_request = ServiceRequest.query.get(request_id)
        err_code, err_msg, status = _require_cab_requester(service_request, user_id)
        if err_code:
            return error_response(err_code, err_msg, None, status)
        data = request.json or {}
        reason = (data.get('reason') or '').strip() or None
        details = dict(service_request.details or {})
        details['request_another_driver_reason'] = reason
        service_request.details = details
        service_request.status = 'pending'
        previous_driver_id = service_request.provider_id
        service_request.provider_id = None
        RequestService.refresh_cab_dispatch(service_request, declined_driver_id=previous_driver_id)
        db.session.commit()
        return success_response(RequestService.serialize_request(service_request), 'Request is now pending for another driver.')
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Request another driver error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to update', None, 500)


def _require_cab_driver(service_request, user_id):
    """Ensure request is cab and user is the driver (provider)."""
    if not service_request:
        return 'NOT_FOUND', 'Service request not found', 404
    if service_request.request_type != 'cab':
        return 'INVALID_REQUEST', 'Not a cab request', 400
    if str(service_request.provider_id) != user_id:
        return 'FORBIDDEN', 'Only the driver can perform this action', 403
    return None, None, None


@bp.route('/<request_id>/client-info', methods=['GET'])
@require_auth
def get_client_info(request_id):
    """Get client (requester) profile and rating summary for a cab request (driver only: available or their ride)."""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        service_request = ServiceRequest.query.get(request_id)
        if not service_request:
            return error_response('NOT_FOUND', 'Service request not found', None, 404)
        # Provider can view client info for: (1) their accepted/completed ride, or (2) pending request (browsing available)
        if user.role not in ('driver', 'professional', 'service-provider'):
            return error_response('FORBIDDEN', 'Only providers can view client info', 403)
        if service_request.request_type == 'cab':
            can_view_pending = user.role == 'driver' and RequestService.can_driver_view_cab_offer(service_request, user)
            if str(service_request.provider_id) != user_id and not can_view_pending:
                return error_response('FORBIDDEN', 'Only the assigned or targeted driver can view client info', 403)
        elif str(service_request.provider_id) != user_id and service_request.status != 'pending':
            return error_response('FORBIDDEN', 'Only the assigned provider can view client info', 403)
        client = service_request.requester
        if not client:
            return error_response('INVALID_REQUEST', 'No client assigned to this request', 400)
        pdata = client.data or {}
        first = (pdata.get('full_name') or '').strip()
        last = (pdata.get('surname') or '').strip()
        client_name = f"{first} {last}".strip() or 'Client'
        agg = db.session.query(
            func.coalesce(func.avg(ClientRating.rating), 0),
            func.count(ClientRating.id)
        ).filter(ClientRating.client_id == client.id).first()
        avg_rating = round(float(agg[0]), 1) if agg and agg[0] is not None else None
        reviews_count = int(agg[1]) if agg and agg[1] is not None else 0
        return success_response({
            'client': {
                'id': str(client.id),
                'name': client_name,
                'profile_image_url': client.profile_image_url,
                'average_rating': avg_rating,
                'reviews_count': reviews_count,
            },
            'request_id': request_id,
        })
    except Exception as e:
        current_app.logger.error(f"Client info error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to get client info', None, 500)


@bp.route('/<request_id>/rate-client', methods=['POST'])
@require_auth
def rate_client(request_id):
    """Provider rates the client (requester) after a completed service."""
    try:
        user_id = get_jwt_identity()
        service_request = ServiceRequest.query.get(request_id)
        if not service_request:
            return error_response('NOT_FOUND', 'Service request not found', None, 404)
        if service_request.request_type != 'cab':
            return error_response('INVALID_REQUEST', 'Not a cab request', 400)
        if str(service_request.provider_id) != user_id:
            return error_response('FORBIDDEN', 'Only the assigned provider can rate the client', 403)
        if service_request.status not in ('accepted', 'completed'):
            return error_response('INVALID_REQUEST', 'Request must be accepted or completed to rate', 400)
        existing = ClientRating.query.filter_by(service_request_id=request_id).first()
        if existing:
            return error_response('INVALID_REQUEST', 'You have already rated this client for this ride', 400)
        data = request.json or {}
        rating = data.get('rating')
        if rating is None:
            return error_response('MISSING_FIELDS', 'Rating is required', None, 400)
        try:
            rating = int(rating)
        except (TypeError, ValueError):
            rating = None
        if not (1 <= rating <= 5):
            return error_response('INVALID_REQUEST', 'Rating must be between 1 and 5', None, 400)
        review_text = (data.get('review_text') or '').strip() or None
        client_rating = ClientRating(
            service_request_id=request_id,
            client_id=service_request.requester_id,
            rater_id=user_id,
            rating=rating,
            review_text=review_text,
        )
        db.session.add(client_rating)
        db.session.commit()
        return success_response({
            'request': service_request.to_dict(),
            'rating': client_rating.to_dict(),
        }, 'Thank you for your rating.')
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Rate client error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to submit rating', None, 500)


def _require_professional_requester(service_request, user_id):
    """Ensure request is professional, accepted, and user is the requester or assigned professional."""
    if not service_request:
        return 'NOT_FOUND', 'Service request not found', 404
    if service_request.request_type != 'professional':
        return 'INVALID_REQUEST', 'Not a professional request', 400
    if service_request.status != 'accepted':
        return 'INVALID_REQUEST', 'Request must be accepted', 400
    if str(service_request.requester_id) != user_id and str(service_request.provider_id) != user_id:
        return 'FORBIDDEN', 'Only the requester or assigned professional can perform this action', 403
    return None, None, None


def _require_provider_requester(service_request, user_id):
    """Ensure request is provider, accepted, and user is the requester or assigned provider."""
    if not service_request:
        return 'NOT_FOUND', 'Service request not found', 404
    if service_request.request_type != 'provider':
        return 'INVALID_REQUEST', 'Not a service provider request', 400
    if service_request.status != 'accepted':
        return 'INVALID_REQUEST', 'Request must be accepted', 400
    if str(service_request.requester_id) != user_id and str(service_request.provider_id) != user_id:
        return 'FORBIDDEN', 'Only the requester or assigned service provider can perform this action', 403
    return None, None, None


@bp.route('/<request_id>/professional-has-arrived', methods=['PATCH'])
@require_auth
def professional_has_arrived(request_id):
    """Mark professional as arrived and complete the request (requester only)."""
    try:
        user_id = get_jwt_identity()
        service_request = ServiceRequest.query.get(request_id)
        err_code, err_msg, status = _require_professional_requester(service_request, user_id)
        if err_code:
            return error_response(err_code, err_msg, None, status)
        details = dict(service_request.details or {})
        details['professional_has_arrived'] = True
        service_request.details = details
        service_request.status = 'completed'
        db.session.commit()

        try:
            admin_fee_setting = AppSetting.query.get('professional_admin_fee_rate')
            admin_fee_rate = float(admin_fee_setting.value) if admin_fee_setting else 0.10
            net_amount = float(service_request.payment_amount or 0) * (1.0 - admin_fee_rate)
            if net_amount > 0 and service_request.provider_id:
                wallet = WalletService.get_or_create_wallet(str(service_request.provider_id))
                WalletService.add_transaction(
                    wallet_id=wallet.id,
                    user_id=str(service_request.provider_id),
                    transaction_type='earnings_transfer',
                    amount=net_amount,
                    currency='ZAR',
                    external_id=service_request.id,
                    description=f"Earnings for job {service_request.id}",
                    metadata={
                        'service_request_id': service_request.id,
                        'role': 'professional'
                    }
                )
                credited_details = dict(service_request.details or {})
                credited_details['wallet_credited'] = True
                service_request.details = credited_details
                db.session.commit()
        except Exception as wallet_err:
            current_app.logger.error(f"Wallet credit error after professional completion: {str(wallet_err)}")
        
        try:
            NotificationService.notify(
                user_id=service_request.requester_id,
                type='job_completed',
                title='Your job has been completed',
                body='Your service has been marked as completed. Please rate your experience.',
                entity_type='service_request',
                entity_id=service_request.id
            )
        except Exception as notif_err:
            current_app.logger.error(f"Notification error on job completion: {str(notif_err)}")
        
        try:
            client = User.query.get(service_request.requester_id)
            if client:
                EmailService.send_job_completed_email(client, service_request)
        except Exception as email_err:
            current_app.logger.error(f"Email error on professional completion: {str(email_err)}")
        
        return success_response(service_request.to_dict(), 'Professional has completed the job. You can rate your service.')    

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Professional has arrived error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to update', None, 500)


@bp.route('/<request_id>/professional-mark-no-show', methods=['POST'])
@require_auth
def professional_mark_no_show(request_id):
    """Mark professional as no-show: release request for another professional (requester only)."""
    try:
        user_id = get_jwt_identity()
        service_request = ServiceRequest.query.get(request_id)
        err_code, err_msg, status = _require_professional_requester(service_request, user_id)
        if err_code:
            return error_response(err_code, err_msg, None, status)
        details = dict(service_request.details or {})
        details['professional_no_show'] = True
        service_request.details = details
        service_request.status = 'pending'
        service_request.provider_id = None
        db.session.commit()

        try:
            NotificationService.notify(
                user_id=service_request.requester_id,
                type='professional_no_show',
                title='Professional has no-showed',
                body='The professional has no-showed and is available for another professional.',
                entity_type='service_request',
                entity_id=service_request.id
            )
        except Exception as notif_err:
            current_app.logger.error(f"Notification error on professional no-show: {str(notif_err)}")
        try:
            client = User.query.get(service_request.requester_id)
            if client:
                EmailService.send_provider_no_show_email(client, service_request)
        except Exception as email_err:
            current_app.logger.error(f"Email error on professional no-show: {str(email_err)}")
        return success_response(service_request.to_dict(), 'Request is now pending for another professional.')
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Professional mark no-show error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to update', None, 500)


@bp.route('/<request_id>/rate-professional', methods=['POST'])
@require_auth
def rate_professional(request_id):
    """Requester rates the professional after completed service."""
    try:
        user_id = get_jwt_identity()
        service_request = ServiceRequest.query.get(request_id)
        if not service_request:
            return error_response('NOT_FOUND', 'Service request not found', None, 404)
        if service_request.request_type != 'professional':
            return error_response('INVALID_REQUEST', 'Not a professional request', 400)
        if str(service_request.requester_id) != user_id:
            return error_response('FORBIDDEN', 'Only the requester can rate the professional', 403)
        if service_request.status not in ('pending', 'accepted', 'completed'):
            return error_response('INVALID_REQUEST', 'Request must be paid to rate', 400)
        if service_request.payment_status != 'paid':
            return error_response('INVALID_REQUEST', 'Payment must be completed before rating', 400)
        details = service_request.details or {}
        existing = ProfessionalRating.query.filter_by(service_request_id=request_id).first()
        if existing:
            return error_response('INVALID_REQUEST', 'You have already rated this professional', 400)
        data = request.json or {}
        rating = data.get('rating')
        if rating is None:
            return error_response('MISSING_FIELDS', 'Rating is required', None, 400)
        try:
            rating = int(rating)
        except (TypeError, ValueError):
            rating = None
        if not (1 <= rating <= 5):
            return error_response('INVALID_REQUEST', 'Rating must be between 1 and 5', None, 400)
        review_text = (data.get('review_text') or '').strip() or None
        prof_id = service_request.provider_id
        if not prof_id:
            # Fallback for existing requests where provider_id might be missing from direct column
            pid = details.get('professional_id') or details.get('provider_id')
            if pid:
                try:
                    from uuid import UUID as PUUID
                    prof_id = PUUID(pid)
                except:
                    pass
        
        if not prof_id:
            return error_response('INVALID_REQUEST', 'No professional associated with this request to rate', 400)

        prof_rating = ProfessionalRating(
            service_request_id=request_id,
            professional_id=prof_id,
            requester_id=user_id,
            rating=rating,
            review_text=review_text,
        )
        db.session.add(prof_rating)
        
        details_dict = dict(details)
        details_dict['professional_rating'] = rating
        details_dict['professional_review'] = review_text
        service_request.details = details_dict
        
        db.session.commit()
        return success_response({
            'request': service_request.to_dict(),
            'rating': prof_rating.to_dict(),
        }, 'Thank you for your rating.')
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Rate professional error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to submit rating', None, 500)


@bp.route('/<request_id>/provider-has-arrived', methods=['PATCH'])
@require_auth
def provider_has_arrived(request_id):
    """Mark service provider as arrived and complete the request (requester only)."""
    try:
        user_id = get_jwt_identity()
        service_request = ServiceRequest.query.get(request_id)
        err_code, err_msg, status = _require_provider_requester(service_request, user_id)
        if err_code:
            return error_response(err_code, err_msg, None, status)
        details = dict(service_request.details or {})
        details['provider_has_arrived'] = True
        service_request.details = details
        service_request.status = 'completed'
        db.session.commit()
        try:
            admin_fee_setting = AppSetting.query.get('driver_admin_fee_rate')
            admin_fee_rate = float(admin_fee_setting.value) if admin_fee_setting else 0.10
            net_amount = float(service_request.payment_amount or 0) * (1.0 - admin_fee_rate)
            if net_amount > 0 and service_request.provider_id:
                wallet = WalletService.get_or_create_wallet(str(service_request.provider_id))
                WalletService.add_transaction(
                    wallet_id=wallet.id,
                    user_id=str(service_request.provider_id),
                    transaction_type='earnings_transfer',
                    amount=net_amount,
                    currency='ZAR',
                    external_id=service_request.id,
                    description=f"Earnings for job {service_request.id}",
                    metadata={
                        'service_request_id': service_request.id,
                        'role': 'service-provider'
                    }
                )
                credited_details = dict(service_request.details or {})
                credited_details['wallet_credited'] = True
                service_request.details = credited_details
                db.session.commit()
        except Exception as wallet_err:
            current_app.logger.error(f"Wallet credit error after provider completion: {str(wallet_err)}")

        try:
            NotificationService.notify(
                user_id=service_request.requester_id,
                type='job_completed',
                title='Your job has been completed',
                body='Your service has been marked as completed. Please rate your experience.',
                entity_type='service_request',
                entity_id=service_request.id
            )
        except Exception as notif_err:
            current_app.logger.error(f"Notification error on provider completion: {str(notif_err)}")
        try:
            client = User.query.get(service_request.requester_id)
            if client:
                EmailService.send_job_completed_email(client, service_request)
        except Exception as email_err:
            current_app.logger.error(f"Email error on provider completion: {str(email_err)}")
        
        return success_response(service_request.to_dict(), 'Service provider has completed the job. You can rate your service.')
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Provider has arrived error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to update', None, 500)


@bp.route('/<request_id>/provider-mark-no-show', methods=['POST'])
@require_auth
def provider_mark_no_show(request_id):
    """Mark service provider as no-show: release request for another provider (requester only)."""
    try:
        user_id = get_jwt_identity()
        service_request = ServiceRequest.query.get(request_id)
        err_code, err_msg, status = _require_provider_requester(service_request, user_id)
        if err_code:
            return error_response(err_code, err_msg, None, status)
        details = dict(service_request.details or {})
        details['provider_no_show'] = True
        service_request.details = details
        service_request.status = 'pending'
        service_request.provider_id = None
        db.session.commit()
        try:
            NotificationService.notify(
                user_id=service_request.requester_id,
                type='provider_no_show',
                title='Provider marked as no-show',
                body='Your request is now open again for another service provider to accept.',
                entity_type='service_request',
                entity_id=service_request.id
            )
        except Exception as notif_err:
            current_app.logger.error(f"Notification error on provider no-show: {str(notif_err)}")
        try:
            client = User.query.get(service_request.requester_id)
            if client:
                EmailService.send_provider_no_show_email(client, service_request)
        except Exception as email_err:
            current_app.logger.error(f"Email error on provider no-show: {str(email_err)}")
        return success_response(service_request.to_dict(), 'Request is now pending for another service provider.')
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Provider mark no-show error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to update', None, 500)


@bp.route('/<request_id>/rate-provider', methods=['POST'])
@require_auth
def rate_provider(request_id):
    """Requester rates the service provider after completed service."""
    try:
        user_id = get_jwt_identity()
        service_request = ServiceRequest.query.get(request_id)
        if not service_request:
            return error_response('NOT_FOUND', 'Service request not found', None, 404)
        if service_request.request_type != 'provider':
            return error_response('INVALID_REQUEST', 'Not a service provider request', 400)
        if str(service_request.requester_id) != user_id:
            return error_response('FORBIDDEN', 'Only the requester can rate the service provider', 403)
        if service_request.status not in ('pending', 'accepted', 'completed'):
            return error_response('INVALID_REQUEST', 'Request must be paid to rate', 400)
        if service_request.payment_status != 'paid':
            return error_response('INVALID_REQUEST', 'Payment must be completed before rating', 400)
        details = service_request.details or {}
        existing = ProviderRating.query.filter_by(service_request_id=request_id).first()
        if existing:
            return error_response('INVALID_REQUEST', 'You have already rated this service provider', 400)
        data = request.json or {}
        rating = data.get('rating')
        if rating is None:
            return error_response('MISSING_FIELDS', 'Rating is required', None, 400)
        try:
            rating = int(rating)
        except (TypeError, ValueError):
            rating = None
        if not (1 <= rating <= 5):
            return error_response('INVALID_REQUEST', 'Rating must be between 1 and 5', None, 400)
        review_text = (data.get('review_text') or '').strip() or None
        prov_id = service_request.provider_id
        if not prov_id:
            # Fallback for existing requests where provider_id might be missing from direct column
            pid = details.get('provider_id') or details.get('professional_id')
            if pid:
                try:
                    from uuid import UUID as PUUID
                    prov_id = PUUID(pid)
                except:
                    pass
        
        if not prov_id:
            return error_response('INVALID_REQUEST', 'No provider associated with this request to rate', 400)

        prov_rating = ProviderRating(
            service_request_id=request_id,
            provider_id=prov_id,
            requester_id=user_id,
            rating=rating,
            review_text=review_text,
        )
        db.session.add(prov_rating)
        
        details_dict = dict(details)
        details_dict['provider_rating'] = rating
        details_dict['provider_review'] = review_text
        service_request.details = details_dict
        
        db.session.commit()
        return success_response({
            'request': service_request.to_dict(),
            'rating': prov_rating.to_dict(),
        }, 'Thank you for your rating.')
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Rate provider error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to submit rating', None, 500)


@bp.route('/reviews/<provider_id>', methods=['GET'])
def get_provider_reviews(provider_id):
    """Get all anonymous reviews for a provider or professional (public endpoint)."""
    try:
        from uuid import UUID as PUUID
        try:
            uid = PUUID(provider_id)
        except ValueError:
            return error_response('INVALID_ID', 'Invalid provider id', None, 400)

        prov_ratings = ProviderRating.query.filter_by(provider_id=uid).order_by(ProviderRating.created_at.desc()).all()
        prof_ratings = ProfessionalRating.query.filter_by(professional_id=uid).order_by(ProfessionalRating.created_at.desc()).all()

        def _fmt(r):
            return {
                'id': str(r.id),
                'rating': r.rating,
                'review_text': r.review_text,
                'created_at': r.created_at.isoformat() if r.created_at else None,
            }

        reviews = [_fmt(r) for r in prov_ratings] + [_fmt(r) for r in prof_ratings]
        reviews.sort(key=lambda x: x['created_at'] or '', reverse=True)

        total = len(reviews)
        avg = round(sum(r['rating'] for r in reviews) / total, 1) if total else 0

        return success_response({
            'reviews': reviews,
            'total': total,
            'average_rating': avg,
        }, 'Reviews fetched successfully')
    except Exception as e:
        current_app.logger.error(f"Get provider reviews error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to fetch reviews', None, 500)

@bp.route('/<request_id>/reject', methods=['POST'])
@require_auth
def reject_request(request_id):
    """Reject service request (provider)"""
    try:
        user_id = get_jwt_identity()
        service_request = ServiceRequest.query.get(request_id)
        
        if not service_request:
            return error_response('NOT_FOUND', 'Service request not found', None, 404)

        user = User.query.get(user_id)
        if service_request.request_type == 'cab':
            if not RequestService.can_driver_view_cab_offer(service_request, user) and (
                not service_request.provider_id or str(service_request.provider_id) != user_id
            ):
                return error_response('FORBIDDEN', 'This ride offer is not currently assigned to you', None, 403)
            service_request.status = 'pending'
            service_request.provider_id = None
            RequestService.refresh_cab_dispatch(service_request, declined_driver_id=user_id)
        else:
            # Check if user is the assigned provider or candidate
            if service_request.provider_id and str(service_request.provider_id) != user_id:
                return error_response('FORBIDDEN', 'You are not assigned to this request', None, 403)
            service_request.status = 'pending'
            service_request.provider_id = None
        db.session.commit()

        try:
            NotificationService.notify(
                user_id=service_request.requester_id,
                type='request_rejected',
                title='A provider declined your booking',
                body='Your request is still open and can be accepted by another provider.',
                entity_type='service_request',
                entity_id=service_request.id
            )
        except Exception as notif_err:
            current_app.logger.error(f"Notification error on reject: {str(notif_err)}")
        
        try:
            client = User.query.get(service_request.requester_id)
            if client:
                EmailService.send_booking_rejected_email(client, service_request)
        except Exception as email_err:
            current_app.logger.error(f"Email error on reject: {str(email_err)}")
        
        return success_response(service_request.to_dict(), 'Request rejected successfully')
        
    except Exception as e:
        current_app.logger.error(f"Reject request error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to reject request', None, 500)

@bp.route('/<request_id>/certificate', methods=['GET'])
@require_auth
def get_service_certificate(request_id):
    """Download completion certificate for a service request"""
    try:
        from flask import send_file
        from backend.services.document_service import DocumentService
        
        user_id = get_jwt_identity()
        service_request = ServiceRequest.query.get(request_id)
        
        if not service_request:
            return error_response('NOT_FOUND', 'Service request not found', None, 404)
        
        if service_request.status != 'completed':
            return error_response('INVALID_STATUS', 'Certificate only available for completed services', None, 400)
        
        # Only requester (or provider/admin) can access
        if str(service_request.requester_id) != user_id and str(service_request.provider_id) != user_id:
            requesting_user = User.query.get(user_id)
            if requesting_user.role != 'admin':
                return error_response('FORBIDDEN', 'Access denied', None, 403)
        
        req_data = service_request.to_dict()
        # Add display names for the certificate
        req_data['client_name'] = service_request.requester.to_dict()['full_name'] if service_request.requester else 'Client'
        req_data['provider_name'] = service_request.provider.to_dict()['full_name'] if service_request.provider else 'Professional'
        
        pdf_buffer = DocumentService.generate_certificate(req_data)
        return send_file(
            pdf_buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f"certificate_{request_id}.pdf"
        )
        
    except Exception as e:
        current_app.logger.error(f"Get certificate error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to generate certificate', None, 500)
