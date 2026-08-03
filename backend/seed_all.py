"""
seed_all CLI command — runs every seeder in dependency order.
Imported and registered in backend/cli.py via:  from backend.seed_all import seed_all
"""
import click
import os
import shutil
from flask.cli import with_appcontext
from flask import current_app
import datetime

from backend.extensions import db
from backend.models import (
    User, ShopCategory, ShopSubcategory, Country, ServiceType, Agent, 
    ServiceRequest, Order, MarketplaceCategory, MarketplaceAd,
    CarouselItem, Testimonial, LandingFeature, AppSetting, ShopProduct
)
from backend.services.wallet_service import WalletService
from backend.utils.auth import generate_tracking_number


@click.command('seed-all')
@with_appcontext
def seed_all():
    """
    Run ALL seeders in order and create the default admin user.
    Idempotent — safe to run on every deploy; existing records are skipped.

    Admin credentials created:
      Email   : admin@ag8te.com
      Password: admin
    """

    SEP = '─' * 55
    click.echo(f'\n{SEP}')
    click.echo('  AG8TE — Full Database Seed')
    click.echo(f'{SEP}\n')

    # ── 1. Countries ───────────────────────────────────────────────────────
    click.echo('[1/8] Countries…')
    countries_data = [
        ('South Africa', 'ZA'), ('United States', 'US'), ('United Kingdom', 'GB'),
        ('Canada', 'CA'), ('Australia', 'AU'), ('New Zealand', 'NZ'),
        ('Germany', 'DE'), ('France', 'FR'), ('Netherlands', 'NL'),
        ('Kenya', 'KE'), ('Nigeria', 'NG'), ('Zimbabwe', 'ZW'),
        ('Botswana', 'BW'), ('Namibia', 'NA'), ('Lesotho', 'LS'),
        ('Mozambique', 'MZ'), ('Zambia', 'ZM'), ('Tanzania', 'TZ'),
        ('India', 'IN'), ('China', 'CN'),
    ]
    countries_added: list = []
    for name, code in countries_data:
        if not Country.query.filter_by(name=name).first():
            db.session.add(Country(name=name, code=code, is_active=True))
            countries_added.append(name)
    db.session.commit()
    click.echo(f'   {len(countries_added)} created.\n')

    # ── 2. Shop Categories ─────────────────────────────────────────────────
    click.echo('[2/8] Shop categories…')
    cats = [
        ('clothing',        'Clothing',        [('clothing-men', 'Men'), ('clothing-women', 'Women'), ('clothing-kids', 'Kids')]),
        ('electronics',     'Electronics',     [('electronics-tv-audio', 'TV & Audio'), ('electronics-mobile-gadgets', 'Mobile & Gadgets')]),
        ('homeware',        'Homeware',        [('homeware-kitchen', 'Kitchen'), ('homeware-decor', 'Decor')]),
        ('beauty-products', 'Beauty Products', [('beauty-makeup', 'Makeup'), ('beauty-skincare', 'Skincare')]),
        ('dry-food',        'Dry Food',        [('dry-food-grains-rice', 'Grains & Rice'), ('dry-food-snacks', 'Snacks')]),
        ('furniture',       'Furniture',       [('furniture-living-room', 'Living Room'), ('furniture-bedroom', 'Bedroom')]),
    ]
    cats_added: list = []
    subs_added: list = []
    for cid, ctitle, subs in cats:
        if not ShopCategory.query.get(cid):
            db.session.add(ShopCategory(id=cid, title=ctitle))
            cats_added.append(cid)
        for sid, stitle in subs:
            if not ShopSubcategory.query.get(sid):
                db.session.add(ShopSubcategory(id=sid, category_id=cid, title=stitle))
                subs_added.append(sid)
    db.session.commit()
    click.echo(f'   {len(cats_added)} categories, {len(subs_added)} subcategories created.\n')

    # ── 3. Services ────────────────────────────────────────────────────────
    click.echo('[3/8] Service types…')
    services_data = [
        ('Home Cleaning',    'service-provider', 1),  ('Plumbing',      'service-provider', 2),
        ('Electrical',       'service-provider', 3),  ('Painting',      'service-provider', 4),
        ('Garden Maintenance','service-provider', 5), ('Carpentry',     'service-provider', 6),
        ('Event Management', 'service-provider', 7),  ('DJ Services',   'service-provider', 8),
        ('Catering',         'service-provider', 9),  ('Photography',   'service-provider', 10),
        ('Hair Styling',     'service-provider', 11), ('Beauty Services','service-provider', 12),
        ('Moving Services',  'service-provider', 13), ('Pet Care',      'service-provider', 14),
        ('IT Support',       'service-provider', 15), ('Locksmith',     'service-provider', 16),
        ('Accountant',       'professional', 1),      ('Lawyer',        'professional', 2),
        ('Doctor',           'professional', 3),      ('Engineer',      'professional', 4),
        ('Architect',        'professional', 5),      ('Financial Advisor', 'professional', 6),
        ('Real Estate Agent','professional', 7),      ('IT Consultant', 'professional', 8),
    ]
    services_added: list = []
    for sname, scat, sorder in services_data:
        if not ServiceType.query.filter_by(name=sname, category=scat).first():
            db.session.add(ServiceType(name=sname, category=scat, order=sorder, is_active=True))
            services_added.append(sname)
    db.session.commit()
    click.echo(f'   {len(services_added)} created.\n')

    # ── 4. Agents ──────────────────────────────────────────────────────────
    click.echo('[4/8] Agents…')
    agent_names = [
        'Taole Lebenya', 'Itumeleng Monyake', 'Toivo Lebenya', 'Khwezi Macingwane',
        'Tshepo Rasiile', 'Phumlani Mfenyana', 'Sebolelo Mpiko', 'Mankoebe Letsie',
        'Lintle Letsie', 'Ntshiuoa Macingwane', 'Andile Fusi',
    ]
    agents_added: list = []
    for i, full_name in enumerate(agent_names, start=1):
        code = f'AGT{i:03d}'
        if not Agent.query.filter_by(agent_id=code).first():
            parts = full_name.strip().split(None, 1)
            db.session.add(Agent(
                name=parts[0],
                surname=parts[1] if len(parts) > 1 else '',
                agent_id=code,
            ))
            agents_added.append(code)
    db.session.commit()
    click.echo(f'   {len(agents_added)} created.\n')

    # ── 5. Hero Banners ────────────────────────────────────────────────────
    click.echo('[5/8] Hero banners…')
    uploads_dir = current_app.config.get('UPLOAD_FOLDER', 'uploads')
    os.makedirs(uploads_dir, exist_ok=True)
    assets_dir = os.path.join(current_app.root_path, 'frontend', 'src', 'assets')
    banners = [
        (1, 'Transport',    'Reliable Rides,\nAnytime, Anywhere',
         'Book verified drivers across South Africa. Safe, affordable, and at your fingertips.',
         'Book a Ride',    '/transport',    'bg-gradient-purple shadow-glow-purple', 'hero-transport.jpg'),
        (2, 'Professionals','Expert Help,\nOne Click Away',
         'Hire accredited lawyers, doctors, accountants, engineers and more — all verified.',
         'Find an Expert', '/professionals','bg-sa-blue shadow-lg',                 'hero-professionals.jpg'),
        (3, 'Services',    'Home & Garden\nServices on Demand',
         'From cleaning to events, DSTV to repairs — trusted providers at your door.',
         'Get a Service',  '/services',    'bg-gradient-gold shadow-glow-gold',     'hero-services.jpg'),
        (4, 'Shop',        'Buy & Sell\nLocally with Ease',
         'Discover products from local sellers. A ads built for Mzansi.',
         'Start Shopping', '/shop',        'bg-sa-red shadow-lg',                  'hero-shop.jpg'),
    ]
    banners_added: list = []
    for order, badge, title, subtitle, cta_text, cta_link, cta_color, img_file in banners:
        if CarouselItem.query.filter_by(badge=badge).first():
            continue
        src = os.path.join(assets_dir, img_file)
        dest_name = f'carousel_seed_{img_file}'
        image_url = None
        try:
            if os.path.exists(src):
                shutil.copy2(src, os.path.join(uploads_dir, dest_name))
                image_url = f'/uploads/{dest_name}'
        except Exception:
            pass
        db.session.add(CarouselItem(
            image_url=image_url, cta_link=cta_link, cta_text=cta_text,
            title=title, subtitle=subtitle, badge=badge,
            cta_color=cta_color, order=order, is_active=True,
        ))
        banners_added.append(badge)
    db.session.commit()
    click.echo(f'   {len(banners_added)} created.\n')

    # ── 6. Landing Features & Testimonials ─────────────────────────────────
    click.echo('[6/8] Landing content…')
    features = [
        ('ShieldCheck', 'Fully Verified',    'Every provider is vetted through SARS, Home Affairs, CIPC, and SAPS databases.', 1),
        ('Clock',       'Instant Booking',   'Book any service in seconds. No long calls, no waiting — just tap and go.',        2),
        ('BadgeCheck',  'Accredited Experts',"Professional bodies validate credentials so you don't have to do due diligence.", 3),
        ('Headphones',  'Dedicated Support', 'Our Mzansi-based support team is available to help — any time, any issue.',       4),
    ]
    features_added: list = []
    for icon, title, desc, order in features:
        if not LandingFeature.query.filter_by(title=title).first():
            db.session.add(LandingFeature(icon=icon, title=title, description=desc, order=order, is_active=True))
            features_added.append(title)
    testimonials = [
        ('Sipho Dlamini', 'Homeowner, Johannesburg',  5, 1,
         'I booked a plumber through AG8TE and he arrived within the hour. Verified, professional, and affordable!'),
        ('Zanele Mokoena','Business Owner, Cape Town', 5, 2,
         'The drivers on this platform are punctual and courteous. I use AG8TE for all my business transport needs.'),
        ('Thabo Sithole', 'Software Engineer, Durban',  5, 3,
         'Found an amazing accountant for my small business. The verification process gives me peace of mind.'),
        ('Lerato Khumalo','Event Planner, Pretoria',    5, 4,
         "I hired a caterer and DJ through AG8TE for my client's event. Both were exceptional!"),
    ]
    testimonials_added: list = []
    for name, role, rating, order, text in testimonials:
        if not Testimonial.query.filter_by(name=name).first():
            db.session.add(Testimonial(name=name, role=role, rating=rating, order=order, text=text, is_active=True))
            testimonials_added.append(name)
    db.session.commit()
    click.echo(f'   {len(features_added)} features, {len(testimonials_added)} testimonials created.\n')

    # ── 7. App Settings ────────────────────────────────────────────────────
    click.echo('[7/10] App settings…')
    settings = [
        ('callout_fee_amount',               150.0),
        ('professional_callout_fee_amount',  250.0),
        ('provider_callout_fee_amount',      150.0),
        ('driver_admin_fee_rate',            0.10),
        ('agent_commission_default',         20.0),
        ('agent_commission_driver',          25.0),
        ('agent_commission_professional',    30.0),
        ('agent_commission_service-provider',25.0),
        ('agent_commission_client',          10.0),
    ]
    settings_added: list = []
    for key, value in settings:
        if not AppSetting.query.get(key):
            db.session.add(AppSetting(key=key, value=value))
            settings_added.append(key)
    db.session.commit()
    click.echo(f'   {len(settings_added)} created.\n')

    # ── 8. Default Admin User ──────────────────────────────────────────────
    click.echo('[8/10] Default admin user…')
    ADMIN_EMAIL = 'admin@ag8te.com'
    ADMIN_PASS  = 'admin'
    ADMIN_NAME  = 'AG8TE Admin'
    if User.query.filter_by(email=ADMIN_EMAIL, role='admin').first():
        click.echo(f'   Already exists ({ADMIN_EMAIL}) — skipped.\n')
    else:
        admin = User(
            email=ADMIN_EMAIL, role='admin',
            is_admin=True, is_paid=True, is_approved=True,
            is_active=True, email_verified=True,
            tracking_number=generate_tracking_number(),
            data={'full_name': ADMIN_NAME},
        )
        admin.set_password(ADMIN_PASS)
        db.session.add(admin)
        db.session.commit()
        WalletService.get_or_create_wallet(admin.id)
        click.echo(f'   Admin created: {ADMIN_EMAIL}\n')

    # ── 9. Shop Products ───────────────────────────────────────────────────
    click.echo('[9/10] Shop products…')
    import secrets
    default_products = [
        {'name': 'Smartphone', 'description': 'Latest smartphone with advanced features', 'price': 8999.99, 'category': 'electronics', 'image_url': 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=800&auto=format&fit=crop'},
        {'name': 'Laptop', 'description': 'High-performance laptop for work and gaming', 'price': 12999.99, 'category': 'electronics', 'image_url': 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=800&auto=format&fit=crop'},
        {'name': 'Headphones', 'description': 'Wireless noise-cancelling headphones', 'price': 2499.99, 'category': 'electronics', 'image_url': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=800&auto=format&fit=crop'},
        {'name': 'Smartwatch', 'description': 'Fitness tracking smartwatch', 'price': 3499.99, 'category': 'electronics', 'image_url': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800&auto=format&fit=crop'},
        {'name': 'T-Shirt', 'description': 'Cotton t-shirt in various colors', 'price': 199.99, 'category': 'clothing', 'image_url': 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=800&auto=format&fit=crop'},
        {'name': 'Jeans', 'description': 'Classic denim jeans', 'price': 799.99, 'category': 'clothing', 'image_url': 'https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=800&auto=format&fit=crop'},
        {'name': 'Coffee Maker', 'description': 'Automatic drip coffee maker', 'price': 899.99, 'category': 'homeware', 'image_url': 'https://images.unsplash.com/photo-1520970014086-2208d157c9e2?q=80&w=800&auto=format&fit=crop'},
        {'name': 'Blender', 'description': 'High-speed kitchen blender', 'price': 599.99, 'category': 'homeware', 'image_url': 'https://images.unsplash.com/photo-1585238341267-1cfec2046a55?q=80&w=800&auto=format&fit=crop'},
    ]
    products_added: list = []
    for p_data in default_products:
        if not ShopProduct.query.filter_by(name=p_data['name']).first():
            p_id = f"PROD-{secrets.token_hex(8).upper()}"
            db.session.add(ShopProduct(
                id=p_id, name=p_data['name'], description=p_data['description'],
                price=p_data['price'], category_id=p_data['category'],
                in_stock=True, image_url=p_data['image_url']
            ))
            products_added.append(p_id)
    db.session.commit()
    click.echo(f'   {len(products_added)} products created.\n')

    # ── 10. Demo Service Providers & Professionals ──────────────────────────
    click.echo('[10/10] Demo data (Providers & Professionals)…')
    demo_users = [
        {
            'email': 'prof_lawyer@ag8te.com', 'full_name': 'Advocate Sipho Mdluli',
            'role': 'professional', 'profession': 'Legal Consultant',
            'services': [{'name': 'Legal Advice', 'description': 'Contract law and civil litigation advice.', 'hourly_rate': 1200.0}],
            'qualification': 'LLB, LLM (Wits)', 'body': 'LPC'
        },
        {
            'email': 'prov_cleaning@ag8te.com', 'full_name': 'Sarah Moremi',
            'role': 'service-provider', 'business': 'Sparkle Home Services',
            'services': [{'name': 'Standard Cleaning', 'description': 'Full house cleaning.', 'hourly_rate': 180.0}]
        },
        {
            'email': 'prof_accountant@ag8te.com', 'full_name': 'Zanele Khumalo CA(SA)',
            'role': 'professional', 'profession': 'Chartered Accountant',
            'services': [{'name': 'Tax Consultation', 'description': 'SARS personal and business tax filing.', 'hourly_rate': 950.0}],
            'qualification': 'BAcc, CTA (UJ)', 'body': 'SAICA'
        }
    ]
    users_added: list = []
    for u_data in demo_users:
        if not User.query.filter_by(email=u_data['email']).first():
            user = User(
                email=u_data['email'], role=u_data['role'],
                is_approved=True, is_active=True, is_paid=True,
                email_verified=True, tracking_number=generate_tracking_number(),
                data={
                    'full_name': u_data['full_name'],
                    'profession': u_data.get('profession'),
                    'business_name': u_data.get('business'),
                    'professional_services': u_data.get('services') if u_data['role'] == 'professional' else None,
                    'provider_services': u_data.get('services') if u_data['role'] == 'service-provider' else None,
                    'highest_qualification': u_data.get('qualification'),
                    'professional_body': u_data.get('body')
                }
            )
            user.set_password('password123')
            db.session.add(user)
            db.session.flush()
            WalletService.get_or_create_wallet(user.id)
            users_added.append(user.email)
    db.session.commit()
    click.echo(f'   {len(users_added)} demo users created.\n')

    # ── 11. ads Categories ──────────────────────────────────────────
    click.echo('[11/12] ads categories…')
    m_cats = [
        ('Vehicles', 'vehicles', 'Car'),
        ('Property', 'property', 'Home'),
        ('Electronics', 'electronics', 'Smartphone'),
        ('Home & Garden', 'home-garden', 'Lamp'),
        ('Services', 'services', 'Briefcase'),
        ('Jobs', 'jobs', 'UserCheck'),
        ('Fashion', 'fashion', 'Shirt'),
        ('Appliances', 'appliances', 'Microwave')
    ]
    mcats_added: list = []
    for name, slug, icon in m_cats:
        if not MarketplaceCategory.query.filter_by(slug=slug).first():
            db.session.add(MarketplaceCategory(name=name, slug=slug, icon=icon))
            mcats_added.append(slug)
    db.session.commit()
    click.echo(f'   {len(mcats_added)} ads categories created.\n')

    # ── 12. ads Ads ────────────────────────────────────────────────
    click.echo('[12/12] ads ads…')
    admin_user = User.query.filter_by(email=ADMIN_EMAIL).first()
    if admin_user:
        example_ads = [
            {
                'title': '2018 Toyota Corolla for Sale',
                'description': 'Excellent condition, low mileage (45,000km). One owner from new. Full service history.',
                'price': 185000.0,
                'category_slug': 'vehicles',
                'city': 'Johannesburg',
                'province': 'Gauteng',
                'condition': 'Used (Like New)',
                'images': ['https://images.unsplash.com/photo-1590362891121-399618458783?q=80&w=800&auto=format&fit=crop']
            },
            {
                'title': 'Modern 2 Bedroom Apartment in Sandton',
                'description': 'Spacious apartment with balcony and fiber ready. Includes 24h security and pool.',
                'price': 12000.0,
                'category_slug': 'property',
                'city': 'Sandton',
                'province': 'Gauteng',
                'condition': 'Excellent',
                'images': ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=800&auto=format&fit=crop']
            },
            {
                'title': 'iPhone 13 Pro - 128GB (Graphite)',
                'description': 'Barely used, comes with original box and accessories. Battery health 95%.',
                'price': 10500.0,
                'category_slug': 'electronics',
                'city': 'Cape Town',
                'province': 'Western Cape',
                'condition': 'Used (Good)',
                'images': ['https://images.unsplash.com/photo-1632661674596-df8be070a5c5?q=80&w=800&auto=format&fit=crop']
            }
        ]
        mads_added: list = []
        for ad_data in example_ads:
            if not MarketplaceAd.query.filter_by(title=ad_data['title']).first():
                cat = MarketplaceCategory.query.filter_by(slug=ad_data['category_slug']).first()
                if cat:
                    db.session.add(MarketplaceAd(
                        user_id=admin_user.id,
                        category_id=cat.id,
                        title=ad_data['title'],
                        description=ad_data['description'],
                        price=ad_data['price'],
                        city=ad_data['city'],
                        province=ad_data['province'],
                        condition=ad_data['condition'],
                        images=ad_data['images'],
                        contact_name='AG8TE Sales',
                        contact_phone='011 234 5678',
                        status='active'
                    ))
                    mads_added.append(ad_data['title'])
        db.session.commit()
        click.echo(f'   {len(mads_added)} ads ads created.\n')

        # ── 12. Demo Bookings (for Admin) ───────────────────────────────────
        click.echo('[12/12] Demo bookings & orders…')
        
        # Admin is our demo client
        admin_user = User.query.filter_by(email='admin@ag8te.com').first()
        demo_prof = User.query.filter_by(role='professional').first()
        demo_prov = User.query.filter_by(role='service-provider').first()
        
        if admin_user:
            # Add a Cab Ride
            if not ServiceRequest.query.filter_by(requester_id=admin_user.id, request_type='cab').first():
                db.session.add(ServiceRequest(
                    id=f"REQ-{secrets.token_hex(4).upper()}CAB",
                    request_type='cab',
                    requester_id=admin_user.id,
                    scheduled_date=(datetime.datetime.utcnow().strftime('%Y-%m-%d')),
                    scheduled_time='14:30',
                    status='completed',
                    payment_status='paid',
                    payment_amount=245.50,
                    location_data={
                        'pickup': {'address': '123 Sandton Dr, Sandton', 'lat': -26.1076, 'lng': 28.0567},
                        'dropoff': {'address': 'OR Tambo International Airport', 'lat': -26.1367, 'lng': 28.2411}
                    },
                    details={'car_type': 'sedan', 'notes': 'Flight at 17:00, please be on time.'}
                ))
            
            # Add a Professional Service
            if demo_prof and not ServiceRequest.query.filter_by(requester_id=admin_user.id, request_type='professional').first():
                db.session.add(ServiceRequest(
                    id=f"REQ-{secrets.token_hex(4).upper()}PROF",
                    request_type='professional',
                    requester_id=admin_user.id,
                    provider_id=demo_prof.id,
                    scheduled_date=(datetime.datetime.utcnow().strftime('%Y-%m-%d')),
                    scheduled_time='10:00',
                    status='accepted',
                    payment_status='paid',
                    payment_amount=450.00,
                    location_data={'location': {'address': 'Online Consultation', 'lat': 0, 'lng': 0}},
                    details={
                        'service_name': 'Tax Consultation',
                        'professional_name': demo_prof.data.get('full_name'),
                        'notes': 'Discussing small business registration.'
                    }
                ))
                
            # Add a Shop Order
            if not Order.query.filter_by(customer_id=admin_user.id).first():
                products = ShopProduct.query.limit(2).all()
                if products:
                    order_items = []
                    for p in products:
                        order_items.append({
                            'product_id': p.id,
                            'product_name': p.name,
                            'price': float(p.price),
                            'image_url': p.image_url,
                            'quantity': 1
                        })
                    
                    db.session.add(Order(
                        id=f"ORD-{secrets.token_hex(4).upper()}SEED",
                        customer_id=admin_user.id,
                        customer_email=admin_user.email,
                        status='paid',
                        total=sum(item['price'] for item in order_items),
                        items=order_items,
                        shipping={'delivery_address': 'Shop 45, Mall of Africa, Midrand'},
                        placed_at=datetime.datetime.utcnow()
                    ))
            
            db.session.commit()
            click.echo('   Demo bookings created for admin.\n')

    click.echo(f'  Seed complete  ✓  ({len(products_added)} products, {len(users_added)} demo users, {len(mads_added)} ads added)')
    click.echo(SEP)
