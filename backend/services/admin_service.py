"""
Admin Service - Encapsulates logic for administrative operations.
"""
import uuid
import logging
from datetime import datetime
from flask import current_app
from sqlalchemy import and_, or_
from backend.extensions import db
from backend.models import User, ServiceRequest, ServiceType, UserSelectedService, Payment, PendingProfileUpdate, AppSetting, Agent
from backend.services.email_service import EmailService
from backend.services.request_service import RequestService
from backend.services.shipping_service import ShiplogicService

logger = logging.getLogger(__name__)

class AdminService:
    @staticmethod
    def requires_registration_payment_before_approval(user):
        """True when a user must pay the registration fee before approval can proceed."""
        return bool(user and user.role not in ('client', 'admin') and not user.is_paid)

    @staticmethod
    def _countable_user_query():
        """Users visible in admin growth/base metrics.

        Clients count immediately because they do not pay a registration fee.
        Non-client registrations only count after payment is completed.
        """
        return User.query.filter(
            or_(
                User.role == 'client',
                User.role == 'admin',
                and_(User.role.in_(['driver', 'professional', 'service-provider']), User.is_paid.is_(True))
            )
        )

    @staticmethod
    def list_users(filters=None, limit=50, offset=0):
        """List users with optional filters"""
        filters = filters or {}
        query = User.query
        
        if filters.get('role'):
            query = query.filter_by(role=filters['role'])
        if filters.get('is_paid') is not None:
            query = query.filter_by(is_paid=filters['is_paid'])
        if filters.get('is_approved') is not None:
            query = query.filter_by(is_approved=filters['is_approved'])
            
        total = query.count()
        users = query.order_by(User.created_at.desc()).limit(limit).offset(offset).all()
        
        return {
            'users': [u.to_dict() for u in users],
            'total': total
        }

    @staticmethod
    def create_user(data):
        """Create a user from admin panel"""
        email = data.get('email', '').strip().lower()
        if not email or not data.get('password'):
            return None, "MISSING_FIELDS"
            
        if User.query.filter_by(email=email).first():
            return None, "ALREADY_EXISTS"
            
        role = data.get('role', 'client')
        user = User(
            email=email,
            role=role,
            is_active=data.get('is_active', True),
            is_approved=data.get('is_approved', True),
            is_paid=data.get('is_paid', False),
            email_verified=data.get('email_verified', True)
        )
        user.set_password(data['password'])
        
        # Profile data mapping
        profile_data = {}
        mappings = {
            'first_name': 'full_name', 'last_name': 'surname', 'phone': 'phone',
            'gender': 'gender', 'sa_id_number': 'sa_id', 'is_sa_citizen': 'sa_citizen',
            'sa_id': 'sa_id', 'sa_citizen': 'sa_citizen', 'username': 'username',
            'highest_qualification': 'highest_qualification', 'professional_body': 'professional_body',
            'professional_services': 'professional_services', 'provider_services': 'provider_services',
            'driver_vehicles': 'driver_services', 'driver_services': 'driver_services',
            'driver_license_number': 'driver_license_number',
            'driver_license_code': 'driver_license_code',
            'driver_license_expiry': 'driver_license_expiry',
            'prdp_number': 'prdp_number',
            'prdp_expiry': 'prdp_expiry',
            'vehicle_disk_expiry': 'vehicle_disk_expiry',
            'operating_areas': 'operating_areas',
        }
        for k, target in mappings.items():
            if k in data: profile_data[target] = data[k]

        if isinstance(data.get('next_of_kin'), dict):
            profile_data['next_of_kin'] = data['next_of_kin']
        else:
            nok = {}
            for k, target in [('next_of_kin_name', 'full_name'), ('next_of_kin_phone', 'contact_number'), ('next_of_kin_email', 'contact_email')]:
                if data.get(k):
                    nok[target] = data[k]
            if nok:
                profile_data['next_of_kin'] = nok
        
        user.data = profile_data
        db.session.add(user)
        db.session.commit()
        return user.to_dict(), None

    @staticmethod
    def approve_user(user_id):
        """Approve user and setup their services"""
        user = User.query.get(user_id)
        if not user:
            return None, "NOT_FOUND"

        if AdminService.requires_registration_payment_before_approval(user):
            try:
                EmailService.send_registration_payment_reminder(user)
            except Exception as e:
                logger.error(f"Registration payment reminder email failed: {e}")
            return {
                'user': user.to_dict(),
                'action': 'payment_reminder_sent'
            }, None

        if user.role == 'driver':
            compliance = RequestService.get_driver_cab_eligibility(
                user,
                require_fresh_location=False,
                require_approval=False,
                require_payment=False,
                require_active=False,
            )
            if not compliance.get('eligible'):
                return None, {
                    'code': 'DRIVER_COMPLIANCE_INCOMPLETE',
                    'details': {
                        'missing_fields': compliance.get('missing_fields') or [],
                        'missing_field_labels': RequestService.humanize_driver_missing_fields(
                            compliance.get('missing_fields') or []
                        ),
                    },
                }
            
        user.is_approved = True
        if user.role in ('professional', 'service-provider'):
            user.is_active = True
            AdminService._setup_user_services(user)
            
        db.session.commit()
        
        try:
            EmailService.send_user_approval_notification(user)
        except Exception as e:
            logger.error(f"Approval email failed: {e}")
            
        return {
            'user': user.to_dict(),
            'action': 'approved'
        }, None

    @staticmethod
    def verify_id(user_id, status, reason=None):
        """Verify or reject ID documents"""
        user = User.query.get(user_id)
        if not user:
            return None, "NOT_FOUND"
            
        if status not in ('verified', 'rejected'):
            return None, "INVALID_STATUS"
            
        if status == 'rejected' and not reason:
            return None, "MISSING_REASON"
            
        user.id_verification_status = status
        if status == 'rejected':
            user.id_rejection_reason = reason
            
        db.session.commit()
        
        try:
            EmailService.send_id_verification_notification(user, status, reason)
        except Exception as e:
            logger.error(f"ID verification email failed: {e}")
            
        return user.to_dict(), None

    @staticmethod
    def _setup_user_services(user):
        """Internal helper to convert JSON services to UserSelectedService models"""
        services = []
        if user.data:
            if user.role == 'professional':
                services = user.data.get('professional_services', [])
            elif user.role == 'service-provider':
                services = user.data.get('provider_services', [])
                
        for s in services:
            service_name = s.get('name', '').strip()
            if not service_name: continue
            
            # Find or create ServiceType
            stype = ServiceType.query.filter(
                db.func.lower(ServiceType.name) == service_name.lower(),
                ServiceType.category == user.role
            ).first()
            
            if not stype:
                stype = ServiceType(
                    name=service_name,
                    description=s.get('description', ''),
                    category=user.role,
                    is_active=True
                )
                db.session.add(stype)
                db.session.flush()
                
            if not UserSelectedService.query.filter_by(user_id=user.id, service_type_id=stype.id).first():
                db.session.add(UserSelectedService(
                    user_id=user.id,
                    service_type_id=stype.id,
                    personalized_description=s.get('personalized_description', '')
                ))

    @staticmethod
    def get_stats():
        """Retrieve dashboard statistics"""
        total_users = AdminService._countable_user_query().count()
        total_revenue = db.session.query(db.func.sum(Payment.amount)).filter(Payment.status == 'completed').scalar() or 0
        total_requests = ServiceRequest.query.count()
        pending_withdrawals = WithdrawalRequest.query.filter_by(status='pending').count()
        
        return {
            'total_users': total_users,
            'total_revenue': float(total_revenue),
            'total_requests': total_requests,
            'pending_withdrawals': pending_withdrawals
        }, None

    @staticmethod
    def get_withdrawal_requests(status=None):
        """Get list of withdrawal requests"""
        from backend.models.withdrawal_request import WithdrawalRequest
        query = WithdrawalRequest.query
        if status:
            query = query.filter_by(status=status)
        
        requests = query.order_by(WithdrawalRequest.created_at.desc()).all()
        return [r.to_dict() for r in requests], None

    @staticmethod
    def handle_withdrawal(withdrawal_id, action, reason=None):
        """Approve or reject a withdrawal request"""
        from backend.models.withdrawal_request import WithdrawalRequest
        req = WithdrawalRequest.query.get(withdrawal_id)
        if not req:
            return None, "NOT_FOUND"
            
        if req.status != 'pending':
            return None, "ALREADY_PROCESSED"
            
        if action == 'approve':
            req.status = 'approved'
            req.processed_at = datetime.utcnow()
        elif action == 'reject':
            req.status = 'rejected'
            req.rejection_reason = reason
            req.processed_at = datetime.utcnow()
            
            # Refund wallet
            from backend.services.wallet_service import WalletService
            WalletService.add_transaction(
                wallet_id=req.wallet_id,
                user_id=req.user_id,
                transaction_type='refund',
                amount=req.amount,
                currency=req.currency,
                description=f"Withdrawal rejected: {reason}"
            )
        else:
            return None, "INVALID_ACTION"
            
        db.session.commit()
        return req.to_dict(), None

    @staticmethod
    def get_global_stats():
        """Consolidated view of all system activity"""
        from backend.models.chat import ChatMessage
        from backend.models.report import Report
        from backend.models.driver_rating import DriverRating
        from backend.models.professional_rating import ProfessionalRating
        from backend.models.provider_rating import ProviderRating
        from backend.models.shop import Order
        from sqlalchemy import func
        from datetime import timedelta
        
        shop_revenue = db.session.query(func.sum(Order.total)).filter(
            Order.status.in_(['paid', 'shipped', 'delivered'])
        ).scalar() or 0
        ride_revenue = db.session.query(func.sum(ServiceRequest.payment_amount)).filter(
            ServiceRequest.request_type == 'cab',
            ServiceRequest.payment_status == 'paid'
        ).scalar() or 0
        service_revenue = db.session.query(func.sum(ServiceRequest.payment_amount)).filter(
            ServiceRequest.request_type.in_(['professional', 'provider']),
            ServiceRequest.payment_status == 'paid'
        ).scalar() or 0
        registration_revenue = db.session.query(func.sum(Payment.amount)).filter(
            Payment.status == 'completed',
            Payment.external_id.like('reg_fee_%')
        ).scalar() or 0
        total_revenue = (
            float(shop_revenue)
            + float(ride_revenue)
            + float(service_revenue)
            + float(registration_revenue)
        )
        
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        user_growth = []
        for i in range(7):
            day = seven_days_ago + timedelta(days=i+1)
            start_of_day = datetime(day.year, day.month, day.day)
            end_of_day = start_of_day + timedelta(days=1)
            count = AdminService._countable_user_query().filter(
                User.created_at >= start_of_day,
                User.created_at < end_of_day
            ).count()
            user_growth.append({'date': start_of_day.strftime('%b %d'), 'count': count})

        cab_requests_query = ServiceRequest.query.filter(ServiceRequest.request_type == 'cab')
        cab_requests = cab_requests_query.all()

        ride_matching = 0
        ride_assigned = 0
        ride_on_trip = 0
        ride_cancelled = 0
        for ride in cab_requests:
            ride_stage = RequestService.get_cab_ride_stage(ride)
            if ride_stage in ('searching', 'no_drivers_available'):
                ride_matching += 1
            elif ride_stage == 'driver_assigned':
                ride_assigned += 1
            elif ride_stage == 'on_trip':
                ride_on_trip += 1
            elif ride_stage == 'cancelled' or ride.status == 'cancelled':
                ride_cancelled += 1

        return {
            'users': {
                'total': AdminService._countable_user_query().count(),
                'drivers': User.query.filter_by(role='driver', is_paid=True).count(),
                'professionals': User.query.filter_by(role='professional', is_paid=True).count(),
                'providers': User.query.filter_by(role='service-provider', is_paid=True).count(),
                'clients': User.query.filter_by(role='client').count(),
                'growth': user_growth
            },
            'requests': {
                'total': ServiceRequest.query.count(),
                'pending': ServiceRequest.query.filter_by(status='pending').count(),
                'completed': ServiceRequest.query.filter_by(status='completed').count(),
                'rides': {
                    'total': cab_requests_query.count(),
                    'matching': ride_matching,
                    'searching': ride_matching,
                    'en_route': ride_assigned,
                    'assigned': ride_assigned,
                    'on_trip': ride_on_trip,
                    'cancelled': ride_cancelled,
                    'completed_today': cab_requests_query.filter(
                        ServiceRequest.status == 'completed',
                        ServiceRequest.updated_at >= today_start
                    ).count(),
                    'cancelled_today': cab_requests_query.filter(
                        ServiceRequest.status == 'cancelled',
                        ServiceRequest.updated_at >= today_start
                    ).count()
                }
            },
            'revenue': {
                'total': total_revenue,
                'shop': float(shop_revenue),
                'ride': float(ride_revenue),
                'service': float(service_revenue),
                'registration': float(registration_revenue)
            },
            'feedback': {
                'total_ratings': DriverRating.query.count() + ProfessionalRating.query.count() + ProviderRating.query.count(),
                'total_reports': Report.query.count(),
                'pending_reports': Report.query.filter_by(status='pending').count()
            },
            'activity': {
                'total_chats': ChatMessage.query.count()
            }
        }, None

    @staticmethod
    def get_payment_settings():
        """Get all payment gateway settings"""
        paypal = AppSetting.query.get('payment_paypal')
        yoco = AppSetting.query.get('payment_yoco')
        shiplogic = AppSetting.query.get(ShiplogicService.SETTING_KEY)
        
        shiplogic_settings = ShiplogicService.get_settings()
        if shiplogic and isinstance(shiplogic.value, dict):
            shiplogic_settings.update(shiplogic.value)

        return {
            'paypal': paypal.value if paypal else {
                'enabled': False,
                'client_id': '',
                'client_secret': '',
                'mode': 'sandbox'
            },
            'yoco': yoco.value if yoco else {
                'enabled': False,
                'secret_key': '',
                'api_url': current_app.config.get('YOCO_API_URL', 'https://payments.yoco.com')
            },
            'shiplogic': shiplogic_settings
        }, None

    @staticmethod
    def update_payment_settings(data):
        """Update payment and shipping gateway settings"""
        for key in ['paypal', 'yoco', 'shiplogic']:
            if key in data:
                gateway_key = ShiplogicService.SETTING_KEY if key == 'shiplogic' else f'payment_{key}'
                setting = AppSetting.query.get(gateway_key)
                if not setting:
                    setting = AppSetting(key=gateway_key)
                    db.session.add(setting)
                
                current_val = setting.value or {}
                # Update but preserve existing fields if not provided
                if isinstance(data[key], dict):
                    current_val.update(data[key])
                setting.value = current_val
        
        db.session.commit()
        return True, None

    @staticmethod
    def suspend_user(user_id, reason=None):
        """Suspend a user"""
        user = User.query.get(user_id)
        if not user:
            return None, "NOT_FOUND"
        user.is_active = False
        db.session.commit()
        try:
            EmailService.send_user_suspension_notification(user, reason=reason)
        except Exception as e:
            logger.error(f"Suspension email failed: {e}")
        return user.to_dict(), None

    @staticmethod
    def unsuspend_user(user_id):
        """Unsuspend a user"""
        user = User.query.get(user_id)
        if not user:
            return None, "NOT_FOUND"
        user.is_active = True
        db.session.commit()
        return user.to_dict(), None

    @staticmethod
    def delete_user(user_id):
        """Permanently delete a user"""
        user = User.query.get(user_id)
        if not user:
            return None, "NOT_FOUND"

        from backend.models.subscription import Subscription
        from backend.models.advert import Advert
        from backend.models.marketplace import MarketplaceAd

        Subscription.query.filter_by(user_id=user.id).delete(synchronize_session=False)
        Advert.query.filter_by(user_id=user.id).delete(synchronize_session=False)
        MarketplaceAd.query.filter_by(user_id=user.id).delete(synchronize_session=False)
        db.session.delete(user)
        db.session.commit()
        return True, None

    @staticmethod
    def get_user(user_id):
        """Get detailed user info for admin"""
        user = User.query.get(user_id)
        if not user:
            return None, "NOT_FOUND"

        profile_data = dict(user.data) if user.data else {}
        data = user.to_dict()
        data['profile_data'] = profile_data

        next_of_kin = profile_data.get('next_of_kin') or {}
        id_document_url = None
        if user.file_urls and isinstance(user.file_urls, list):
            id_document_url = user.file_urls[0] if user.file_urls else None

        qualification_urls = profile_data.get('qualification_urls') or []
        if not isinstance(qualification_urls, list):
            qualification_urls = [qualification_urls] if qualification_urls else []

        data.update({
            'phone': profile_data.get('phone'),
            'gender': profile_data.get('gender'),
            'is_sa_citizen': profile_data.get('sa_citizen'),
            'sa_id_number': profile_data.get('sa_id'),
            'next_of_kin_name': next_of_kin.get('full_name'),
            'next_of_kin_phone': next_of_kin.get('contact_number'),
            'next_of_kin_email': next_of_kin.get('contact_email'),
            'highest_qualification': profile_data.get('highest_qualification'),
            'professional_body': profile_data.get('professional_body'),
            'professional_services': profile_data.get('professional_services') or [],
            'provider_services': profile_data.get('provider_services') or [],
            'driver_services': profile_data.get('driver_services') or [],
            'driver_license_number': profile_data.get('driver_license_number'),
            'driver_license_code': profile_data.get('driver_license_code'),
            'driver_license_expiry': profile_data.get('driver_license_expiry'),
            'prdp_number': profile_data.get('prdp_number'),
            'prdp_expiry': profile_data.get('prdp_expiry'),
            'vehicle_disk_expiry': profile_data.get('vehicle_disk_expiry'),
            'operating_areas': profile_data.get('operating_areas') or [],
            'id_document_url': id_document_url,
            'proof_of_residence_url': profile_data.get('proof_of_residence_url'),
            'driver_license_url': profile_data.get('driver_license_url'),
            'prdp_document_url': profile_data.get('prdp_document_url'),
            'vehicle_disk_document_url': profile_data.get('vehicle_disk_document_url'),
            'cv_resume_url': profile_data.get('cv_resume_url'),
            'qualification_urls': qualification_urls,
            'registration_documents': {
                'profile_image_url': user.profile_image_url,
                'id_document_url': id_document_url,
                'proof_of_residence_url': profile_data.get('proof_of_residence_url'),
                'driver_license_url': profile_data.get('driver_license_url'),
                'prdp_document_url': profile_data.get('prdp_document_url'),
                'vehicle_disk_document_url': profile_data.get('vehicle_disk_document_url'),
                'cv_resume_url': profile_data.get('cv_resume_url'),
                'qualification_urls': qualification_urls,
            }
        })

        if user.role == 'driver':
            compliance = RequestService.get_driver_cab_eligibility(
                user,
                require_fresh_location=False,
                require_approval=False,
                require_payment=False,
                require_active=False,
            )
            data['driver_compliance'] = {
                'ready_for_approval': compliance.get('eligible', False),
                'missing_fields': compliance.get('missing_fields') or [],
                'missing_field_labels': RequestService.humanize_driver_missing_fields(
                    compliance.get('missing_fields') or []
                ),
            }
            
        # Pending updates
        pending = PendingProfileUpdate.query.filter_by(user_id=user_id, status='pending').first()
        data['pending_updates'] = pending.payload if pending else None
        
        return data, None

    @staticmethod
    def get_user_vehicle_images(user_id):
        """Get vehicle images for a user"""
        from backend.models.vehicle_image import VehicleImage
        images = VehicleImage.query.filter_by(user_id=user_id).all()
        return [img.to_dict() for img in images], None

    @staticmethod
    def list_pending_profile_updates():
        """List all pending profile update requests."""
        from backend.models.pending_profile_update import PendingProfileUpdate
        pending = PendingProfileUpdate.query.filter_by(status='pending').order_by(
            PendingProfileUpdate.created_at.desc()
        ).all()
        out = []
        for p in pending:
            user = User.query.get(p.user_id)
            d = p.to_dict()
            d['user_email'] = user.email if user else None
            d['user_role'] = user.role if user else None
            ud = user.data or {}
            # Fix Potential "Unknown" by checking both key patterns
            fn = (ud.get('full_name') or ud.get('first_name') or ud.get('name', '')).strip()
            sn = (ud.get('surname') or ud.get('last_name', '')).strip()
            d['user_full_name'] = (fn + (' ' + sn if sn else '')).strip() or '—'
            out.append(d)
        return {'pending_updates': out}, None

    @staticmethod
    def approve_pending_profile_update(pending_id):
        """Apply pending profile changes to user"""
        from backend.models.pending_profile_update import PendingProfileUpdate
        pending = PendingProfileUpdate.query.get(pending_id)
        if not pending:
            return None, "NOT_FOUND"
        if pending.status != 'pending':
            return None, "INVALID_STATUS"
        user = User.query.get(pending.user_id)
        if not user:
            return None, "NOT_FOUND"
            
        payload = pending.payload or {}
        updated_data = dict(user.data) if user.data else {}
        for key, value in payload.items():
            if key in ('phone', 'next_of_kin', 'driver_services', 'professional_services', 'provider_services',
                       'highest_qualification', 'professional_body', 'proof_of_residence_url', 'driver_license_url', 'qualification_urls', 'operating_areas', 'availability'):
                if value is None and key in updated_data:
                    del updated_data[key]
                else:
                    updated_data[key] = value

            if key in ('professional_services', 'provider_services') and isinstance(value, list):
                category = 'professional' if key == 'professional_services' else 'service-provider'
                for service in value:
                    s_name = service.get('name', '').strip()
                    if not s_name: continue
                    existing = ServiceType.query.filter(ServiceType.name.ilike(s_name)).first()
                    if not existing:
                        db.session.add(ServiceType(name=s_name, category=category, is_active=True, description=service.get('description', '')))

        user.data = updated_data
        db.session.delete(pending)
        db.session.commit()
        return user.to_dict(), None

    @staticmethod
    def reject_pending_profile_update(pending_id, admin_id, reason=None):
        """Reject a pending profile update"""
        from backend.models.pending_profile_update import PendingProfileUpdate
        pending = PendingProfileUpdate.query.get(pending_id)
        if not pending:
            return None, "NOT_FOUND"
        if pending.status != 'pending':
            return None, "INVALID_STATUS"
            
        pending.status = 'rejected'
        pending.reviewed_at = datetime.utcnow()
        pending.reviewed_by_id = admin_id
        pending.rejection_reason = reason
        db.session.commit()
        return True, None

    @staticmethod
    def list_all_chats():
        """List all chat messages for monitoring"""
        from backend.models.chat import ChatMessage
        messages = ChatMessage.query.order_by(ChatMessage.created_at.desc()).limit(200).all()
        return [m.to_dict() for m in messages], None

    @staticmethod
    def list_global_commissions():
        """List all agent commissions"""
        from backend.models.agent_commission import AgentCommission
        commissions = AgentCommission.query.order_by(AgentCommission.created_at.desc()).limit(100).all()
        out = []
        for c in commissions:
            d = c.to_dict()
            if c.agent:
                d['agent_email'] = c.agent.email
            out.append(d)
        return {'commissions': out}, None

    @staticmethod
    def get_affiliate_stats():
        """Get aggregate affiliate metrics"""
        from backend.models.agent_commission import AgentCommission
        from sqlalchemy import func
        total_payout = db.session.query(func.sum(AgentCommission.amount)).filter(AgentCommission.status == 'paid_out').scalar() or 0.0
        active_agents_count = db.session.query(func.count(func.distinct(AgentCommission.agent_id))).scalar() or 0
        total_commissions = db.session.query(func.count(AgentCommission.id)).scalar() or 0

        return {
            'total_paid_out': float(total_payout),
            'active_agents_count': active_agents_count,
            'total_commissions': total_commissions
        }, None
