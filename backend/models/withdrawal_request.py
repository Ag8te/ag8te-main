"""Withdrawal request: earner requests to withdraw from wallet (money moves to suspense until paid/reversed)."""
import uuid
from datetime import datetime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from backend.extensions import db


class WithdrawalRequest(db.Model):
    """Earner withdrawal request; on create wallet is debited (suspense); admin can mark paid or reversed."""
    __tablename__ = 'withdrawal_requests'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    status = db.Column(db.Text, nullable=False, default='pending')  # pending | paid | reversed
    requested_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
    processed_at = db.Column(db.DateTime(timezone=True), nullable=True)
    admin_notes = db.Column(db.Text, nullable=True)
    banking_details = db.Column(JSONB, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship('User', backref='withdrawal_requests')

    __table_args__ = (
        db.CheckConstraint("status IN ('pending', 'paid', 'reversed')", name='check_withdrawal_status'),
    )

    def to_dict(self):
        return {
            'id': str(self.id),
            'user_id': str(self.user_id),
            'amount': float(self.amount) if self.amount else 0.0,
            'status': self.status,
            'requested_at': self.requested_at.isoformat() if self.requested_at else None,
            'processed_at': self.processed_at.isoformat() if self.processed_at else None,
            'admin_notes': self.admin_notes,
            'banking_details': self.banking_details or {},
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
