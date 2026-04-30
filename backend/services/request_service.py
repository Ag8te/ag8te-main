"""
Service Request Service - Encapsulates logic for cab and professional services.
"""
import math
import secrets
import uuid
from datetime import datetime, timedelta
from flask import current_app
from backend.extensions import db
from backend.models import ServiceRequest, User, AppSetting, Payment, Wallet, ClientRating, DriverRating, ProfessionalRating, ProviderRating
from backend.services.wallet_service import WalletService
from backend.services.payment_service import PaymentService
from backend.utils.url import get_request_frontend_base_url

CAR_TYPE_BASE_RATE_PER_KM = {
    'small_hatchback': 8.12,
    'sedan': 8.44,
    'suv': 8.92,
    'bakkie': 9.40,
    'luxury': 11.80,
    'hybrid': 7.80,
    'electric': 6.52,
}

class RequestService:
    CAB_DRIVER_SEARCH_RADIUS_KM = 12
    CAB_DRIVER_OFFER_LIMIT = 1
    CAB_DRIVER_OFFER_WINDOW_SECONDS = 30

    @staticmethod
    def calculate_quote(pickup, dropoff, preferences=None):
        """Calculate cab quote based on distance and car type"""
        preferences = preferences or {}
        distance_km = RequestService._haversine_distance_km(pickup, dropoff)
        
        if distance_km is None or distance_km <= 0:
            return None, "INVALID_DISTANCE"
            
        rate_per_km = RequestService._get_rate_per_km(preferences)
        quote_amount = round(float(distance_km) * float(rate_per_km), 2)
        
        return {
            'distance_km': float(distance_km),
            'rate_per_km': float(rate_per_km),
            'payment_amount': quote_amount
        }, None

    @staticmethod
    def create_request(data, user_id):
        """Create a service request with wallet deduction if applicable"""
        request_id = f"REQ-{secrets.token_hex(8).upper()}"
        location_data = {}
        
        if data.get('pickup') and data.get('dropoff'):
            location_data = {'pickup': data['pickup'], 'dropoff': data['dropoff']}
        elif data.get('location'):
            location_data = {'location': data['location']}
            
        payment_amount = RequestService._resolve_payment_amount(data)
        
        service_request = ServiceRequest(
            id=request_id,
            request_type=data['type'],
            requester_id=user_id,
            scheduled_date=data['date'],
            scheduled_time=data['time'],
            location_data=location_data,
            details=data.get('preferences', {}),
            payment_amount=payment_amount,
            payment_status='pending'
        )
        
        if data.get('notes'):
            service_request.details['notes'] = data['notes']
            
        # Wallet logic for providers
        if data['type'] == 'provider':
            wallet = WalletService.get_or_create_wallet(user_id)
            if float(wallet.balance or 0) < payment_amount:
                return None, "INSUFFICIENT_FUNDS"
                
            WalletService.add_transaction(
                wallet_id=wallet.id,
                user_id=user_id,
                transaction_type='payment',
                amount=payment_amount,
                external_id=request_id,
                description=f"Call-out fee for {data['type']} request {request_id}"
            )
            service_request.payment_status = 'paid'
            service_request.status = 'pending'
        else:
            service_request.payment_status = 'pending'
            service_request.status = 'unpaid'
            
        db.session.add(service_request)
        db.session.commit()
        
        return service_request, None

    @staticmethod
    def create_checkout(request_type, data, user_id, host_url):
        """Standardized checkout flow for cab and professional requests"""
        request_id = f"REQ-{secrets.token_hex(8).upper()}"
        
        if request_type == 'cab':
            location_data = {'pickup': data['pickup'], 'dropoff': data['dropoff']}
            payment_amount = float(data['payment_amount'])
            distance_km = data.get('distance_km') or RequestService._haversine_distance_km(data['pickup'], data['dropoff'])
            request_details = dict(data.get('preferences', {}))
            selected_driver_id = data.get('selected_driver_id')
            
            schedule_type = data.get('schedule_type', 'now')
            now = datetime.utcnow()
            if schedule_type == 'now':
                scheduled_dt = now
            elif schedule_type == 'later':
                try:
                    sast_dt = datetime.strptime(data['date'] + ' ' + data['time'], '%Y-%m-%d %H:%M')
                except ValueError:
                    return None, "INVALID_DATETIME_FORMAT"
                #Validate in SAST - same timezone the user is in
                now_sast = now + timedelta(hours=2)
                if sast_dt <= now_sast:
                    return None, "BOOKING_IN_PAST"
                if sast_dt < now_sast + timedelta(hours=1):
                    return None, "BOOKING_TOO_SOON"
                
                #Only convert to UTC after validation passes
                scheduled_dt = sast_dt - timedelta(hours=2)
            else:
                return None, "INVALID_SCHEDULE_TYPE"
            
            scheduled_date = scheduled_dt.strftime("%Y-%m-%d")
            scheduled_time = scheduled_dt.strftime("%H:%M")

            preferred_driver = None
            if selected_driver_id:
                preferred_driver, error = RequestService._validate_selected_driver(
                    selected_driver_id,
                    request_details.get('car_type'),
                    data['pickup'],
                )
                if error:
                    return None, error

                request_details['selected_driver_id'] = str(preferred_driver.id)
                request_details['selected_driver'] = RequestService._build_driver_snapshot(preferred_driver)
                request_details['preferred_driver_id'] = str(preferred_driver.id)
            
            service_request = ServiceRequest(
                id=request_id,
                request_type='cab',
                requester_id=user_id,
                scheduled_date=scheduled_date,
                scheduled_time=scheduled_time,
                location_data=location_data,
                distance_km=distance_km,
                details=request_details,
                payment_amount=payment_amount,
                payment_status='pending',
                status='unpaid'
            )
        else: # professional or provider
            location_data = {'location': data['location']}
            payment_amount = RequestService._resolve_payment_amount(data)
            
            # For RFQ, no upfront payment
            is_rfq = data.get('is_rfq', False)
            if is_rfq:
                payment_amount = 0
                
            service_request = ServiceRequest(
                id=request_id,
                request_type=request_type,
                requester_id=user_id,
                scheduled_date=data['date'],
                scheduled_time=data['time'],
                location_data=location_data,
                details=dict(data.get('preferences', {})),
                payment_amount=payment_amount,
                payment_status='pending',
                status='pending' if is_rfq else 'unpaid'
            )
            
            if is_rfq:
                service_request.details['is_rfq'] = True
            else:
                pid = service_request.details.get('professional_id') or service_request.details.get('provider_id')
                if not pid:
                    return None, "PROVIDER_ID_REQUIRED"
                service_request.provider_id = uuid.UUID(pid)
                # Availability check
                available, error = RequestService.check_provider_availability(service_request.provider_id, data['date'], data['time'])
                if not available:
                        return None, error

        if data.get('notes'):
            service_request.details['notes'] = data['notes']
            
        db.session.add(service_request)
        db.session.flush()
        
        if data.get('is_rfq'):
            db.session.commit()
            return service_request, None
            
        # Create payment session
        amount_cents = int(round(payment_amount * 100))
        external_id = f"request_{request_id}_{secrets.token_hex(6)}"
        base_url = host_url.rstrip('/')
        frontend_url = get_request_frontend_base_url()
        
        success_url = f"{base_url}/api/payments/request-callback?callback_status=success&external_id={external_id}&request_id={request_id}&frontend_url={frontend_url}"
        cancel_url = f"{base_url}/api/payments/request-callback?callback_status=cancel&external_id={external_id}&request_id={request_id}&frontend_url={frontend_url}"
        failure_url = f"{base_url}/api/payments/request-callback?callback_status=failure&external_id={external_id}&request_id={request_id}&frontend_url={frontend_url}"
        
        checkout = PaymentService.create_checkout(
            amount=amount_cents,
            currency='ZAR',
            external_id=external_id,
            success_url=success_url,
            cancel_url=cancel_url,
            failure_url=failure_url,
            provider=data.get('provider', 'yoco')
        )
        
        payment = Payment.query.filter_by(external_id=external_id).first()
        if payment:
            service_request.details['payment_id'] = str(payment.id)
            
        db.session.commit()
        return {
            'request_id': request_id,
            'checkout_id': checkout['checkout_id'],
            'redirect_url': checkout['redirect_url'],
            'external_id': external_id
        }, None

    @staticmethod
    def assign_initial_cab_dispatch(service_request):
        """Populate targeted driver offers for a newly paid cab request."""
        if not service_request or service_request.request_type != 'cab':
            return

        details = dict(service_request.details or {})
        details.setdefault('dispatch_state', 'searching')
        details.setdefault('declined_driver_ids', [])
        details.setdefault('targeted_driver_ids', [])

        preferred_driver_id = details.get('preferred_driver_id')
        pickup = (service_request.location_data or {}).get('pickup') or {}
        car_type = details.get('car_type')
        targeted_ids = RequestService._select_next_cab_offer_ids(
            pickup=pickup,
            car_type=car_type,
            declined_driver_ids=details.get('declined_driver_ids') or [],
            preferred_driver_id=preferred_driver_id,
        )

        now_iso = datetime.utcnow().isoformat()
        details['targeted_driver_ids'] = targeted_ids
        details['dispatch_state'] = 'searching' if targeted_ids else 'no_drivers_available'
        details['dispatch_updated_at'] = now_iso
        details['dispatch_expires_at'] = (
            (datetime.utcnow() + timedelta(seconds=RequestService.CAB_DRIVER_OFFER_WINDOW_SECONDS)).isoformat()
            if targeted_ids else None
        )
        details.pop('assigned_driver', None)
        service_request.details = details

    @staticmethod
    def refresh_cab_dispatch(service_request, declined_driver_id=None):
        """Update targeted drivers after a cab offer is declined or reassigned."""
        if not service_request or service_request.request_type != 'cab':
            return

        details = dict(service_request.details or {})
        declined_ids = list(details.get('declined_driver_ids') or [])
        if declined_driver_id and str(declined_driver_id) not in declined_ids:
            declined_ids.append(str(declined_driver_id))

        pickup = (service_request.location_data or {}).get('pickup') or {}
        car_type = details.get('car_type')

        next_candidates = RequestService._select_next_cab_offer_ids(
            pickup=pickup,
            car_type=car_type,
            declined_driver_ids=declined_ids,
            preferred_driver_id=details.get('preferred_driver_id'),
        )

        details['declined_driver_ids'] = declined_ids
        details['targeted_driver_ids'] = next_candidates
        details['dispatch_state'] = 'searching' if next_candidates else 'no_drivers_available'
        details['dispatch_updated_at'] = datetime.utcnow().isoformat()
        details['dispatch_expires_at'] = (
            (datetime.utcnow() + timedelta(seconds=RequestService.CAB_DRIVER_OFFER_WINDOW_SECONDS)).isoformat()
            if next_candidates else None
        )
        details.pop('assigned_driver', None)
        service_request.details = details

    @staticmethod
    def refresh_expired_cab_dispatch_if_needed(service_request):
        """Rotate targeted cab offers when the current offer window has expired."""
        if not service_request or service_request.request_type != 'cab':
            return False
        if service_request.status != 'pending' or service_request.provider_id is not None:
            return False

        details = dict(service_request.details or {})
        targeted_ids = list(details.get('targeted_driver_ids') or [])
        dispatch_state = details.get('dispatch_state')
        expires_at = details.get('dispatch_expires_at')
        if not targeted_ids or dispatch_state != 'searching':
            return False

        try:
            dispatch_expiry = datetime.fromisoformat((expires_at or '').replace('Z', '+00:00'))
        except Exception:
            dispatch_expiry = None

        if not dispatch_expiry:
            return False

        if datetime.utcnow() < dispatch_expiry.replace(tzinfo=None):
            return False

        details['declined_driver_ids'] = list(dict.fromkeys((details.get('declined_driver_ids') or []) + targeted_ids))
        service_request.details = details
        RequestService.refresh_cab_dispatch(service_request)
        return True

    @staticmethod
    def can_driver_view_cab_offer(service_request, driver):
        """Return True when a pending cab request is currently offered to this driver."""
        if not service_request or service_request.request_type != 'cab' or not driver:
            return False
        if service_request.status != 'pending' or service_request.provider_id is not None:
            return False

        details = service_request.details or {}
        targeted_driver_ids = details.get('targeted_driver_ids') or []
        declined_driver_ids = details.get('declined_driver_ids') or []
        driver_id = str(driver.id)

        if driver_id in declined_driver_ids:
            return False
        if targeted_driver_ids:
            return driver_id in targeted_driver_ids
        return False

    @staticmethod
    def _select_next_cab_offer_ids(pickup, car_type=None, declined_driver_ids=None, preferred_driver_id=None):
        """Return the next driver ids who should see the active offer, nearest-first."""
        declined_driver_ids = {str(driver_id) for driver_id in (declined_driver_ids or [])}
        targeted_ids = []

        if preferred_driver_id and str(preferred_driver_id) not in declined_driver_ids:
            preferred_driver, error = RequestService._validate_selected_driver(
                preferred_driver_id,
                car_type,
                pickup,
            )
            if not error and preferred_driver:
                targeted_ids.append(str(preferred_driver.id))

        if len(targeted_ids) >= RequestService.CAB_DRIVER_OFFER_LIMIT:
            return targeted_ids[:RequestService.CAB_DRIVER_OFFER_LIMIT]

        remaining_candidates = RequestService.find_nearest_matching_drivers(
            pickup,
            car_type=car_type,
            limit=RequestService.CAB_DRIVER_OFFER_LIMIT,
            exclude_driver_ids=declined_driver_ids | set(targeted_ids),
        )
        targeted_ids.extend(str(driver.id) for driver in remaining_candidates)
        return targeted_ids[:RequestService.CAB_DRIVER_OFFER_LIMIT]

    @staticmethod
    def get_cab_ride_stage(service_request):
        """Return a single rider/driver-friendly stage for a cab request."""
        if not service_request or service_request.request_type != 'cab':
            return None

        details = service_request.details or {}
        if service_request.status == 'cancelled':
            return 'cancelled'
        if service_request.status == 'completed' or details.get('cab_arrived_at_location'):
            return 'completed'
        if details.get('cab_trip_started'):
            return 'on_trip'
        if details.get('cab_driver_arrived'):
            return 'driver_arrived'
        if service_request.status == 'accepted' or service_request.provider_id:
            return 'driver_assigned'
        if details.get('dispatch_state') == 'no_drivers_available':
            return 'no_drivers_available'
        if service_request.payment_status == 'paid' and service_request.status == 'pending':
            return 'searching'
        if service_request.status == 'unpaid':
            return 'awaiting_payment'
        return service_request.status

    @staticmethod
    def serialize_request(service_request):
        """Serialize a request with rider/driver-facing cab metadata."""
        data = service_request.to_dict()
        details = dict(data.get('details') or {})
        data['details'] = details

        if service_request.request_type != 'cab':
            return data

        details['ride_stage'] = RequestService.get_cab_ride_stage(service_request)
        data['ride_stage'] = details['ride_stage']
        data['dispatch_state'] = details.get('dispatch_state')

        assigned_snapshot = None
        if service_request.provider_id and service_request.provider:
            assigned_snapshot = RequestService._build_driver_snapshot(service_request.provider)
            details['assigned_driver'] = assigned_snapshot
        else:
            assigned_snapshot = details.get('assigned_driver') or details.get('selected_driver')

        if assigned_snapshot:
            data['driver_id'] = assigned_snapshot.get('id')
            data['driver_name'] = assigned_snapshot.get('name')
            data['driver_phone'] = assigned_snapshot.get('phone')
            data['driver_profile_image_url'] = assigned_snapshot.get('profile_image_url')
            data['driver_current_location'] = assigned_snapshot.get('current_location')
            data['driver_vehicle'] = assigned_snapshot.get('vehicle')

        return data

    @staticmethod
    def find_nearest_matching_drivers(pickup, car_type=None, limit=5, exclude_driver_ids=None):
        """Find the nearest eligible online drivers for a pickup location."""
        exclude_driver_ids = {str(driver_id) for driver_id in (exclude_driver_ids or set())}
        pickup_lat = pickup.get('lat')
        pickup_lng = pickup.get('lng')
        if pickup_lat is None or pickup_lng is None:
            return []

        requested_types = RequestService._expand_requested_car_types(car_type)
        candidate_drivers = User.query.filter_by(
            role='driver',
            is_active=True,
            is_approved=True,
            is_paid=True,
        ).all()

        ranked = []
        for driver in candidate_drivers:
            if str(driver.id) in exclude_driver_ids:
                continue

            driver_data = driver.data or {}
            current_location = driver_data.get('current_location') or {}
            lat = current_location.get('lat')
            lng = current_location.get('lng')
            updated_at = current_location.get('updated_at')
            if lat is None or lng is None or not updated_at:
                continue

            try:
                last_seen = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
            except Exception:
                continue

            if (datetime.utcnow() - last_seen.replace(tzinfo=None)) > timedelta(minutes=15):
                continue

            driver_types = RequestService._extract_driver_car_types(driver)
            if requested_types and driver_types.isdisjoint(requested_types):
                continue

            distance_km = RequestService._haversine_distance_km(
                {'lat': float(pickup_lat), 'lng': float(pickup_lng)},
                {'lat': float(lat), 'lng': float(lng)},
            )
            if distance_km is None or distance_km > RequestService.CAB_DRIVER_SEARCH_RADIUS_KM:
                continue

            ranked.append((distance_km, driver))

        ranked.sort(key=lambda item: item[0])
        return [driver for _, driver in ranked[:limit]]

    @staticmethod
    def _extract_driver_car_types(driver):
        driver_data = driver.data or {}
        driver_services = driver_data.get('driver_services') or []
        car_types = set()
        for service in driver_services:
            if isinstance(service, dict):
                car_type = service.get('car_type')
                if car_type:
                    car_types.update(RequestService._expand_requested_car_types(car_type))
        return car_types

    @staticmethod
    def _expand_requested_car_types(car_type):
        if not car_type:
            return set()
        normalized = str(car_type).strip().lower().replace(' ', '_')
        aliases = {
            'small_hatchback': {'small_hatchback', 'hatchback'},
            'hatchback': {'small_hatchback', 'hatchback'},
            'standard': {'sedan', 'standard'},
            'sedan': {'sedan', 'standard'},
            'premium': {'luxury', 'premium'},
            'luxury': {'luxury', 'premium'},
            'suv': {'suv'},
        }
        return aliases.get(normalized, {normalized})

    @staticmethod
    def _validate_selected_driver(driver_id, requested_car_type, pickup):
        """Validate that a suggested driver is still eligible for this cab request."""
        driver = User.query.filter_by(
            id=driver_id,
            role='driver',
            is_active=True,
            is_approved=True,
            is_paid=True,
        ).first()
        if not driver:
            return None, "DRIVER_NOT_AVAILABLE"

        driver_data = driver.data or {}
        current_location = driver_data.get('current_location') or {}
        updated_at = current_location.get('updated_at')
        if not updated_at:
            return None, "DRIVER_OFFLINE"

        try:
            last_seen = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
        except Exception:
            return None, "DRIVER_OFFLINE"

        if (datetime.utcnow() - last_seen.replace(tzinfo=None)) > timedelta(minutes=15):
            return None, "DRIVER_OFFLINE"

        driver_car_types = set()
        for service in driver_data.get('driver_services', []) or []:
            car_type = (service or {}).get('car_type')
            if car_type:
                driver_car_types.add(str(car_type).strip().lower())

        fallback_car_type = ((driver_data.get('car_details') or {}).get('car_type') or '').strip().lower()
        if fallback_car_type:
            driver_car_types.add(fallback_car_type)

        normalized_requested_car_type = (requested_car_type or '').strip().lower()
        if normalized_requested_car_type and normalized_requested_car_type not in driver_car_types:
            return None, "DRIVER_RIDE_TYPE_MISMATCH"

        try:
            pickup_lat = float(pickup.get('lat'))
            pickup_lng = float(pickup.get('lng'))
            driver_lat = float(current_location.get('lat'))
            driver_lng = float(current_location.get('lng'))
        except (TypeError, ValueError):
            return None, "DRIVER_OFFLINE"

        distance_km = RequestService._haversine_distance_km(
            {'lat': pickup_lat, 'lng': pickup_lng},
            {'lat': driver_lat, 'lng': driver_lng},
        )
        if distance_km is None or distance_km > 10:
            return None, "DRIVER_TOO_FAR"

        return driver, None

    @staticmethod
    def _build_driver_snapshot(driver):
        """Capture the assigned driver and vehicle details for rider-facing flows."""
        driver_data = driver.data or {}
        name = RequestService._get_user_display_name(driver)
        vehicle = RequestService._extract_primary_driver_vehicle(driver_data)
        return {
            'id': str(driver.id),
            'name': name or driver.email,
            'phone': driver_data.get('phone'),
            'profile_image_url': driver.profile_image_url,
            'current_location': driver_data.get('current_location'),
            'vehicle': vehicle,
        }

    @staticmethod
    def _get_user_display_name(user):
        user_data = user.data or {}
        first = (user_data.get('full_name') or user_data.get('first_name') or '').strip()
        last = (user_data.get('surname') or user_data.get('last_name') or '').strip()
        return f"{first} {last}".strip()

    @staticmethod
    def _extract_primary_driver_vehicle(driver_data):
        car_details = driver_data.get('car_details') or {}
        driver_services = driver_data.get('driver_services') or []
        primary_vehicle = next(
            (service for service in driver_services if isinstance(service, dict)),
            {},
        )

        return {
            'make': primary_vehicle.get('car_make') or car_details.get('make'),
            'model': primary_vehicle.get('car_model') or car_details.get('model'),
            'license_plate': primary_vehicle.get('registration_number') or primary_vehicle.get('registration') or car_details.get('plate'),
            'color': primary_vehicle.get('color') or car_details.get('color'),
            'year': primary_vehicle.get('car_year') or car_details.get('year'),
            'car_type': primary_vehicle.get('car_type') or car_details.get('car_type'),
        }

    @staticmethod
    def check_provider_availability(provider_id, date_str, time_str):
        """Check if a provider is available at a given time"""
        provider = User.query.get(provider_id)
        if not provider or not provider.data or 'availability' not in provider.data:
            return True, None
            
        availability = provider.data['availability']
        
        # Blocked dates
        if date_str in (availability.get('blocked_dates') or []):
            return False, "PROV_DATE_BLOCKED"
            
        # Regular hours
        try:
            dt = datetime.strptime(date_str, '%Y-%m-%d')
            day_name = dt.strftime('%A').lower()
            day_config = availability.get('regular_hours', {}).get(day_name, {})
            if not day_config.get('enabled'):
                return False, f"PROV_NOT_WORKING_{day_name.upper()}"
                
            start = day_config.get('start', '08:00')
            end = day_config.get('end', '17:00')
            if not (start <= time_str < end):
                return False, "PROV_OUT_OF_HOURS"
        except ValueError:
            return False, "INVALID_DATETIME_FORMAT"
            
        # Busy slots
        busy = ServiceRequest.query.filter(
            ServiceRequest.provider_id == provider_id,
            ServiceRequest.scheduled_date == date_str,
            ServiceRequest.scheduled_time == time_str,
            ServiceRequest.status.in_(['accepted', 'completed', 'paid'])
        ).first()
        
        if busy:
            return False, "TIME_SLOT_TAKEN"
            
        return True, None

    @staticmethod
    def _get_rate_per_km(preferences):
        car_type = (preferences.get('car_type') or '').lower().strip()
        return CAR_TYPE_BASE_RATE_PER_KM.get(car_type, CAR_TYPE_BASE_RATE_PER_KM['sedan'])

    @staticmethod
    def _haversine_distance_km(pickup, dropoff):
        try:
            lat1, lon1 = float(pickup.get('lat')), float(pickup.get('lng'))
            lat2, lon2 = float(dropoff.get('lat')), float(dropoff.get('lng'))
        except (TypeError, ValueError, AttributeError):
            return None
        R = 6371.0
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        d_phi = math.radians(lat2 - lat1)
        d_lambda = math.radians(lon2 - lon1)
        a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    @staticmethod
    def _resolve_payment_amount(data):
        payment_amount = float(data.get('payment_amount', 0))
        if data['type'] in ('professional', 'provider'):
            setting_key = f"{data['type']}_callout_fee_amount"
            setting = AppSetting.query.get(setting_key) or AppSetting.query.get('callout_fee_amount')
            if setting:
                payment_amount = float(setting.value)
            elif not payment_amount:
                payment_amount = 150.0
        return payment_amount
