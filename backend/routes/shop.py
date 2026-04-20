"""
Shop Routes
"""
from flask import Blueprint, request, current_app
from backend.models import ShopCategory, ShopSubcategory, ShopProduct, Order, User
from backend.models.shop import Inventory
from backend.extensions import db
from backend.utils.response import success_response, error_response
from backend.utils.decorators import require_auth
from backend.services.payment_service import PaymentService
from datetime import datetime
import secrets
import uuid
from backend.utils.url import get_public_backend_base_url, get_request_frontend_base_url

bp = Blueprint('shop', __name__)

@bp.route('/products', methods=['GET'])
def list_products():
    """List products"""
    try:
        from sqlalchemy import or_
        
        category_id = request.args.get('category_id')
        subcategory_id = request.args.get('subcategory_id')
        search = request.args.get('search')
        limit = int(request.args.get('limit', 50))
        offset = int(request.args.get('offset', 0))
        
        # Filter by active products
        query = ShopProduct.query.filter(ShopProduct.status == 'active')
        
        if subcategory_id:
            query = query.filter_by(subcategory_id=subcategory_id)
        elif category_id:
            query = query.filter_by(category_id=category_id)
        
        # Search against product name and description
        if search:
            search_term = f'%{search}%'
            query = query.filter(
                or_(
                    ShopProduct.name.ilike(search_term),
                    ShopProduct.description.ilike(search_term)
                )
            )
        
        total = query.count()
        products = query.limit(limit).offset(offset).all()
        
        # Sync product stock status with inventory
        from backend.services.inventory_service import sync_product_stock_status
        for product in products:
            sync_product_stock_status(product.id)
        
        # Build products list with accurate stock status
        products_list = []
        for p in products:
            product_dict = p.to_dict()
            # Ensure in_stock reflects current inventory status
            inventory = Inventory.query.filter_by(product_id=p.id).first()
            if inventory:
                # Use available_quantity (total - reserved) for stock status
                if inventory.available_quantity <= 0:
                    product_dict['in_stock'] = False
                else:
                    product_dict['in_stock'] = True
            # If no inventory record, use product's in_stock field
            products_list.append(product_dict)
        
        return success_response({
            'products': products_list,
            'total': total,
            'limit': limit,
            'offset': offset
        })
        
    except Exception as e:
        current_app.logger.error(f"List products error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to list products', None, 500)

@bp.route('/products/<product_id>', methods=['GET'])
def get_product(product_id):
    """Get product details"""
    try:
        product = ShopProduct.query.get(product_id)
        
        if not product:
            return error_response('NOT_FOUND', 'Product not found', None, 404)
        
        # Sync product stock status with inventory
        from backend.services.inventory_service import sync_product_stock_status
        sync_product_stock_status(product_id)
        
        # Refresh product from database
        db.session.refresh(product)
        
        product_dict = product.to_dict()
        
        # Ensure in_stock reflects current inventory status
        inventory = Inventory.query.filter_by(product_id=product_id).first()
        if inventory:
            # Use available_quantity (total - reserved) for stock status
            if inventory.available_quantity <= 0:
                product_dict['in_stock'] = False
            else:
                product_dict['in_stock'] = True
        
        return success_response(product_dict)
        
    except Exception as e:
        current_app.logger.error(f"Get product error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to get product', None, 500)

@bp.route('/categories', methods=['GET'])
def list_categories():
    """List categories"""
    try:
        categories = ShopCategory.query.all()
        return success_response({'categories': [c.to_dict() for c in categories]})
        
    except Exception as e:
        current_app.logger.error(f"List categories error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to list categories', None, 500)

@bp.route('/subcategories', methods=['GET'])
def list_subcategories():
    """List subcategories, optionally filtered by category"""
    try:
        category_id = request.args.get('category_id')
        
        if category_id:
            subcategories = ShopSubcategory.query.filter_by(category_id=category_id).all()
        else:
            subcategories = ShopSubcategory.query.all()
        
        return success_response({
            'subcategories': [s.to_dict() for s in subcategories]
        })
    except Exception as e:
        current_app.logger.error(f"List subcategories error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to list subcategories', None, 500)

@bp.route('/orders', methods=['POST'])
@require_auth
def create_order():
    """Create order with pending status"""
    try:
        from flask_jwt_extended import get_jwt_identity
        user_id = get_jwt_identity()
        user = db.session.get(User, user_id) if user_id else None
        
        data = request.json
        items = data.get('items', [])
        total = data.get('total', 0)
        delivery_address = data.get('delivery_address')
        
        if not items:
            return error_response('INVALID_REQUEST', 'Order must have items', None, 400)
        
        # Validate inventory availability for each item
        unavailable_items = []
        for item in items:
            product_id = item.get('product_id') or item.get('id')
            quantity = item.get('quantity', 0)
            
            if not product_id or quantity <= 0:
                continue
            
            # Get product
            product = ShopProduct.query.get(product_id)
            if not product:
                unavailable_items.append({
                    'product_id': product_id,
                    'reason': 'Product not found'
                })
                continue
            
            # Check if product is active and in stock
            if product.status != 'active':
                unavailable_items.append({
                    'product_id': product_id,
                    'product_name': product.name,
                    'reason': 'Product is not active'
                })
                continue
            
            # Check inventory
            inventory = Inventory.query.filter_by(product_id=product_id).first()
            if inventory:
                available_quantity = inventory.available_quantity
                if available_quantity < quantity:
                    unavailable_items.append({
                        'product_id': product_id,
                        'product_name': product.name,
                        'reason': f'Insufficient inventory. Available: {available_quantity}, Requested: {quantity}',
                        'available': available_quantity,
                        'requested': quantity
                    })
                    continue
            elif not product.in_stock:
                # Product marked as out of stock but no inventory record
                unavailable_items.append({
                    'product_id': product_id,
                    'product_name': product.name,
                    'reason': 'Product is out of stock'
                })
                continue
        
        # If any items are unavailable, return error
        if unavailable_items:
            return error_response(
                'INSUFFICIENT_INVENTORY',
                'Some products are out of stock or have insufficient inventory',
                {'unavailable_items': unavailable_items},
                400
            )
        
        order_id = f"ORD-{secrets.token_hex(8).upper()}"
        
        # Prepare shipping data with delivery address
        shipping_data = data.get('shipping', {})
        if delivery_address:
            shipping_data['delivery_address'] = delivery_address
        
        order = Order(
            id=order_id,
            customer_id=user_id,
            customer_email=user.email if user else data.get('email'),
            total=total,
            items=items,
            shipping=shipping_data,
            status='pending'
        )
        
        db.session.add(order)
        db.session.commit()
        
        return success_response(order.to_dict(), 'Order created successfully', 201)
        
    except Exception as e:
        current_app.logger.error(f"Create order error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to create order', None, 500)

@bp.route('/orders/<order_id>/pay', methods=['POST'])
@require_auth
def initiate_order_payment(order_id):
    """Initiate payment for an order via Yoco"""
    try:
        from flask_jwt_extended import get_jwt_identity
        user_id = get_jwt_identity()
        
        order = Order.query.get(order_id)
        
        if not order:
            return error_response('NOT_FOUND', 'Order not found', None, 404)
        
        if str(order.customer_id) != user_id:
            return error_response('FORBIDDEN', 'Access denied', None, 403)
        
        if order.status != 'pending':
            return error_response('INVALID_STATUS', 'Order is not pending payment', None, 400)
        
        # Create external_id for payment tracking (format: order_{order_id}_{random_hex})
        external_id = f"order_{order_id}_{uuid.uuid4().hex[:8]}"
        
        # Calculate amount in cents
        amount_in_cents = int(float(order.total) * 100)
        
        # Create callback URLs
        base_url = get_public_backend_base_url()
        frontend_url = get_request_frontend_base_url()
        success_url = f"{base_url}/api/payments/order-callback?callback_status=success&external_id={external_id}&order_id={order_id}&frontend_url={frontend_url}"
        cancel_url = f"{base_url}/api/payments/order-callback?callback_status=cancel&external_id={external_id}&order_id={order_id}&frontend_url={frontend_url}"
        failure_url = f"{base_url}/api/payments/order-callback?callback_status=failure&external_id={external_id}&order_id={order_id}&frontend_url={frontend_url}"
        
        # Create Yoco checkout
        checkout_result = PaymentService.create_checkout(
            amount=amount_in_cents,
            currency='ZAR',
            external_id=external_id,
            success_url=success_url,
            cancel_url=cancel_url,
            failure_url=failure_url
        )
        
        # Store payment_id in order
        order.payment_id = checkout_result.get('payment_id')
        db.session.commit()
        
        return success_response({
            'redirect_url': checkout_result['redirect_url'],
            'checkout_id': checkout_result['checkout_id'],
            'external_id': external_id,
            'order_id': order_id
        })
        
    except Exception as e:
        current_app.logger.error(f"Initiate order payment error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to initiate payment', None, 500)

@bp.route('/orders', methods=['GET'])
@require_auth
def list_orders():
    """List user orders"""
    try:
        from flask_jwt_extended import get_jwt_identity
        user_id = get_jwt_identity()
        limit = int(request.args.get('limit', 50))
        offset = int(request.args.get('offset', 0))
        
        query = Order.query.filter_by(customer_id=user_id)
        total = query.count()
        orders = query.order_by(Order.placed_at.desc()).limit(limit).offset(offset).all()
        
        return success_response({
            'orders': [o.to_dict() for o in orders],
            'total': total,
            'limit': limit,
            'offset': offset
        })
        
    except Exception as e:
        current_app.logger.error(f"List orders error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to list orders', None, 500)

@bp.route('/orders/<order_id>', methods=['GET'])
@require_auth
def get_order(order_id):
    """Get order details"""
    try:
        from flask_jwt_extended import get_jwt_identity
        user_id = get_jwt_identity()
        
        order = Order.query.get(order_id)
        
        if not order:
            return error_response('NOT_FOUND', 'Order not found', None, 404)
        
        # Only allow user to access their own orders
        if str(order.customer_id) != user_id:
            return error_response('FORBIDDEN', 'Access denied', None, 403)
        
        return success_response(order.to_dict())
        
    except Exception as e:
        current_app.logger.error(f"Get order error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to get order', None, 500)

@bp.route('/orders/<order_id>/invoice', methods=['GET'])
@require_auth
def get_order_invoice(order_id):
    """Download invoice for an order"""
    try:
        from flask_jwt_extended import get_jwt_identity
        from flask import send_file
        from backend.services.document_service import DocumentService
        
        user_id = get_jwt_identity()
        order = Order.query.get(order_id)
        
        if not order:
            return error_response('NOT_FOUND', 'Order not found', None, 404)
        
        # Only allow user to access their own invoices (or admin)
        if str(order.customer_id) != user_id:
            # Check if admin
            requesting_user = User.query.get(user_id)
            if requesting_user.role != 'admin':
                return error_response('FORBIDDEN', 'Access denied', None, 403)
        
        pdf_buffer = DocumentService.generate_invoice(order.to_dict())
        return send_file(
            pdf_buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f"invoice_{order_id}.pdf"
        )
        
    except Exception as e:
        current_app.logger.error(f"Get invoice error: {str(e)}")
        return error_response('INTERNAL_ERROR', 'Failed to generate invoice', None, 500)
