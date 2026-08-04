from flask import Blueprint, request, current_app
from backend.models import MarketplaceCategory, MarketplaceAd, User
from backend.extensions import db
from backend.utils.response import success_response, error_response
from backend.utils.decorators import require_auth
from flask_jwt_extended import get_jwt_identity
import uuid

bp = Blueprint('marketplace_ads', __name__)

@bp.route('/categories', methods=['GET'])
def list_categories():
    """List ads categories"""
    try:
        categories = MarketplaceCategory.query.all()
        return success_response({'categories': [c.to_dict() for c in categories]})
    except Exception as e:
        current_app.logger.error(f"List ads categories error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to list categories', None, 500)

@bp.route('/ads', methods=['GET'])
def list_ads():
    """List ads ads with filters"""
    try:
        category_slug = request.args.get('category')
        search = request.args.get('search')
        city = request.args.get('city')
        province = request.args.get('province')
        min_price = request.args.get('min_price')
        max_price = request.args.get('max_price')
        limit = int(request.args.get('limit', 20))
        offset = int(request.args.get('offset', 0))

        query = MarketplaceAd.query.filter_by(status='active')

        if category_slug:
            category = MarketplaceCategory.query.filter_by(slug=category_slug).first()
            if category:
                query = query.filter_by(category_id=category.id)

        if search:
            search_term = f'%{search}%'
            query = query.filter(
                (MarketplaceAd.title.ilike(search_term)) | 
                (MarketplaceAd.description.ilike(search_term))
            )

        if city:
            query = query.filter(MarketplaceAd.city.ilike(city))
        
        if province:
            query = query.filter(MarketplaceAd.province.ilike(province))

        if min_price:
            query = query.filter(MarketplaceAd.price >= float(min_price))
        
        if max_price:
            query = query.filter(MarketplaceAd.price <= float(max_price))

        total = query.count()
        ads = query.order_by(MarketplaceAd.created_at.desc()).limit(limit).offset(offset).all()

        return success_response({
            'ads': [ad.to_dict() for ad in ads],
            'total': total,
            'limit': limit,
            'offset': offset
        })
    except Exception as e:
        current_app.logger.error(f"List ads ads error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to list ads', None, 500)

@bp.route('/ads/<ad_id>', methods=['GET'])
def get_ad(ad_id):
    """Get ad details"""
    try:
        ad = MarketplaceAd.query.get(ad_id)
        if not ad:
            return error_response('NOT_FOUND', 'Ad not found', None, 404)
        return success_response(ad.to_dict())
    except Exception as e:
        current_app.logger.error(f"Get ad error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to get ad', None, 500)

@bp.route('/ads', methods=['POST'])
@require_auth
def create_ad():
    """Create a new ad"""
    try:
        user_id = get_jwt_identity()
        data = request.json

        # Required fields
        required = ['category_id', 'title', 'description', 'city', 'province']
        for field in required:
            if not data.get(field):
                return error_response('MISSING_FIELD', f'Field {field} is required', None, 400)

        ad = MarketplaceAd(
            user_id=user_id,
            category_id=data.get('category_id'),
            title=data.get('title'),
            description=data.get('description'),
            price=data.get('price'),
            city=data.get('city'),
            province=data.get('province'),
            condition=data.get('condition'),
            images=data.get('images', []),
            contact_name=data.get('contact_name'),
            contact_phone=data.get('contact_phone'),
            contact_email=data.get('contact_email'),
            status='active'
        )

        db.session.add(ad)
        db.session.commit()

        return success_response(ad.to_dict(), 'Ad posted successfully', 201)
    except Exception as e:
        current_app.logger.error(f"Create ad error: {str(e)}")
        db.session.rollback()
        return error_response('INTERNAL_ERROR', 'Failed to post ad', None, 500)

@bp.route('/ads/<ad_id>', methods=['PATCH'])
@require_auth
def update_ad(ad_id):
    """Update an ad"""
    try:
        user_id = get_jwt_identity()
        ad = MarketplaceAd.query.get(ad_id)

        if not ad:
            return error_response('NOT_FOUND', 'Ad not found', None, 404)
        
        if str(ad.user_id) != user_id:
            return error_response('FORBIDDEN', 'You do not own this ad', None, 403)

        data = request.json
        fields = ['title', 'description', 'price', 'city', 'province', 'condition', 'images', 'status', 'contact_name', 'contact_phone', 'contact_email']
        
        for field in fields:
            if field in data:
                setattr(ad, field, data[field])

        db.session.commit()
        return success_response(ad.to_dict(), 'Ad updated successfully')
    except Exception as e:
        current_app.logger.error(f"Update ad error: {str(e)}")
        db.session.rollback()
        return error_response('INTERNAL_ERROR', 'Failed to update ad', None, 500)

@bp.route('/ads/<ad_id>', methods=['DELETE'])
@require_auth
def delete_ad(ad_id):
    """Delete an ad"""
    try:
        user_id = get_jwt_identity()
        ad = MarketplaceAd.query.get(ad_id)

        if not ad:
            return error_response('NOT_FOUND', 'Ad not found', None, 404)
        
        if str(ad.user_id) != user_id:
            return error_response('FORBIDDEN', 'You do not own this ad', None, 403)

        db.session.delete(ad)
        db.session.commit()
        return success_response(None, 'Ad deleted successfully')
    except Exception as e:
        current_app.logger.error(f"Delete ad error: {str(e)}")
        db.session.rollback()
        return error_response('INTERNAL_ERROR', 'Failed to delete ad', None, 500)
