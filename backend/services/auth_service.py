import logging
import os
import uuid
import json
from datetime import datetime, timezone
from flask import current_app
from werkzeug.utils import secure_filename
from backend.models import User, Agent, VehicleImage, UserSelectedService, SubscriptionPlan
from backend.extensions import db
from backend.utils.auth import create_email_verification_token, generate_tracking_number
from backend.services.email_service import EmailService
from backend.services.wallet_service import WalletService
from backend.services.payment_service import PaymentService

logger = logging.getLogger(__name__)

REGISTRATION_FEE_AMOUNT = 0  # Free registration period; restore paid amount when needed.
REGISTRATION_FEE_REQUIRED = REGISTRATION_FEE_AMOUNT > 0
MAX_FAILED_LOGIN_ATTEMPTS = 5

class AuthService:
    @staticmethod
    def _send_registration_email(user):
        if user.role == 'client':
            token = create_email_verification_token(user.id)
            EmailService.send_client_registration_verification(user, token)
        else:
            EmailService.send_registration_confirmation(user)

    @staticmethod
    def register_user(email, password, role, full_name=None, phone=None):
        """Standard user registration."""
        if User.query.filter_by(email=email, role=role).first():
            return None, "USER_EXISTS"

        is_client = role == 'client'
        is_registration_paid = is_client or not REGISTRATION_FEE_REQUIRED
        
        user = User(
            email=email,
            role=role,
            is_admin=False,
            is_paid=is_registration_paid,
            is_approved=False,
            is_active=True,
            email_verified=role != 'client',
            tracking_number=generate_tracking_number()
        )
        user.set_password(password)
        
        if full_name:
            user.data = {
                'full_name': full_name,
                'phone': phone or ''
            }
        
        db.session.add(user)
        db.session.commit()
        
        # Initialize dependencies
        WalletService.get_or_create_wallet(user.id)

        try:
            AuthService._send_registration_email(user)
        except Exception as e:
            logger.warning(f"Failed to send registration confirmation email for user {user.id}: {e}")
            
        return user, None

    @staticmethod
    def login_user(email, password, role=None):
        """Authenticate user by email/password, optionally scoped to a role."""
        if role:
            user = User.query.filter_by(email=email, role=role).first()
        else:
            role_order = ['client', 'driver', 'professional', 'service-provider', 'agent']
            users = User.query.filter(User.email == email, User.role.in_(role_order)).all()
            users.sort(key=lambda u: role_order.index(u.role) if u.role in role_order else len(role_order))
            user = next((candidate for candidate in users if candidate.check_password(password)), None)

        if not user:
            return None, "INVALID_CREDENTIALS"

        if user.password_reset_required:
            return user, "PASSWORD_RESET_REQUIRED"

        if not user.check_password(password):
            user.login_failed_attempts = (user.login_failed_attempts or 0) + 1
            if user.login_failed_attempts >= MAX_FAILED_LOGIN_ATTEMPTS:
                user.password_reset_required = True
                user.password_reset_required_at = datetime.now(timezone.utc)
                db.session.commit()
                return user, "PASSWORD_RESET_REQUIRED"
            db.session.commit()
            return None, "INVALID_CREDENTIALS"
        
        if user.login_failed_attempts or user.password_reset_required:
            user.login_failed_attempts = 0
            user.password_reset_required = False
            user.password_reset_required_at = None
            db.session.commit()

        if not user.is_active:
            return None, "ACCOUNT_INACTIVE"

        if user.role != 'client' and user.role != 'admin' and not user.is_paid:
            if not REGISTRATION_FEE_REQUIRED:
                user.is_paid = True
                db.session.commit()
            else:
                return user, "PAYMENT_REQUIRED"
            
        return user, None

    @staticmethod
    def handle_file_upload(file, prefix, folder):
        """Helper to handle individual file uploads."""
        if not file or not file.filename:
            return None
        file_ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else 'pdf'
        unique_filename = f"{prefix}_{uuid.uuid4().hex[:8]}.{file_ext}"
        filepath = os.path.join(folder, unique_filename)
        file.save(filepath)
        return f"/uploads/{unique_filename}"

    @classmethod
    def register_with_payment_logic(cls, registration_data, files):
        """Complex registration logic with file uploads and payment initiation."""
        # Validation is mostly handled by the blueprint schema, but we do critical checks here
        email = registration_data.get('email', '').strip()
        role = registration_data.get('role')
        password = registration_data.get('password') or ''
        
        # Ensure critical strings are trimmed
        for key in ['full_name', 'surname', 'phone', 'id_number']:
            if key in registration_data and isinstance(registration_data[key], str):
                registration_data[key] = registration_data[key].strip()
        
        existing_user = User.query.filter_by(email=email, role=role).first()
        if existing_user:
            # If the same non-client user has not paid yet, resume the payment flow
            # instead of blocking them with a duplicate-account message.
            if role != 'client' and not existing_user.is_paid and existing_user.check_password(password):
                if not REGISTRATION_FEE_REQUIRED:
                    existing_user.is_paid = True
                    db.session.commit()
                    return existing_user, "EXISTING_FREE_USER"
                return existing_user, "EXISTING_UNPAID_USER"
            return None, "USER_EXISTS"

        # Agent logic
        agent_id = registration_data.get('agent_id')
        agent_uuid = None
        if agent_id:
            agent_by_code = Agent.query.filter_by(agent_id=agent_id).first()
            if agent_by_code:
                agent_uuid = agent_by_code.id
            else:
                try:
                    agent_uuid = uuid.UUID(agent_id)
                except (ValueError, TypeError):
                    return None, "INVALID_AGENT"

        is_client = role == 'client'
        is_registration_paid = is_client or not REGISTRATION_FEE_REQUIRED

        # Create user
        user = User(
            email=email,
            role=role,
            is_admin=False,
            is_paid=is_registration_paid,
            is_approved=False,
            is_active=True,
            email_verified=role != 'client',
            tracking_number=generate_tracking_number(),
            nationality=registration_data.get('nationality'),
            agent_id=agent_uuid,
        )
        user.set_password(password)
        
        # Build data JSONB
        user_data = {
            'full_name': registration_data.get('full_name'),
            'surname': registration_data.get('surname'),
            'phone': registration_data.get('phone'),
            'gender': registration_data.get('gender'),
            'id_number': registration_data.get('id_number'),
            'next_of_kin': registration_data.get('next_of_kin'),
            'sa_citizen': registration_data.get('nationality') == 'South Africa'
        }

        if user_data['sa_citizen']:
            user_data['sa_id'] = registration_data.get('id_number')
        else:
            user_data['passport_number'] = registration_data.get('id_number')

        def _normalize_driver_services(reg_data):
            raw_driver_services = reg_data.get('driver_services') or []
            normalized_services = []

             # car_details is the legacy fallback — use it to fill any
             # missing fields from driver_services entries so no vehicle
             # ends up with empty car_type, make, model etc.
            car_details = reg_data.get('car_details') or {}
            if not isinstance(car_details, dict):
                car_details = {}

            for service in raw_driver_services:
                if not isinstance(service, dict):
                    continue
                normalized_services.append({
                    # Pull from driver_services first, fall back to
                    # car_details for any field that came in empty
                    'car_make': service.get('car_make') or service.get('make') or car_details.get('car_make') or car_details.get('make') or'',
                    'car_model': service.get('car_model') or service.get('model') or car_details.get('car_model') or car_details.get('model') or '',
                    'car_year': service.get('car_year') or service.get('year') or car_details.get('car_year') or car_details.get('year'),
                    'registration_number': service.get('registration_number') or service.get('registration') or service.get('license_plate') or service.get('plate') or car_details.get('registration_number') or car_details.get('plate') or '',
                    'car_type': service.get('car_type') or car_details.get('car_type') or '',
                    'color': service.get('color') or car_details.get('color') or '',
                    'seats': service.get('seats') or car_details.get('seats'),
                    'disk_expiry': service.get('disk_expiry') or service.get('vehicle_disk_expiry') or car_details.get('disk_expiry') or reg_data.get('vehicle_disk_expiry'),
                    'disk_document': service.get('disk_document') or service.get('vehicle_disk_document_url') or car_details.get('disk_document') or reg_data.get('vehicle_disk_document_url'),
                    'images': service.get('images') or [],
                })

            if normalized_services:
                return normalized_services
            
            # Full fallback — driver_services was empty or missing,
            # build entirely from car_details
            if not any(car_details.values()):
                return []
            return [{
                'car_make': car_details.get('car_make') or car_details.get('make') or '',
                'car_model': car_details.get('car_model') or car_details.get('model') or '',
                'car_year': car_details.get('car_year') or car_details.get('year'),
                'registration_number': car_details.get('registration_number') or car_details.get('registration') or car_details.get('license_plate') or car_details.get('plate') or '',
                'car_type': car_details.get('car_type') or '',
                'color': car_details.get('color') or '',
                'seats': car_details.get('seats'),
                'disk_expiry': car_details.get('disk_expiry') or reg_data.get('vehicle_disk_expiry'),
                'disk_document': car_details.get('disk_document') or reg_data.get('vehicle_disk_document_url'),
                'images': car_details.get('images') or [],
            }]

        # Handle specific roles
        if role == 'professional':
            user_data['highest_qualification'] = registration_data.get('highest_qualification')
            user_data['professional_body'] = registration_data.get('professional_body')
            user_data['professional_services'] = registration_data.get('professional_services', [])
        elif role == 'driver':
            user_data['driver_services'] = _normalize_driver_services(registration_data)
            if registration_data.get('car_details'):
                user_data['car_details'] = registration_data.get('car_details')
            user_data['driver_license_number'] = registration_data.get('driver_license_number')
            user_data['driver_license_code'] = registration_data.get('driver_license_code')
            user_data['driver_license_expiry'] = registration_data.get('driver_license_expiry')
            user_data['prdp_number'] = registration_data.get('prdp_number')
            user_data['prdp_expiry'] = registration_data.get('prdp_expiry')
            user_data['vehicle_disk_expiry'] = registration_data.get('vehicle_disk_expiry')
            user_data['operating_areas'] = registration_data.get('operating_areas') or []
        elif role == 'service-provider':
            user_data['provider_services'] = registration_data.get('provider_services', [])

        if role in ('professional', 'service-provider') and registration_data.get('service_description'):
            user_data['service_description'] = registration_data.get('service_description')

        user.data = user_data

        # File processing
        upload_folder = current_app.config.get('UPLOAD_FOLDER')
        if not os.path.exists(upload_folder):
            os.makedirs(upload_folder)

        # Map files to user data
        if 'id_document' in files:
            url = cls.handle_file_upload(files['id_document'], 'id', upload_folder)
            user.file_urls = [url] if url else []
        
        if 'proof_of_residence' in files:
            user_data['proof_of_residence_url'] = cls.handle_file_upload(files['proof_of_residence'], 'proof', upload_folder)
            
        if 'drivers_license' in files:
            user_data['driver_license_url'] = cls.handle_file_upload(files['drivers_license'], 'license', upload_folder)

        if 'prdp_document' in files:
            user_data['prdp_document_url'] = cls.handle_file_upload(files['prdp_document'], 'prdp', upload_folder)

        if 'vehicle_disk_document' in files:
            vehicle_disk_url = cls.handle_file_upload(files['vehicle_disk_document'], 'disk', upload_folder)
            user_data['vehicle_disk_document_url'] = vehicle_disk_url
            if vehicle_disk_url and user_data.get('driver_services'):
                user_data['driver_services'][0]['disk_document'] = vehicle_disk_url

        if 'cv_resume' in files:
            user_data['cv_resume_url'] = cls.handle_file_upload(files['cv_resume'], 'cv', upload_folder)
            
        if 'profile_photo' in files:
            user.profile_image_url = cls.handle_file_upload(files['profile_photo'], 'profile', upload_folder)

        if 'qualification_documents' in files:
            qual_files = files.getlist('qualification_documents')
            urls = [cls.handle_file_upload(f, 'qual', upload_folder) for f in qual_files if f]
            user_data['qualification_urls'] = [u for u in urls if u]

        user.data = user_data
        db.session.add(user)
        db.session.flush()

        WalletService.get_or_create_wallet(user.id)

        # Vehicle images for drivers
        if role == 'driver':
            import re
            for key in files:
                m = re.match(r'vehicle_images_(\d+)', key)
                if m:
                    car_index = int(m.group(1))
                    for f in files.getlist(key):
                        url = cls.handle_file_upload(f, 'vehicle', upload_folder)
                        if url:
                            db.session.add(VehicleImage(user_id=user.id, car_index=car_index, image_url=url))
                            if car_index < len(user_data.get('driver_services', [])):
                                images = user_data['driver_services'][car_index].setdefault('images', [])
                                images.append(url)
                elif key == 'car_images':
                    for f in files.getlist(key):
                        url = cls.handle_file_upload(f, 'vehicle', upload_folder)
                        if url:
                            db.session.add(VehicleImage(user_id=user.id, car_index=0, image_url=url))
                            if user_data.get('driver_services'):
                                images = user_data['driver_services'][0].setdefault('images', [])
                                images.append(url)
            user.data =user_data
            
        if role == 'service-provider':
            user.data = user_data

        db.session.commit()
        logger.info(f"User {user.id} committed to DB in register_with_payment_logic")
        
        try:
            cls._send_registration_email(user)
            logger.info("Registration confirmation email sent for user %s", user.id)
        except Exception as e:
            logger.error("Failed to send registration confirmation email for user %s: %s", user.id, e)
            
        return user, None

    @staticmethod
    def complete_registration(external_id):
        """Mark user as paid based on successful payment completion."""
        from backend.models import Payment, User
        payment = Payment.query.filter_by(external_id=external_id).first()
        if not payment or payment.status != 'completed':
            return None, "PAYMENT_INCOMPLETE"
        
        # Extract user_id from external_id
        if not external_id.startswith('reg_fee_'):
            return None, "INVALID_EXTERNAL_ID"
            
        parts = external_id.split('_')
        if len(parts) < 4:
            return None, "INVALID_EXTERNAL_ID"
            
        user_id_hex = '_'.join(parts[2:-1]).replace('-', '')
        if len(user_id_hex) != 32:
            return None, "INVALID_EXTERNAL_ID"
            
        user_id_str = f"{user_id_hex[:8]}-{user_id_hex[8:12]}-{user_id_hex[12:16]}-{user_id_hex[16:20]}-{user_id_hex[20:32]}"
        user = User.query.get(uuid.UUID(user_id_str))
        
        if not user:
            return None, "USER_NOT_FOUND"
            
        user.is_paid = True
        db.session.commit()
        return user, None

    @staticmethod
    def verify_registration_payment(external_id, subscription_id=None, callback_status=None):
        """Verify payment status and update user record."""
        from backend.models import Payment, Subscription, User
        from backend.services.agent_service import AgentService
        
        payment = Payment.query.filter_by(external_id=external_id).first()
        subscription = None
        if not payment and subscription_id:
            subscription = Subscription.query.filter_by(provider_subscription_id=subscription_id).first()
        
        if not payment and not subscription:
            return None, "PAYMENT_NOT_FOUND"
            
        # Verify with provider
        if payment:
            verified_status = PaymentService.get_payment_status(external_id)
            if verified_status != 'completed':
                # Treat Yoco success callback as completed to bypass webhook/API delays
                if callback_status == 'success' and payment.payment_method == 'yoco':
                    logger.info(f"verify_registration_payment: trusting callback_status=success for Yoco {external_id}")
                    verified_status = 'completed'
                    payment.status = 'completed'
                    db.session.commit()
                else:
                    return None, f"VERIFICATION_FAILED (status: {verified_status})"
        elif subscription:
            verified_status = PaymentService.get_subscription_status(subscription.provider_subscription_id, subscription.provider)
            if verified_status not in ['active', 'approved']:
                return None, f"VERIFICATION_FAILED (status: {verified_status})"
            
        # Extract User
        parts = external_id.split('_')
        user_id_hex = '_'.join(parts[2:-1]).replace('-', '')
        user_id_str = f"{user_id_hex[:8]}-{user_id_hex[8:12]}-{user_id_hex[12:16]}-{user_id_hex[16:20]}-{user_id_hex[20:32]}"
        user = User.query.get(uuid.UUID(user_id_str))
        
        if not user:
            return None, "USER_NOT_FOUND"
            
        if not user.is_paid:
            user.is_paid = True
            # Award commission
            try:
                AgentService.award_commission(user)
            except Exception as e:
                logger.warning(f"Failed to award commission for user {user.id}: {e}")
                
            # Send confirmation email
            amount = float(payment.amount) if payment else 100.0
            try:
                EmailService.send_registration_payment_confirmation(user, amount)
            except Exception as e:
                logger.warning(f"Failed to send payment confirmation email for user {user.id}: {e}")
                
            db.session.commit()
            
        return user, None
