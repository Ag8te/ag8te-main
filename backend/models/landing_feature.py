"""
LandingFeature model for the "Why Choose Us" section on the landing page.
"""
import uuid
from datetime import datetime
from sqlalchemy.dialects.postgresql import UUID
from backend.extensions import db


class LandingFeature(db.Model):
    """Items displayed in the 'Why Choose AG8TE' section."""
    __tablename__ = 'landing_features'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    icon = db.Column(db.String(60), nullable=True)      # Lucide icon name e.g. "ShieldCheck"
    title = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, nullable=False)
    order = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': str(self.id),
            'icon': self.icon,
            'title': self.title,
            'description': self.description,
            'order': self.order,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
