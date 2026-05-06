"""
Profile Service - Encapsulates logic for user profile management.
"""
import os
import uuid
import json
import logging
from urllib.parse import quote
from flask import current_app
from backend.extensions import db
from backend.models import User, PendingProfileUpdate, Payment
from backend.services.payment_service import PaymentService
from backend.services.agent_service import AgentService
from backend.utils.url import get_public_backend_base_url, get_request_frontend_base_url, get_request_frontend_return_path

logger = logging.getLogger(__name__)

REGISTRATION_FEE_AMOUNT = 10000  # R100.00

ALLOWED_AFTER_APPROVAL_COMMON = {'phone', 'next_of_kin'}
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
        """Fetch comprehensive profile information for a user WITH pending diff preview"""
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

        pending_data = None
        if pending:
            payload = pending.payload or {}
            diff = ProfileService.build_profile_diff(user, payload)
            pending_data = {
                **pending.to_dict(),
                "diff": diff,
            }

        return {
            'user': user.to_dict(),
            'profile_data': user.data or {},
            'registration_fee_paid': user.is_paid,
            'id_verification_status': user.id_verification_status,
            'id_rejection_reason': user.id_rejection_reason,
            'id_document_url': id_document_url,
            'selected_agent_id': selected_agent_id,
            'pending_profile_update': pending_data
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
        return_path = quote(get_request_frontend_return_path('/profile'), safe='')
        
        urls = {
            'success_url': f"{backend_url}/api/profile/payment-callback?callback_status=success&external_id={external_id}&provider={provider}&frontend_url={frontend_url}&return_path={return_path}",
            'cancel_url': f"{backend_url}/api/profile/payment-callback?callback_status=cancel&external_id={external_id}&provider={provider}&frontend_url={frontend_url}&return_path={return_path}",
            'failure_url': f"{backend_url}/api/profile/payment-callback?callback_status=failure&external_id={external_id}&provider={provider}&frontend_url={frontend_url}&return_path={return_path}"
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
          
       
      def normalize_services(services):
           cleaned = []
           
           if not isinstance(services, list):
                return cleaned
            
           for s in services:
               if not isinstance(s, dict):
                   continue
               
               name = (s.get('name') or '').strip()
               description = (s.get('description') or '').strip()
               hourly_rate = s.get('hourly_rate')
               
               try:
                   hourly_rate = float(hourly_rate) if hourly_rate not in (None, '') else None
               except (ValueError, TypeError):
                    hourly_rate = None
                    
               if not name:
                    continue
                
               cleaned.append({
                    'name': name,
                    'description': description,
                    'hourly_rate': hourly_rate

                })
               
           return cleaned
       
      # =========================
       # CLEAN AVAILABILITY STRUCTURE (UNCHANGED)
      # =========================
      if 'availability' in data and data['availability'] is not None:
          availability = data['availability']

          if isinstance(availability, dict):
              cleaned = {}
              if 'is_online' in availability:
                # Keep is_online for drivers
                cleaned['is_online'] = bool(availability.get('is_online', False))
              if 'regular_hours' in availability:
                #keep working hours for professionals and service providers
                cleaned['regular_hours'] = availability['regular_hours']
              if 'blocked_dates' in availability:
                #keep blocked dates for professionals and service providers
                cleaned['blocked_dates'] = availability['blocked_dates']
              if 'schedule' in availability:
                #keep lagacy schedule shape from Profile.tsx just in case
                cleaned['schedule'] = availability['schedule']
              payload['availability'] = cleaned
      if 'professional_services' in payload:
            payload['professional_services'] = normalize_services(payload['professional_services'])
            
      if 'provider_services' in payload:
            payload['provider_services'] = normalize_services(payload['provider_services'])
      #if 'availability' in data and data['availability'] is not None:
       #   availability = data['availability']
      if 'availability' in payload and isinstance(payload['availability'], dict):
            payload['availability'] = {
                'is_online': bool(payload['availability'].get('is_online', False))
            }
         # if isinstance(availability, dict):
          #    payload['availability'] = {
            #      'is_online': bool(availability.get('is_online', False))
            #  }

      # =========================
      # FILE HANDLING
      # =========================
      if files:
          upload_folder = current_app.config.get('UPLOAD_FOLDER')
          print("FILES RECEIVED:", list(files.keys()))
       
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
             #  NEW: VEHICLE FILE HANDLING
             # =========================
 
          # Get vehicles from payload (already coming from frontend)
          driver_services = payload.get('driver_services', [])
  
          # Loop through each vehicle
          for i, vehicle in enumerate(driver_services):
  
              # -------------------------
              # HANDLE VEHICLE IMAGES
              # -------------------------
              images = []
              image_files = files.getlist(f"vehicles[{i}][images]")
              for img_file in image_files:
                    if img_file and img_file.filename:
                        ext = img_file.filename.rsplit('.', 1)[1].lower()
                        unique = f"{str(user.id)}_vehicle_{i}_{uuid.uuid4().hex[:8]}.{ext}"
                        filepath = os.path.join(upload_folder, unique)
                        img_file.save(filepath)
                        images.append(f"/uploads/{unique}")
  
              # Attach images to vehicle
              if images:
                  vehicle['images'] = images
  
              # -------------------------
              #  HANDLE VEHICLE DISK
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
  
    @staticmethod
    def build_profile_diff(user, payload):
        current_data = user.data or {}
        diff = {}

        for key, new_value in payload.items():
            if key == "next_of_kin":
                current_nok = current_data.get("next_of_kin", {})

                diff["next_of_kin"] = {
                    "old": current_nok,
                    "new": new_value
                }
            else:
                diff[key] = {
                    "old": current_data.get(key),
                    "new": new_value
                }

        return diff
