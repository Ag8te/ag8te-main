"""
Notification Service
"""
from flask import current_app
from backend.models.notification import Notification
from backend.extensions import db


class NotificationService:

    @staticmethod
    def notify(user_id, type, title, body, entity_type=None, entity_id=None):
        """
        Save an in-app notification for a user.
        Wrapped in try/except so failure never affects the calling action.
        """
        try:
            notification = Notification(
                user_id=user_id,
                type=type,
                title=title,
                body=body,
                status='unread',
                entity_type=entity_type,
                entity_id=str(entity_id) if entity_id else None
            )
            db.session.add(notification)
            db.session.commit()
        except Exception as e:
            current_app.logger.error(f"Notification save error: {str(e)}")
            db.session.rollback()