
"""
Emergency Alert Routes
======================

Extends the existing blueprint with:
  POST   /api/emergency/panic          — trigger a panic alert
  GET    /api/emergency/panic/admin    — admin: list all alerts
  PATCH  /api/emergency/panic/<id>/resolve  — admin: resolve an alert
 
The original /log and /config endpoints are preserved unchanged.
"""
import logging
import uuid
from datetime import datetime, timezone
from flask import Blueprint, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity 
from backend.models import User
from backend.models.panic_alert import PanicAlert
from backend.extensions import db
from backend.utils.response import success_response, error_response
from backend.services.email_service import EmailService
from backend.services import armed_response_service as armed_response_service



bp = Blueprint('emergency', __name__)
logger = logging.getLogger(__name__)

@bp.route('/log', methods=['POST'])
@jwt_required()
def log_alert():
    """Log an emergency alert for analytics and tracking"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return error_response('USER_NOT_FOUND', 'User not found', None, 404)
        
    data = request.get_json()
    alert_type = data.get('alert_type')  # security, medical
    location = data.get('location', {})
    
    # In a real implementation, we would create an EmergencyAlert record in the DB
    # For now, we log it and return success
    logger.info(f"Emergency alert triggered by user {user_id}: {alert_type} at {location}")
    
    return success_response('Alert logged successfully', {
        'user_id': user_id,
        'alert_type': alert_type,
        'timestamp': data.get('timestamp')
    })

@bp.route('/config', methods=['GET'])
@jwt_required()
def get_config():
    """Return Aura configuration to the mobile app"""
    # This avoids hardcoding keys in the mobile app if we want to fetch them dynamically
    return success_response('Configuration fetched', {
        'aura_base_url': current_app.config.get('AURA_BASE_URL', 'https://panic.aura.services/panic-api/v2'),
        'aura_client_id': current_app.config.get('AURA_CLIENT_ID')
    })

# ─────────────────────────────────────────────────────────────────────────────
# NEW: PANIC BUTTON ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────
 
@bp.route("/panic", methods=["POST"])
@jwt_required()
def trigger_panic():
    """
    Trigger a panic alert.
 
    Body (JSON, all optional):
        latitude    float   GPS latitude
        longitude   float   GPS longitude
        booking_id  str     UUID of the active booking (ride or job)
 
    Flow:
      1. Create PanicAlert record in DB
      2. Attempt armed response dispatch (stub until provider chosen)
      3. Email admin
      4. Email next of kin (if email on file)
      5. Return alert data to frontend so it can show confirmation state
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return error_response("USER_NOT_FOUND", "User not found", None, 404)
 
    body = request.get_json(silent=True) or {}
    latitude = body.get("latitude")
    longitude = body.get("longitude")
    raw_booking_id = body.get("booking_id")
 
    booking_uuid = str(raw_booking_id) if raw_booking_id else None
 
    # 1. Persist the alert immediately
    alert = PanicAlert(
        user_id=user.id,
        booking_id=booking_uuid,
        latitude=latitude,
        longitude=longitude,
        status="active",
    )
    db.session.add(alert)
    db.session.flush()  # get alert.id before commits below
 
    # 2. Armed response dispatch (stub — no-op until provider chosen)
    try:
        dispatch_result = armed_response_service.trigger_dispatch(
            user=user,
            latitude=latitude,
            longitude=longitude,
            booking_id=booking_uuid,
        )
        alert.armed_response_ref = dispatch_result.get("ref")
        alert.armed_response_status = dispatch_result.get("status")
    except Exception as exc:
        logger.error("[panic] Armed response dispatch failed: %s", exc)
        alert.armed_response_status = "dispatch_error"
 
    db.session.commit()
 
    # 3. Email admin
    try:
        sent = EmailService.send_panic_admin_notification(alert)
        alert.admin_email_sent = bool(sent)
        db.session.commit()
    except Exception as exc:
        logger.error("[panic] Admin email failed: %s", exc)
 
    # 4. Email next of kin
    try:
        nok_sent = EmailService.send_panic_next_of_kin_notification(alert)
        alert.next_of_kin_email_sent = bool(nok_sent)
        db.session.commit()
    except Exception as exc:
        logger.error("[panic] Next-of-kin email failed: %s", exc)
 
    logger.warning(
        "[panic] ALERT TRIGGERED — user=%s alert=%s lat=%s lng=%s booking=%s",
        user_id, alert.id, latitude, longitude, booking_uuid,
    )
 
    return success_response("Panic alert triggered", {
        "alert_id": str(alert.id),
        "status": alert.status,
        "armed_response_status": alert.armed_response_status,
        "admin_notified": alert.admin_email_sent,
        "next_of_kin_notified": alert.next_of_kin_email_sent,
    })
 
 
@bp.route("/panic/admin", methods=["GET"])
@jwt_required()
def admin_list_panics():
    """
    Admin: list all panic alerts, newest first.
    Query params:
        status  str     filter by status (active|resolved). Default: all.
        limit   int     page size. Default 50.
        offset  int     pagination offset. Default 0.
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or not user.is_admin:
        return error_response("FORBIDDEN", "Admin access required", None, 403)
 
    status_filter = request.args.get("status")
    limit = min(int(request.args.get("limit", 50)), 200)
    offset = int(request.args.get("offset", 0))
 
    query = PanicAlert.query
    if status_filter in ("active", "resolved"):
        query = query.filter(PanicAlert.status == status_filter)
 
    total = query.count()
    alerts = (
        query.order_by(PanicAlert.created_at.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )
 
    return success_response("Alerts fetched", {
        "alerts": [a.to_dict() for a in alerts],
        "total": total,
        "limit": limit,
        "offset": offset,
    })
 
 
@bp.route("/panic/<alert_id>/resolve", methods=["PATCH"])
@jwt_required()
def admin_resolve_panic(alert_id):
    """
    Admin: mark a panic alert as resolved.
 
    Body (JSON):
        notes   str     optional resolution notes
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or not user.is_admin:
        return error_response("FORBIDDEN", "Admin access required", None, 403)
 
    try:
        alert_uuid = uuid.UUID(alert_id)
    except ValueError:
        return error_response("INVALID_ID", "Invalid alert ID", None, 400)
 
    alert = PanicAlert.query.get(alert_uuid)
    if not alert:
        return error_response("NOT_FOUND", "Alert not found", None, 404)
 
    if alert.status == "resolved":
        return error_response("ALREADY_RESOLVED", "Alert is already resolved", None, 400)
 
    body = request.get_json(silent=True) or {}
    alert.status = "resolved"
    alert.resolved_by_id = user.id
    alert.resolved_at = datetime.now(timezone.utc)
    alert.resolution_notes = (body.get("notes") or "").strip() or None
    db.session.commit()
 
    logger.info("[panic] Alert %s resolved by admin %s", alert.id, user_id)
    return success_response("Alert resolved", alert.to_dict())
 
