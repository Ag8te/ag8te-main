"""
Inventory Service
"""
from flask import current_app
from backend.models.shop import ShopProduct, Inventory
from backend.extensions import db
import uuid


def update_inventory_on_order_payment(order):
    """
    Update inventory quantities when an order is paid.
    Decreases inventory quantity for each product in the order.
    
    Args:
        order: Order object with status='paid' and items (JSONB)
    
    Returns:
        tuple: (success: bool, message: str)
    """
    try:
        if not order or not order.items:
            return False, "Order or items not found"
        
        items = order.items if isinstance(order.items, list) else []
        
        for item in items:
            product_id = item.get('product_id') or item.get('id')
            quantity = item.get('quantity', 0)
            
            if not product_id or quantity <= 0:
                current_app.logger.warning(f"Invalid item in order {order.id}: {item}")
                continue
            
            # Get product
            product = ShopProduct.query.get(product_id)
            if not product:
                current_app.logger.warning(f"Product {product_id} not found for order {order.id}")
                continue
            
            # Variable products store stock per variation — deduct from variation stock
            if product and product.product_type == 'variable':
                sku = item.get('sku')
                variant_label = item.get('variant_label')
                variations = product.variations if isinstance(product.variations, list) else []
                matched_idx = None
                if sku:
                    matched_idx = next((i for i, v in enumerate(variations) if v.get('sku') == sku), None)
                if matched_idx is None and variant_label:
                    attrs = {}
                    for part in variant_label.split(', '):
                        if ': ' in part:
                            k, v = part.split(': ', 1)
                            attrs[k.strip()] = v.strip()
                    matched_idx = next((
                        i for i, v in enumerate(variations)
                        if all(v.get('attributes', {}).get(k) == val for k, val in attrs.items())
                    ), None)
                if matched_idx is not None:
                    new_stock = max(0, variations[matched_idx].get('stock', 0) - quantity)
                    variations[matched_idx] = {**variations[matched_idx], 'stock': new_stock}
                    product.variations = variations
                    current_app.logger.info(
                        f"Variation stock updated for product {product_id}: "
                        f"decreased by {quantity}, new stock: {new_stock}"
                    )
                continue

            # Get or create inventory
            inventory = Inventory.query.filter_by(product_id=product_id).first()
            if not inventory:
                # Create inventory if it doesn't exist
                inventory_id = f"INV-{uuid.uuid4().hex[:12].upper()}"
                inventory = Inventory(
                    id=inventory_id,
                    product_id=product_id,
                    quantity=0,
                    reserved_quantity=0
                )
                db.session.add(inventory)
                current_app.logger.info(f"Created inventory for product {product_id}")
            
            # Check if enough inventory available
            if inventory.quantity < quantity:
                current_app.logger.warning(
                    f"Insufficient inventory for product {product_id}: "
                    f"requested {quantity}, available {inventory.quantity}"
                )
                # Still decrease what's available, but log warning
                quantity_to_deduct = inventory.quantity
            else:
                quantity_to_deduct = quantity
            
            # Decrease inventory quantity
            inventory.quantity = max(0, inventory.quantity - quantity_to_deduct)
            
            # Update product in_stock status
            if inventory.quantity <= 0:
                product.in_stock = False
                current_app.logger.info(f"Product {product_id} is now out of stock")
            else:
                product.in_stock = True
            
            current_app.logger.info(
                f"Inventory updated for product {product_id}: "
                f"decreased by {quantity_to_deduct}, new quantity: {inventory.quantity}"
            )
        
        db.session.commit()
        return True, "Inventory updated successfully"
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating inventory for order {order.id}: {str(e)}")
        return False, f"Error updating inventory: {str(e)}"


def sync_product_stock_status(product_id=None):
    """
    Sync product in_stock status with inventory quantity.
    If inventory is zero or less, mark product as out of stock.
    
    Args:
        product_id: Optional product ID. If None, syncs all products.
    
    Returns:
        int: Number of products updated
    """
    try:
        if product_id:
            products = [ShopProduct.query.get(product_id)] if ShopProduct.query.get(product_id) else []
        else:
            products = ShopProduct.query.filter_by(status='active').all()
        
        updated_count = 0
        for product in products:
            if not product:
                continue
            
            inventory = Inventory.query.filter_by(product_id=product.id).first()
            if inventory:
                # Update in_stock based on available inventory
                if inventory.available_quantity <= 0:
                    if product.in_stock:
                        product.in_stock = False
                        updated_count += 1
                else:
                    if not product.in_stock:
                        product.in_stock = True
                        updated_count += 1
            elif product.in_stock:
                # No inventory record but product is marked as in stock
                # This could be a legacy product, keep it as is or mark as out of stock
                # For now, we'll leave it as is to avoid breaking existing products
                pass
        
        if updated_count > 0:
            db.session.commit()
        
        return updated_count
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error syncing product stock status: {str(e)}")
        return 0

# Called when an order is created (before payment).
# It increments reserved_quantity for each item so that
# available_quantity (quantity - reserved_quantity) drops immediately.
# Any other customer checking stock now sees the correct lower number.
# If any single item can't be reserved (out of stock), we roll back
# all reservations made so far in this order and return an error —
# the order should not be created at all.

def reserve_inventory_for_order(order):
    """
    Reserve inventory for each item in a pending order.
    Increments reserved_quantity so available_quantity drops immediately.
    Rolls back all reservations if any item cannot be fulfilled.

    Args:
        order: Order object with items (JSONB list)

    Returns:
        tuple: (success: bool, message: str, unavailable_items: list)
    """
    try:
        if not order or not order.items:
            return False, "Order or items not found", []

        items = order.items if isinstance(order.items, list) else []
        reserved = []  # track what we reserved so we can roll back if needed
        unavailable = []

        for item in items:
            product_id = item.get('product_id') or item.get('id')
            quantity = item.get('quantity', 0)

            if not product_id or quantity <= 0:
                continue

            product = ShopProduct.query.get(product_id)

            # Variable products store stock per variation — skip inventory table check
            if product and product.product_type == 'variable':
                sku = item.get('sku')
                variant_label = item.get('variant_label')
                variations = product.variations if isinstance(product.variations, list) else []
                matched = None
                if sku:
                    matched = next((v for v in variations if v.get('sku') == sku), None)
                if not matched and variant_label:
                    # Parse variant_label like "Color: Black, Size: 9" into attributes dict
                    attrs = {}
                    for part in variant_label.split(', '):
                        if ': ' in part:
                            k, v = part.split(': ', 1)
                            attrs[k.strip()] = v.strip()
                    matched = next((
                        v for v in variations
                        if all(v.get('attributes', {}).get(k) == val for k, val in attrs.items())
                    ), None)
                if not matched:
                    unavailable.append({
                        'product_id': product_id,
                        'product_name': product.name,
                        'reason': 'Variant not found'
                    })
                    continue
                if matched.get('stock', 0) < quantity:
                    unavailable.append({
                        'product_id': product_id,
                        'product_name': product.name,
                        'reason': f'Only {matched.get("stock", 0)} available, {quantity} requested',
                        'available': matched.get('stock', 0),
                        'requested': quantity
                    })
                    continue
                # Variable product stock is valid — no inventory table reservation needed
                continue

            inventory = Inventory.query.filter_by(product_id=product_id).first()

            if not inventory:
                unavailable.append({
                    'product_id': product_id,
                    'product_name': product.name if product else product_id,
                    'reason': 'No inventory record found'
                })
                continue

            if inventory.available_quantity < quantity:
                unavailable.append({
                    'product_id': product_id,
                    'product_name': product.name if product else product_id,
                    'reason': f'Only {inventory.available_quantity} available, {quantity} requested',
                    'available': inventory.available_quantity,
                    'requested': quantity
                })
                continue

            # Reserve the stock
            inventory.reserved_quantity += quantity
            reserved.append((inventory, quantity))

        if unavailable:
            # Roll back every reservation made in this loop before returning
            for inventory, quantity in reserved:
                inventory.reserved_quantity = max(0, inventory.reserved_quantity - quantity)
            db.session.commit()
            return False, "Some items are unavailable", unavailable

        db.session.commit()  # permanently save the reservations
        return True, "Inventory reserved", []

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error reserving inventory for order {order.id}: {str(e)}")
        return False, f"Error reserving inventory: {str(e)}", []

# Called when a payment fails or is cancelled.
# Decrements reserved_quantity back down so the stock
# becomes available to other customers again.

def release_inventory_reservation(order):
    """
    Release reserved inventory for a failed or cancelled order.
    Decrements reserved_quantity for each item.

    Args:
        order: Order object with items (JSONB list)

    Returns:
        tuple: (success: bool, message: str)
    """
    try:
        if not order or not order.items:
            return False, "Order or items not found"

        items = order.items if isinstance(order.items, list) else []

        for item in items:
            product_id = item.get('product_id') or item.get('id')
            quantity = item.get('quantity', 0)

            if not product_id or quantity <= 0:
                continue

            inventory = Inventory.query.filter_by(product_id=product_id).first()
            if inventory:
                # Never let reserved_quantity go below zero
                inventory.reserved_quantity = max(0, inventory.reserved_quantity - quantity)

        db.session.commit()
        return True, "Inventory reservation released"

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error releasing inventory for order {order.id}: {str(e)}")
        return False, f"Error releasing reservation: {str(e)}"


def restore_inventory_on_order_cancel(order):
    """
    Restore inventory quantities when a paid order is cancelled.
    This is the reverse of update_inventory_on_order_payment.
    Only call this for orders that were in 'paid' status —
    pending orders only need release_inventory_reservation.

    Args:
        order: Order object with items (JSONB list)

    Returns:
        tuple: (success: bool, message: str)
    """
    try:
        if not order or not order.items:
            return False, "Order or items not found"

        items = order.items if isinstance(order.items, list) else []

        for item in items:
            product_id = item.get('product_id') or item.get('id')
            quantity = item.get('quantity', 0)

            if not product_id or quantity <= 0:
                continue

            product = ShopProduct.query.get(product_id)
            if not product:
                current_app.logger.warning(
                    f"Product {product_id} not found when restoring "
                    f"inventory for cancelled order {order.id}"
                )
                continue

            # Variable products — restore variation stock
            if product and product.product_type == 'variable':
                sku = item.get('sku')
                variant_label = item.get('variant_label')
                variations = product.variations if isinstance(product.variations, list) else []
                matched_idx = None
                if sku:
                    matched_idx = next((i for i, v in enumerate(variations) if v.get('sku') == sku), None)
                if matched_idx is None and variant_label:
                    attrs = {}
                    for part in variant_label.split(', '):
                        if ': ' in part:
                            k, v = part.split(': ', 1)
                            attrs[k.strip()] = v.strip()
                    matched_idx = next((
                        i for i, v in enumerate(variations)
                        if all(v.get('attributes', {}).get(k) == val for k, val in attrs.items())
                    ), None)
                if matched_idx is not None:
                    new_stock = variations[matched_idx].get('stock', 0) + quantity
                    variations[matched_idx] = {**variations[matched_idx], 'stock': new_stock}
                    product.variations = variations
                    current_app.logger.info(
                        f"Variation stock restored for product {product_id}: "
                        f"added back {quantity}, new stock: {new_stock}"
                    )
                continue

            inventory = Inventory.query.filter_by(product_id=product_id).first()
            if not inventory:
                continue

            inventory.quantity += quantity

            if inventory.available_quantity > 0:
                product.in_stock = True

            current_app.logger.info(
                f"Inventory restored for product {product_id}: "
                f"added back {quantity}, new quantity: {inventory.quantity}"
            )

        db.session.commit()
        return True, "Inventory restored successfully"

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(
            f"Error restoring inventory for order {order.id}: {str(e)}"
        )
        return False, f"Error restoring inventory: {str(e)}"