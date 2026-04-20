"""
Profile Service - Encapsulates logic for user profile management.
"""
import os
import uuid
import json
import logging
from flask import current_app
from backend.extensions import db
from backend.models import User, PendingProfileUpdate, Payment
from backend.services.payment_service import PaymentService
from backend.services.agent_service import AgentService
from backend.utils.url import get_public_backend_base_url, get_request_frontend_base_url

logger = logging.getLogger(__name__)

REGISTRATION_FEE_AMOUNT = 10000  # R100.00

ALLOWED_AFTER_APPROVAL_COMMON = {'phone', 'next_of_kin', 'full_name', 'surname', 'gender'}
ALLOWED_AFTER_APPROVAL_BY_ROLE = {
    'driver': {'driver_services', 'proof_of_residence_url', 'driver_license_url', 'operating_areas', 'availability'},
    'service-provider': {'provider_services', 'proof_of_residence_url', 'driver_license_url', 'operating_areas', 'availability'},
    'professional': {
        'professional_services', 'proof_of_residence_url', 'highest_qualification',
        'professional_body', 'qualification_urls', 'operating_areas', 'availability'
    },
    'client': {'full_name', 'surname', 'phone', 'gender', 'next_of_kin'},
}

class ProfileService:
    @staticmethod
    def get_profile_info(user_id):
        """Fetch comprehensive profile information for a user"""
        user = User.query.get(user_id)
        if not user:
            return None, "USER_NOT_FOUND"
            
        id_document_url = None
        if user.file_urls and isinstance(user.file_urls, list) and len(user.file_urls) > 0:
            id_document_url = user.file_urls[0]
            
        selected_agent_id = user.agent.agent_id if user.agent else None
        pending = PendingProfileUpdate.query.filter_by(
            user_id=user.id, status='pending'
        ).order_by(PendingProfileUpdate.created_at.desc()).first()
        
        return {
            'user': user.to_dict(),
            'profile_data': user.data or {},
            'registration_fee_paid': user.is_paid,
            'id_verification_status': user.id_verification_status,
            'id_rejection_reason': user.id_rejection_reason,
            'id_document_url': id_document_url,
            'selected_agent_id': selected_agent_id,
            'pending_profile_update': pending.to_dict() if pending else None
        }, None

    @staticmethod
    def handle_profile_update(user_id, data, files=None):
        """Handle profile update logic, including shadow updates for providers"""
        user = User.query.get(user_id)
        if not user:
            return None, "USER_NOT_FOUND"
            
        if not user.is_approved and user.role != 'client':
            return None, "NOT_APPROVED"
            
        # Validate allowed fields
        allowed_keys = ALLOWED_AFTER_APPROVAL_COMMON | ALLOWED_AFTER_APPROVAL_BY_ROLE.get(user.role, set())
        disallowed = set(data.keys()) - allowed_keys
        if disallowed:
            return None, f"DISALLOWED_FIELDS: {', '.join(sorted(disallowed))}"
            
        if PendingProfileUpdate.query.filter_by(user_id=user.id, status='pending').first():
            return None, "PENDING_EXISTS"
            
        payload = ProfileService._prepare_payload(user, data, files)
        if not payload:
            return None, "NO_CHANGES"
            
        if user.role == 'client':
            user_data = user.data or {}
            for k, v in payload.items():
                if k == 'next_of_kin':
                    user_data['next_of_kin'] = v
                else:
                    user_data[k] = v
            user.data = user_data
            db.session.commit()
            return user.to_dict(), None
            
        pending = PendingProfileUpdate(user_id=user.id, payload=payload, status='pending')
        db.session.add(pending)
        db.session.commit()
        return {'pending_id': str(pending.id)}, None

    @staticmethod
    def upload_photo(user_id, photo_file):
        """Update profile photo directly"""
        user = User.query.get(user_id)
        if not user:
            return None, "USER_NOT_FOUND"
            
        upload_folder = current_app.config.get('UPLOAD_FOLDER')
        if not os.path.exists(upload_folder):
            os.makedirs(upload_folder)
            
        file_ext = photo_file.filename.rsplit('.', 1)[1].lower()
        unique_filename = f"profile_{user.id.hex}_{uuid.uuid4().hex[:8]}.{file_ext}"
        filepath = os.path.join(upload_folder, unique_filename)
        photo_file.save(filepath)
        
        user.profile_image_url = f"/uploads/{unique_filename}"
        db.session.commit()
        return user.profile_image_url, None

    @staticmethod
    def initiate_registration_payment(user_id, provider='paypal'):
        """Create checkout for registration fee"""
        user = User.query.get(user_id)
        if not user or user.is_paid:
            return None, "ALREADY_PAID_OR_NOT_FOUND"
            
        user_id_hex = str(user.id).replace('-', '')
        external_id = f"reg_fee_{user_id_hex}_{uuid.uuid4().hex[:8]}"
        backend_url = get_public_backend_base_url()
        frontend_url = get_request_frontend_base_url()
        
        urls = {
            'success_url': f"{backend_url}/api/profile/payment-callback?callback_status=success&external_id={external_id}&provider={provider}&frontend_url={frontend_url}",
            'cancel_url': f"{backend_url}/api/profile/payment-callback?callback_status=cancel&external_id={external_id}&provider={provider}&frontend_url={frontend_url}",
            'failure_url': f"{backend_url}/api/profile/payment-callback?callback_status=failure&external_id={external_id}&provider={provider}&frontend_url={frontend_url}"
        }
        
        checkout = PaymentService.create_checkout(
            amount=REGISTRATION_FEE_AMOUNT,
            currency='ZAR',
            external_id=external_id,
            provider=provider,
            **urls
        )
        return {
            'redirect_url': checkout['redirect_url'],
            'checkout_id': checkout['checkout_id'],
            'external_id': external_id
        }, None

    @staticmethod
    def handle_payment_callback(external_id):
        """Process registration fee completion"""
        verified_status = PaymentService.get_payment_status(external_id)
        if verified_status != 'completed':
            return False, "PAYMENT_NOT_COMPLETED"
            
        payment = Payment.query.filter_by(external_id=external_id).first()
        if not payment:
            return False, "PAYMENT_NOT_FOUND"
            
        if not external_id.startswith('reg_fee_'):
            return False, "INVALID_ID"
            
        # Parse user ID
        parts = external_id.split('_')
        user_id_hex = ''.join(parts[2:-1])
        user_id_str = f"{user_id_hex[:8]}-{user_id_hex[8:12]}-{user_id_hex[12:16]}-{user_id_hex[16:20]}-{user_id_hex[20:32]}"
        user = User.query.get(uuid.UUID(user_id_str))
        
        if not user or user.is_paid:
            return False, "USER_ALREADY_PAID_OR_NOT_FOUND"
            
        if payment.status == 'pending' and payment.amount * 100 >= REGISTRATION_FEE_AMOUNT:
            user.is_paid = True
            payment.status = 'completed'
            AgentService.award_commission(user)
            db.session.commit()
            return True, None
            
        return False, "VERIFICATION_FAILED"

    @staticmethod
    def _parse_form_request(req):
        """Parse multipart/form-data request into a clean dictionary"""
        data = {}
        for key in ['full_name', 'surname', 'phone', 'gender', 'sa_id', 'highest_qualification', 'professional_body']:
            if key in req.form:
                data[key] = req.form[key] or None
        
        if 'sa_citizen' in req.form:
            data['sa_citizen'] = req.form['sa_citizen'].lower() in ('true', '1', 'on')
        
        for json_key in ['next_of_kin', 'operating_areas', 'availability', 
                        'professional_services', 'provider_services', 'driver_services']:
            if json_key in req.form:
                try:
                    val = req.form[json_key]
                    data[json_key] = json.loads(val) if val else None
                except (json.JSONDecodeError, ValueError):
                    data[json_key] = None
                    
        # Clean empty strings
        for k, v in data.items():
            if v == '':
                data[k] = None
        
        if isinstance(data.get('next_of_kin'), dict):
            for k in data['next_of_kin']:
                if data['next_of_kin'][k] == '':
                    data['next_of_kin'][k] = None
                    
        return data

    @staticmethod
    def _prepare_payload(user, data, files):
      payload = {}

      # =========================
      # BASIC FIELD MAPPING (UNCHANGED)
      # =========================
      for key in (
          'phone', 'full_name', 'surname', 'next_of_kin',
          'operating_areas', 'availability',
          'driver_services', 'professional_services', 'provider_services',
          'highest_qualification', 'professional_body'
      ):
          if key in data and data[key] is not None:
              payload[key] = data[key]

      # =========================
       # CLEAN AVAILABILITY STRUCTURE (UNCHANGED)
      # =========================
      if 'availability' in data and data['availability'] is not None:
          availability = data['availability']

          if isinstance(availability, dict):
              payload['availability'] = {
                  'is_online': bool(availability.get('is_online', False))
              }

      # =========================
      # FILE HANDLING
      # =========================
      if files:
          upload_folder = current_app.config.get('UPLOAD_FOLDER')
  
          # -------------------------
          # EXISTING FILES (UNCHANGED)
          # -------------------------
          for key, filename_prefix in [
              ('proof_of_residence', 'proof_pending'),
              ('drivers_license_document', 'license_pending')
          ]: 
              if key in files:
                  file = files[key]
                  if file and file.filename:
                      ext = file.filename.rsplit('.', 1)[1].lower()
                      unique = f"{str(user.id)}_{filename_prefix}_{uuid.uuid4().hex[:8]}.{ext}"
                      file.save(os.path.join(upload_folder, unique))
 
                      payload[
                          'driver_license_url' if 'license' in key else 'proof_of_residence_url'
                      ] = f"/uploads/{unique}"
  
          # -------------------------
          # QUALIFICATIONS (UNCHANGED)
          # -------------------------
          if 'qualification_documents' in files:
              qual_files = files.getlist('qualification_documents')
              qual_urls = []
  
              for file in qual_files:
                  if file and file.filename:
                      ext = file.filename.rsplit('.', 1)[1].lower()
                      unique = f"{str(user.id)}_qual_pending_{uuid.uuid4().hex[:8]}.{ext}"
                      file.save(os.path.join(upload_folder, unique))
                      qual_urls.append(f"/uploads/{unique}")
  
              if qual_urls:
                  payload['qualification_urls'] = qual_urls
  
          # =========================
          # 🚗 NEW: VEHICLE FILE HANDLING
          # =========================
 
          # Get vehicles from payload (already coming from frontend)
          driver_services = payload.get('driver_services', [])
  
          # Loop through each vehicle
          for i, vehicle in enumerate(driver_services):
  
              # -------------------------
              # 📸 HANDLE VEHICLE IMAGES
              # -------------------------
              images = []
              img_index = 0
  
              # Loop until no more images found
              while True:
                  file_key = f"vehicles[{i}][images][{img_index}]"
                  file = files.get(file_key)
  
                  if not file:
                      break  # stop when no more images
  
                  if file and file.filename:
                      ext = file.filename.rsplit('.', 1)[1].lower()
                      unique = f"{str(user.id)}_vehicle_{i}_{uuid.uuid4().hex[:8]}.{ext}"
                      filepath = os.path.join(upload_folder, unique)
  
                      file.save(filepath)
                      images.append(f"/uploads/{unique}")
  
                  img_index += 1
  
              # Attach images to vehicle
              if images:
                  vehicle['images'] = images
  
              # -------------------------
              # 📄 HANDLE VEHICLE DISK
               # -------------------------
              disk_file = files.get(f"vehicles[{i}][disk_document]")
  
              if disk_file and disk_file.filename:
                  ext = disk_file.filename.rsplit('.', 1)[1].lower()
                  unique = f"{str(user.id)}_disk_{i}_{uuid.uuid4().hex[:8]}.{ext}"
                  filepath = os.path.join(upload_folder, unique)
  
                  disk_file.save(filepath)
  
                  # Attach disk to vehicle
                  vehicle['disk_document'] = f"/uploads/{unique}"
   
          # Save updated vehicles back
          payload['driver_services'] = driver_services
  
      return payload
