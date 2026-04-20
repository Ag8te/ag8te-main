"""
Profile Routes
"""
import os
import uuid
import json
from werkzeug.utils import secure_filename
from flask import Blueprint, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import Schema, ValidationError, fields
from backend.models import Payment, User, PendingProfileUpdate
from backend.extensions import db
from backend.utils.response import success_response, error_response
from backend.utils.decorators import require_auth
from backend.utils.auth import validate_sa_id
from backend.utils.url import get_callback_frontend_base_url
from backend.services.profile_service import ProfileService

bp = Blueprint('profile', __name__)

# Registration fee amount in cents (e.g., 10000 = R100.00)
REGISTRATION_FEE_AMOUNT = 10000  # R100.00

# After approval, only these profile fields may be changed (and require admin approval to apply)
ALLOWED_AFTER_APPROVAL_COMMON = {'phone', 'next_of_kin', 'full_name', 'surname', 'gender'}
ALLOWED_AFTER_APPROVAL_BY_ROLE = {
    'driver': {'driver_services', 'proof_of_residence_url', 'driver_license_url', 'operating_areas', 'availability'},
    'service-provider': {'provider_services', 'proof_of_residence_url', 'driver_license_url', 'operating_areas', 'availability'},
    'professional': {
        'professional_services', 'proof_of_residence_url', 'highest_qualification',
        'professional_body', 'qualification_urls', 'operating_areas', 'availability'
    },
    'client': {'full_name', 'surname', 'phone', 'gender', 'next_of_kin'},
}

class NextOfKinSchema(Schema):
    full_name = fields.Str(allow_none=True, load_default=None)
    contact_number = fields.Str(allow_none=True, load_default=None)
    contact_email = fields.Email(allow_none=True, load_default=None)


class ServiceSchema(Schema):
    """Represents a service offered by a professional or service provider."""

    name = fields.Str(required=True)
    description = fields.Str(allow_none=True, load_default=None)
    # Hourly rate is mainly for professionals; optional for service providers.
    hourly_rate = fields.Float(allow_none=True, load_default=None)


class DriverServiceSchema(Schema):
    """Represents a driver's car/service offering."""

    car_make = fields.Str(required=True)
    car_model = fields.Str(required=True)
    car_year = fields.Int(allow_none=True, load_default=None)
    registration_number = fields.Str(allow_none=True, load_default=None)
    car_type = fields.Str(required=True)  # standard, premium, suv; pricing is admin-configured


class UpdateProfileSchema(Schema):
    full_name = fields.Str(allow_none=True, load_default=None)
    surname = fields.Str(allow_none=True, load_default=None)
    first_name = fields.Str(allow_none=True, load_default=None)
    last_name = fields.Str(allow_none=True, load_default=None)
    phone = fields.Str(allow_none=True, load_default=None)
    gender = fields.Str(allow_none=True, load_default=None)
    sa_citizen = fields.Bool(allow_none=True, load_default=False)
    sa_id = fields.Str(allow_none=True, load_default=None)
    next_of_kin = fields.Nested(NextOfKinSchema, allow_none=True, load_default=None)
    # Professional metadata
    highest_qualification = fields.Str(allow_none=True, load_default=None)
    professional_body = fields.Str(allow_none=True, load_default=None)
    operating_areas = fields.List(fields.Str(), allow_none=True, load_default=None)
    availability = fields.Dict(allow_none=True, load_default=None)
    # Role-specific fields
    professional_services = fields.List(fields.Nested(ServiceSchema), allow_none=True, load_default=None)
    provider_services = fields.List(fields.Nested(ServiceSchema), allow_none=True, load_default=None)
    driver_services = fields.List(fields.Nested(DriverServiceSchema), allow_none=True, load_default=None)

@bp.route('', methods=['GET'])
@require_auth
def get_profile():
    try:
        user_id = get_jwt_identity()
        profile_info, error = ProfileService.get_profile_info(user_id)
        
        if error:
            return error_response(error, 'Failed to get profile', None, 404 if error == 'USER_NOT_FOUND' else 500)
            
        return success_response(profile_info)
        
    except Exception as e:
        current_app.logger.error(f"Get profile error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to get profile', None, 500)

def allowed_file(filename):
    """Check if file extension is allowed"""
    ALLOWED_EXTENSIONS = {'pdf', 'jpg', 'jpeg', 'png'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def allowed_image_file(filename):
    """Check if file is an allowed image for profile photo"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'jpg', 'jpeg', 'png'}

@bp.route('', methods=['PATCH'])
@require_auth
def update_profile():
    try:
        user_id = get_jwt_identity()
        schema = UpdateProfileSchema()
        
        # Parse data depending on content type
        if request.content_type and 'multipart/form-data' in request.content_type:
            # Simple wrapper for form parsing logic if it was in service, 
            # but usually route handles the request object parsing.
            # Keeping parsing here for now but could move to service if preferred.
            request_data = ProfileService._parse_form_request(request) # I'll add this helper to service
        else:
            request_data = request.json or {}
            
        # Basic validation with Marshmallow
    
        data = schema.load(request_data, partial=True)
        data = {k: v for k, v in data.items() if v is not None}
        
        result, error = ProfileService.handle_profile_update(user_id, data, request.files)
        if error:
            status_code = 403 if error == "NOT_APPROVED" else 400
            if error == "INTERNAL_ERROR": status_code = 500
            return error_response(error, 'Failed to update profile', None, status_code)
            
        return success_response(result, 'Profile update processed successfully')
        
    except ValidationError as e:
        current_app.logger.error(f"Validation error: {e.messages}")
        return error_response('VALIDATION_ERROR', 'Invalid input data', e.messages, 400)
    except Exception as e:
        current_app.logger.error(f"Update profile error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to update profile', None, 500)


@bp.route('/upload-photo', methods=['POST'])
@require_auth
def upload_profile_photo():
    try:
        user_id = get_jwt_identity()
        if 'photo' not in request.files:
            return error_response('MISSING_FILES', 'No photo provided', None, 400)

        photo_url, error = ProfileService.upload_photo(user_id, request.files['photo'])
        if error:
            return error_response(error, 'Failed to upload photo', None, 400)
            
        return success_response({'profile_image_url': photo_url}, 'Profile photo updated successfully')

    except Exception as e:
        current_app.logger.error(f"Upload photo error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to upload photo', None, 500)


@bp.route('/professionals', methods=['GET'])
def list_professionals():
    """
    List professionals, including their services and hourly rates.

    Query params:
      - search: filter by service name/description (case-insensitive, contains)
      - order_by: 'rate' to sort by minimum hourly_rate across services
      - direction: 'asc' (default) or 'desc'
    """
    try:
        search = (request.args.get('search') or '').strip().lower()
        order_by = request.args.get('order_by')
        direction = request.args.get('direction', 'asc').lower()

        # Base query: active, approved, paid professionals
        query = User.query.filter_by(role='professional', is_active=True, is_approved=True, is_paid=True)
        professionals = query.all()

        results = []
        for prof in professionals:
            services = (prof.data or {}).get('professional_services') or []

            # Optionally filter by search text against service name/description
            filtered_services = []
            for svc in services:
                name = (svc.get('name') or '').lower()
                desc = (svc.get('description') or '').lower()
                if not search or search in name or search in desc:
                    filtered_services.append(svc)

            if not filtered_services:
                # Skip professionals without matching services
                if search:
                    continue

            # Compute minimum hourly rate across services (if any)
            min_rate = None
            for svc in filtered_services:
                try:
                    rate = svc.get('hourly_rate')
                    if rate is None:
                        continue
                    rate_val = float(rate)
                    if min_rate is None or rate_val < min_rate:
                        min_rate = rate_val
                except (TypeError, ValueError):
                    continue

            results.append(
                {
                    'professional': prof.to_dict(),
                    'services': filtered_services,
                    'min_hourly_rate': min_rate,
                }
            )

        # Sort by minimum hourly rate if requested
        if order_by == 'rate':
            reverse = direction == 'desc'

            def sort_key(item):
                # Place professionals without a rate at the end
                return (item['min_hourly_rate'] is None, item['min_hourly_rate'] or 0.0)

            results.sort(key=sort_key, reverse=reverse)

        return success_response({'professionals': results})

    except Exception as e:
        current_app.logger.error(f"List professionals error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to list professionals', None, 500)

@bp.route('/professional/<uuid:prof_id>', methods=['GET'])
def get_professional(prof_id):
    """Get details of a single professional"""
    try:
        prof = User.query.filter_by(id=prof_id, role='professional', is_active=True, is_approved=True, is_paid=True).first()
        if not prof:
            return error_response('NOT_FOUND', 'Professional not found', None, 404)
        
        services = (prof.data or {}).get('professional_services') or []
        
        # Compute minimum hourly rate
        min_rate = None
        for svc in services:
            try:
                rate = svc.get('hourly_rate')
                if rate is not None:
                    rate_val = float(rate)
                    if min_rate is None or rate_val < min_rate:
                        min_rate = rate_val
            except (TypeError, ValueError):
                continue

        return success_response({
            'professional': prof.to_dict(),
            'services': services,
            'min_hourly_rate': min_rate
        })
    except Exception as e:
        current_app.logger.error(f"Get professional error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to get professional', None, 500)

@bp.route('/service-providers', methods=['GET'])
def list_service_providers():
    """
    List service providers, including their services.
    Query params:
      - search: filter by service name/description (case-insensitive, contains)
    """
    try:
        search = (request.args.get('search') or '').strip().lower()

        # Base query: active, approved, paid service providers
        query = User.query.filter_by(role='service-provider', is_active=True, is_approved=True, is_paid=True)
        providers = query.all()

        results = []
        for provider in providers:
            services = (provider.data or {}).get('provider_services') or []

            # Optionally filter by search text against service name/description
            filtered_services = []
            for svc in services:
                name = (svc.get('name') or '').lower()
                desc = (svc.get('description') or '').lower()
                if not search or search in name or search in desc:
                    filtered_services.append(svc)

            if not filtered_services:
                # Skip providers without matching services
                if search:
                    continue

            results.append(
                {
                    'provider': provider.to_dict(),
                    'services': filtered_services,
                }
            )

        return success_response({'service_providers': results})

    except Exception as e:
        current_app.logger.error(f"List service providers error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to list service providers', None, 500)

@bp.route('/service-provider/<uuid:provider_id>', methods=['GET'])
def get_service_provider(provider_id):
    """Get details of a single service provider"""
    try:
        provider = User.query.filter_by(id=provider_id, role='service-provider', is_active=True, is_approved=True, is_paid=True).first()
        if not provider:
            return error_response('NOT_FOUND', 'Service provider not found', None, 404)
        
        services = (provider.data or {}).get('provider_services') or []
        
        return success_response({
            'provider': provider.to_dict(),
            'services': services
        })
    except Exception as e:
        current_app.logger.error(f"Get service provider error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to get service provider', None, 500)

@bp.route('/pay-registration-fee', methods=['POST'])
@require_auth
def pay_registration_fee():
    try:
        data = request.json or {}
        user_id = get_jwt_identity()
        provider = data.get('provider', 'paypal')
        
        checkout, error = ProfileService.initiate_registration_payment(user_id, provider)
        if error:
            return error_response(error, 'Failed to create checkout', None, 400)
            
        return success_response(checkout)
        
    except ValueError as e:
        return error_response('INVALID_REQUEST', str(e), None, 400)
    except Exception as e:
        current_app.logger.error(f"Pay registration fee error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to create checkout', None, 500)

@bp.route('/payment-callback', methods=['GET'])
def payment_callback():
    try:
        external_id = request.args.get('external_id')
        frontend_url = get_callback_frontend_base_url()
        
        success, error = ProfileService.handle_payment_callback(external_id)
        
        if success:
            return current_app.make_response((
                f'<html><body><script>window.location.href="{frontend_url}/profile?payment=success";</script></body></html>',
                302
            ))
        else:
            return current_app.make_response((
                f'<html><body><script>window.location.href="{frontend_url}/profile?payment=error&reason=' + (error or 'unknown') + '";</script></body></html>',
                302
            ))
            
    except Exception as e:
        current_app.logger.error(f"Payment callback error: {str(e)}")
        frontend_url = get_callback_frontend_base_url()
        return current_app.make_response((
            f'<html><body><script>window.location.href="{frontend_url}/profile?payment=error";</script></body></html>',
            302
        ))
        
    except Exception as e:
        current_app.logger.error(f"Payment callback error: {str(e)}")
        frontend_url = get_callback_frontend_base_url()
        return current_app.make_response((
            f'<html><body><script>window.location.href="{frontend_url}/profile?payment=error";</script></body></html>',
            302
        ))
