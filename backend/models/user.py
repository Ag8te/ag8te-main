"""
User Models
"""
import uuid
import bcrypt
from datetime import datetime, timedelta, timezone
from flask_login import UserMixin
from sqlalchemy.dialects.postgresql import UUID, JSONB, CITEXT
from backend.extensions import db

class User(UserMixin, db.Model):
    """User model"""
    __tablename__ = 'users'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = db.Column(CITEXT, nullable=False)
    password_hash = db.Column(db.Text, nullable=False)
    
    # User role and type
    role = db.Column(db.Text, nullable=False)
    
    # Status flags
    is_admin = db.Column(db.Boolean, default=False)
    is_paid = db.Column(db.Boolean, default=False)
    is_approved = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    email_verified = db.Column(db.Boolean, default=False)
    
    # Profile data
    profile_image_url = db.Column(db.Text, nullable=True)  # e.g. /uploads/profile_xxx.jpg
    tracking_number = db.Column(db.Text, unique=True)
    data = db.Column(JSONB, default={})  # Stores user profile data
    file_urls = db.Column(JSONB, default=[])  # Stores uploaded file URLs
    nationality = db.Column(db.Text)  # Country name or code for nationality
    
    # ID verification status
    id_verification_status = db.Column(db.Text, default='pending')
    id_rejection_reason = db.Column(db.Text)
    registration_rejection_reason = db.Column(db.Text, nullable=True) # stores the admins reason for rejecting the registration
    registration_review_status = db.Column(db.Text, nullable=True, default='pending')

    # Aura Integration
    aura_id = db.Column(db.Text, nullable=True)
    aura_status = db.Column(db.Text, nullable=True)  # active, inactive, pending

    # Optional agent who supported the user at registration
    agent_id = db.Column(UUID(as_uuid=True), db.ForeignKey('agents.id', ondelete='SET NULL'), nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    wallet = db.relationship('Wallet', backref='user', uselist=False, cascade='all, delete-orphan')
    agent = db.relationship('Agent', backref='users', foreign_keys=[agent_id])
    
    __table_args__ = (
        db.UniqueConstraint('email', 'role', name='uq_user_email_role'),
        db.CheckConstraint("role IN ('client', 'driver', 'professional', 'service-provider', 'admin', 'agent')", name='check_role'),
        db.CheckConstraint("id_verification_status IN ('pending', 'verified', 'rejected')", name='check_id_verification_status'),
    )
    
    def set_password(self, password):
        """Hash and set password"""
        salt = bcrypt.gensalt(rounds=12)
        self.password_hash = bcrypt.hashpw(
            password.encode('utf-8'),
            salt
        ).decode('utf-8')
    
    def check_password(self, password):
        """Check password against hash"""
        if isinstance(self.password_hash, str):
            password_hash_bytes = self.password_hash.encode('utf-8')
        else:
            password_hash_bytes = self.password_hash
        return bcrypt.checkpw(
            password.encode('utf-8'),
            password_hash_bytes
        )
    
    def to_dict(self):
        """Convert to dictionary"""
        # Try various possible keys for names in the JSON data
        first_name = (self.data.get('full_name') or self.data.get('first_name') or '').strip() if self.data else ''
        last_name = (self.data.get('surname') or self.data.get('last_name') or '').strip() if self.data else ''
        
        # If full_name contains a space and last_name is empty, try to split it
        if first_name and not last_name and ' ' in first_name:
            parts = first_name.split(' ', 1)
            first_name = parts[0]
            last_name = parts[1]

        full_display_name = f"{first_name} {last_name}".strip() or "Unknown"
        
        return {
            'id': str(self.id),
            'email': self.email,
            'role': self.role,
            'first_name': first_name,
            'last_name': last_name,
            'name': full_display_name,
            'full_name': full_display_name,
            'phone': self.data.get('phone', '') if self.data else '',
            'is_admin': self.is_admin,
            'is_paid': self.is_paid,
            'is_approved': self.is_approved,
            'is_active': self.is_active,
            'email_verified': self.email_verified,
            'profile_image_url': self.profile_image_url,
            'tracking_number': self.tracking_number,
            'data': self.data,
            'file_urls': self.file_urls,
            'nationality': self.nationality,
            'id_verification_status': self.id_verification_status,
            'id_rejection_reason': self.id_rejection_reason,
            'registration_rejection_reason': self.registration_rejection_reason,
            'registration_review_status': self.registration_review_status,
            'aura_id': self.aura_id,
            'aura_status': self.aura_status,
            'agent_id': str(self.agent_id) if self.agent_id else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
    
    def __repr__(self):
        return f'<User {self.email}>'


class PasswordResetToken(db.Model):
    """Password reset token model"""
    __tablename__ = 'password_reset_tokens'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    token = db.Column(db.Text, unique=True, nullable=False)
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False)
    used = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
    
    user = db.relationship('User', backref='password_reset_tokens')
    
    def is_valid(self):
        """Check if token is valid"""
        now = datetime.now(timezone.utc) if self.expires_at.tzinfo else datetime.utcnow()
        return not self.used and now < self.expires_at


class EmailVerificationToken(db.Model):
    """Email verification token model"""
    __tablename__ = 'email_verification_tokens'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    token = db.Column(db.Text, unique=True, nullable=False)
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False)
    used = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
    
    user = db.relationship('User', backref='email_verification_tokens')
    
    def is_valid(self):
        """Check if token is valid"""
        now = datetime.now(timezone.utc) if self.expires_at.tzinfo else datetime.utcnow()
        return not self.used and now < self.expires_at


class Wallet(db.Model):
    """User wallet model"""
    __tablename__ = 'wallets'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False)
    balance = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    currency = db.Column(db.Text, nullable=False, default='ZAR')
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    transactions = db.relationship('WalletTransaction', backref='wallet', lazy='dynamic', cascade='all, delete-orphan')
    
    __table_args__ = (
        db.CheckConstraint('balance >= 0', name='check_balance_non_negative'),
    )
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': str(self.id),
            'user_id': str(self.user_id),
            'balance': float(self.balance) if self.balance else 0.0,
            'currency': self.currency,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class WalletTransaction(db.Model):
    """Wallet transaction model"""
    __tablename__ = 'wallet_transactions'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    wallet_id = db.Column(UUID(as_uuid=True), db.ForeignKey('wallets.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='SET NULL'))
    transaction_type = db.Column(db.Text, nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    currency = db.Column(db.Text, nullable=False, default='ZAR')
    balance_before = db.Column(db.Numeric(10, 2), nullable=False)
    balance_after = db.Column(db.Numeric(10, 2), nullable=False)
    external_id = db.Column(db.Text)  # Payment ID, Service Request ID, or Order ID
    description = db.Column(db.Text)
    meta_data = db.Column('metadata', JSONB, default={})  # 'metadata' is reserved, using 'meta_data' as Python attribute
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
    
    __table_args__ = (
        db.CheckConstraint("transaction_type IN ('top-up', 'payment', 'refund', 'cancellation_refund', 'withdrawal', 'earnings_transfer', 'withdrawal_reversal')", name='check_transaction_type'),
    )
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': str(self.id),
            'wallet_id': str(self.wallet_id),
            'user_id': str(self.user_id) if self.user_id else None,
            'transaction_type': self.transaction_type,
            'amount': float(self.amount) if self.amount else 0.0,
            'currency': self.currency,
            'balance_before': float(self.balance_before) if self.balance_before else 0.0,
            'balance_after': float(self.balance_after) if self.balance_after else 0.0,
            'external_id': self.external_id,
            'description': self.description,
            'metadata': self.meta_data,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

