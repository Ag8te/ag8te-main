"""
Panic Alert Model
=================

"""
import uuid
from datetime import datetime
from sqlalchemy.dialects.postgresql import UUID
from backend.extensions import db


class PanicAlert(db.Model):
    __tablename__ = "panic_alerts"

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Who triggered it
    user_id = db.Column(
        UUID(as_uuid=True),
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    user = db.relationship("User", foreign_keys=[user_id], backref="panic_alerts", lazy=True)

    # Booking context — optional, set when panic fired from an active ride/job
    booking_id = db.Column(
        db.Text,
        db.ForeignKey("service_requests.id", ondelete="SET NULL"),
        nullable=True,
    )

    # GPS at moment of panic — nullable, device may not have coords
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)

    # Status lifecycle: active → resolved
    status = db.Column(db.String(20), nullable=False, default="active")

    # Admin who resolved it
    resolved_by_id = db.Column(
        UUID(as_uuid=True),
        db.ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    resolved_by = db.relationship("User", foreign_keys=[resolved_by_id], lazy=True)
    resolved_at = db.Column(db.DateTime(timezone=True), nullable=True)
    resolution_notes = db.Column(db.Text, nullable=True)

    # Notification tracking
    admin_email_sent = db.Column(db.Boolean, default=False)
    next_of_kin_email_sent = db.Column(db.Boolean, default=False)

    # Armed response stub — populated when a provider is wired up
    armed_response_ref = db.Column(db.String(100), nullable=True)
    armed_response_status = db.Column(db.String(50), nullable=True)

    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    def to_dict(self):
        user = self.user
        full_name = ""
        if user:
            d = user.data or {}
            first = (d.get("full_name") or d.get("first_name") or "").strip()
            last = (d.get("surname") or d.get("last_name") or "").strip()
            if first and not last and " " in first:
                parts = first.split(" ", 1)
                first, last = parts[0], parts[1]
            full_name = f"{first} {last}".strip() or user.email

        resolved_name = None
        if self.resolved_by:
            rd = self.resolved_by.data or {}
            resolved_name = (rd.get("full_name") or "").strip() or self.resolved_by.email

        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "user": {
                "id": str(user.id),
                "name": full_name,
                "email": user.email,
                "phone": (user.data or {}).get("phone", ""),
                "role": user.role,
            } if user else None,
            "booking_id": self.booking_id,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "status": self.status,
            "resolved_by": resolved_name,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "resolution_notes": self.resolution_notes,
            "admin_email_sent": self.admin_email_sent,
            "next_of_kin_email_sent": self.next_of_kin_email_sent,
            "armed_response_ref": self.armed_response_ref,
            "armed_response_status": self.armed_response_status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }