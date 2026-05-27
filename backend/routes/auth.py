"""
Authentication Routes
"""
import json
import logging
import os
import uuid

from flask import Blueprint, request, current_app, jsonify
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required
from google.oauth2 import id_token
from google.auth.transport.requests import Request
from marshmallow import Schema, fields, ValidationError, validate

from backend.models import User, PasswordResetToken, EmailVerificationToken, Country, ServiceType, UserSelectedService, Agent, VehicleImage, Subscription, SubscriptionPlan
from backend.extensions import db
from backend.utils.response import success_response, error_response
from backend.utils.auth import create_password_reset_token, create_email_verification_token, generate_tracking_number, validate_sa_id
from backend.services.email_service import EmailService
from backend.services.wallet_service import WalletService
from backend.services.payment_service import PaymentService
from backend.services.agent_service import AgentService
from backend.services.auth_service import AuthService
from backend.services.otp_service import OtpService, SENSITIVE_SMS_PURPOSES
from backend.utils.url import (
    append_query_params,
    get_callback_frontend_return_url,
    get_public_backend_base_url,
    get_request_frontend_base_url,
)

bp = Blueprint('auth', __name__)
logger = logging.getLogger(__name__)

REGISTRATION_FEE_AMOUNT = 10000  # R100.00 in cents


def _create_registration_checkout_for_user(user, provider='yoco'):
    """Create a one-time Yoco checkout for non-client registration."""
    if user.role == 'client':
        raise ValueError("Clients do not require registration payment.")

    provider_name = (provider or 'yoco').strip().lower()
    if provider_name != 'yoco':
        raise ValueError("Registration payments are processed with Yoco only.")

    user_id_hex = str(user.id).replace('-', '')
    external_id = f"reg_fee_{user_id_hex}_{uuid.uuid4().hex[:8]}"

    backend_url = get_public_backend_base_url()
    frontend_url = get_request_frontend_base_url()
    success_url = f"{backend_url}/api/auth/registration-callback?callback_status=success&external_id={external_id}&provider=yoco&frontend_url={frontend_url}"
    cancel_url = f"{backend_url}/api/auth/registration-callback?callback_status=cancel&external_id={external_id}&provider=yoco&frontend_url={frontend_url}"
    failure_url = f"{backend_url}/api/auth/registration-callback?callback_status=failure&external_id={external_id}&provider=yoco&frontend_url={frontend_url}"

    checkout_result = PaymentService.create_checkout(
        amount=REGISTRATION_FEE_AMOUNT,
        currency='ZAR',
        external_id=external_id,
        success_url=success_url,
        cancel_url=cancel_url,
        failure_url=failure_url,
        provider='yoco'
    )

    return {
        'redirect_url': checkout_result['redirect_url'],
        'checkout_id': checkout_result['checkout_id'],
        'external_id': external_id
    }

# Validation Schemas
class RegisterSchema(Schema):
    email = fields.Email(required=True)
    password = fields.Str(required=True, validate=validate.Length(min=8))
    role = fields.Str(required=True, validate=validate.OneOf(['client', 'driver', 'professional', 'service-provider']))
    full_name = fields.Str()
    phone = fields.Str()

class LoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.Str(required=True)
    role = fields.Str(required=True, validate=validate.OneOf(['client', 'driver', 'professional', 'service-provider', 'agent']))

class ForgotPasswordSchema(Schema):
    email = fields.Email(required=True)
    role = fields.Str(validate=validate.OneOf(['client', 'driver', 'professional', 'service-provider']))

class ResetPasswordSchema(Schema):
    token = fields.Str(required=True)
    password = fields.Str(required=True, validate=validate.Length(min=8))

class VerifyEmailSchema(Schema):
    token = fields.Str(required=True)

class VerifyLoginOtpSchema(Schema):
    challenge_id = fields.Str(required=True)
    code = fields.Str(required=True, validate=validate.Length(equal=6))

class ResendLoginOtpSchema(Schema):
    challenge_id = fields.Str(required=True)

class VerifySensitiveSmsSchema(Schema):
    purpose = fields.Str(required=True, validate=validate.OneOf(sorted(SENSITIVE_SMS_PURPOSES)))
    firebase_id_token = fields.Str(required=True)

class VerifyPasswordResetSmsSchema(Schema):
    email = fields.Email(required=True)
    firebase_id_token = fields.Str(required=True)
    role = fields.Str(validate=validate.OneOf(['client', 'driver', 'professional', 'service-provider', 'agent']))

class ResendVerificationSchema(Schema):
    email = fields.Email(required=True)
    role = fields.Str(required=True, validate=validate.OneOf(['client', 'driver', 'professional', 'service-provider', 'agent']))

@bp.route('/register', methods=['POST'])
def register():
    """User registration endpoint"""
    try:
        logger.info("register: request received")
        schema = RegisterSchema()
        data = schema.load(request.json)
        
        user, error = AuthService.register_user(
            email=data['email'],
            password=data['password'],
            role=data['role'],
            full_name=data.get('full_name'),
            phone=data.get('phone')
        )
        
        if error == "USER_EXISTS":
            return error_response('USER_EXISTS', 'An account with this email and role already exists', None, 400)
        
        # Generate JWT token
        access_token = create_access_token(identity=str(user.id))
        
        return success_response({
            'user': user.to_dict(),
            'token': access_token
        }, 'User registered successfully', 201)
    except ValidationError as e:
        return error_response('VALIDATION_ERROR', 'Invalid input data', e.messages, 400)
    except Exception as e:
        logger.exception("register: failed")
        return error_response('INTERNAL_ERROR', 'Registration failed', None, 500)

@bp.route('/login', methods=['POST'])
def login():
    """User login endpoint"""
    try:
        logger.info("login: request received")
        schema = LoginSchema()
        data = schema.load(request.json)
        
        user, error = AuthService.login_user(
            email=data['email'],
            password=data['password'],
            role=data['role']
        )
        
        if error == "INVALID_CREDENTIALS":
            return error_response('INVALID_CREDENTIALS', 'Invalid email, password, or role combination', None, 401)
        if error == "ACCOUNT_INACTIVE":
            return error_response('ACCOUNT_INACTIVE', 'Account is inactive', None, 403)
        if error == "PAYMENT_REQUIRED":
            checkout_result = _create_registration_checkout_for_user(user, provider='yoco')
            return success_response({
                'user': user.to_dict(),
                **checkout_result,
                'payment_required': True,
                'message': 'Registration payment is still pending. Redirecting to Yoco.'
            }, 'Registration payment required.', 200)
        challenge = OtpService.create_email_login_challenge(user)
        return success_response({
            'user': user.to_dict(),
            'otp_required': True,
            'challenge_id': str(challenge.id),
            'channel': 'email',
            'expires_at': challenge.expires_at.isoformat() if challenge.expires_at else None
        }, 'Login OTP sent')
    except ValidationError as e:
        return error_response('VALIDATION_ERROR', 'Invalid input data', e.messages, 400)
    except Exception as e:
        logger.exception("login: failed")
        return error_response('INTERNAL_ERROR', 'Login failed', None, 500)


@bp.route('/verify-login-otp', methods=['POST'])
def verify_login_otp():
    """Verify email OTP after password login and issue the session JWT."""
    try:
        schema = VerifyLoginOtpSchema()
        data = schema.load(request.json)
        challenge, error = OtpService.verify_email_challenge(data['challenge_id'], data['code'], purpose='login')

        if error == "OTP_EXPIRED":
            return error_response('OTP_EXPIRED', 'The verification code has expired. Please request a new code.', None, 400)
        if error:
            return error_response('INVALID_OTP', 'Invalid verification code', None, 400)

        user = challenge.user
        if not user or not user.is_active:
            return error_response('ACCOUNT_INACTIVE', 'Account is inactive', None, 403)

        access_token = create_access_token(identity=str(user.id))
        return success_response({
            'user': user.to_dict(),
            'token': access_token
        }, 'Login successful')
    except ValidationError as e:
        return error_response('VALIDATION_ERROR', 'Invalid input data', e.messages, 400)
    except Exception:
        logger.exception("verify_login_otp: failed")
        return error_response('INTERNAL_ERROR', 'Failed to verify login code', None, 500)


@bp.route('/resend-login-otp', methods=['POST'])
def resend_login_otp():
    """Resend a login OTP for an existing login challenge."""
    try:
        schema = ResendLoginOtpSchema()
        data = schema.load(request.json)
        from backend.models import OtpChallenge
        challenge = OtpChallenge.query.get(data['challenge_id'])
        if not challenge or challenge.purpose != 'login' or challenge.channel != 'email' or not challenge.user:
            return error_response('INVALID_OTP', 'Invalid login challenge', None, 400)
        if challenge.used:
            return error_response('INVALID_OTP', 'This login challenge has already been used', None, 400)

        new_challenge = OtpService.create_email_login_challenge(challenge.user)
        return success_response({
            'challenge_id': str(new_challenge.id),
            'channel': 'email',
            'expires_at': new_challenge.expires_at.isoformat() if new_challenge.expires_at else None
        }, 'Login OTP resent')
    except ValidationError as e:
        return error_response('VALIDATION_ERROR', 'Invalid input data', e.messages, 400)
    except Exception:
        logger.exception("resend_login_otp: failed")
        return error_response('INTERNAL_ERROR', 'Failed to resend login code', None, 500)


@bp.route('/verify-sensitive-sms', methods=['POST'])
@jwt_required()
def verify_sensitive_sms():
    """Verify Firebase phone OTP for sensitive authenticated actions."""
    try:
        schema = VerifySensitiveSmsSchema()
        data = schema.load(request.json)
        user = User.query.get(get_jwt_identity())
        if not user:
            return error_response('USER_NOT_FOUND', 'User not found', None, 404)

        claims, error = OtpService.verify_firebase_phone_token(
            data['firebase_id_token'],
            expected_phone=OtpService.user_phone(user)
        )
        if error:
            return error_response(error, 'SMS verification failed', None, 400)

        verification, error = OtpService.record_sms_verification(user, data['purpose'], claims)
        if error:
            return error_response(error, 'Invalid SMS verification purpose', None, 400)

        return success_response({
            'verification_id': str(verification.id),
            'purpose': verification.purpose,
            'channel': 'sms',
            'verified_at': verification.verified_at.isoformat() if verification.verified_at else None
        }, 'SMS verification successful')
    except ValidationError as e:
        return error_response('VALIDATION_ERROR', 'Invalid input data', e.messages, 400)
    except Exception:
        logger.exception("verify_sensitive_sms: failed")
        return error_response('INTERNAL_ERROR', 'Failed to verify SMS code', None, 500)


@bp.route('/verify-password-reset-sms', methods=['POST'])
def verify_password_reset_sms():
    """Verify Firebase phone OTP and issue a password reset token."""
    try:
        schema = VerifyPasswordResetSmsSchema()
        data = schema.load(request.json)
        if data.get('role'):
            user = User.query.filter_by(email=data['email'], role=data['role']).first()
        else:
            user = User.query.filter_by(email=data['email']).first()

        if not user:
            return error_response('INVALID_CREDENTIALS', 'Unable to verify this account', None, 400)

        claims, error = OtpService.verify_firebase_phone_token(
            data['firebase_id_token'],
            expected_phone=OtpService.user_phone(user)
        )
        if error:
            return error_response(error, 'SMS verification failed', None, 400)

        OtpService.record_sms_verification(user, 'password_reset', claims)
        token = create_password_reset_token(user.id)
        return success_response({'token': token}, 'SMS verified. You can now reset your password.')
    except ValidationError as e:
        return error_response('VALIDATION_ERROR', 'Invalid input data', e.messages, 400)
    except Exception:
        logger.exception("verify_password_reset_sms: failed")
        return error_response('INTERNAL_ERROR', 'Failed to verify password reset SMS', None, 500)

@bp.route('/google-login', methods=['POST'])
def google_login():
    """Google OAuth login endpoint"""
    try:
        logger.info("google_login: request received")
        data = request.json
        token = data.get('token')
        role = data.get('role', 'client')

        if not token:
            return error_response('MISSING_TOKEN', 'Google token is required', None, 400)

        # Verify Google Token
        client_id = current_app.config.get('GOOGLE_CLIENT_ID')
        if not client_id:
            logger.error("google_login: GOOGLE_CLIENT_ID not configured")
            return error_response('CONFIG_ERROR', 'Google Client ID not configured', None, 500)

        try:
            idinfo = id_token.verify_oauth2_token(token, Request(), client_id)
            
            # ID token is valid. Get user's Google ID and email.
            google_id = idinfo['sub']
            email = idinfo['email']
            name = idinfo.get('name', '')
            
            # Check if user exists
            user = User.query.filter_by(email=email, role=role).first()
            
            if not user:
                # Create new user
                logger.info("google_login: creating new user email=%s role=%s", email, role)
                user = User(
                    email=email,
                    role=role,
                    is_admin=False,
                    is_paid=True, # Google users are often considered verified
                    is_approved=True,
                    is_active=True,
                    email_verified=True,
                    tracking_number=generate_tracking_number()
                )
                # Set a dummy password for Google users to satisfy non-nullable constraint
                user.set_password(str(uuid.uuid4()))
                user.data = {
                    'full_name': name,
                    'google_id': google_id,
                    'registration_method': 'google'
                }
                db.session.add(user)
                db.session.commit()
                
                # Create wallet
                WalletService.get_or_create_wallet(user.id)
            
            # Login successful
            access_token = create_access_token(identity=str(user.id))
            logger.info("google_login: success user_id=%s", user.id)
            
            return success_response({
                'user': user.to_dict(),
                'token': access_token
            }, 'Google login successful')

        except ValueError:
            # Invalid token
            logger.warning("google_login: invalid token")
            return error_response('INVALID_TOKEN', 'Invalid Google token', None, 401)

    except Exception as e:
        logger.exception("google_login: failed")
        return error_response('INTERNAL_ERROR', 'Google login failed', None, 500)

class AdminLoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.Str(required=True)


@bp.route('/admin-login', methods=['POST'])
def admin_login():
    """Admin login endpoint. Role is assumed to be admin. Only email and password required."""
    try:
        logger.info("admin_login: request received")
        schema = AdminLoginSchema()
        data = schema.load(request.json)
        user = User.query.filter_by(email=data['email'], role='admin').first()
        if not user or not user.check_password(data['password']):
            logger.warning("admin_login: invalid credentials")
            return error_response('INVALID_CREDENTIALS', 'Invalid email or password', None, 401)
        if not user.is_active:
            logger.warning("admin_login: account inactive user_id=%s", user.id)
            return error_response('ACCOUNT_INACTIVE', 'Account is inactive', None, 403)
        if not user.is_admin:
            logger.warning("admin_login: not admin user_id=%s", user.id)
            return error_response('FORBIDDEN', 'Not an admin account', None, 403)
        access_token = create_access_token(identity=str(user.id))
        logger.info("admin_login: success user_id=%s", user.id)
        return success_response({
            'user': user.to_dict(),
            'token': access_token
        }, 'Admin login successful')
    except ValidationError as e:
        logger.warning("admin_login: validation error %s", e.messages)
        return error_response('VALIDATION_ERROR', 'Invalid input data', e.messages, 400)
    except Exception as e:
        logger.exception("admin_login: failed")
        return error_response('INTERNAL_ERROR', 'Login failed', None, 500)


@bp.route('/roles-for-email', methods=['GET'])
def roles_for_email():
    """Return roles that have accounts for the given email. Used by login form to show role options."""
    try:
        email = request.args.get('email', '').strip().lower()
        if not email:
            return success_response({'roles': []})
        users = User.query.filter_by(email=email).all()
        roles = sorted(set(u.role for u in users if u.role and u.role != 'admin'))
        return success_response({'roles': roles})
    except Exception as e:
        logger.warning("roles_for_email: %s", e)
        return success_response({'roles': []})

@bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """User logout endpoint"""
    # With JWT, logout is handled client-side by removing the token
    # This endpoint exists for consistency and can be used for token blacklisting in the future
    return success_response(None, 'Logged out successfully')

@bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Request password reset endpoint"""
    try:
        logger.info("forgot_password: request received")
        schema = ForgotPasswordSchema()
        data = schema.load(request.json)
        if data.get('role'):
            user = User.query.filter_by(email=data['email'], role=data['role']).first()
        else:
            user = User.query.filter_by(email=data['email']).first()
        
        if user:
            # Generate password reset token
            token = create_password_reset_token(user.id)
            
            # Queue password reset email
            try:
                EmailService.send_password_reset_email(user, token)
            except Exception as e:
                logger.warning("forgot_password: failed to send reset email: %s", e)
        
        return success_response(None, 'If the email exists, a password reset link has been sent')
    except ValidationError as e:
        logger.warning("forgot_password: validation error %s", e.messages)
        return error_response('VALIDATION_ERROR', 'Invalid input data', e.messages, 400)
    except Exception as e:
        logger.exception("forgot_password: failed")
        return error_response('INTERNAL_ERROR', 'Failed to process request', None, 500)

@bp.route('/reset-password', methods=['POST'])
def reset_password():
    """Reset password with token endpoint"""
    try:
        logger.info("reset_password: request received")
        schema = ResetPasswordSchema()
        data = schema.load(request.json)
        token = PasswordResetToken.query.filter_by(token=data['token']).first()
        if not token or not token.is_valid():
            logger.warning("reset_password: invalid or expired token")
            return error_response('INVALID_TOKEN', 'Invalid or expired reset token', None, 400)
        user = token.user
        user.set_password(data['password'])
        token.used = True
        db.session.commit()
        logger.info("reset_password: success user_id=%s", user.id)
        return success_response(None, 'Password reset successfully')
    except ValidationError as e:
        logger.warning("reset_password: validation error %s", e.messages)
        return error_response('VALIDATION_ERROR', 'Invalid input data', e.messages, 400)
    except Exception as e:
        logger.exception("reset_password: failed")
        return error_response('INTERNAL_ERROR', 'Failed to reset password', None, 500)

@bp.route('/verify-email', methods=['POST'])
def verify_email():
    """Verify email with token endpoint"""
    try:
        logger.info("verify_email: request received")
        schema = VerifyEmailSchema()
        data = schema.load(request.json)
        token = EmailVerificationToken.query.filter_by(token=data['token']).first()
        if not token or not token.is_valid():
            logger.warning("verify_email: invalid or expired token")
            return error_response('INVALID_TOKEN', 'Invalid or expired verification token', None, 400)
        user = token.user
        user.email_verified = True
        token.used = True
        db.session.commit()
        
        # Generate JWT token for immediate payment or login
        access_token = create_access_token(identity=str(user.id))
        
        logger.info("verify_email: success user_id=%s", user.id)
        return success_response({
            'user': user.to_dict(),
            'token': access_token
        }, 'Email verified successfully')
    except ValidationError as e:
        logger.warning("verify_email: validation error %s", e.messages)
        return error_response('VALIDATION_ERROR', 'Invalid input data', e.messages, 400)
    except Exception as e:
        logger.exception("verify_email: failed")
        return error_response('INTERNAL_ERROR', 'Failed to verify email', None, 500)

@bp.route('/initiate-registration-payment', methods=['POST'])
@jwt_required()
def initiate_registration_payment():
    """Initiate registration payment for a user whose account is still unpaid."""
    try:
        data = request.json or {}
        provider = data.get('provider', 'yoco')
        
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user:
            return error_response('USER_NOT_FOUND', 'User not found', None, 404)

        if user.role == 'client':
            return error_response('PAYMENT_NOT_REQUIRED', 'Clients do not pay a registration fee.', None, 400)
            
        if user.is_paid:
            return error_response('ALREADY_PAID', 'Registration fee already paid', None, 400)

        checkout_result = _create_registration_checkout_for_user(user, provider=provider)

        logger.info("initiate_registration_payment: success user_id=%s external_id=%s", user.id, checkout_result['external_id'])
        return success_response(checkout_result)
    except Exception as e:
        logger.exception("initiate_registration_payment: failed")
        return error_response('INTERNAL_ERROR', 'Failed to initiate payment', None, 500)

@bp.route('/resend-verification', methods=['POST'])
def resend_verification():
    """Resend email verification token"""
    try:
        logger.info("resend_verification: request received")
        schema = ResendVerificationSchema()
        data = schema.load(request.json)
        user = User.query.filter_by(email=data['email'], role=data['role']).first()
        
        if not user:
            # Return success to prevent enumeration
            return success_response(None, 'If the account exists, a verification email has been sent')
            
        if user.email_verified:
            return success_response(None, 'Email is already verified')
            
        # Create new verification token
        token = create_email_verification_token(user.id)
        
        # Queue verification email
        try:
            EmailService.send_verification_email(user, token)
        except Exception as e:
            logger.warning("resend_verification: failed to send email: %s", e)
            
        return success_response(None, 'Verification email has been resent')
    except ValidationError as e:
        logger.warning("resend_verification: validation error %s", e.messages)
        return error_response('VALIDATION_ERROR', 'Invalid input data', e.messages, 400)
    except Exception as e:
        logger.exception("resend_verification: failed")
        return error_response('INTERNAL_ERROR', 'Failed to resend verification email', None, 500)

@bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current user endpoint"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user:
            logger.warning("get_current_user: user not found user_id=%s", user_id)
            return error_response('USER_NOT_FOUND', 'User not found', None, 404)
        return success_response(user.to_dict())
    except Exception as e:
        logger.exception("get_current_user: failed")
        return error_response('INTERNAL_ERROR', 'Failed to get user', None, 500)

@bp.route('/agents', methods=['GET'])
def list_agents():
    """List agents for registration dropdown (displays agent_id)."""
    try:
        agents = Agent.query.order_by(Agent.agent_id).all()
        return success_response([a.to_dict() for a in agents])
    except Exception as e:
        logger.exception("list_agents: failed")
        return error_response('INTERNAL_ERROR', 'Failed to list agents', None, 500)


@bp.route('/register-with-payment', methods=['POST'])
def register_with_payment():
    """Registration flow: clients complete immediately, other roles pay via Yoco."""
    try:
        logger.info("register_with_payment: request received")
        registration_data_str = request.form.get('registration_data')
        if not registration_data_str:
            return error_response('MISSING_DATA', 'Registration data is required', None, 400)
        
        registration_data = json.loads(registration_data_str)
        
        # Delegate to AuthService for complex registration logic
        user, error = AuthService.register_with_payment_logic(registration_data, request.files)
        
        if error == "USER_EXISTS":
            return error_response('USER_EXISTS', 'An account with this email and role already exists', None, 400)
        if error == "EXISTING_UNPAID_USER":
            checkout_result = _create_registration_checkout_for_user(user, provider='yoco')
            return success_response({
                'user': user.to_dict(),
                **checkout_result,
                'message': 'Your registration already exists and payment is still pending. Redirecting to Yoco.'
            }, 'Existing unpaid registration found. Redirecting to payment.', 200)
        if error == "INVALID_AGENT":
            return error_response('INVALID_FIELDS', 'Invalid agent code format.', None, 400)
        if error:
            return error_response('REGISTRATION_FAILED', error, None, 400)

        if user.role == 'client':
            access_token = create_access_token(identity=str(user.id))
            return success_response({
                'user': user.to_dict(),
                'token': access_token,
                'message': 'Registration completed successfully.'
            }, 'Registration completed successfully.', 201)

        checkout_result = _create_registration_checkout_for_user(user, provider='yoco')
        return success_response({
            'user': user.to_dict(),
            **checkout_result,
            'message': 'Registration details captured. Continue to Yoco to complete payment.'
        }, 'Registration created. Redirecting to payment.', 201)
    except json.JSONDecodeError:
        return error_response('INVALID_DATA', 'Invalid registration data format', None, 400)
    except Exception as e:
        db.session.rollback()
        logger.exception("register_with_payment: failed")
        return error_response('INTERNAL_ERROR', 'Registration failed', None, 500)

@bp.route('/complete-registration', methods=['POST'])
def complete_registration():
    """Complete registration after successful payment"""
    try:
        logger.info("complete_registration: request received")
        data = request.json
        external_id = data.get('external_id')
        
        user, error = AuthService.complete_registration(external_id)
        
        if error == "PAYMENT_NOT_FOUND":
            return error_response('PAYMENT_NOT_FOUND', 'Payment not found', None, 404)
        if error == "PAYMENT_INCOMPLETE":
            return error_response('PAYMENT_NOT_COMPLETED', 'Payment not completed', None, 400)
        if error:
            return error_response('REGISTRATION_FAILED', error, None, 400)
            
        access_token = create_access_token(identity=str(user.id))
        return success_response({
            'user': user.to_dict(),
            'token': access_token
        }, 'Registration completed successfully')
    except Exception as e:
        db.session.rollback()
        logger.exception("complete_registration: failed")
        return error_response('INTERNAL_ERROR', 'Failed to complete registration', None, 500)

@bp.route('/countries', methods=['GET'])
def get_countries():
    """Get all active countries"""
    try:
        countries = Country.query.filter_by(is_active=True).order_by(Country.name.asc()).all()
        return success_response({
            'countries': [c.to_dict() for c in countries]
        })
    except Exception as e:
        logger.exception("get_countries: failed")
        return error_response('INTERNAL_ERROR', 'Failed to load countries', None, 500)

@bp.route('/service-types', methods=['GET'])
def get_service_types():
    """Get service types with optional filters"""
    try:
        category = request.args.get('category')
        is_active = request.args.get('is_active', 'true').lower() == 'true'
        
        query = ServiceType.query
        if category:
            query = query.filter_by(category=category)
        if is_active:
            query = query.filter_by(is_active=True)
        
        service_types = query.order_by(ServiceType.order.asc(), ServiceType.name.asc()).all()
        return success_response({
            'service_types': [st.to_dict() for st in service_types]
        })
    except Exception as e:
        logger.exception("get_service_types: failed")
        return error_response('INTERNAL_ERROR', 'Failed to load service types', None, 500)

@bp.route('/registration-callback', methods=['GET'])
def registration_payment_callback():
    """Handle registration payment callback"""
    try:
        external_id = request.args.get('external_id')
        subscription_id = request.args.get('subscription_id')
        callback_status = request.args.get('callback_status')

        cancelled_url = append_query_params(
            get_callback_frontend_return_url('/payment-status'),
            {'payment': 'cancel', 'external_id': external_id}
        )
        success_url = append_query_params(
            get_callback_frontend_return_url('/payment-status'),
            {'payment': 'success', 'external_id': external_id}
        )

        if callback_status == 'cancel':
            return current_app.make_response((
                f'<html><body><script>window.location.replace("{cancelled_url}");</script></body></html>',
                302
            ))

        user, error = AuthService.verify_registration_payment(external_id, subscription_id, callback_status=callback_status)

        if user:
            return current_app.make_response((
                f'<html><body><script>window.location.replace("{success_url}");</script></body></html>',
                302
            ))
        else:
            return current_app.make_response((
                f'<html><body><script>window.location.replace("{append_query_params(get_callback_frontend_return_url("/payment-status"), {"payment": "error", "reason": error or "unknown", "external_id": external_id})}");</script></body></html>',
                302
            ))

    except Exception as e:
        logger.exception("registration_callback: failed")
        return current_app.make_response((
            f'<html><body><script>window.location.replace("{append_query_params(get_callback_frontend_return_url("/payment-status"), {"payment": "error"})}");</script></body></html>',
            302
        ))
