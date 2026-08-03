from app import app
from backend.extensions import db
from backend.models import ShopProduct, User, MarketplaceAd, MarketplaceCategory
import click

with app.app_context():
    print("Clearing demo products and ads ads...")
    # Delete demo products by matching the default ones in seed_all
    default_names = ['Smartphone', 'Laptop', 'Headphones', 'Smartwatch', 'T-Shirt', 'Jeans', 'Coffee Maker', 'Blender']
    db.session.query(ShopProduct).filter(ShopProduct.name.in_(default_names)).delete(synchronize_session=False)
    
    # Delete demo users by email
    demo_emails = ['prof_lawyer@ag8te.com', 'prov_cleaning@ag8te.com', 'prof_accountant@ag8te.com']
    db.session.query(User).filter(User.email.in_(demo_emails)).delete(synchronize_session=False)

    # Delete demo ads
    demo_ads = ['2018 Toyota Corolla for Sale', 'Modern 2 Bedroom Apartment in Sandton', 'iPhone 13 Pro - 128GB (Graphite)']
    db.session.query(MarketplaceAd).filter(MarketplaceAd.title.in_(demo_ads)).delete(synchronize_session=False)

    db.session.commit()
    print("Demo data cleared.")
