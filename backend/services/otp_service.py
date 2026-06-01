"""
OTP Service
"""
import logging
import secrets
import hashlib
from datetime import datetime, timedelta

from flask import current_app
from google.auth.transport.requests import Request
from google.oauth2 import id_token
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from backend.extensions import db
from backend.models import OtpChallenge, User
from backend.services.email_service import EmailService

logger = logging.getLogger(__name__)

SENSITIVE_SMS_PURPOSES = {'payout', 'password_reset', 'payment_verification'}


class OtpService:
    @staticmethod
    def _secret():
        return current_app.config.get('OTP_SECRET_KEY') or current_app.config.get('JWT_SECRET_KEY')

    @staticmethod
    def _trusted_device_serializer():
        return URLSafeTimedSerializer(
            OtpService._secret(),
            salt='login-otp-trusted-device'
        )

    @staticmethod
    def _password_fingerprint(user):
        return hashlib.sha256(str(user.password_hash or '').encode('utf-8')).hexdigest()

    @staticmethod
    def generate_code():
        return f"{secrets.randbelow(1000000):06d}"

    @staticmethod
    def create_email_login_challenge(user):
        code = OtpService.generate_code()
        expires_at = datetime.utcnow() + timedelta(
            minutes=current_app.config.get('OTP_LOGIN_EXPIRES_MINUTES', 10)
        )
        challenge = OtpChallenge(
            user_id=user.id,
            purpose='login',
            channel='email',
            identifier=user.email,
            code_hash=OtpChallenge.hash_code(code, OtpService._secret()),
            expires_at=expires_at,
            max_attempts=current_app.config.get('OTP_MAX_ATTEMPTS', 5),
        )
        db.session.add(challenge)
        db.session.commit()
        EmailService.send_otp_email(user, code, purpose='login')
        return challenge

    @staticmethod
    def verify_email_challenge(challenge_id, code, purpose='login'):
        challenge = OtpChallenge.query.get(challenge_id)
        if not challenge or challenge.channel != 'email' or challenge.purpose != purpose:
            return None, "INVALID_OTP"

        if not challenge.is_valid():
            return None, "OTP_EXPIRED"

        challenge.attempts += 1
        if not challenge.verify_code(code, OtpService._secret()):
            db.session.commit()
            return None, "INVALID_OTP"

        challenge.used = True
        challenge.verified_at = datetime.utcnow()
        db.session.commit()
        return challenge, None

    @staticmethod
    def create_trusted_login_device_token(user):
        return OtpService._trusted_device_serializer().dumps({
            'user_id': str(user.id),
            'role': user.role,
            'password_fingerprint': OtpService._password_fingerprint(user),
        })

    @staticmethod
    def is_trusted_login_device(user, token):
        if not user or not token:
            return False

        try:
            payload = OtpService._trusted_device_serializer().loads(
                token,
                max_age=current_app.config.get('OTP_TRUSTED_DEVICE_DAYS', 7) * 24 * 60 * 60
            )
        except (BadSignature, SignatureExpired, TypeError, ValueError):
            return False

        return (
            payload.get('user_id') == str(user.id)
            and payload.get('role') == user.role
            and payload.get('password_fingerprint') == OtpService._password_fingerprint(user)
        )

    @staticmethod
    def verify_firebase_phone_token(firebase_id_token, expected_phone=None):
        project_id = current_app.config.get('FIREBASE_PROJECT_ID')
        if not project_id:
            return None, "FIREBASE_NOT_CONFIGURED"

        try:
            claims = id_token.verify_firebase_token(firebase_id_token, Request(), audience=project_id)
        except Exception as e:
            logger.warning("Firebase phone token verification failed: %s", e)
            return None, "INVALID_FIREBASE_TOKEN"

        phone_number = claims.get('phone_number')
        if not phone_number:
            return None, "PHONE_NOT_VERIFIED"

        if expected_phone and OtpService.normalize_phone(expected_phone) != OtpService.normalize_phone(phone_number):
            return None, "PHONE_MISMATCH"

        return claims, None

    @staticmethod
    def record_sms_verification(user, purpose, firebase_claims):
        if purpose not in SENSITIVE_SMS_PURPOSES:
            return None, "INVALID_PURPOSE"

        expires_at = datetime.utcnow() + timedelta(
            minutes=current_app.config.get('OTP_SENSITIVE_EXPIRES_MINUTES', 10)
        )
        challenge = OtpChallenge(
            user_id=user.id if user else None,
            purpose=purpose,
            channel='sms',
            identifier=firebase_claims.get('phone_number'),
            firebase_uid=firebase_claims.get('user_id') or firebase_claims.get('sub'),
            used=True,
            verified_at=datetime.utcnow(),
            expires_at=expires_at,
            meta_data={'firebase': {'sign_in_provider': firebase_claims.get('firebase', {}).get('sign_in_provider')}},
        )
        db.session.add(challenge)
        db.session.commit()
        return challenge, None

    @staticmethod
    def user_phone(user):
        if not user:
            return None
        data = user.data or {}
        return data.get('phone') or data.get('phone_number')

    @staticmethod
    def normalize_phone(phone):
        return ''.join(ch for ch in str(phone or '') if ch.isdigit())
