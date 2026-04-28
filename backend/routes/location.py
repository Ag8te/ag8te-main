"""
Location Routes
"""
from flask import Blueprint, request, current_app
import math
from datetime import datetime

from flask_jwt_extended import get_jwt_identity

from backend.extensions import db
from backend.models import User
from backend.utils.decorators import require_role
from backend.utils.response import error_response, success_response

bp = Blueprint('location', __name__)

@bp.route('/calculate-distance', methods=['POST'])
def calculate_distance():
    """Calculate distance between two points"""
    try:
        data = request.json
        origin = data.get('origin', {})
        destination = data.get('destination', {})
        
        if not origin.get('lat') or not origin.get('lng') or \
           not destination.get('lat') or not destination.get('lng'):
            return {'success': False, 'error': 'Missing coordinates'}, 400
        
        # Haversine formula for distance calculation
        lat1, lon1 = float(origin['lat']), float(origin['lng'])
        lat2, lon2 = float(destination['lat']), float(destination['lng'])
        
        R = 6371  # Earth radius in kilometers
        
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        
        a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * \
            math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        distance = R * c
        
        return {
            'success': True,
            'data': {
                'distance': round(distance, 2),
                'unit': 'km'
            }
        }
        
    except Exception as e:
        current_app.logger.error(f"Calculate distance error: {str(e)}")
        return {'success': False, 'error': 'Failed to calculate distance'}, 500


@bp.route('/current', methods=['POST'])
@require_role('driver')
def update_current_location():
    """Persist the driver's latest browser-reported location for nearby ride suggestions."""
    try:
        data = request.json or {}
        lat = data.get('lat')
        lng = data.get('lng')

        if lat is None or lng is None:
            return error_response('INVALID_INPUT', 'Latitude and longitude are required', None, 400)

        try:
            lat = float(lat)
            lng = float(lng)
        except (TypeError, ValueError):
            return error_response('INVALID_INPUT', 'Latitude and longitude must be numeric', None, 400)

        if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
            return error_response('INVALID_INPUT', 'Invalid latitude or longitude range', None, 400)

        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user:
            return error_response('USER_NOT_FOUND', 'User not found', None, 404)

        user_data = dict(user.data or {})
        user_data['current_location'] = {
            'lat': lat,
            'lng': lng,
            'updated_at': datetime.utcnow().isoformat() + 'Z'
        }
        user.data = user_data
        db.session.commit()

        return success_response({
            'location': user_data['current_location']
        }, 'Location updated successfully')
    except Exception as e:
        current_app.logger.error(f"Update current location error: {str(e)}")
        db.session.rollback()
        return error_response('INTERNAL_ERROR', 'Failed to update current location', None, 500)
