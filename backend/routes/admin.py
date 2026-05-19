"""
Admin Routes
"""

import json
import os
import uuid
from datetime import datetime

from flask import Blueprint, current_app, request, jsonify
from flask_jwt_extended import get_jwt_identity
from marshmallow import ValidationError

from backend.extensions import db
from backend.models import (
    AppSetting,
    FAQ,
    ServiceRequest,
    User,
    ProductImage,
    ServiceType,
    CarouselItem,
    FooterContent,
    WithdrawalRequest,
    Agent,
    VehicleImage,
    PendingProfileUpdate,
)
from backend.models.shop import Inventory, ShopCategory, ShopSubcategory, ShopProduct
from backend.services.admin_service import AdminService
from backend.services.email_service import EmailService
from backend.services.payment_service import PaymentService
from backend.services.agent_service import AgentService
from backend.services.request_service import RequestService
from backend.utils.decorators import require_admin, require_auth
from backend.utils.response import error_response, success_response

bp = Blueprint("admin", __name__)


ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "webp"}
ALLOWED_ADMIN_USER_ROLES = {
    "client",
    "driver",
    "professional",
    "service-provider",
    "admin",
    "agent",
}


def _allowed_image_file(filename: str) -> bool:
    """Check if uploaded product image has an allowed extension."""
    if not filename or "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[1].lower()
    return ext in ALLOWED_IMAGE_EXTENSIONS


def _parse_json_payload(raw_value, default):
    if raw_value in (None, ""):
        return default
    if isinstance(raw_value, (list, dict)):
        return raw_value
    try:
        return json.loads(raw_value)
    except Exception:
        return default


def _extract_product_shipping_profile(payload):
    shipping_keys = {
        "shipping_profile",
        "shipping_description",
        "shipping_weight_kg",
        "shipping_length_cm",
        "shipping_width_cm",
        "shipping_height_cm",
    }
    provided = any(key in payload for key in shipping_keys)
    if not provided:
        return False, None

    if "shipping_profile" in payload:
        raw_profile = payload.get("shipping_profile")
        if isinstance(raw_profile, str):
            raw_profile = _parse_json_payload(raw_profile, {})
        return True, ShopProduct.normalize_shipping_profile(raw_profile)

    profile = {
        "description": payload.get("shipping_description"),
        "weight_kg": payload.get("shipping_weight_kg"),
        "length_cm": payload.get("shipping_length_cm"),
        "width_cm": payload.get("shipping_width_cm"),
        "height_cm": payload.get("shipping_height_cm"),
    }
    return True, ShopProduct.normalize_shipping_profile(profile)


@bp.route("/users", methods=["GET"])
@require_admin
def list_users():
    try:
        filters = {
            "role": request.args.get("role"),
            "is_paid": request.args.get("is_paid") == "true"
            if request.args.get("is_paid")
            else None,
            "is_approved": request.args.get("is_approved") == "true"
            if request.args.get("is_approved")
            else None,
        }
        limit = int(request.args.get("limit", 50))
        offset = int(request.args.get("offset", 0))

        result = AdminService.list_users(filters, limit, offset)
        return success_response(
            {
                "users": result["users"],
                "total": result["total"],
                "limit": limit,
                "offset": offset,
            }
        )

    except Exception as e:
        current_app.logger.error(f"List users error: {str(e)}")
        return error_response("INTERNAL_ERROR", "Failed to list users", None, 500)


@bp.route("/users", methods=["POST"])
@require_admin
def create_user():
    try:
        data = request.get_json(silent=True) or {}
        user_dict, error = AdminService.create_user(data)
        if error:
            return error_response(
                error,
                "Failed to create user",
                None,
                400 if error != "ALREADY_EXISTS" else 409,
            )

        return success_response(user_dict, "User created successfully", 201)

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Create user error: {str(e)}")
        return error_response("INTERNAL_ERROR", "Failed to create user", None, 500)


@bp.route("/users/<user_id>/approve", methods=["PATCH"])
@require_admin
def approve_user(user_id):
    try:
        payload, error = AdminService.approve_user(user_id)
        if error:
            if isinstance(error, dict):
                error_code = error.get("code", "INTERNAL_ERROR")
                details = error.get("details")
                message = "Failed to approve user"
                if error_code == "DRIVER_COMPLIANCE_INCOMPLETE":
                    missing = ", ".join((details or {}).get("missing_field_labels") or [])
                    message = (
                        f"Driver compliance is incomplete. Missing: {missing}"
                        if missing else
                        "Driver compliance is incomplete."
                    )
                return error_response(
                    error_code,
                    message,
                    details,
                    400,
                )
            return error_response(
                error,
                "Failed to approve user",
                None,
                404 if error == "NOT_FOUND" else 500,
            )

        action = (payload or {}).get("action")
        if action == "payment_reminder_sent":
            return success_response(
                payload,
                "Registration payment is still pending. Reminder email sent instead of approving the user."
            )

        return success_response(payload, "User approved successfully")

    except Exception as e:
        current_app.logger.error(f"Approve user error: {str(e)}")
        return error_response("INTERNAL_ERROR", "Failed to approve user", None, 500)
        
    
@bp.route("/users/<user_id>/reject", methods=["PATCH"])
@require_admin
def reject_user(user_id):
    """Reject a pending registration with a mandatory reason.

    Body: { "reason": "Blurry driver's licence — please re-upload." }
    Returns 400 if reason is missing or user is already approved.
    """
    try:
        data = request.get_json(silent=True) or {}
        reason = (data.get("reason") or "").strip()

        # Validate reason before hitting the service
        if not reason:
            return error_response(
                "MISSING_REASON",
                "A rejection reason is required.",
                None,
                400,
            )

        user_dict, error = AdminService.reject_user(user_id, reason)
        if error:
            status = 404 if error == "NOT_FOUND" else 400
            messages = {
                "NOT_FOUND": "User not found.",
                "ALREADY_APPROVED": "This user is already approved and cannot be rejected.",
                "MISSING_REASON": "A rejection reason is required.",
            }
            return error_response(
                error,
                messages.get(error, "Failed to reject user."),
                None,
                status,
            )

        return success_response(
            user_dict,
            "User application rejected. The provider has been notified by email."
        )
    except Exception as e:
        current_app.logger.error(f"Reject user error: {str(e)}")
        return error_response("INTERNAL_ERROR", "Failed to reject user.", None, 500)



@bp.route("/users/<user_id>/verify-id", methods=["PATCH"])
@require_admin
def verify_id(user_id):
    try:
        data = request.get_json(silent=True) or {}
        user_dict, error = AdminService.verify_id(
            user_id, data.get("status"), data.get("reason")
        )
        if error:
            return error_response(
                error, "Failed to verify ID", None, 400 if error != "NOT_FOUND" else 404
            )

        return success_response(user_dict, f"ID verification status updated")

    except Exception as e:
        current_app.logger.error(f"Verify ID error: {str(e)}")
        return error_response("INTERNAL_ERROR", "Failed to verify ID", None, 500)


@bp.route("/users/<user_id>/suspend", methods=["PATCH"])
@require_admin
def suspend_user(user_id):
    try:
        data = request.get_json(silent=True) or {}
        user_dict, error = AdminService.suspend_user(user_id, reason=data.get("reason"))
        if error:
            return error_response(
                error,
                "Failed to suspend user",
                None,
                404 if error == "NOT_FOUND" else 500,
            )
        return success_response(user_dict, "User suspended successfully")
    except Exception as e:
        current_app.logger.error(f"Suspend user error: {str(e)}")
        return error_response("INTERNAL_ERROR", "Failed to suspend user", None, 500)


@bp.route("/users/<user_id>", methods=["GET"])
@require_admin
def get_user(user_id):
    try:
        result, error = AdminService.get_user(user_id)
        if error:
            return error_response(error, "User not found", None, 404)
        return success_response(result)
    except Exception as e:
        current_app.logger.error(f"Get user error: {str(e)}")
        return error_response("INTERNAL_ERROR", "Failed to fetch user", None, 500)


@bp.route("/users/<user_id>/vehicle-images", methods=["GET"])
@require_admin
def get_user_vehicle_images(user_id):
    """Get driver's vehicle images and driver_services for admin (e.g. carousel modal)."""
    try:
        user = User.query.get(user_id)
        if not user:
            return error_response("NOT_FOUND", "User not found", None, 404)
        driver_services = (user.data or {}).get("driver_services") or []
        images = (
            VehicleImage.query.filter_by(user_id=user.id)
            .order_by(VehicleImage.car_index, VehicleImage.id)
            .all()
        )
        # Build list of image URLs (and optionally by car_index for grouping)
        image_list = [img.to_dict() for img in images]
        return success_response(
            {
                "driver_services": driver_services,
                "vehicle_images": image_list,
            }
        )
    except Exception as e:
        current_app.logger.error(f"Get vehicle images error: {str(e)}")
        return error_response(
            "INTERNAL_ERROR", "Failed to get vehicle images", None, 500
        )


def _allowed_profile_image(filename):
    """Check if file is an allowed image for profile photo."""
    if not filename or "." not in filename:
        return False
    return filename.rsplit(".", 1)[1].lower() in {"jpg", "jpeg", "png"}


@bp.route("/users/<user_id>", methods=["PUT"])
@require_admin
def update_user(user_id):
    """Update user profile (admin only). Accepts JSON or multipart/form-data (for profile image)."""
    try:
        import json as json_module
        from backend.routes.profile import UpdateProfileSchema

        user = User.query.get(user_id)
        if not user:
            return error_response("NOT_FOUND", "User not found", None, 404)
        was_approved = bool(user.is_approved)

        schema = UpdateProfileSchema()
        request_data = {}

        # Handle multipart/form-data (e.g. when profile image is uploaded)
        if request.content_type and "multipart/form-data" in request.content_type:
            for key in [
                "full_name",
                "surname",
                "phone",
                "gender",
                "sa_id",
                "highest_qualification",
                "professional_body",
                "driver_license_number",
                "driver_license_code",
                "driver_license_expiry",
                "prdp_number",
                "prdp_expiry",
                "vehicle_disk_expiry",
            ]:
                if key in request.form:
                    request_data[key] = request.form[key] or None
            if "sa_citizen" in request.form:
                request_data["sa_citizen"] = request.form["sa_citizen"].lower() in (
                    "true",
                    "1",
                    "on",
                )
            if "next_of_kin" in request.form:
                try:
                    request_data["next_of_kin"] = (
                        json_module.loads(request.form["next_of_kin"])
                        if request.form["next_of_kin"]
                        else None
                    )
                except (json_module.JSONDecodeError, ValueError):
                    request_data["next_of_kin"] = None
            for key in [
                "professional_services",
                "provider_services",
                "driver_services",
                "operating_areas",
            ]:
                if key in request.form:
                    try:
                        request_data[key] = (
                            json_module.loads(request.form[key])
                            if request.form[key]
                            else None
                        )
                    except (json_module.JSONDecodeError, ValueError):
                        request_data[key] = None
            for field in ["is_paid", "is_approved", "is_active", "email_verified"]:
                if field in request.form:
                    request_data[field] = request.form[field].lower() in (
                        "true",
                        "1",
                        "on",
                    )

            # Profile image file
            if "profile_image" in request.files:
                file = request.files["profile_image"]
                if file and file.filename and _allowed_profile_image(file.filename):
                    upload_folder = current_app.config.get("UPLOAD_FOLDER")
                    if upload_folder and not os.path.exists(upload_folder):
                        os.makedirs(upload_folder)
                    file_ext = file.filename.rsplit(".", 1)[1].lower()
                    unique_filename = (
                        f"profile_admin_{user_id[:8]}_{uuid.uuid4().hex[:8]}.{file_ext}"
                    )
                    filepath = os.path.join(upload_folder, unique_filename)
                    file.save(filepath)
                    profile_url = f"/uploads/{unique_filename}"
                    if user.profile_image_url and user.profile_image_url.startswith(
                        "/uploads/"
                    ):
                        old_path = os.path.join(
                            upload_folder,
                            user.profile_image_url.replace("/uploads/", ""),
                        )
                        if os.path.exists(old_path):
                            try:
                                os.remove(old_path)
                            except Exception as e:
                                current_app.logger.warning(
                                    f"Could not delete old profile image: {e}"
                                )
                    user.profile_image_url = profile_url
        else:
            request_data = request.get_json(silent=True) or {}

        # Extract admin-managed core account fields before profile-schema validation.
        core_fields = {}
        for field in ["email", "role", "username", "password"]:
            if field in request_data:
                core_fields[field] = request_data.pop(field)

        if "sa_id_number" in request_data and "sa_id" not in request_data:
            request_data["sa_id"] = request_data.pop("sa_id_number")
        if "is_sa_citizen" in request_data and "sa_citizen" not in request_data:
            request_data["sa_citizen"] = request_data.pop("is_sa_citizen")

        next_of_kin_fields = [
            request_data.pop("next_of_kin_name", None),
            request_data.pop("next_of_kin_phone", None),
            request_data.pop("next_of_kin_email", None),
        ]
        if (
            any(value is not None for value in next_of_kin_fields)
            and "next_of_kin" not in request_data
        ):
            request_data["next_of_kin"] = {
                "full_name": next_of_kin_fields[0],
                "contact_number": next_of_kin_fields[1],
                "contact_email": next_of_kin_fields[2],
            }

        if "driver_vehicles" in request_data and "driver_services" not in request_data:
            request_data.pop("driver_vehicles", None)

        # Extract status fields before validation (they're not in UpdateProfileSchema)
        status_fields = {}
        for field in ["is_paid", "is_approved", "is_active", "email_verified"]:
            if field in request_data:
                status_fields[field] = request_data.pop(field)

        if "email" in core_fields:
            email = (core_fields.get("email") or "").strip().lower()
            if not email:
                raise ValidationError({"email": ["Email cannot be blank."]})
            existing_user = User.query.filter(
                User.email == email, User.id != user.id
            ).first()
            if existing_user:
                return error_response(
                    "ALREADY_EXISTS", "A user with this email already exists", None, 409
                )
            user.email = email

        if "role" in core_fields:
            role = (core_fields.get("role") or "").strip()
            if role not in ALLOWED_ADMIN_USER_ROLES:
                raise ValidationError({"role": ["Invalid user role."]})
            user.role = role
            user.is_admin = role == "admin"

        if "password" in core_fields:
            password = (core_fields.get("password") or "").strip()
            if password:
                user.set_password(password)

        if "username" in core_fields:
            username = (core_fields.get("username") or "").strip()
            current_data = dict(user.data) if user.data else {}
            if username:
                current_data["username"] = username
            else:
                current_data.pop("username", None)
            user.data = current_data

        # Extract provider_services before validation (handled separately via UserSelectedService)
        provider_services_data = None
        if "provider_services" in request_data:
            provider_services_data = request_data.pop("provider_services")
        
        driver_services_data = None
        if "driver_services" in request_data:
            driver_services_data = request_data.pop("driver_services")

        # Convert empty strings to None for optional fields
        for key in [
            "full_name",
            "surname",
            "phone",
            "gender",
            "sa_id",
            "highest_qualification",
            "professional_body",
            "driver_license_number",
            "driver_license_code",
            "driver_license_expiry",
            "prdp_number",
            "prdp_expiry",
            "vehicle_disk_expiry",
        ]:
            if key in request_data and request_data[key] == "":
                request_data[key] = None

        # Handle next_of_kin object
        if "next_of_kin" in request_data:
            if isinstance(request_data["next_of_kin"], dict):
                for kin_key in ["full_name", "contact_number", "contact_email"]:
                    if (
                        kin_key in request_data["next_of_kin"]
                        and request_data["next_of_kin"][kin_key] == ""
                    ):
                        request_data["next_of_kin"][kin_key] = None
            elif request_data["next_of_kin"] == "":
                request_data["next_of_kin"] = None

        # Get existing user data or create new dict
        updated_data = dict(user.data) if user.data else {}

        # Only validate and update profile fields if any are provided
        if request_data:
            # Validate only profile fields (status fields handled separately)
            data = schema.load(request_data)

            # Extract provider_services before field mapping (handled separately via UserSelectedService)
            provider_services_data = None
            if "provider_services" in data:
                provider_services_data = data.pop("provider_services")

            # Update all fields (same logic as profile update)
            field_mappings = {
                "full_name": "full_name",
                "surname": "surname",
                "first_name": "full_name",
                "last_name": "surname",
                "phone": "phone",
                "gender": "gender",
                "sa_citizen": "sa_citizen",
                "sa_id": "sa_id",
                "next_of_kin": "next_of_kin",
                "highest_qualification": "highest_qualification",
                "professional_body": "professional_body",
                "professional_services": "professional_services",
                "driver_license_number": "driver_license_number",
                "driver_license_code": "driver_license_code",
                "driver_license_expiry": "driver_license_expiry",
                "prdp_number": "prdp_number",
                "prdp_expiry": "prdp_expiry",
                "vehicle_disk_expiry": "vehicle_disk_expiry",
                "operating_areas": "operating_areas",
            }

            for key, data_key in field_mappings.items():
                if key in data:
                    if data[key] is not None:
                        updated_data[data_key] = data[key]
                    elif data_key in updated_data:
                        if data_key != 'driver_services':
                           del updated_data[data_key]

            # Handle sa_citizen special case
            if "sa_citizen" in data and not data["sa_citizen"]:
                if "sa_id" in updated_data:
                    del updated_data["sa_id"]

        if user.role == 'driver' and driver_services_data is not None:
            if isinstance(driver_services_data, list) and len(driver_services_data) > 0:
                updated_data['driver_services'] = driver_services_data
        # Handle service provider services (UserSelectedService model)
        if user.role == "service-provider" and provider_services_data is not None:
            from backend.models import UserSelectedService

            provider_services = (
                provider_services_data
                if isinstance(provider_services_data, list)
                else []
            )

            # Delete existing services
            UserSelectedService.query.filter_by(user_id=user.id).delete()

            # Add new services
            for svc_data in provider_services:
                if svc_data.get("service_type_id"):
                    try:
                        user_service = UserSelectedService(
                            user_id=user.id,
                            service_type_id=uuid.UUID(svc_data["service_type_id"]),
                            personalized_description=svc_data.get(
                                "personalized_description"
                            ),
                        )
                        db.session.add(user_service)
                    except (ValueError, TypeError) as e:
                        current_app.logger.warning(
                            f"Invalid service_type_id: {svc_data.get('service_type_id')}"
                        )

        # Update status flags if provided (extracted before validation)
        if "is_paid" in status_fields:
            user.is_paid = bool(status_fields["is_paid"])
        if "is_approved" in status_fields:
            user.is_approved = bool(status_fields["is_approved"])
        if "is_active" in status_fields:
            user.is_active = bool(status_fields["is_active"])
        if "email_verified" in status_fields:
            user.email_verified = bool(status_fields["email_verified"])

        # Update the JSONB field
        user.data = updated_data

        final_is_approved = bool(user.is_approved)
        final_is_paid = bool(user.is_paid)
        approval_transition_requested = user.role == "driver" and not was_approved and final_is_approved
        payment_approval_blocked = (
            not was_approved and
            final_is_approved and
            not final_is_paid and
            AdminService.requires_registration_payment_before_approval(user)
        )

        if payment_approval_blocked:
            user.is_approved = False
            db.session.commit()
            try:
                EmailService.send_registration_payment_reminder(user)
            except Exception as e:
                current_app.logger.error(f"Registration payment reminder email failed: {e}")
            return success_response(
                {
                    "user": user.to_dict(),
                    "action": "payment_reminder_sent",
                },
                "Registration payment is still pending. Update saved, but the user was not approved. Reminder email sent.",
            )

        if approval_transition_requested:
            compliance = RequestService.get_driver_cab_eligibility(
                user,
                require_fresh_location=False,
                require_approval=False,
                require_payment=False,
                require_active=False,
            )
            if not compliance.get("eligible"):
                missing_labels = RequestService.humanize_driver_missing_fields(
                    compliance.get("missing_fields") or []
                )
                return error_response(
                    "DRIVER_COMPLIANCE_INCOMPLETE",
                    (
                        f"Driver compliance is incomplete. Missing: {', '.join(missing_labels)}"
                        if missing_labels else
                        "Driver compliance is incomplete."
                    ),
                    {
                        "missing_fields": compliance.get("missing_fields") or [],
                        "missing_field_labels": missing_labels,
                    },
                    400,
                )

        db.session.commit()

        return success_response({"user": user.to_dict(), "action": "updated"}, "User updated successfully")

    except ValidationError as e:
        current_app.logger.error(f"Validation error: {e.messages}")
        return error_response("VALIDATION_ERROR", "Invalid input data", e.messages, 400)
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Update user error: {str(e)}")
        return error_response("INTERNAL_ERROR", "Failed to update user", None, 500)


@bp.route("/users/<user_id>/unsuspend", methods=["PATCH"])
@require_admin
def unsuspend_user(user_id):
    try:
        user_dict, error = AdminService.unsuspend_user(user_id)
        if error:
            return error_response(
                error,
                "Failed to unsuspend user",
                None,
                404 if error == "NOT_FOUND" else 500,
            )
        return success_response(user_dict, "User unsuspended successfully")
    except Exception as e:
        current_app.logger.error(f"Unsuspend user error: {str(e)}")
        return error_response("INTERNAL_ERROR", "Failed to unsuspend user", None, 500)


@bp.route("/users/<user_id>", methods=["DELETE"])
@require_admin
def delete_user(user_id):
    try:
        success, error = AdminService.delete_user(user_id)
        if error:
            return error_response(
                error,
                "Failed to delete user",
                None,
                404 if error == "NOT_FOUND" else 500,
            )
        return success_response(None, "User deleted successfully")
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Delete user error: {str(e)}")
        return error_response(
            "INTERNAL_ERROR",
            "Cannot delete unverified users or unpaid registered users",
            None,
            500,
        )


@bp.route("/requests", methods=["GET"])
@require_admin
def list_requests():
    """List all service requests with optional filters: status, type, payment_status"""
    try:
        limit = int(request.args.get("limit", 50))
        offset = int(request.args.get("offset", 0))
        status = request.args.get("status", "").strip().lower()
        request_type = request.args.get("type", "").strip().lower()
        payment_status = request.args.get("payment_status", "").strip().lower()

        query = ServiceRequest.query

        if status:
            query = query.filter(ServiceRequest.status == status)
        if request_type:
            query = query.filter(ServiceRequest.request_type == request_type)
        if payment_status:
            query = query.filter(ServiceRequest.payment_status == payment_status)

        total = query.count()
        requests = (
            query.order_by(ServiceRequest.created_at.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )

        request_payload = []
        for r in requests:
            data = r.to_dict()
            details = r.details or {}
            requester_data = (
                (r.requester.data or {}) if r.requester and r.requester.data else {}
            )
            provider_data = (
                (r.provider.data or {}) if r.provider and r.provider.data else {}
            )

            requester_name = "Unknown"
            if r.requester:
                requester_name = (
                    f"{(requester_data.get('full_name') or '').strip()} {(requester_data.get('surname') or '').strip()}".strip()
                    or r.requester.email
                    or "Unknown"
                )

            provider_name = None
            if r.provider:
                provider_name = (
                    f"{(provider_data.get('full_name') or '').strip()} {(provider_data.get('surname') or '').strip()}".strip()
                    or r.provider.email
                )
            elif r.request_type == "cab":
                selected_driver = details.get("selected_driver") or {}
                provider_name = selected_driver.get("name")

            data.update(
                {
                    "requester_name": requester_name,
                    "provider_name": provider_name,
                    "dispatch_state": details.get("dispatch_state"),
                    "cancellation_reason": details.get("cancellation_reason"),
                    "car_type": details.get("car_type"),
                    "distance_km": data.get("distance_km"),
                }
            )
            request_payload.append(data)

        return success_response(
            {
                "requests": request_payload,
                "total": total,
                "limit": limit,
                "offset": offset,
            }
        )

    except Exception as e:
        current_app.logger.error(f"List requests error: {str(e)}")
        return error_response("INTERNAL_ERROR", "Failed to list requests", None, 500)


@bp.route("/stats", methods=["GET"])
@require_admin
def get_stats():
    try:
        stats = AdminService.get_stats()
        return success_response(stats)

    except Exception as e:
        current_app.logger.error(f"Get stats error: {str(e)}")
        return error_response("INTERNAL_ERROR", "Failed to get stats", None, 500)


@bp.route("/products", methods=["GET"])
@require_admin
def list_products():
    """List products with optional search and filters: name, status, category_id, subcategory_id"""
    try:
        limit = int(request.args.get("limit", 50))
        offset = int(request.args.get("offset", 0))
        search = (request.args.get("search") or "").strip()
        status = request.args.get("status", "").strip().lower()
        category_id = request.args.get("category_id", "").strip() or None
        subcategory_id = request.args.get("subcategory_id", "").strip() or None

        query = ShopProduct.query

        if search:
            query = query.filter(ShopProduct.name.ilike(f"%{search}%"))
        if status and status in ("active", "inactive"):
            query = query.filter(ShopProduct.status == status)
        if category_id:
            query = query.filter(ShopProduct.category_id == category_id)
        if subcategory_id:
            query = query.filter(ShopProduct.subcategory_id == subcategory_id)

        total = query.count()
        products = (
            query.order_by(ShopProduct.created_at.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )

        return success_response(
            {
                "products": [p.to_dict() for p in products],
                "total": total,
                "limit": limit,
                "offset": offset,
            }
        )

    except Exception as e:
        current_app.logger.error(f"List products error: {str(e)}")
        return error_response("INTERNAL_ERROR", "Failed to list products", None, 500)


@bp.route("/products", methods=["POST"])
@require_admin
def create_product():
    """Create a new product"""
    try:
        image_url = None

        # Support both JSON and multipart/form-data (for image uploads)
        if request.content_type and "multipart/form-data" in request.content_type:
            form = request.form
            name = form.get("name")
            description = form.get("description", "")
            price = form.get("price")
            category_id = form.get("category_id", "").strip() or None
            subcategory_id = form.get("subcategory_id", "").strip() or None
            quantity_raw = form.get("quantity", "0")
            try:
                quantity = int(quantity_raw)
            except (TypeError, ValueError):
                quantity = 0

            product_type = form.get("product_type", "simple")
            attributes = _parse_json_payload(form.get("attributes", "[]"), [])
            variations = _parse_json_payload(form.get("variations", "[]"), [])
            grouped_products = _parse_json_payload(form.get("grouped_products", "[]"), [])
            external_url = form.get("external_url", "").strip() or None
            button_text = (
                form.get("button_text", "Buy Product").strip() or "Buy Product"
            )
            _shipping_provided, shipping_profile = _extract_product_shipping_profile(form)

            image_files = request.files.getlist("image_files")
        else:
            data = request.get_json(silent=True) or {}
            name = data.get("name")
            description = data.get("description", "")
            price = data.get("price")
            category_id = data.get("category_id", "").strip() or None
            subcategory_id = data.get("subcategory_id", "").strip() or None
            quantity = data.get("quantity", 0)  # Initial inventory quantity

            product_type = data.get("product_type", "simple")
            attributes = data.get("attributes", [])
            variations = data.get("variations", [])
            grouped_products = data.get("grouped_products", [])
            external_url = data.get("external_url", "").strip() or None
            button_text = (
                data.get("button_text", "Buy Product").strip() or "Buy Product"
            )
            _shipping_provided, shipping_profile = _extract_product_shipping_profile(data)

            image_files = []

        if not name or not price:
            return error_response(
                "MISSING_FIELDS", "Name and price are required", None, 400
            )

        attributes = ShopProduct.with_shipping_profile(attributes, shipping_profile)

        # Generate product ID
        product_id = f"PROD-{uuid.uuid4().hex[:12].upper()}"

        # Handle multiple image files
        image_url = None
        if image_files:
            upload_folder = current_app.config.get("UPLOAD_FOLDER")
            if upload_folder and not os.path.exists(upload_folder):
                os.makedirs(upload_folder)

            for idx, image_file in enumerate(image_files):
                if (
                    image_file
                    and image_file.filename
                    and _allowed_image_file(image_file.filename)
                ):
                    ext = image_file.filename.rsplit(".", 1)[1].lower()
                    unique_filename = f"{product_id}_img_{uuid.uuid4().hex[:8]}.{ext}"
                    filepath = os.path.join(upload_folder, unique_filename)
                    image_file.save(filepath)

                    # First image becomes primary and sets product.image_url
                    if idx == 0:
                        image_url = f"/uploads/{unique_filename}"

                    # Create ProductImage record
                    product_image = ProductImage(
                        product_id=product_id,
                        image_url=f"/uploads/{unique_filename}",
                        is_primary=(idx == 0),
                        order=idx + 1,
                    )
                    db.session.add(product_image)

        # Create product
        product = ShopProduct(
            id=product_id,
            name=name,
            description=description,
            price=price,
            category_id=category_id,
            subcategory_id=subcategory_id,
            product_type=product_type,
            attributes=attributes,
            variations=variations,
            grouped_products=grouped_products,
            external_url=external_url,
            button_text=button_text,
            image_url=image_url,  # Legacy field, kept for backward compatibility
            status="active",
            in_stock=True,
        )
        db.session.add(product)
        db.session.flush()  # Get product ID

        # Create inventory record
        inventory_id = f"INV-{uuid.uuid4().hex[:12].upper()}"
        inventory = Inventory(
            id=inventory_id,
            product_id=product_id,
            quantity=quantity,
            reserved_quantity=0,
        )
        db.session.add(inventory)
        db.session.commit()

        # Return product with images
        product_dict = product.to_dict()
        images = (
            ProductImage.query.filter_by(product_id=product_id)
            .order_by(ProductImage.order.asc(), ProductImage.created_at.asc())
            .all()
        )
        product_dict["images"] = [img.to_dict() for img in images]

        return success_response(product_dict, "Product created successfully")

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Create product error: {str(e)}", exc_info=True)
        return error_response(
            "INTERNAL_ERROR", f"Failed to create product: {str(e)}", None, 500
        )


@bp.route("/products/<product_id>", methods=["GET"])
@require_admin
def get_product(product_id):
    """Get a single product with images"""
    try:
        product = ShopProduct.query.get(product_id)
        if not product:
            return error_response("NOT_FOUND", "Product not found", None, 404)

        product_dict = product.to_dict()

        # Get all images for this product
        images = (
            ProductImage.query.filter_by(product_id=product_id)
            .order_by(ProductImage.order.asc(), ProductImage.created_at.asc())
            .all()
        )
        product_dict["images"] = [img.to_dict() for img in images]

        return success_response(product_dict)

    except Exception as e:
        current_app.logger.error(f"Get product error: {str(e)}")
        return error_response("INTERNAL_ERROR", "Failed to get product", None, 500)


@bp.route("/products/<product_id>", methods=["PATCH"])
@require_admin
def update_product(product_id):
    """Update a product with support for multiple images, categories, and subcategories"""
    try:
        product = ShopProduct.query.get(product_id)
        if not product:
            return error_response("NOT_FOUND", "Product not found", None, 404)

        # Support both JSON and multipart/form-data (for image uploads)
        if request.content_type and "multipart/form-data" in request.content_type:
            form = request.form
            parsed_attributes = None
            shipping_provided, shipping_profile = _extract_product_shipping_profile(form)
            if "name" in form:
                product.name = form.get("name") or product.name
            if "description" in form:
                product.description = form.get("description", "")
            if "price" in form:
                try:
                    product.price = float(form.get("price"))
                except (TypeError, ValueError):
                    pass
            if "category_id" in form:
                category_id_val = form.get("category_id", "").strip()
                product.category_id = category_id_val if category_id_val else None
            if "subcategory_id" in form:
                subcategory_id_val = form.get("subcategory_id", "").strip()
                product.subcategory_id = (
                    subcategory_id_val if subcategory_id_val else None
                )

            if "product_type" in form:
                product.product_type = form.get("product_type", "simple")
            if "attributes" in form:
                candidate_attributes = _parse_json_payload(form.get("attributes", "[]"), None)
                if candidate_attributes is not None:
                    parsed_attributes = candidate_attributes
            if "variations" in form:
                candidate_variations = _parse_json_payload(form.get("variations", "[]"), None)
                if candidate_variations is not None:
                    product.variations = candidate_variations
            if "grouped_products" in form:
                candidate_grouped_products = _parse_json_payload(
                    form.get("grouped_products", "[]"),
                    None,
                )
                if candidate_grouped_products is not None:
                    product.grouped_products = candidate_grouped_products
            if "external_url" in form:
                product.external_url = form.get("external_url", "").strip() or None
            if "button_text" in form:
                product.button_text = (
                    form.get("button_text", "Buy Product").strip() or "Buy Product"
                )

            if parsed_attributes is not None or shipping_provided:
                base_attributes = (
                    parsed_attributes if parsed_attributes is not None else product.attributes
                )
                effective_shipping_profile = (
                    shipping_profile
                    if shipping_provided
                    else ShopProduct.extract_shipping_profile(product.attributes)
                )
                product.attributes = ShopProduct.with_shipping_profile(
                    base_attributes,
                    effective_shipping_profile,
                )

            # Handle multiple image files
            image_files = request.files.getlist("image_files")
            if image_files:
                upload_folder = current_app.config.get("UPLOAD_FOLDER")
                if upload_folder and not os.path.exists(upload_folder):
                    os.makedirs(upload_folder)

                # Get current max order
                max_order = (
                    db.session.query(db.func.max(ProductImage.order))
                    .filter_by(product_id=product_id)
                    .scalar()
                    or 0
                )

                for idx, image_file in enumerate(image_files):
                    if (
                        image_file
                        and image_file.filename
                        and _allowed_image_file(image_file.filename)
                    ):
                        ext = image_file.filename.rsplit(".", 1)[1].lower()
                        unique_filename = (
                            f"{product_id}_img_{uuid.uuid4().hex[:8]}.{ext}"
                        )
                        filepath = os.path.join(upload_folder, unique_filename)
                        image_file.save(filepath)

                        # Check if this should be primary (first image or if no primary exists)
                        is_primary = False
                        if idx == 0:
                            existing_primary = ProductImage.query.filter_by(
                                product_id=product_id, is_primary=True
                            ).first()
                            if not existing_primary:
                                is_primary = True

                        product_image = ProductImage(
                            product_id=product_id,
                            image_url=f"/uploads/{unique_filename}",
                            is_primary=is_primary,
                            order=max_order + idx + 1,
                        )
                        db.session.add(product_image)

            # Handle deleted image IDs
            deleted_image_ids = form.get("deleted_image_ids", "")
            if deleted_image_ids:
                try:
                    deleted_ids = (
                        json.loads(deleted_image_ids)
                        if isinstance(deleted_image_ids, str)
                        else deleted_image_ids
                    )
                    for img_id in deleted_ids:
                        img = ProductImage.query.get(img_id)
                        if img and img.product_id == product_id:
                            # Delete file from disk
                            if img.image_url and img.image_url.startswith("/uploads/"):
                                file_path = os.path.join(
                                    current_app.config.get("UPLOAD_FOLDER", ""),
                                    img.image_url.replace("/uploads/", ""),
                                )
                                if os.path.exists(file_path):
                                    try:
                                        os.remove(file_path)
                                    except:
                                        pass
                            db.session.delete(img)
                except:
                    pass

            # Handle primary image change
            primary_image_id = form.get("primary_image_id")
            if primary_image_id:
                # Unset all primary flags
                ProductImage.query.filter_by(product_id=product_id).update(
                    {"is_primary": False}
                )
                # Set new primary
                primary_img = ProductImage.query.get(primary_image_id)
                if primary_img and primary_img.product_id == product_id:
                    primary_img.is_primary = True

            if "quantity" in form:
                try:
                    quantity_val = int(form.get("quantity"))
                except (TypeError, ValueError):
                    quantity_val = None

                if quantity_val is not None:
                    inventory = Inventory.query.filter_by(product_id=product_id).first()
                    if inventory:
                        inventory.quantity = quantity_val
                    else:
                        inventory_id = f"INV-{uuid.uuid4().hex[:12].upper()}"
                        inventory = Inventory(
                            id=inventory_id,
                            product_id=product_id,
                            quantity=quantity_val,
                            reserved_quantity=0,
                        )
                        db.session.add(inventory)
        else:
            data = request.get_json(silent=True) or {}
            shipping_provided, shipping_profile = _extract_product_shipping_profile(data)
            parsed_attributes = None

            if "name" in data:
                product.name = data["name"]
            if "description" in data:
                product.description = data.get("description", "")
            if "price" in data:
                product.price = data["price"]
            if "category_id" in data:
                product.category_id = data.get("category_id")
            if "subcategory_id" in data:
                product.subcategory_id = data.get("subcategory_id")

            if "product_type" in data:
                product.product_type = data["product_type"]
            if "attributes" in data:
                parsed_attributes = data["attributes"]
            if "variations" in data:
                product.variations = data["variations"]
            if "grouped_products" in data:
                product.grouped_products = data["grouped_products"]
            if "external_url" in data:
                product.external_url = data.get("external_url", "").strip() or None
            if "button_text" in data:
                product.button_text = (
                    data.get("button_text", "Buy Product").strip() or "Buy Product"
                )

            if parsed_attributes is not None or shipping_provided:
                base_attributes = (
                    parsed_attributes if parsed_attributes is not None else product.attributes
                )
                effective_shipping_profile = (
                    shipping_profile
                    if shipping_provided
                    else ShopProduct.extract_shipping_profile(product.attributes)
                )
                product.attributes = ShopProduct.with_shipping_profile(
                    base_attributes,
                    effective_shipping_profile,
                )

            if "quantity" in data:
                inventory = Inventory.query.filter_by(product_id=product_id).first()
                if inventory:
                    inventory.quantity = data["quantity"]
                else:
                    inventory_id = f"INV-{uuid.uuid4().hex[:12].upper()}"
                    inventory = Inventory(
                        id=inventory_id,
                        product_id=product_id,
                        quantity=data["quantity"],
                        reserved_quantity=0,
                    )
                    db.session.add(inventory)

        db.session.commit()

        # Return updated product with images
        product_dict = product.to_dict()
        images = (
            ProductImage.query.filter_by(product_id=product_id)
            .order_by(ProductImage.order.asc(), ProductImage.created_at.asc())
            .all()
        )
        product_dict["images"] = [img.to_dict() for img in images]

        return success_response(product_dict, "Product updated successfully")

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Update product error: {str(e)}")
        return error_response("INTERNAL_ERROR", "Failed to update product", None, 500)


@bp.route("/products/<product_id>/activate", methods=["PATCH"])
@require_admin
def activate_product(product_id):
    """Activate a product"""
    try:
        product = ShopProduct.query.get(product_id)
        if not product:
            return error_response("NOT_FOUND", "Product not found", None, 404)

        product.status = "active"
        db.session.commit()

        return success_response(product.to_dict(), "Product activated successfully")

    except Exception as e:
        current_app.logger.error(f"Activate product error: {str(e)}")
        return error_response("INTERNAL_ERROR", "Failed to activate product", None, 500)


@bp.route("/products/<product_id>/deactivate", methods=["PATCH"])
@require_admin
def deactivate_product(product_id):
    """Deactivate a product"""
    try:
        product = ShopProduct.query.get(product_id)
        if not product:
            return error_response("NOT_FOUND", "Product not found", None, 404)

        product.status = "inactive"
        db.session.commit()

        return success_response(product.to_dict(), "Product deactivated successfully")

    except Exception as e:
        current_app.logger.error(f"Deactivate product error: {str(e)}")
        return error_response(
            "INTERNAL_ERROR", "Failed to deactivate product", None, 500
        )


@bp.route("/products/<product_id>/inventory", methods=["PATCH"])
@require_admin
def update_inventory(product_id):
    """Update product inventory quantity"""
    try:
        product = ShopProduct.query.get(product_id)
        if not product:
            return error_response("NOT_FOUND", "Product not found", None, 404)

        data = request.get_json(silent=True)
        quantity = data.get("quantity")

        if quantity is None:
            return error_response("MISSING_FIELDS", "Quantity is required", None, 400)

        inventory = Inventory.query.filter_by(product_id=product_id).first()
        if inventory:
            inventory.quantity = quantity
        else:
            # Create inventory if it doesn't exist
            inventory_id = f"INV-{uuid.uuid4().hex[:12].upper()}"
            inventory = Inventory(
                id=inventory_id,
                product_id=product_id,
                quantity=quantity,
                reserved_quantity=0,
            )
            db.session.add(inventory)

        db.session.commit()

        return success_response(product.to_dict(), "Inventory updated successfully")

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Update inventory error: {str(e)}")
        return error_response("INTERNAL_ERROR", "Failed to update inventory", None, 500)


@bp.route("/categories", methods=["GET"])
@require_admin
def list_categories():
    """List all categories for product creation"""
    try:
        categories = ShopCategory.query.order_by(ShopCategory.title).all()
        return success_response({"categories": [c.to_dict() for c in categories]})
    except Exception as e:
        current_app.logger.error(f"List categories error: {str(e)}")
        return error_response("INTERNAL_ERROR", "Failed to list categories", None, 500)


@bp.route("/categories", methods=["POST"])
@require_admin
def create_category():
    """Create a new category"""
    try:
        data = request.get_json(silent=True) or {}
        title = data.get("title")

        if not title:
            return error_response("MISSING_FIELDS", "Title is required", None, 400)

        category_id = f"CAT-{uuid.uuid4().hex[:12].upper()}"
        category = ShopCategory(id=category_id, title=title)
        db.session.add(category)
        db.session.commit()

        return success_response(
            category.to_dict(), "Category created successfully", 201
        )
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Create category error: {str(e)}", exc_info=True)
        return error_response(
            "INTERNAL_ERROR", f"Failed to create category: {str(e)}", None, 500
        )


@bp.route("/categories/<category_id>", methods=["PUT"])
@require_admin
def update_category(category_id):
    """Update a category"""
    try:
        category = ShopCategory.query.get(category_id)
        if not category:
            return error_response("NOT_FOUND", "Category not found", None, 404)

        data = request.get_json(silent=True) or {}
        if "title" in data:
            category.title = data["title"]

        db.session.commit()
        return success_response(category.to_dict(), "Category updated successfully")
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Update category error: {str(e)}", exc_info=True)
        return error_response(
            "INTERNAL_ERROR", f"Failed to update category: {str(e)}", None, 500
        )


@bp.route("/categories/<category_id>", methods=["DELETE"])
@require_admin
def delete_category(category_id):
    """Delete a category"""
    try:
        category = ShopCategory.query.get(category_id)
        if not category:
            return error_response("NOT_FOUND", "Category not found", None, 404)

        db.session.delete(category)
        db.session.commit()
        return success_response(None, "Category deleted successfully")
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Delete category error: {str(e)}")
        return error_response("INTERNAL_ERROR", "Failed to delete category", None, 500)


@bp.route("/subcategories", methods=["POST"])
@require_admin
def create_subcategory():
    """Create a new subcategory"""
    try:
        data = request.get_json(silent=True) or {}
        title = data.get("title")
        category_id = data.get("category_id")

        if not title or not category_id:
            return error_response(
                "MISSING_FIELDS", "Title and category_id are required", None, 400
            )

        subcategory_id = f"SUBCAT-{uuid.uuid4().hex[:12].upper()}"
        subcategory = ShopSubcategory(
            id=subcategory_id, category_id=category_id, title=title
        )
        db.session.add(subcategory)
        db.session.commit()

        return success_response(
            subcategory.to_dict(), "Subcategory created successfully", 201
        )
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Create subcategory error: {str(e)}", exc_info=True)
        return error_response(
            "INTERNAL_ERROR", f"Failed to create subcategory: {str(e)}", None, 500
        )


@bp.route("/subcategories/<subcategory_id>", methods=["PUT"])
@require_admin
def update_subcategory(subcategory_id):
    """Update a subcategory"""
    try:
        subcategory = ShopSubcategory.query.get(subcategory_id)
        if not subcategory:
            return error_response("NOT_FOUND", "Subcategory not found", None, 404)

        data = request.get_json(silent=True) or {}
        if "title" in data:
            subcategory.title = data["title"]
        if "category_id" in data:
            subcategory.category_id = data["category_id"]

        db.session.commit()
        return success_response(
            subcategory.to_dict(), "Subcategory updated successfully"
        )
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Update subcategory error: {str(e)}")
        return error_response(
            "INTERNAL_ERROR", "Failed to update subcategory", None, 500
        )


@bp.route("/subcategories/<subcategory_id>", methods=["DELETE"])
@require_admin
def delete_subcategory(subcategory_id):
    """Delete a subcategory"""
    try:
        subcategory = ShopSubcategory.query.get(subcategory_id)
        if not subcategory:
            return error_response("NOT_FOUND", "Subcategory not found", None, 404)

        db.session.delete(subcategory)
        db.session.commit()
        return success_response(None, "Subcategory deleted successfully")
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Delete subcategory error: {str(e)}")
        return error_response(
            "INTERNAL_ERROR", "Failed to delete subcategory", None, 500
        )


@bp.route("/service-types", methods=["GET"])
@require_admin
def list_service_types():
    """List all service types"""
    try:
        category = request.args.get("category")
        is_active = request.args.get("is_active")

        query = ServiceType.query
        if category:
            query = query.filter_by(category=category)
        if is_active is not None:
            query = query.filter_by(is_active=(is_active.lower() == "true"))

        service_types = query.order_by(
            ServiceType.order.asc(), ServiceType.name.asc()
        ).all()
        return success_response(
            {"service_types": [st.to_dict() for st in service_types]}
        )
    except Exception as e:
        current_app.logger.error(f"List service types error: {str(e)}")
        return error_response(
            "INTERNAL_ERROR", "Failed to list service types", None, 500
        )


@bp.route("/service-types", methods=["POST"])
@require_admin
def create_service_type():
    """Create a new service type"""
    try:
        data = request.get_json(silent=True) or {}
        name = data.get("name")
        category = data.get("category")

        if not name or not category:
            return error_response(
                "MISSING_FIELDS", "Name and category are required", None, 400
            )

        service_type = ServiceType(
            name=name,
            description=data.get("description"),
            category=category,
            order=data.get("order", 0),
            is_active=data.get("is_active", True),
        )
        db.session.add(service_type)
        db.session.commit()

        return success_response(
            service_type.to_dict(), "Service type created successfully", 201
        )
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Create service type error: {str(e)}")
        return error_response(
            "INTERNAL_ERROR", "Failed to create service type", None, 500
        )


@bp.route("/service-types/<service_type_id>", methods=["PUT"])
@require_admin
def update_service_type(service_type_id):
    """Update a service type"""
    try:
        service_type = ServiceType.query.get(service_type_id)
        if not service_type:
            return error_response("NOT_FOUND", "Service type not found", None, 404)

        data = request.get_json(silent=True) or {}
        if "name" in data:
            service_type.name = data["name"]
        if "description" in data:
            service_type.description = data["description"]
        if "category" in data:
            service_type.category = data["category"]
        if "order" in data:
            service_type.order = data["order"]
        if "is_active" in data:
            service_type.is_active = data["is_active"]

        db.session.commit()
        return success_response(
            service_type.to_dict(), "Service type updated successfully"
        )
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Update service type error: {str(e)}")
        return error_response(
            "INTERNAL_ERROR", "Failed to update service type", None, 500
        )


@bp.route("/service-types/<service_type_id>", methods=["DELETE"])
@require_admin
def delete_service_type(service_type_id):
    """Delete a service type"""
    try:
        service_type = ServiceType.query.get(service_type_id)
        if not service_type:
            return error_response("NOT_FOUND", "Service type not found", None, 404)

        db.session.delete(service_type)
        db.session.commit()
        return success_response(None, "Service type deleted successfully")
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Delete service type error: {str(e)}")
        return error_response(
            "INTERNAL_ERROR", "Failed to delete service type", None, 500
        )


@bp.route("/orders", methods=["GET"])
@require_admin
def list_orders():
    """List all orders for sales reconciliation"""
    try:
        from backend.models.shop import Order

        limit = int(request.args.get("limit", 100))
        offset = int(request.args.get("offset", 0))

        orders = (
            Order.query.order_by(Order.placed_at.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )
        total = Order.query.count()

        return success_response(
            {"orders": [o.to_dict() for o in orders], "total": total}
        )
    except Exception as e:
        current_app.logger.error(f"List orders error: {str(e)}")
        return error_response("INTERNAL_ERROR", "Failed to list orders", None, 500)


@bp.route("/payments", methods=["GET"])
@require_admin
def list_payments():
    """List all payments for sales reconciliation"""
    try:
        limit = int(request.args.get("limit", 100))
        offset = int(request.args.get("offset", 0))

        payments = (
            Payment.query.order_by(Payment.created_at.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )
        total = Payment.query.count()

        # Enhance payment data with user email if available
        payments_data = []
        for payment in payments:
            payment_dict = payment.to_dict()
            # Try to extract user email from external_id if it's a registration payment
            if payment.external_id and payment.external_id.startswith("reg_fee_"):
                try:
                    parts = payment.external_id.split("_")
                    if len(parts) >= 4:
                        user_id_hex = "_".join(parts[2:-1])
                        user_id_hex_clean = user_id_hex.replace("-", "")
                        if len(user_id_hex_clean) == 32:
                            user_id_str = f"{user_id_hex_clean[:8]}-{user_id_hex_clean[8:12]}-{user_id_hex_clean[12:16]}-{user_id_hex_clean[16:20]}-{user_id_hex_clean[20:32]}"
                            user_id = uuid.UUID(user_id_str)
                            user = User.query.get(user_id)
                            if user:
                                payment_dict["user_email"] = user.email
                except:
                    pass
            payments_data.append(payment_dict)

        return success_response({"payments": payments_data, "total": total})
    except Exception as e:
        current_app.logger.error(f"List payments error: {str(e)}")
        return error_response("INTERNAL_ERROR", "Failed to list payments", None, 500)


def _get_callout_fee_value(
    key: str, fallback_key: str = "callout_fee_amount", default: float = 150.0
) -> float:
    """Get call-out fee from app_settings with fallback."""
    setting = AppSetting.query.get(key) or AppSetting.query.get(fallback_key)
    return float(setting.value) if setting else default


@bp.route("/settings", methods=["GET"])
def list_settings():
    """List all application settings. Authenticated users can view."""
    try:
        settings = AppSetting.query.all()
        # Map 'key' to 'id' for frontend compatibility
        settings_data = []
        for s in settings:
            d = s.to_dict()
            d["id"] = s.key
            settings_data.append(d)
        return success_response(settings_data)
    except Exception as e:
        current_app.logger.error(f"List settings error: {str(e)}")
        return error_response("INTERNAL_ERROR", "Failed to list settings", None, 500)


@bp.route("/settings/callout-fee", methods=["GET"])
@require_auth
def get_callout_fee():
    """
    Get the professional call-out fee (for backward compatibility).
    Prefer GET /settings/callout-fees for both professional and provider fees.
    """
    try:
        amount = _get_callout_fee_value("professional_callout_fee_amount")
        return success_response({"amount": amount})
    except Exception as e:
        current_app.logger.error(f"Get call-out fee error: {str(e)}")
        return error_response("INTERNAL_ERROR", "Failed to get call-out fee", None, 500)


@bp.route("/settings/callout-fees", methods=["GET"])
@require_auth
def get_callout_fees():
    """
    Get professional and service-provider call-out fees (admin-configured, db-based).
    All authenticated users can view. Used by Request Professional and Request Service Provider pages.
    """
    try:
        professional = _get_callout_fee_value("professional_callout_fee_amount")
        provider = _get_callout_fee_value("provider_callout_fee_amount")
        return success_response(
            {
                "professional_callout_fee": professional,
                "provider_callout_fee": provider,
            }
        )
    except Exception as e:
        current_app.logger.error(f"Get call-out fees error: {str(e)}")
        return error_response(
            "INTERNAL_ERROR", "Failed to get call-out fees", None, 500
        )


@bp.route("/settings/callout-fees", methods=["PATCH"])
@require_admin
def update_callout_fees():
    """
    Update professional and/or service-provider call-out fees. Admin only.
    Accepts { professional_callout_fee?, provider_callout_fee? }; updates only provided keys.
    """
    try:
        data = request.get_json(silent=True) or {}
        updated = {}

        for key, setting_key in [
            ("professional_callout_fee", "professional_callout_fee_amount"),
            ("provider_callout_fee", "provider_callout_fee_amount"),
        ]:
            amount = data.get(key)
            if amount is None:
                continue
            try:
                amount_value = float(amount)
            except (TypeError, ValueError):
                return error_response(
                    "INVALID_AMOUNT", f"{key} must be a number", None, 400
                )
            if amount_value < 0:
                return error_response(
                    "INVALID_AMOUNT", f"{key} must be non-negative", None, 400
                )
            setting = AppSetting.query.get(setting_key)
            if not setting:
                setting = AppSetting(key=setting_key, value=amount_value)
                db.session.add(setting)
            else:
                setting.value = amount_value
            updated[key] = amount_value

        if not updated:
            return error_response(
                "MISSING_FIELDS",
                "Provide at least one of professional_callout_fee, provider_callout_fee",
                None,
                400,
            )

        db.session.commit()
        return success_response(updated, "Call-out fee(s) updated successfully")
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Update call-out fees error: {str(e)}")
        return error_response(
            "INTERNAL_ERROR", "Failed to update call-out fees", None, 500
        )


@bp.route("/settings/callout-fee", methods=["PATCH"])
@require_admin
def update_callout_fee():
    """
    Update the professional call-out fee (legacy single-fee endpoint).
    Prefer PATCH /settings/callout-fees to set both professional and provider fees.
    """
    try:
        data = request.get_json(silent=True) or {}
        amount = data.get("amount")
        if amount is None:
            return error_response("MISSING_FIELDS", "amount is required", None, 400)
        try:
            amount_value = float(amount)
        except (TypeError, ValueError):
            return error_response(
                "INVALID_AMOUNT", "amount must be a number", None, 400
            )
        if amount_value < 0:
            return error_response(
                "INVALID_AMOUNT", "amount must be non-negative", None, 400
            )
        setting_key = "professional_callout_fee_amount"
        setting = AppSetting.query.get(setting_key)
        if not setting:
            setting = AppSetting(key=setting_key, value=amount_value)
            db.session.add(setting)
        else:
            setting.value = amount_value
        db.session.commit()
        return success_response(
            {"amount": amount_value}, "Call-out fee updated successfully"
        )
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Update call-out fee error: {str(e)}")
        return error_response(
            "INTERNAL_ERROR", "Failed to update call-out fee", None, 500
        )


# ---------- Legal content (Terms of Use, Privacy Policy): text or PDF ----------
LEGAL_KEYS = {"terms": "legal_terms_of_use", "privacy": "legal_privacy_policy"}
LEGAL_PDF_FILENAMES = {"terms": "legal_terms.pdf", "privacy": "legal_privacy.pdf"}


def _get_legal_content(key: str):
    """Return { content_type, text?, file_url? } for public or admin."""
    setting_key = LEGAL_KEYS.get(key)
    if not setting_key:
        return None
    setting = AppSetting.query.get(setting_key)
    if not setting or not isinstance(setting.value, dict):
        return {"content_type": "text", "text": "", "file_url": None}
    v = setting.value
    content_type = v.get("content_type") or "text"
    text = v.get("text") or ""
    file_url = None
    if content_type == "pdf" and v.get("filename"):
        file_url = f"/uploads/{v['filename']}"
    return {"content_type": content_type, "text": text, "file_url": file_url}


@bp.route("/legal/<page>", methods=["GET"])
def get_legal_content(page):
    """Get Terms of Use or Privacy Policy content (content_type: text | pdf, text, file_url). Public."""
    if page not in LEGAL_KEYS:
        return error_response("NOT_FOUND", "Unknown legal page", None, 404)
    try:
        data = _get_legal_content(page)
        return success_response(data)
    except Exception as e:
        current_app.logger.error(f"Get legal content error: {str(e)}")
        return error_response(
            "INTERNAL_ERROR", "Failed to get legal content", None, 500
        )


@bp.route("/legal/<page>", methods=["PATCH"])
@require_admin
def update_legal_content(page):
    """
    Update Terms of Use or Privacy Policy. Admin only.
    Accepts multipart/form-data: content_type (text|pdf), text (if text), file (if pdf).
    """
    if page not in LEGAL_KEYS:
        return error_response("NOT_FOUND", "Unknown legal page", None, 404)
    try:
        setting_key = LEGAL_KEYS[page]
        content_type = request.form.get("content_type", "text").strip().lower()
        if content_type not in ("text", "pdf"):
            return error_response(
                "INVALID_INPUT", "content_type must be text or pdf", None, 400
            )

        if content_type == "text":
            text = request.form.get("text", "")
            value = {"content_type": "text", "text": text, "filename": None}
        else:
            # PDF: require file upload
            file = request.files.get("file")
            if not file or not file.filename:
                return error_response(
                    "MISSING_FIELDS", "file is required for PDF content type", None, 400
                )
            if not file.filename.lower().endswith(".pdf"):
                return error_response("INVALID_INPUT", "File must be a PDF", None, 400)
            upload_folder = current_app.config.get("UPLOAD_FOLDER")
            if not upload_folder:
                return error_response(
                    "INTERNAL_ERROR", "Upload folder not configured", None, 500
                )
            os.makedirs(upload_folder, exist_ok=True)
            filename = LEGAL_PDF_FILENAMES[page]
            filepath = os.path.join(upload_folder, filename)
            file.save(filepath)
            value = {"content_type": "pdf", "text": None, "filename": filename}
            setting = AppSetting.query.get(setting_key)
            if not setting:
                setting = AppSetting(key=setting_key, value=value)
                db.session.add(setting)
            else:
                setting.value = value
            db.session.commit()
            return success_response(
                _get_legal_content(page), "Legal content updated successfully"
            )

        setting = AppSetting.query.get(setting_key)
        if not setting:
            setting = AppSetting(key=setting_key, value=value)
            db.session.add(setting)
        else:
            setting.value = value
        db.session.commit()
        return success_response(
            _get_legal_content(page), "Legal content updated successfully"
        )
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Update legal content error: {str(e)}")
        return error_response(
            "INTERNAL_ERROR", "Failed to update legal content", None, 500
        )


# ---------- Recon (month-end earnings transfer) ----------
@bp.route("/recon/trigger", methods=["POST"])
@require_admin
def trigger_recon():
    """Manually trigger recon for all earner roles for a given month (YYYY-MM)."""
    try:
        from backend.services.recon_service import run_recon_for_all_earners

        data = request.get_json(silent=True) or {}
        month = data.get("month")
        if not month or len(month) != 7 or month[4] != "-":
            return error_response("INVALID_INPUT", "month must be YYYY-MM", None, 400)
        results = run_recon_for_all_earners(month)
        return success_response({"month": month, "transferred": results})
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Recon trigger error: {str(e)}")
        return error_response("INTERNAL_ERROR", str(e), None, 500)


# ---------- Withdrawal requests ----------
@bp.route("/withdrawal-requests", methods=["GET"])
@require_admin
def list_withdrawal_requests_admin():
    """List all withdrawal requests (earners); status paid, pending, or reversed."""
    try:
        requests = WithdrawalRequest.query.order_by(
            WithdrawalRequest.created_at.desc()
        ).all()
        out = []
        for r in requests:
            d = r.to_dict()
            if r.user:
                u = r.user
                ud = u.data or {}
                d["user_name"] = (
                    (ud.get("full_name") or "") + " " + (ud.get("surname") or "")
                )
                d["user_email"] = u.email
                d["user_role"] = u.role
            out.append(d)
        return success_response({"withdrawal_requests": out})
    except Exception as e:
        current_app.logger.error(f"List withdrawal requests admin error: {str(e)}")
        return error_response(
            "INTERNAL_ERROR", "Failed to list withdrawal requests", None, 500
        )


@bp.route("/withdrawal-requests/<wr_id>", methods=["PATCH"])
@require_admin
def update_withdrawal_request(wr_id):
    """Update withdrawal request status: paid, pending, or reversed. If reversed, credit user wallet."""
    try:
        from backend.services.wallet_service import WalletService
        from datetime import datetime, timezone

        wr = WithdrawalRequest.query.get(wr_id)
        if not wr:
            return error_response(
                "NOT_FOUND", "Withdrawal request not found", None, 404
            )
        data = request.get_json(silent=True) or {}
        status = data.get("status")
        if status not in ("pending", "paid", "reversed"):
            return error_response(
                "INVALID_INPUT", "status must be pending, paid, or reversed", None, 400
            )
        admin_notes = data.get("admin_notes")
        if status == "reversed" and wr.status != "reversed":
            wallet = WalletService.get_or_create_wallet(wr.user_id)
            WalletService.add_transaction(
                wallet_id=wallet.id,
                user_id=wr.user_id,
                transaction_type="withdrawal_reversal",
                amount=float(wr.amount),
                currency=wallet.currency or "ZAR",
                external_id=str(wr.id),
                description="Withdrawal reversed",
                metadata={"withdrawal_request_id": str(wr.id)},
            )
        wr.status = status
        wr.processed_at = (
            datetime.now(timezone.utc) if status in ("paid", "reversed") else None
        )
        if admin_notes is not None:
            wr.admin_notes = admin_notes
        db.session.commit()
        return success_response(wr.to_dict(), "Withdrawal request updated")
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Update withdrawal request error: {str(e)}")
        return error_response("INTERNAL_ERROR", str(e), None, 500)


@bp.route("/settings/driver-admin-fee-rate", methods=["GET"])
@require_auth
def get_driver_admin_fee_rate():
    """
    Get the admin fee rate (percentage) applied to driver earnings from completed rides.
    All authenticated users can view the admin fee rate.
    Returns rate as a decimal (e.g., 0.15 for 15%).
    """
    try:
        setting_key = "driver_admin_fee_rate"
        setting = AppSetting.query.get(setting_key)
        # Default to 10% (0.10) if not yet configured
        rate = float(setting.value) if setting else 0.10
        return success_response({"rate": rate, "percentage": rate * 100})
    except Exception as e:
        current_app.logger.error(f"Get driver admin fee rate error: {str(e)}")
        return error_response(
            "INTERNAL_ERROR", "Failed to get driver admin fee rate", None, 500
        )


@bp.route("/settings/driver-admin-fee-rate", methods=["PATCH"])
@require_admin
def update_driver_admin_fee_rate():
    """
    Update the admin fee rate (percentage) applied to driver earnings from completed rides.
    Only admins can update the admin fee rate.
    Accepts rate as a decimal (0-1) or percentage (0-100).
    """
    try:
        setting_key = "driver_admin_fee_rate"
        data = request.get_json(silent=True) or {}
        rate = data.get("rate")
        percentage = data.get("percentage")

        # Accept either 'rate' (decimal) or 'percentage' (0-100)
        if rate is None and percentage is None:
            return error_response(
                "MISSING_FIELDS", "rate or percentage is required", None, 400
            )

        if rate is not None:
            try:
                rate_value = float(rate)
            except (TypeError, ValueError):
                return error_response(
                    "INVALID_RATE", "rate must be a number", None, 400
                )
            if rate_value < 0 or rate_value > 1:
                return error_response(
                    "INVALID_RATE",
                    "rate must be between 0 and 1 (e.g., 0.15 for 15%)",
                    None,
                    400,
                )
        elif percentage is not None:
            try:
                percentage_value = float(percentage)
            except (TypeError, ValueError):
                return error_response(
                    "INVALID_PERCENTAGE", "percentage must be a number", None, 400
                )
            if percentage_value < 0 or percentage_value > 100:
                return error_response(
                    "INVALID_PERCENTAGE",
                    "percentage must be between 0 and 100",
                    None,
                    400,
                )
            rate_value = percentage_value / 100.0
        else:
            rate_value = 0.10  # Default to 10%

        setting = AppSetting.query.get(setting_key)
        if not setting:
            setting = AppSetting(key=setting_key, value=rate_value)
            db.session.add(setting)
        else:
            setting.value = rate_value

        db.session.commit()
        return success_response(
            {"rate": rate_value, "percentage": rate_value * 100},
            "Driver admin fee rate updated successfully",
        )

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Update driver admin fee rate error: {str(e)}")
        return error_response(
            "INTERNAL_ERROR", "Failed to update driver admin fee rate", None, 500
        )


# FAQ Management Routes
@bp.route("/faqs", methods=["GET"])
@require_admin
def list_faqs():
    """List all FAQs (including inactive)"""
    try:
        faqs = FAQ.query.order_by(FAQ.order.asc(), FAQ.created_at.asc()).all()

        return success_response({"faqs": [faq.to_dict() for faq in faqs]})

    except Exception as e:
        current_app.logger.error(f"List FAQs error: {str(e)}")
        return error_response("INTERNAL_ERROR", "Failed to list FAQs", None, 500)


@bp.route("/faqs", methods=["POST"])
@require_admin
def create_faq():
    """Create a new FAQ"""
    try:
        data = request.get_json(silent=True)
        question = data.get("question")
        answer = data.get("answer")
        order = data.get("order", 0)
        is_active = data.get("is_active", True)

        if not question or not answer:
            return error_response(
                "MISSING_FIELDS", "Question and answer are required", None, 400
            )

        faq = FAQ(question=question, answer=answer, order=order, is_active=is_active)

        db.session.add(faq)
        db.session.commit()

        return success_response(faq.to_dict(), "FAQ created successfully", 201)

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Create FAQ error: {str(e)}")
        return error_response("INTERNAL_ERROR", "Failed to create FAQ", None, 500)


@bp.route("/faqs/<faq_id>", methods=["PUT"])
@require_admin
def update_faq(faq_id):
    """Update an existing FAQ"""
    try:
        faq = FAQ.query.get(faq_id)
        if not faq:
            return error_response("NOT_FOUND", "FAQ not found", None, 404)

        data = request.get_json(silent=True)
        if "question" in data:
            faq.question = data["question"]
        if "answer" in data:
            faq.answer = data["answer"]
        if "order" in data:
            faq.order = data["order"]
        if "is_active" in data:
            faq.is_active = data["is_active"]

        db.session.commit()

        return success_response(faq.to_dict(), "FAQ updated successfully")

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Update FAQ error: {str(e)}")
        return error_response("INTERNAL_ERROR", "Failed to update FAQ", None, 500)


@bp.route("/faqs/<faq_id>", methods=["DELETE"])
@require_admin
def delete_faq(faq_id):
    """Delete an FAQ"""
    try:
        faq = FAQ.query.get(faq_id)
        if not faq:
            return error_response("NOT_FOUND", "FAQ not found", None, 404)

        db.session.delete(faq)
        db.session.commit()

        return success_response(None, "FAQ deleted successfully")

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Delete FAQ error: {str(e)}")
        return error_response("INTERNAL_ERROR", "Failed to delete FAQ", None, 500)


# ---------- Carousel (home page) ----------
@bp.route("/carousel", methods=["GET"])
@require_admin
def list_carousel():
    """List all carousel items (admin)"""
    try:
        items = CarouselItem.query.order_by(
            CarouselItem.order.asc(), CarouselItem.created_at.asc()
        ).all()
        return success_response({"items": [i.to_dict() for i in items]})
    except Exception as e:
        current_app.logger.error(f"List carousel error: {str(e)}")
        return error_response("INTERNAL_ERROR", "Failed to list carousel", None, 500)


@bp.route("/carousel", methods=["POST"])
@require_admin
def create_carousel_item():
    """Create carousel item with optional image upload"""
    try:
        image_url = None
        if request.content_type and "multipart/form-data" in request.content_type:
            form = request.form
            cta_link = form.get("cta_link", "").strip() or None
            cta_text = form.get("cta_text", "").strip() or None
            order_val = form.get("order", "0")
            is_active = form.get("is_active", "true").lower() in ("true", "1", "yes")
            try:
                order = int(order_val)
            except (TypeError, ValueError):
                order = 0
            image_file = request.files.get("image_file")
            if (
                image_file
                and image_file.filename
                and _allowed_image_file(image_file.filename)
            ):
                upload_folder = current_app.config.get("UPLOAD_FOLDER")
                if upload_folder and not os.path.exists(upload_folder):
                    os.makedirs(upload_folder)
                ext = image_file.filename.rsplit(".", 1)[1].lower()
                unique_filename = f"carousel_{uuid.uuid4().hex[:12]}.{ext}"
                filepath = os.path.join(upload_folder, unique_filename)
                image_file.save(filepath)
                image_url = f"/uploads/{unique_filename}"
        else:
            data = request.get_json(silent=True) or {}
            cta_link = data.get("cta_link") or None
            cta_text = data.get("cta_text") or None
            order = data.get("order", 0)
            is_active = data.get("is_active", True)
        item = CarouselItem(
            image_url=image_url,
            cta_link=cta_link,
            cta_text=cta_text,
            order=order,
            is_active=is_active,
        )
        db.session.add(item)
        db.session.commit()
        return success_response(item.to_dict(), "Carousel item created", 201)
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Create carousel error: {str(e)}")
        return error_response(
            "INTERNAL_ERROR", "Failed to create carousel item", None, 500
        )


@bp.route("/carousel/<item_id>", methods=["PATCH"])
@require_admin
def update_carousel_item(item_id):
    """Update carousel item; optional image upload"""
    try:
        item = CarouselItem.query.get(item_id)
        if not item:
            return error_response("NOT_FOUND", "Carousel item not found", None, 404)
        if request.content_type and "multipart/form-data" in request.content_type:
            form = request.form
            if "cta_link" in form:
                item.cta_link = form.get("cta_link", "").strip() or None
            if "cta_text" in form:
                item.cta_text = form.get("cta_text", "").strip() or None
            if "order" in form:
                try:
                    item.order = int(form.get("order", 0))
                except (TypeError, ValueError):
                    pass
            if "is_active" in form:
                item.is_active = form.get("is_active", "true").lower() in (
                    "true",
                    "1",
                    "yes",
                )
            image_file = request.files.get("image_file")
            if (
                image_file
                and image_file.filename
                and _allowed_image_file(image_file.filename)
            ):
                upload_folder = current_app.config.get("UPLOAD_FOLDER")
                if upload_folder and not os.path.exists(upload_folder):
                    os.makedirs(upload_folder)
                ext = image_file.filename.rsplit(".", 1)[1].lower()
                unique_filename = f"carousel_{uuid.uuid4().hex[:12]}.{ext}"
                filepath = os.path.join(upload_folder, unique_filename)
                image_file.save(filepath)
                if item.image_url and item.image_url.startswith("/uploads/"):
                    old_path = os.path.join(
                        upload_folder, item.image_url.replace("/uploads/", "")
                    )
                    if os.path.exists(old_path):
                        try:
                            os.remove(old_path)
                        except Exception:
                            pass
                item.image_url = f"/uploads/{unique_filename}"
        else:
            data = request.get_json(silent=True) or {}
            if "cta_link" in data:
                item.cta_link = data.get("cta_link") or None
            if "cta_text" in data:
                item.cta_text = data.get("cta_text") or None
            if "order" in data:
                item.order = data.get("order", 0)
            if "is_active" in data:
                item.is_active = data.get("is_active", True)
        db.session.commit()
        return success_response(item.to_dict(), "Carousel item updated")
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Update carousel error: {str(e)}")
        return error_response(
            "INTERNAL_ERROR", "Failed to update carousel item", None, 500
        )


@bp.route("/carousel/<item_id>", methods=["DELETE"])
@require_admin
def delete_carousel_item(item_id):
    """Delete carousel item and its image file if any"""
    try:
        item = CarouselItem.query.get(item_id)
        if not item:
            return error_response("NOT_FOUND", "Carousel item not found", None, 404)
        if item.image_url and item.image_url.startswith("/uploads/"):
            upload_folder = current_app.config.get("UPLOAD_FOLDER")
            if upload_folder:
                old_path = os.path.join(
                    upload_folder, item.image_url.replace("/uploads/", "")
                )
                if os.path.exists(old_path):
                    try:
                        os.remove(old_path)
                    except Exception:
                        pass
        db.session.delete(item)
        db.session.commit()
        return success_response(None, "Carousel item deleted")
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Delete carousel error: {str(e)}")
        return error_response(
            "INTERNAL_ERROR", "Failed to delete carousel item", None, 500
        )


# ---------- Footer CMS ----------
@bp.route("/footer", methods=["GET"])
@require_admin
def get_footer_admin():
    """Get footer content (admin)"""
    try:
        footer = FooterContent.query.get(1)
        if not footer:
            footer = FooterContent(id=1, company_name="MzansiServe")
            db.session.add(footer)
            db.session.commit()
        return success_response(footer.to_dict())
    except Exception as e:
        current_app.logger.error(f"Get footer error: {str(e)}")
        return error_response("INTERNAL_ERROR", "Failed to get footer", None, 500)


@bp.route("/footer", methods=["PATCH"])
@require_admin
def update_footer():
    """Update footer content"""
    try:
        footer = FooterContent.query.get(1)
        if not footer:
            footer = FooterContent(id=1, company_name="MzansiServe")
            db.session.add(footer)
            db.session.flush()
        data = request.get_json(silent=True) or {}
        if "company_name" in data:
            footer.company_name = data.get("company_name") or ""
        if "email" in data:
            footer.email = data.get("email") or None
        if "phone" in data:
            footer.phone = data.get("phone") or None
        if "physical_address" in data:
            footer.physical_address = data.get("physical_address") or None
        db.session.commit()
        return success_response(footer.to_dict(), "Footer updated")
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Update footer error: {str(e)}")
        return error_response("INTERNAL_ERROR", "Failed to update footer", None, 500)


# ---------- Agents (for registration dropdown; display agent_id) ----------
@bp.route("/agents", methods=["GET"])
@require_admin
def list_agents_admin():
    """List all agents"""
    try:
        agents = Agent.query.order_by(Agent.agent_id).all()
        return success_response([a.to_dict() for a in agents])
    except Exception as e:
        current_app.logger.error(f"List agents error: {str(e)}")
        return error_response("INTERNAL_ERROR", "Failed to list agents", None, 500)


def _generate_agent_id():
    """Generate a short unique alphanumeric agent_id (e.g. 8 chars)."""
    import random
    import string

    chars = string.ascii_uppercase + string.digits
    for _ in range(100):
        candidate = "".join(random.choices(chars, k=8))
        if not Agent.query.filter_by(agent_id=candidate).first():
            return candidate
    return "A" + uuid.uuid4().hex[:7].upper()


@bp.route("/agents", methods=["POST"])
@require_admin
def create_agent():
    """Create a new agent. agent_id is optional; if omitted, a short alphanumeric ID is auto-generated."""
    try:
        data = request.get_json(silent=True) or {}
        name = (data.get("name") or "").strip()
        surname = (data.get("surname") or "").strip()
        id_number = (data.get("id_number") or "").strip() or None
        agent_id = (data.get("agent_id") or "").strip()
        phone = (data.get("phone") or "").strip() or None
        municipality = (data.get("municipality") or "").strip() or None
        ward = (data.get("ward") or "").strip() or None

        if not name or not surname:
            return error_response(
                "MISSING_FIELDS", "Name and surname are required", None, 400
            )
        if not agent_id:
            agent_id = _generate_agent_id()
        if Agent.query.filter_by(agent_id=agent_id).first():
            return error_response(
                "DUPLICATE", "An agent with this agent_id already exists", None, 400
            )

        agent = Agent(
            name=name,
            surname=surname,
            id_number=id_number,
            agent_id=agent_id,
            phone=phone,
            municipality=municipality,
            ward=ward,
        )
        db.session.add(agent)
        db.session.commit()
        return success_response(agent.to_dict(), "Agent created")
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Create agent error: {str(e)}")
        return error_response("INTERNAL_ERROR", "Failed to create agent", None, 500)


@bp.route("/agents/<agent_uuid>", methods=["PUT"])
@require_admin
def update_agent(agent_uuid):
    """Update an agent"""
    try:
        agent = Agent.query.get(agent_uuid)
        if not agent:
            return error_response("NOT_FOUND", "Agent not found", None, 404)
        data = request.get_json(silent=True) or {}
        if "name" in data:
            agent.name = (data.get("name") or "").strip() or agent.name
        if "surname" in data:
            agent.surname = (data.get("surname") or "").strip() or agent.surname
        if "id_number" in data:
            agent.id_number = (data.get("id_number") or "").strip() or None
        if "phone" in data:
            agent.phone = (data.get("phone") or "").strip() or None
        if "municipality" in data:
            agent.municipality = (data.get("municipality") or "").strip() or None
        if "ward" in data:
            agent.ward = (data.get("ward") or "").strip() or None
        if "agent_id" in data:
            new_agent_id = (data.get("agent_id") or "").strip()
            if not new_agent_id:
                return error_response(
                    "INVALID_FIELDS", "agent_id cannot be empty", None, 400
                )
            existing = Agent.query.filter_by(agent_id=new_agent_id).first()
            if existing and str(existing.id) != str(agent_uuid):
                return error_response(
                    "DUPLICATE", "An agent with this agent_id already exists", None, 400
                )
            agent.agent_id = new_agent_id
        db.session.commit()
        return success_response(agent.to_dict(), "Agent updated")
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Update agent error: {str(e)}")
        return error_response("INTERNAL_ERROR", "Failed to update agent", None, 500)


@bp.route("/agents/<agent_uuid>", methods=["DELETE"])
@require_admin
def delete_agent(agent_uuid):
    """Delete an agent (users.agent_id set to NULL via FK ondelete=SET NULL)"""
    try:
        agent = Agent.query.get(agent_uuid)
        if not agent:
            return error_response("NOT_FOUND", "Agent not found", None, 404)
        db.session.delete(agent)
        db.session.commit()
        return success_response(None, "Agent deleted")
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Delete agent error: {str(e)}")
        return error_response("INTERNAL_ERROR", "Failed to delete agent", None, 500)


# ---------- Pending profile updates (post-approval changes; apply when admin approves) ----------
@bp.route("/pending-profile-updates", methods=["GET"])
@require_admin
def list_pending_profile_updates():
    try:
        pending, error = AdminService.list_pending_profile_updates()
        return success_response(pending)
    except Exception as e:
        current_app.logger.error(f"List pending profile updates error: {str(e)}")
        return error_response(
            "INTERNAL_ERROR", "Failed to list pending updates", None, 500
        )


@bp.route("/pending-profile-updates/<pending_id>/approve", methods=["POST"])
@require_admin
def approve_pending_profile_update(pending_id):
    try:
        user, error = AdminService.approve_pending_profile_update(pending_id)
        if error:
            return error_response(
                error,
                "Failed to apply update",
                None,
                404 if error == "NOT_FOUND" else 400,
            )
        return success_response(user, "Profile changes applied successfully")
    except Exception as e:
        current_app.logger.error(f"Approve pending update error: {str(e)}")
        return error_response("INTERNAL_ERROR", "Failed to apply update", None, 500)


@bp.route("/pending-profile-updates/<pending_id>/reject", methods=["POST"])
@require_admin
def reject_pending_profile_update(pending_id):
    try:
        admin_id = get_jwt_identity()
        data = request.get_json(silent=True) or {}
        reason = (data.get("reason") or "").strip() or None
        success, error = AdminService.reject_pending_profile_update(
            pending_id, admin_id, reason
        )
        if error:
            return error_response(
                error,
                "Failed to reject update",
                None,
                404 if error == "NOT_FOUND" else 400,
            )
        return success_response(None, "Profile update rejected")
    except Exception as e:
        current_app.logger.error(f"Reject pending update error: {str(e)}")
        return error_response("INTERNAL_ERROR", "Failed to reject update", None, 500)


# ─── Testimonials Management ───────────────────────────────────────────────────


@bp.route("/testimonials", methods=["GET"])
@require_admin
def list_testimonials():
    """List all testimonials."""
    from backend.models.testimonial import Testimonial

    try:
        items = Testimonial.query.order_by(
            Testimonial.order.asc(), Testimonial.created_at.asc()
        ).all()
        return success_response({"testimonials": [t.to_dict() for t in items]})
    except Exception as e:
        return error_response(
            "INTERNAL_ERROR", "Failed to load testimonials", None, 500
        )


@bp.route("/testimonials", methods=["POST"])
@require_admin
def create_testimonial():
    """Create a new testimonial."""
    from backend.models.testimonial import Testimonial

    try:
        data = request.get_json(silent=True) or {}
        if not data.get("name") or not data.get("text"):
            return error_response(
                "VALIDATION_ERROR", "name and text are required", None, 400
            )
        t = Testimonial(
            name=data["name"].strip(),
            role=data.get("role", "").strip() or None,
            avatar_url=data.get("avatar_url") or None,
            rating=int(data.get("rating", 5)),
            text=data["text"].strip(),
            order=int(data.get("order", 0)),
            is_active=bool(data.get("is_active", True)),
        )
        db.session.add(t)
        db.session.commit()
        return success_response(t.to_dict(), "Testimonial created"), 201
    except Exception as e:
        db.session.rollback()
        return error_response(
            "INTERNAL_ERROR", "Failed to create testimonial", None, 500
        )


@bp.route("/testimonials/<testimonial_id>", methods=["PUT"])
@require_admin
def update_testimonial(testimonial_id):
    """Update a testimonial."""
    from backend.models.testimonial import Testimonial

    try:
        t = Testimonial.query.get(testimonial_id)
        if not t:
            return error_response("NOT_FOUND", "Testimonial not found", None, 404)
        data = request.get_json(silent=True) or {}
        if "name" in data:
            t.name = data["name"].strip()
        if "role" in data:
            t.role = data["role"].strip() or None
        if "text" in data:
            t.text = data["text"].strip()
        if "rating" in data:
            t.rating = int(data["rating"])
        if "order" in data:
            t.order = int(data["order"])
        if "is_active" in data:
            t.is_active = bool(data["is_active"])
        if "avatar_url" in data:
            t.avatar_url = data["avatar_url"] or None
        db.session.commit()
        return success_response(t.to_dict(), "Testimonial updated")
    except Exception as e:
        db.session.rollback()
        return error_response(
            "INTERNAL_ERROR", "Failed to update testimonial", None, 500
        )


@bp.route("/testimonials/<testimonial_id>", methods=["DELETE"])
@require_admin
def delete_testimonial(testimonial_id):
    """Delete a testimonial."""
    from backend.models.testimonial import Testimonial

    try:
        t = Testimonial.query.get(testimonial_id)
        if not t:
            return error_response("NOT_FOUND", "Testimonial not found", None, 404)
        db.session.delete(t)
        db.session.commit()
        return success_response(None, "Testimonial deleted")
    except Exception as e:
        db.session.rollback()
        return error_response(
            "INTERNAL_ERROR", "Failed to delete testimonial", None, 500
        )


# ─── Landing Features Management ───────────────────────────────────────────────


@bp.route("/landing-features", methods=["GET"])
@require_admin
def list_landing_features_admin():
    """List all landing features."""
    from backend.models.landing_feature import LandingFeature

    try:
        items = LandingFeature.query.order_by(
            LandingFeature.order.asc(), LandingFeature.created_at.asc()
        ).all()
        return success_response({"features": [f.to_dict() for f in items]})
    except Exception as e:
        return error_response(
            "INTERNAL_ERROR", "Failed to load landing features", None, 500
        )


@bp.route("/landing-features", methods=["POST"])
@require_admin
def create_landing_feature():
    """Create a new landing feature."""
    from backend.models.landing_feature import LandingFeature

    try:
        data = request.get_json(silent=True) or {}
        if not data.get("title") or not data.get("description"):
            return error_response(
                "VALIDATION_ERROR", "title and description are required", None, 400
            )
        f = LandingFeature(
            icon=data.get("icon", "Star").strip(),
            title=data["title"].strip(),
            description=data["description"].strip(),
            order=int(data.get("order", 0)),
            is_active=bool(data.get("is_active", True)),
        )
        db.session.add(f)
        db.session.commit()
        return success_response(f.to_dict(), "Feature created"), 201
    except Exception as e:
        db.session.rollback()
        return error_response("INTERNAL_ERROR", "Failed to create feature", None, 500)


@bp.route("/landing-features/<feature_id>", methods=["PUT"])
@require_admin
def update_landing_feature(feature_id):
    """Update a landing feature."""
    from backend.models.landing_feature import LandingFeature

    try:
        f = LandingFeature.query.get(feature_id)
        if not f:
            return error_response("NOT_FOUND", "Feature not found", None, 404)
        data = request.get_json(silent=True) or {}
        if "icon" in data:
            f.icon = data["icon"].strip()
        if "title" in data:
            f.title = data["title"].strip()
        if "description" in data:
            f.description = data["description"].strip()
        if "order" in data:
            f.order = int(data["order"])
        if "is_active" in data:
            f.is_active = bool(data["is_active"])
        db.session.commit()
        return success_response(f.to_dict(), "Feature updated")
    except Exception as e:
        db.session.rollback()
        return error_response("INTERNAL_ERROR", "Failed to update feature", None, 500)


@bp.route("/landing-features/<feature_id>", methods=["DELETE"])
@require_admin
def delete_landing_feature(feature_id):
    """Delete a landing feature."""
    from backend.models.landing_feature import LandingFeature

    try:
        f = LandingFeature.query.get(feature_id)
        if not f:
            return error_response("NOT_FOUND", "Feature not found", None, 404)
        db.session.delete(f)
        db.session.commit()
        return success_response(None, "Feature deleted")
    except Exception as e:
        db.session.rollback()
        return error_response("INTERNAL_ERROR", "Failed to delete feature", None, 500)


@bp.route("/users/<user_id>/impersonate", methods=["POST"])
@require_admin
def impersonate_user(user_id):
    """Generate a JWT token for another user (admin only)"""
    try:
        from flask_jwt_extended import create_access_token

        user = User.query.get(user_id)
        if not user:
            return error_response("NOT_FOUND", "User not found", None, 404)

        # Create token for target user
        access_token = create_access_token(identity=str(user.id))

        return success_response(
            {"user": user.to_dict(), "token": access_token},
            f"Impersonating user {user.email}",
        )

    except Exception as e:
        current_app.logger.error(f"Impersonate error: {str(e)}")
        return error_response("INTERNAL_ERROR", "Failed to impersonate user", None, 500)


@bp.route("/api-logs", methods=["GET"])
@require_admin
def list_api_logs():
    """List external API logs"""
    try:
        from backend.models.api_log import ExternalApiLog

        limit = int(request.args.get("limit", 100))
        offset = int(request.args.get("offset", 0))
        provider = request.args.get("provider")

        query = ExternalApiLog.query
        if provider:
            query = query.filter_by(provider=provider)

        total = query.count()
        logs = (
            query.order_by(ExternalApiLog.created_at.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )

        return success_response(
            {
                "logs": [l.to_dict() for l in logs],
                "total": total,
                "limit": limit,
                "offset": offset,
            }
        )

    except Exception as e:
        current_app.logger.error(f"List API logs error: {str(e)}")
        return error_response("INTERNAL_ERROR", "Failed to list API logs", None, 500)


@bp.route("/reports", methods=["GET"])
@require_admin
def list_reports():
    """List all user reports"""
    try:
        from backend.models.report import Report

        status = request.args.get("status")
        limit = int(request.args.get("limit", 100))
        offset = int(request.args.get("offset", 0))

        query = Report.query
        if status:
            query = query.filter_by(status=status)

        total = query.count()
        reports = (
            query.order_by(Report.created_at.desc()).limit(limit).offset(offset).all()
        )

        return success_response(
            {
                "reports": [r.to_dict() for r in reports],
                "total": total,
                "limit": limit,
                "offset": offset,
            }
        )
    except Exception as e:
        current_app.logger.error(f"List reports error: {str(e)}")
        return error_response("INTERNAL_ERROR", "Failed to list reports", None, 500)


@bp.route("/reports/<report_id>", methods=["PATCH"])
@require_admin
def update_report(report_id):
    """Update report status and add notes"""
    try:
        from backend.models.report import Report

        report = Report.query.get(report_id)
        if not report:
            return error_response("NOT_FOUND", "Report not found", None, 404)

        data = request.json
        status = data.get("status")
        admin_notes = data.get("admin_notes")

        if status:
            report.status = status
            if status in ("resolved", "dismissed"):
                report.resolved_at = datetime.utcnow()

        if admin_notes:
            report.admin_notes = admin_notes

        db.session.commit()
        return success_response(report.to_dict(), "Report updated successfully")
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Update report error: {str(e)}")
        return error_response("INTERNAL_ERROR", "Failed to update report", None, 500)


@bp.route("/global-stats", methods=["GET"])
@require_admin
def get_global_stats():
    try:
        stats, error = AdminService.get_global_stats()
        return success_response(stats)
    except Exception as e:
        current_app.logger.error(f"Global stats error: {str(e)}")
        return error_response("INTERNAL_ERROR", "Failed to get global stats", None, 500)


@bp.route("/chats", methods=["GET"])
@require_admin
def list_all_chats():
    """List all chat conversations for monitoring"""
    try:
        messages, error = AdminService.list_all_chats()
        return success_response(messages)
    except Exception as e:
        current_app.logger.error(f"List chats error: {str(e)}")
        return error_response("INTERNAL_ERROR", "Failed to list chats", None, 500)


@bp.route("/global-commissions", methods=["GET"])
@require_admin
def list_global_commissions():
    """List all agent commissions for monitoring"""
    try:
        commissions, error = AdminService.list_global_commissions()
        return success_response(commissions)
    except Exception as e:
        current_app.logger.error(f"List global commissions error: {str(e)}")
        return error_response("INTERNAL_ERROR", "Failed to list commissions", None, 500)


@bp.route("/affiliate-stats", methods=["GET"])
@require_admin
def get_affiliate_stats():
    """Get summarized affiliate/agent performance metrics"""
    try:
        stats, error = AdminService.get_affiliate_stats()
        return success_response(stats)
    except Exception as e:
        current_app.logger.error(f"Affiliate stats error: {str(e)}")
        return error_response(
            "INTERNAL_ERROR", "Failed to get affiliate stats", None, 500
        )


@bp.route("/settings/payment", methods=["GET"])
@require_admin
def get_payment_settings():
    try:
        settings, error = AdminService.get_payment_settings()
        return success_response(settings)
    except Exception as e:
        current_app.logger.error(f"Get payment settings error: {str(e)}")
        return error_response(
            "INTERNAL_ERROR", "Failed to get payment settings", None, 500
        )


@bp.route("/settings/payment", methods=["PATCH"])
@require_admin
def update_payment_settings():
    try:
        data = request.get_json() or {}
        success, error = AdminService.update_payment_settings(data)
        return success_response(None, "Payment settings updated successfully")
    except Exception as e:
        current_app.logger.error(f"Update payment settings error: {str(e)}")
        return error_response(
            "INTERNAL_ERROR", "Failed to update payment settings", None, 500
        )
