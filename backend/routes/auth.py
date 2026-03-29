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

bp = Blueprint('auth', __name__)
logger = logging.getLogger(__name__)

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
    role = fields.Str(required=True, validate=validate.OneOf(['client', 'driver', 'professional', 'service-provider']))

class ForgotPasswordSchema(Schema):
    email = fields.Email(required=True)
    role = fields.Str(validate=validate.OneOf(['client', 'driver', 'professional', 'service-provider']))

class ResetPasswordSchema(Schema):
    token = fields.Str(required=True)
    password = fields.Str(required=True, validate=validate.Length(min=8))

class VerifyEmailSchema(Schema):
    token = fields.Str(required=True)

class ResendVerificationSchema(Schema):
    email = fields.Email(required=True)
    role = fields.Str(required=True, validate=validate.OneOf(['client', 'driver', 'professional', 'service-provider']))

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
        if error == "EMAIL_NOT_VERIFIED":
            return error_response('EMAIL_NOT_VERIFIED', 'Your email address is not verified. Please check your inbox or resend the verification email.', None, 403)
            
        access_token = create_access_token(identity=str(user.id))
        return success_response({
            'user': user.to_dict(),
            'token': access_token
        }, 'Login successful')
    except ValidationError as e:
        return error_response('VALIDATION_ERROR', 'Invalid input data', e.messages, 400)
    except Exception as e:
        logger.exception("login: failed")
        return error_response('INTERNAL_ERROR', 'Login failed', None, 500)

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
    """Initiate registration payment for a verified user"""
    try:
        data = request.json or {}
        provider = data.get('provider', 'paypal')  # PayPal as default
        
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user:
            return error_response('USER_NOT_FOUND', 'User not found', None, 404)
        
        if not user.email_verified:
            return error_response('EMAIL_NOT_VERIFIED', 'Please verify your email address first', None, 403)
            
        if user.is_paid:
            return error_response('ALREADY_PAID', 'Registration fee already paid', None, 400)
            
        # Generate external_id for payment
        user_id_hex = str(user.id).replace('-', '')
        external_id = f"reg_fee_{user_id_hex}_{uuid.uuid4().hex[:8]}"
        
        # Check if user needs a subscription
        # Providers and Professionals pay a recurring fee (subscription)
        needs_subscription = user.role in ('professional', 'service-provider')
        
        backend_url = current_app.config.get('BACKEND_URL', 'https://mzansiserve.co.za').rstrip('/')
        success_url = f"{backend_url}/api/auth/registration-callback?callback_status=success&external_id={external_id}&provider={provider}"
        cancel_url = f"{backend_url}/api/auth/registration-callback?callback_status=cancel&external_id={external_id}&provider={provider}"
        
        if provider == 'paypal' and needs_subscription:
            from backend.models import SubscriptionPlan
            # Handle subscription flow
            plan_name = f"{user.role.title()} Subscription"
            plan = SubscriptionPlan.query.filter_by(name=plan_name).first()
            if not plan:
                plan = SubscriptionPlan(
                    name=plan_name,
                    description=f"Monthly subscription fee for {user.role}",
                    price=100.00,
                    currency='ZAR',
                    interval='month'
                )
                db.session.add(plan)
                db.session.commit()
            
            # Sync with PayPal if needed
            if not plan.paypal_plan_id:
                try:
                    pp_plan = PaymentService.create_subscription_plan(
                        name=plan.name,
                        description=plan.description,
                        price=float(plan.price),
                        currency=plan.currency,
                        interval=plan.interval,
                        provider='paypal'
                    )
                    plan.paypal_plan_id = pp_plan['plan_id']
                    db.session.commit()
                except Exception as e:
                    logger.error("Failed to create PayPal plan: %s", e)
                    return error_response('PAYMENT_ERROR', 'Could not initialize subscription plan', None, 500)
            
            checkout_result = PaymentService.create_subscription(
                user_id=str(user.id),
                plan_id=plan.paypal_plan_id,
                success_url=success_url,
                cancel_url=cancel_url,
                provider='paypal',
                external_id=external_id
            )
        else:
            # One-time payment flow
            REGISTRATION_FEE_AMOUNT = 10000  # R100.00 in cents
            checkout_result = PaymentService.create_checkout(
                amount=REGISTRATION_FEE_AMOUNT,
                currency='ZAR',
                external_id=external_id,
                success_url=success_url,
                cancel_url=cancel_url,
                failure_url=f"{backend_url}/api/auth/registration-callback?callback_status=failure&external_id={external_id}&provider={provider}",
                provider=provider
            )
        
        logger.info("initiate_registration_payment: success user_id=%s external_id=%s", user.id, external_id)
        return success_response({
            'redirect_url': checkout_result['redirect_url'],
            'checkout_id': checkout_result['checkout_id'],
            'external_id': external_id
        })
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
    """User registration with payment checkout"""
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
        if error == "INVALID_AGENT":
            return error_response('INVALID_FIELDS', 'Invalid agent code format.', None, 400)
        if error:
            return error_response('REGISTRATION_FAILED', error, None, 400)
            
        return success_response({
            'user': user.to_dict(),
            'message': 'Registration successful. Please check your email to verify your account and complete payment.'
        }, 'Registration successful. Check email for verification.', 201)
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
        
        frontend_url = current_app.config.get('FRONTEND_URL', 'https://mzansiserve.co.za')
        
        if callback_status == 'cancel':
            return current_app.make_response((
                f'<html><body><script>window.location.href="{frontend_url}/payment-status?payment=cancel&external_id=' + (external_id or '') + '";</script></body></html>',
                302
            ))

        user, error = AuthService.verify_registration_payment(external_id, subscription_id, callback_status=callback_status)
        
        if user:
            return current_app.make_response((
                f'<html><body><script>window.location.href="{frontend_url}/payment-status?payment=success&external_id=' + (external_id or '') + '";</script></body></html>',
                302
            ))
        else:
            return current_app.make_response((
                f'<html><body><script>window.location.href="{frontend_url}/payment-status?payment=error&reason=' + (error or 'unknown') + '&external_id=' + (external_id or '') + '";</script></body></html>',
                302
            ))
            
    except Exception as e:
        logger.exception("registration_callback: failed")
        frontend_url_fallback = current_app.config.get('FRONTEND_URL', 'https://mzansiserve.co.za')
        return current_app.make_response((
            f'<html><body><script>window.location.href="{frontend_url_fallback}/?payment=error";</script></body></html>',
            302
        ))
        
    except Exception as e:
        logger.exception("registration_callback: failed")
        frontend_url_fallback = current_app.config.get('FRONTEND_URL', 'https://mzansiserve.co.za')
        return current_app.make_response((
            f'<html><body><script>window.location.href="{frontend_url_fallback}/?payment=error";</script></body></html>',
            302
        ))

