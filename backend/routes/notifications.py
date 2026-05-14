"""
Notification Routes
"""
from flask import Blueprint
from flask_jwt_extended import get_jwt_identity
from backend.models.notification import Notification
from backend.extensions import db
from backend.utils.response import success_response, error_response
from backend.utils.decorators import require_auth

bp = Blueprint('notifications', __name__)


@bp.route('', methods=['GET'])
@require_auth
def get_notifications():
    """Get all notifications for current user"""
    try:
        user_id = get_jwt_identity()
        notifications = Notification.query.filter_by(user_id=user_id)\
            .order_by(Notification.created_at.desc()).limit(50).all()
        unread_count = Notification.query.filter_by(
            user_id=user_id, status='unread'
        ).count()
        return success_response({
            'notifications': [n.to_dict() for n in notifications],
            'unread_count': unread_count
        })
    except Exception as e:
        return error_response('INTERNAL_ERROR', 'Failed to get notifications', None, 500)


@bp.route('/<notification_id>/read', methods=['PATCH'])
@require_auth
def mark_read(notification_id):
    """Mark a single notification as read"""
    try:
        user_id = get_jwt_identity()
        notification = Notification.query.filter_by(
            id=notification_id, user_id=user_id
        ).first()
        if not notification:
            return error_response('NOT_FOUND', 'Notification not found', None, 404)
        notification.status = 'read'
        db.session.commit()
        return success_response(notification.to_dict())
    except Exception as e:
        return error_response('INTERNAL_ERROR', 'Failed to mark as read', None, 500)


@bp.route('/read-all', methods=['PATCH'])
@require_auth
def mark_all_read():
    """Mark all notifications as read for current user"""
    try:
        user_id = get_jwt_identity()
        updated = Notification.query.filter_by(
            user_id=user_id, status='unread'
        ).update({'status': 'read'})
        db.session.commit()
        return success_response({'updated': updated})
    except Exception as e:
        return error_response('INTERNAL_ERROR', 'Failed to mark all as read', None, 500)