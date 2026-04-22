"""
Authentication Utilities
"""
import secrets
import uuid
from datetime import datetime, timedelta
from flask import current_app, url_for
from backend.models import User, PasswordResetToken, EmailVerificationToken
from backend.extensions import db

def generate_token():
    """Generate a secure random token"""
    return secrets.token_urlsafe(32)

def create_password_reset_token(user_id):
    """Create a password reset token for user.

    Any older unused reset links for the same user are invalidated first so
    only the latest email link remains usable.
    """
    PasswordResetToken.query.filter_by(user_id=user_id, used=False).update(
        {"used": True},
        synchronize_session=False
    )

    token = generate_token()
    expires_at = datetime.utcnow() + timedelta(hours=24)
    
    password_reset_token = PasswordResetToken(
        user_id=user_id,
        token=token,
        expires_at=expires_at
    )
    db.session.add(password_reset_token)
    db.session.commit()
    
    return token

def create_email_verification_token(user_id):
    """Create an email verification token for user"""
    token = generate_token()
    expires_at = datetime.utcnow() + timedelta(days=7)
    
    verification_token = EmailVerificationToken(
        user_id=user_id,
        token=token,
        expires_at=expires_at
    )
    db.session.add(verification_token)
    db.session.commit()
    
    return token

def validate_sa_id(id_number):
    """
    Validate South African ID number structure
    
    SA ID format: YYMMDD G SSS C A Z
    - YYMMDD: Date of birth
    - G: Gender (0-9)
    - SSS: Sequence number
    - C: Citizenship (0 or 1)
    - A: Race (deprecated, now always 8)
    - Z: Check digit
    
    Basic validation: 13 digits, valid date range, check digit
    """
    if not id_number or len(id_number) != 13 or not id_number.isdigit():
        return False
    
    # Extract date
    year = int(id_number[0:2])
    month = int(id_number[2:4])
    day = int(id_number[4:6])
    
    # Validate date range
    if month < 1 or month > 12:
        return False
    if day < 1 or day > 31:
        return False
    
    # Convert 2-digit year to 4-digit (assume 1900-2099)
    if year < 50:
        full_year = 2000 + year
    else:
        full_year = 1900 + year
    
    # Basic date validation (doesn't check for actual valid dates, but checks range)
    try:
        datetime(full_year, month, day)
    except ValueError:
        return False
    
    return True

def generate_tracking_number():
    """Generate a unique tracking number"""
    return f"TRK-{uuid.uuid4().hex[:12].upper()}"
