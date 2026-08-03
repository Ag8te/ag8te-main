"""
Footer CMS model: company contact details shown in site footer
"""
from datetime import datetime
from backend.extensions import db


class FooterContent(db.Model):
    """Single-row footer content: company name, email, phone, physical address"""
    __tablename__ = 'footer_content'

    id = db.Column(db.Integer, primary_key=True, default=1, autoincrement=False)
    company_name = db.Column(db.String(255), nullable=True, default='AG8TE')
    email = db.Column(db.String(255), nullable=True)
    phone = db.Column(db.String(80), nullable=True)
    physical_address = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'company_name': self.company_name,
            'email': self.email,
            'phone': self.phone,
            'physical_address': self.physical_address,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
