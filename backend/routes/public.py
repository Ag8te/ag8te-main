"""
Public Routes (No Authentication Required)
"""
from flask import Blueprint, current_app, request
from sqlalchemy import func
from backend.models import CarouselItem, User, ProfessionalRating, DriverRating, ProviderRating
from backend.models.testimonial import Testimonial
from backend.models.landing_feature import LandingFeature
from backend.models.footer_cms import FooterContent
from backend.models.setting import AppSetting
from backend.models.service import ServiceType
from backend.extensions import db
from backend.utils.response import success_response, error_response
from backend.services.pricing_service import PricingService
from backend.services.request_service import RequestService
from datetime import datetime, timedelta

bp = Blueprint('public', __name__)


@bp.route('/top-providers', methods=['GET'])
def get_top_providers():
    """Returns top-rated verified professionals and drivers for the landing page."""
    try:
        limit = request.args.get('limit', default=3, type=int)
        
        # We need to aggregate across professional_ratings, driver_ratings, and provider_ratings
        # For simplicity in this implementation, let's fetch professionals with the highest professional_ratings
        # and drivers with the highest driver_ratings, then combine and sort.
        
        # Professional Ratings
        prof_stats = db.session.query(
            ProfessionalRating.professional_id,
            func.avg(ProfessionalRating.rating).label('avg_rating'),
            func.count(ProfessionalRating.id).label('review_count')
        ).group_by(ProfessionalRating.professional_id).subquery()
        
        top_profs = db.session.query(User, prof_stats.c.avg_rating, prof_stats.c.review_count).join(
            prof_stats, User.id == prof_stats.c.professional_id
        ).filter(User.is_approved == True).order_by(prof_stats.c.avg_rating.desc()).limit(limit).all()
        
        # Driver Ratings
        driver_stats = db.session.query(
            DriverRating.driver_id,
            func.avg(DriverRating.rating).label('avg_rating'),
            func.count(DriverRating.id).label('review_count')
        ).group_by(DriverRating.driver_id).subquery()
        
        top_drivers = db.session.query(User, driver_stats.c.avg_rating, driver_stats.c.review_count).join(
            driver_stats, User.id == driver_stats.c.driver_id
        ).filter(User.is_approved == True).order_by(driver_stats.c.avg_rating.desc()).limit(limit).all()
        
        # Combine and format
        result = []
        for user, avg, count in top_profs:
            d = user.to_dict()
            d['avg_rating'] = float(avg) if avg else 0
            d['review_count'] = count
            d['role_display'] = user.data.get('profession', user.role.capitalize())
            result.append(d)
            
        for user, avg, count in top_drivers:
            d = user.to_dict()
            d['avg_rating'] = float(avg) if avg else 0
            d['review_count'] = count
            d['role_display'] = "Premium Driver"
            result.append(d)
            
        # Re-sort by rating and limit
        result = sorted(result, key=lambda x: x['avg_rating'], reverse=True)[:limit]
        
        return success_response({'providers': result})
    except Exception as e:
        current_app.logger.error(f"Get top providers error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to load top providers', None, 500)


@bp.route('/carousel', methods=['GET'])
def list_active_carousel():
    """List all active carousel items for the public landing page."""
    try:
        items = CarouselItem.query.filter_by(is_active=True).order_by(CarouselItem.order.asc(), CarouselItem.created_at.asc()).all()
        return success_response({
            'items': [item.to_dict() for item in items]
        })
    except Exception as e:
        current_app.logger.error(f"List public carousel error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to load carousel items', None, 500)


@bp.route('/testimonials', methods=['GET'])
def list_testimonials():
    """List all active testimonials for the public landing page."""
    try:
        items = Testimonial.query.filter_by(is_active=True).order_by(
            Testimonial.order.asc(), Testimonial.created_at.asc()
        ).all()
        return success_response({'testimonials': [t.to_dict() for t in items]})
    except Exception as e:
        current_app.logger.error(f"List testimonials error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to load testimonials', None, 500)


@bp.route('/landing-features', methods=['GET'])
def list_landing_features():
    """List all active landing features (Why Choose Us) for the public landing page."""
    try:
        items = LandingFeature.query.filter_by(is_active=True).order_by(
            LandingFeature.order.asc(), LandingFeature.created_at.asc()
        ).all()
        return success_response({'features': [f.to_dict() for f in items]})
    except Exception as e:
        current_app.logger.error(f"List landing features error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to load landing features', None, 500)


@bp.route('/landing', methods=['GET'])
def get_landing_data():
    """Combined endpoint — fetch all public landing page data in one call."""
    try:
        carousel = CarouselItem.query.filter_by(is_active=True).order_by(
            CarouselItem.order.asc(), CarouselItem.created_at.asc()
        ).all()
        testimonials = Testimonial.query.filter_by(is_active=True).order_by(
            Testimonial.order.asc(), Testimonial.created_at.asc()
        ).all()
        features = LandingFeature.query.filter_by(is_active=True).order_by(
            LandingFeature.order.asc(), LandingFeature.created_at.asc()
        ).all()
        return success_response({
            'carousel': [c.to_dict() for c in carousel],
            'testimonials': [t.to_dict() for t in testimonials],
            'features': [f.to_dict() for f in features],
        })
    except Exception as e:
        current_app.logger.error(f"Get landing data error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to load landing data', None, 500)


@bp.route('/maps-key', methods=['GET'])
def get_maps_key():
    """Returns the Google Maps API key for frontend usage."""
    try:
        key = current_app.config.get('GOOGLE_MAPS_API_KEY')
        if not key:
            return error_response('NOT_FOUND', 'Google Maps API key not configured', None, 404)
        return success_response({'key': key})
    except Exception as e:
        current_app.logger.error(f"Get maps key error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to retrieve maps key', None, 500)


@bp.route('/calculate-fare', methods=['GET'])
def calculate_fare():
    """Calculate trip fare based on distance and vehicle type."""
    try:
        distance = request.args.get('distance', type=float)
        car_type = request.args.get('car_type', default='sedan')
        
        if distance is None:
            return error_response('INVALID_INPUT', 'Distance is required', None, 400)
            
        # Use current time for time-based surcharges
        now = datetime.utcnow()
        fare = PricingService.calculate_trip_price(distance, now, car_type)
        
        return success_response({'fare': fare})
    except Exception as e:
        current_app.logger.error(f"Calculate fare error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to calculate fare', None, 500)


@bp.route('/drivers-nearby', methods=['GET'])
def get_drivers_nearby():
    """
    Find drivers within a certain radius of a location.
    Params: lat, lng, radius (km, default 10)
    """
    try:
        lat = request.args.get('lat', type=float)
        lng = request.args.get('lng', type=float)
        radius = request.args.get('radius', default=10, type=float)

        if lat is None or lng is None:
            return error_response('INVALID_INPUT', 'Coordinates are required', None, 400)

        # Only ride-ready drivers should be considered for nearby ride suggestions.
        drivers = User.query.filter_by(
            role='driver',
            is_approved=True,
            is_active=True,
            is_paid=True
        ).all()

        rating_rows = db.session.query(
            DriverRating.driver_id,
            func.coalesce(func.avg(DriverRating.rating), 0).label('avg_rating'),
            func.count(DriverRating.id).label('review_count')
        ).filter(
            DriverRating.driver_id.in_([driver.id for driver in drivers])
        ).group_by(DriverRating.driver_id).all() if drivers else []
        rating_map = {
            str(driver_id): {
                'average_rating': round(float(avg_rating), 1) if avg_rating is not None else 0.0,
                'reviews_count': int(review_count or 0),
            }
            for driver_id, avg_rating, review_count in rating_rows
        }
        
        nearby = []
        for d in drivers:
            eligibility = RequestService.get_driver_cab_eligibility(
                d,
                require_fresh_location=True,
            )
            if not eligibility.get('eligible'):
                continue

            d_data = d.data or {}
            loc = eligibility.get('current_location') or {}
            d_lat = loc.get('lat')
            d_lng = loc.get('lng')
            if d_lat is None or d_lng is None:
                continue
            
            # Simple Haversine for filtering
            dist = _calculate_haversine(lat, lng, d_lat, d_lng)
            if dist <= radius:
                services = d_data.get('driver_services', [])
                car_types = set()
                for service in services:
                    if isinstance(service, dict) and service.get('car_type'):
                        car_types.update(RequestService._expand_requested_car_types(service.get('car_type')))
                    elif isinstance(service, str):
                        car_types.update(RequestService._expand_requested_car_types(service))

                if not car_types and isinstance(d_data.get('car_details'), dict):
                    fallback_type = d_data['car_details'].get('car_type')
                    if fallback_type:
                        car_types.update(RequestService._expand_requested_car_types(fallback_type))

                vehicle = RequestService._extract_primary_driver_vehicle(d_data)
                rating_summary = rating_map.get(str(d.id), {'average_rating': 0.0, 'reviews_count': 0})
                display_name = RequestService._get_user_display_name(d) or 'Driver'

                nearby.append({
                    'id': str(d.id),
                    'name': display_name,
                    'first_name': RequestService._get_user_first_name(d),
                    'phone': d_data.get('phone', ''),
                    'location': {'lat': d_lat, 'lng': d_lng},
                    'distance_km': round(dist, 2),
                    'eta_min': max(1, round(dist * 2)),
                    'car_types': sorted(car_types),
                    'profile_image_url': d.profile_image_url,
                    'average_rating': rating_summary['average_rating'],
                    'reviews_count': rating_summary['reviews_count'],
                    'is_verified': True,
                    'vehicle': vehicle,
                })
        
        # Sort by distance
        nearby = sorted(nearby, key=lambda x: x['distance_km'])
        
        return success_response({'drivers': nearby})
    except Exception as e:
        current_app.logger.error(f"Get drivers nearby error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to find nearby drivers', None, 500)


def _calculate_haversine(lat1, lon1, lat2, lon2):
    """Internal helper for distance calculation"""
    import math
    R = 6371  # Earth radius in KM
    
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = math.sin(d_lat/2)**2 + math.cos(math.radians(lat1)) * \
        math.cos(math.radians(lat2)) * math.sin(d_lon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    return R * c


@bp.route('/footer', methods=['GET'])
def get_footer_details():
    """Returns the dynamic footer contact details from the CMS settings."""
    try:
        footer = FooterContent.query.get(1)
        if footer:
            return success_response({'footer': footer.to_dict()})
        else:
            return success_response({
                'footer': {
                    'company_name': 'MzansiServe',
                    'email': 'info@mzansiserve.co.za',
                    'phone': '+27 (0) 11 000 0000',
                    'physical_address': 'Johannesburg, Gauteng, South Africa'
                }
            })
    except Exception as e:
        current_app.logger.error(f"Get footer details error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to load footer details', None, 500)


@bp.route('/service-options', methods=['GET'])
def get_service_options():
    """Returns a list of approved service types for professionals and service providers."""
    try:
        category = request.args.get('category')
        query = ServiceType.query.filter_by(is_active=True)
        if category:
            query = query.filter_by(category=category)
            
        services = query.order_by(ServiceType.order.asc(), ServiceType.name.asc()).all()
        return success_response({'services': [s.to_dict() for s in services]})
    except Exception as e:
        current_app.logger.error(f"Get service options error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to load service options', None, 500)

@bp.route('/payment-gateways', methods=['GET'])
def get_payment_gateways():
    """Returns the enabled status of payment gateways (PayPal, Yoco)."""
    try:
        paypal_setting = AppSetting.query.get('payment_paypal')
        yoco_setting = AppSetting.query.get('payment_yoco')
        
        # Fallback to current_app config if settings not in DB
        paypal_enabled = paypal_setting.value.get('enabled', False) if paypal_setting else current_app.config.get('PAYPAL_CLIENT_ID') is not None
        yoco_enabled = yoco_setting.value.get('enabled', False) if yoco_setting else current_app.config.get('YOCO_SECRET_KEY') is not None
        
        return success_response({
            'paypal': {'enabled': paypal_enabled},
            'yoco': {'enabled': yoco_enabled}
        })
    except Exception as e:
        current_app.logger.error(f"Get payment gateways error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to load payment options', None, 500)
