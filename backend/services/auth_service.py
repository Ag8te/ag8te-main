import logging
import os
import uuid
import json
from flask import current_app
from werkzeug.utils import secure_filename
from backend.models import User, Agent, VehicleImage, UserSelectedService, SubscriptionPlan
from backend.extensions import db
from backend.utils.auth import generate_tracking_number, create_email_verification_token
from backend.services.email_service import EmailService
from backend.services.wallet_service import WalletService
from backend.services.payment_service import PaymentService

logger = logging.getLogger(__name__)

class AuthService:
    @staticmethod
    def register_user(email, password, role, full_name=None, phone=None):
        """Standard user registration."""
        if User.query.filter_by(email=email, role=role).first():
            return None, "USER_EXISTS"
        
        user = User(
            email=email,
            role=role,
            is_admin=False,
            is_paid=False,
            is_approved=False,
            is_active=True,
            email_verified=False,
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
        token = create_email_verification_token(user.id)
        
        try:
            EmailService.send_verification_email(user, token)
        except Exception as e:
            logger.warning(f"Failed to send verification email for user {user.id}: {e}")
            
        return user, None

    @staticmethod
    def login_user(email, password, role):
        """Authenticate user by email, password and role."""
        user = User.query.filter_by(email=email, role=role).first()
        if not user or not user.check_password(password):
            return None, "INVALID_CREDENTIALS"
        
        if not user.is_active:
            return None, "ACCOUNT_INACTIVE"
            
        if not user.email_verified:
            return None, "EMAIL_NOT_VERIFIED"
            
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
        
        # Ensure critical strings are trimmed
        for key in ['full_name', 'surname', 'phone', 'id_number']:
            if key in registration_data and isinstance(registration_data[key], str):
                registration_data[key] = registration_data[key].strip()
        
        if User.query.filter_by(email=email, role=role).first():
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

        # Create user
        user = User(
            email=email,
            role=role,
            is_admin=False,
            is_paid=False,
            is_approved=False,
            is_active=True,
            email_verified=False,
            tracking_number=generate_tracking_number(),
            nationality=registration_data.get('nationality'),
            agent_id=agent_uuid,
        )
        user.set_password(registration_data['password'])
        
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

        # Handle specific roles
        if role == 'professional':
            user_data['highest_qualification'] = registration_data.get('highest_qualification')
            user_data['professional_body'] = registration_data.get('professional_body')
            user_data['professional_services'] = registration_data.get('professional_services', [])
        elif role == 'driver':
            user_data['driver_services'] = registration_data.get('driver_services', [])

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
        
        # Handle subscription logic for service-provider
        if role == 'service-provider':
            user_data['provider_services'] = registration_data.get('provider_services', [])
            user.data = user_data

        db.session.commit()
        logger.info(f"User {user.id} committed to DB in register_with_payment_logic")
        
        # Send Verification Email
        try:
            token = create_email_verification_token(user.id)
            logger.info(f"Generated verification token for user {user.id}")
            EmailService.send_verification_email(user, token)
            logger.info(f"Verification email sent for user {user.id}")
        except Exception as e:
            logger.error(f"CRITICAL: Failed to send verification email for user {user.id}: {e}")
            logger.exception(e) # Log the full stack trace
            
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
    def verify_registration_payment(external_id, subscription_id=None):
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
        verified_status = PaymentService.get_payment_status(external_id)
        if verified_status != 'completed':
            return None, "VERIFICATION_FAILED"
            
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
