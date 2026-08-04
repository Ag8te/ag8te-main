# AG8TE Technical Specification: Flask Migration

## Document Information
- **Version**: 1.0
- **Date**: 2024
- **Purpose**: Technical specification for migrating AG8TE from Node/Supabase to Flask/PostgreSQL/Docker architecture
- **Status**: Draft

---

## Table of Contents
1. [Executive Summary](#executive-summary)
3. [Target Architecture](#target-architecture)
4. [Feature Inventory](#feature-inventory)
5. [Database Schema Migration](#database-schema-migration)
6. [API Endpoints Specification](#api-endpoints-specification)
7. [Authentication & Authorization](#authentication--authorization)
8. [Docker & Deployment](#docker--deployment)
9. [Migration Strategy](#migration-strategy)
10. [Implementation Phases](#implementation-phases)

---

## Executive Summary

### Project Overview
AG8TE is a service ads platform connecting users with vetted service providers (cabs, professionals, service providers). The platform includes user registration, service request management, payment processing, e-commerce shop, and admin dashboards.

### Migration Goals
- **Convert** from Node.js/Express backend to fullstack Flask (Python) with server-side rendering
- **Replace** Supabase with native PostgreSQL database
- **Containerize** application using Docker and Docker Compose
- **Maintain** all existing features and functionality
- **Improve** deployment and development workflow

### Key Benefits
- Simplified architecture (single database instead of Supabase)
- Better control over database schema and migrations
- Easier local development with Docker
- Reduced vendor lock-in
- Cost optimization (no Supabase subscription)

---

## Target Architecture

### Technology Stack

#### Fullstack Application
- **Framework**: Flask 3.0+ (Python 3.11+) - serves both API and frontend
- **Templating**: Jinja2 (server-side rendering)
- **Styling**: Tailwind CSS (via CDN or compiled CSS)
- **JavaScript**: Vanilla JS or lightweight libraries (Alpine.js, HTMX, etc.)
- **ORM**: SQLAlchemy 2.0+
- **Migrations**: Flask-Migrate (Alembic)
- **Auth**: Flask-Login + Flask-JWT-Extended
- **Validation**: Marshmallow
- **Email**: Flask-Mail (SMTP)
- **Payment**: Yoco API (HTTP requests)
- **Static Files**: Flask serves static assets (CSS, JS, images) from `/static`
- **Templates**: Flask serves HTML templates from `/templates`

#### Database
- **Database**: PostgreSQL 15+
- **Connection**: psycopg2 or asyncpg
- **Extensions**: pgcrypto, citext

#### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Reverse Proxy**: Nginx (optional, for production)
- **Environment**: Python virtual environment
- **Static File Serving**: Flask serves static assets (CSS, JS, images) from `/static` directory
- **Template Rendering**: Flask renders HTML templates server-side using Jinja2

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Flask Fullstack Application                │
│                    Port: 5000 (dev) / 80 (prod)              │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              API Routes (/api/*)                        │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │  │
│  │  │   Auth   │  │ Requests │  │ Payments │              │  │
│  │  └──────────┘  └──────────┘  └──────────┘              │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │  │
│  │  │   Shop   │  │  Admin   │  │  Email   │              │  │
│  │  └──────────┘  └──────────┘  └──────────┘              │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │         Frontend (Jinja2 Templates - Server-Side)      │  │
│  │  • HTML templates in /templates                         │  │
│  │  • Server-side rendering with Jinja2                     │  │
│  │  • Static assets (CSS, JS) in /static                    │  │
│  │  • Vanilla JS for interactivity                           │  │
│  │  • API calls to /api/* endpoints (AJAX/fetch)           │  │
│  └─────────────────────────────────────────────────────────┘  │
└────────────────────────────┬──────────────────────────────────┘
                             │ SQL
                             │
┌────────────────────────────▼──────────────────────────────────┐
│                    PostgreSQL Database                         │
│                    Port: 5432                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │   Users      │  │   Requests   │  │   Orders     │        │
│  │   Tables     │  │   Tables     │  │   Tables     │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### Docker Compose Structure

```yaml
services:
  app:
    build: .
    ports: ["5000:5000"]
    environment:
      - DATABASE_URL=postgresql://mzansi:${DB_PASSWORD:-changeme}@db:5432/ag8te
      - SECRET_KEY=${SECRET_KEY:-dev-secret-key}
      - JWT_SECRET_KEY=${JWT_SECRET_KEY:-jwt-secret-key}
      - FLASK_ENV=development
      - FLASK_DEBUG=1
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_PORT=${SMTP_PORT:-587}
      - SMTP_USER=${SMTP_USER}
      - SMTP_PASSWORD=${SMTP_PASSWORD}
      - PAYPAL_CLIENT_ID=${PAYPAL_CLIENT_ID}
      - PAYPAL_SECRET=${PAYPAL_SECRET}
      - YOCO_SECRET_KEY=${YOCO_SECRET_KEY}
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - .:/app
      - ./static:/app/static
      - ./uploads:/app/uploads
    command: flask run --host=0.0.0.0 --port=5000
    
  db:
    image: postgres:15-alpine
    ports: ["5432:5432"]
    environment:
      - POSTGRES_DB=ag8te
      - POSTGRES_USER=mzansi
      - POSTGRES_PASSWORD=${DB_PASSWORD:-changeme}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U mzansi"]
      interval: 10s
      timeout: 5s
      retries: 5
      
volumes:
  postgres_data:
```

---

## Feature Inventory

### 1. User Authentication & Registration

#### Target Implementation
- Flask-Login for session management
- JWT tokens for API authentication
- bcrypt for password hashing
- Email verification via Flask-Mail
- Password reset tokens stored in database

**Endpoints:**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `POST /api/auth/verify-email` - Verify email with token
- `GET /api/auth/me` - Get current user

### 2. Service Requests
#### Target Implementation
- RESTful API endpoints for CRUD operations
- WebSocket support for real-time updates (optional, using Flask-SocketIO)
- Location data stored as JSONB in PostgreSQL
- Payment status tracking

**Endpoints:**
- `POST /api/requests` - Create service request
- `GET /api/requests` - List requests (with filters)
- `GET /api/requests/<id>` - Get request details
- `PATCH /api/requests/<id>` - Update request status
- `DELETE /api/requests/<id>` - Cancel request
- `POST /api/requests/<id>/assign` - Assign provider
- `POST /api/requests/<id>/complete` - Mark as complete

### 3. Payment Processing

#### Target Implementation
- Yoco API integration
- Payment webhook handling
- Transaction records in database

**Endpoints:**
- `POST /api/payments/create-checkout` - Create payment checkout
- `POST /api/payments/capture-order` - Capture PayPal order
- `POST /api/payments/yoco/charge` - Process Yoco charge
- `POST /api/payments/webhook` - Payment webhook handler
- `GET /api/payments/status/<id>` - Get payment status

### 4. E-commerce Shop

#### Target Implementation
- Product CRUD operations
- Category management
- Order processing
- File upload for product images (local storage or S3)

**Endpoints:**
- `GET /api/shop/products` - List products
- `GET /api/shop/products/<id>` - Get product
- `GET /api/shop/categories` - List categories
- `POST /api/shop/orders` - Create order
- `GET /api/shop/orders` - List user orders
- `GET /api/shop/orders/<id>` - Get order details

### 5. Admin Dashboard

#### Target Implementation
- Admin authentication (users with `is_admin = TRUE`)
- Admin-only endpoints
- Dashboard statistics
- User management
- Registration approval
- Shop management
- Contact and Address details for contact

**Endpoints:**
- `GET /api/admin/requests` - List all requests
- `GET /api/admin/users` - List all users (with filters for role, approval status, payment status)
- `PATCH /api/admin/users/<id>/approve` - Approve user registration
- `PATCH /api/admin/users/<id>/reject` - Reject user registration (with reason)
- `PATCH /api/admin/users/<id>/verify-id` - Verify or reject ID document
- `GET /api/admin/stats` - Dashboard statistics

### 6. Email Service

#### Target Implementation
- Flask-Mail for SMTP
- Email templates (Jinja2)
- Email db table to manage email queue for async processing
  - Manage email status to assert if email has been sent yet or not.

**Endpoints:**
- `POST /api/email/send` - Send email (admin/internal)

### 7. User Dashboard

#### Target Implementation

**Core Features:**
- RESTful API for dashboard data
- Request filtering and management
- Role-based dashboards (commuter, driver, professional, service-provider)
- Payment history tracking
- Google Maps integration for location services
- Real-time updates via polling or WebSocket
- PDF invoice generation for orders and service requests

#### Role-Based Dashboard Features

##### Commuter Dashboard

**Wallet Card:**
- Display wallet balance amount
- Wallet page with "Top Up" option
  - Top up processes checkout payment via Yoco
  - On payment success: display modal "Payment success. Wallet balance updated" with new balance
- Service request page integration:
  - Display wallet balance on service request page
  - If sufficient funds: book service automatically
  - If insufficient funds: show payment button for outstanding amount
  - On payment success: display modal "Payment success. Service Request is being processed" and set request status to pending

**Shopping History Card:**
- Display most recent 3 orders
- "See More" button redirects to shopping history page
- Shopping history page features:
  - Full order history with pagination
  - Download previous invoices (PDF generation)
  - Invoice includes: order details, items, pricing, dates

**Service Requests Card:**
- Display most recent 3 service requests with status (pending, accepted, completed, cancelled)
- "See More" button redirects to requested services page
- Requested services page features:
  - Full service request history
  - Download previous invoices (PDF generation)
  - Invoice includes: service details, pricing, dates, provider information

**Quick Actions Card:**
- Link to "Request a Service Provider"
- Link to "Request a Professional"
- Link to "Request a Driver"

**Service Request Management:**
- For requests with status "accepted" or "pending":
  - Modal with options: "Close" and "Cancel Ride Request"
  - Cancellation rules:
    - Status "pending": Cancel with no charge against wallet
    - Status "accepted": Cancel with charge against wallet
    - On cancellation: Refund trip value minus cancellation charge to commuter wallet

##### Driver Dashboard

**Wallet Card:**
- Display wallet balance for earnings tracking
- Withdrawal capabilities; submit withdrawal request

**Shopping History Card:**
- Display most recent 3 orders
- "See More" button redirects to shopping history page
- Full order history with invoice downloads

**Service Requests Card:**
- Filtered list showing only matching requests:
  - Matches driver's car type (as requested by commuter)
  - Status: pending, accepted (by this driver), completed (by this driver), cancelled (by driver or commuter)
- Each request displays:
  - Location (pick-up and drop-off)
  - Distance (calculated and stored)
  - Paid price
  - Ride status (pending, accepted, completed, cancelled)
- Status field has "Options" action button:
  - Status "pending": Options modal with "View", "Reject", "Accept"
  - Status "accepted": Options modal with "View", "Cancel", "Close"
  - Status "cancelled": Options modal with "View", "Close"

**Service Request Rules:**
- When ride request is first created, status is "pending"
- Cancellation rules:
  - Status "pending": Cancel with no charge against wallet
  - Status "accepted": Cancel with charge against wallet
- If driver cancels:
  - Service request status set to "pending"
  - Request removed from driver's list (no longer visible to cancelling driver)

**Ride Pick-up Schedule:**
- Display scheduled rides with:
  - Location (pick-up and drop-off)
  - Paid price
  - Ride status (pending, accepted, completed, cancelled)
- Status action button triggers modal:
  - Status "pending": Options "Accept", "Reject"
  - Status "accepted": Options "Cancel"

##### Professional & Service-Provider Dashboards

- Follow the overall logic of the driver role dashboard above
- Service-specific filtering based on provider's service offerings
- Quote submission workflow for service requests

#### Google Maps Integration

**Location Services:**
- Pick-up and drop-off point confirmation for cab requests
- Service location confirmation for service provider requests
- Meeting location confirmation for professional requests
- Address and coordinate validation

**Distance Calculation:**
- Use GPS to calculate distance between pick-up and drop-off points
- Store calculated distance with service request
- Display distance when driver views request
- Distance used for pricing calculations

#### Payment History

- Track all payment transactions
- Filter by payment type (wallet top-up, service payment, registration fee)
- Display payment status, amounts, dates
- Link to invoices where applicable

#### Real-Time Updates

- Polling mechanism for dashboard updates (every 5-10 seconds)
- Optional WebSocket support for instant updates
- Update service request status changes
- Update wallet balance changes
- Update new request notifications

#### Service Request Workflows

**Request a Driver Workflow:**
1. User searches for pick-up point using Google Maps
2. User searches for drop-off point using Google Maps
3. User sets service preferences:
   - Driver gender preference
   - Car make preference
   - Car type preference
   - Date and time
4. User submits driver request
5.1. Distance calculated with google maps distance.
5.1. Trip price calculated using a formula of Rands per kilometer.
  5.1.1 Trip price can vary based on the car type, car make, car model and year of the car.
  5.1.2 Include cli command to pre-populate common car type, car make, car model and year of the car. Include a cost per kilometer for each car make.
  5.1.2 Ensure the admin portal allows admin to update this information
5.1. Request is stored in db with status "pending", distance data and price data and requester info.
5.2 Request is listed to all drivers matching preferences
5.3 Drivers views request info, including pick-up location, drop-off location, ride distance and ride price
5.4 Driver accepts or rejects request. First driver to accept the request is assigned to the request and other drivers can no longer accept the request.
5.5 other drivers can no longer see the service request.
5.5 user can only see accepted rides if that user is the acceptnig driver

**Request a Service Provider Workflow:**
1. User searches for service from service list
2. Service providers display:
   - Service descriptions
   - Average cost per hour
3. Filtering and ordering options (e.g., price)
4. User selects service from list
5. User views all service providers for selected service
6. Each provider has "Request Service" action button
7. "Request Service" triggers modal with fields:
   - Location (Google Maps integration)
   - Date and time
   - Additional notes
8. User submits request
9. Service request saved to database
10. Service provider sees request on dashboard and service requests page
11. Service provider clicks action button on request
12. Modal opens with options to:
    - Input service request amount
    - Submit service quote
13. Commuter receives quote and can accept or decline
14. If accepted: request status changes to "accepted"

**Request a Professional Workflow:**
- Follows the same logic as service provider workflow above

#### API Endpoints

**Dashboard Endpoints:**
- `GET /api/dashboard` - Get role-based dashboard data (wallet, recent orders, recent requests)
- `GET /api/dashboard/wallet` - Get wallet balance and transaction history
- `POST /api/dashboard/wallet/top-up` - Initiate wallet top-up payment
- `GET /api/dashboard/requests` - Get user's service requests (filtered by role)
- `GET /api/dashboard/requests/available` - Get available service requests (for providers)
- `GET /api/dashboard/orders` - Get user's order history
- `GET /api/dashboard/orders/<id>/invoice` - Download order invoice (PDF)
- `GET /api/dashboard/requests/<id>/invoice` - Download service request invoice (PDF)
- `GET /api/dashboard/payment-history` - Get payment transaction history

**Service Request Endpoints:**
- `POST /api/requests` - Create service request
- `GET /api/requests` - List service requests (with role-based filtering)
- `GET /api/requests/<id>` - Get service request details
- `PATCH /api/requests/<id>/status` - Update request status
- `POST /api/requests/<id>/cancel` - Cancel service request
- `POST /api/requests/<id>/accept` - Accept service request (provider)
- `POST /api/requests/<id>/reject` - Reject service request (provider)
- `POST /api/requests/<id>/bid` - Submit bid for service request (driver)
- `POST /api/requests/<id>/counter-bid` - Submit counter bid (commuter)
- `POST /api/requests/<id>/quote` - Submit service quote (service provider/professional)

**Location & Distance Endpoints:**
- `POST /api/location/calculate-distance` - Calculate distance between two points
- `POST /api/location/geocode` - Geocode address to coordinates
- `POST /api/location/reverse-geocode` - Reverse geocode coordinates to address

#### Implementation Tasks

**Dashboard Implementation:**
- [ ] Implement RESTful API for dashboard data
- [ ] Implement role-based dashboard filtering
- [ ] Implement wallet functionality
  - [ ] Wallet balance tracking
  - [ ] Wallet top-up payment integration
  - [ ] Wallet balance display on service request pages
  - [ ] Automatic booking when sufficient funds
  - [ ] Payment processing for insufficient funds
- [ ] Implement shopping history card
  - [ ] Display most recent 3 orders
  - [ ] Shopping history page with full order list
  - [ ] PDF invoice generation for orders
- [ ] Implement service requests card
  - [ ] Display most recent 3 requests
  - [ ] Requested services page with full request history
  - [ ] PDF invoice generation for service requests
- [ ] Implement quick action links
- [ ] Implement service request cancellation logic
  - [ ] Pending status cancellation (no charge)
  - [ ] Accepted status cancellation (with charge)
  - [ ] Refund calculation and wallet credit
- [ ] Implement driver dashboard filtering
  - [ ] Filter by car type match
  - [ ] Filter by status (pending, accepted, completed, cancelled)
  - [ ] Hide cancelled requests from cancelling driver
- [ ] Implement service request action modals
  - [ ] Options modal based on request status
  - [ ] View, Accept, Reject, Cancel, Close actions
- [ ] Implement payment history tracking
- [ ] Implement Google Maps integration
  - [ ] Location search and confirmation
  - [ ] Distance calculation
  - [ ] Store distance with service request
  - [ ] Display distance to drivers
- [ ] Implement real-time updates (polling or WebSocket)
- [ ] Implement PDF invoice generation
  - [ ] Order invoices
  - [ ] Service request invoices

**User Registration & Profile:**
- [ ] Implement user registration/login
  - [ ] Role selection (commuter, driver, professional, service-provider)
  - [ ] Admin users only created from admin portal
  - [ ] Basic registration fields (Name, Surname, Email, Password)
  - [ ] Terms of Use link near register button
  - [ ] Terms of Use checkbox requirement
  - [ ] Mark users as unpaid if registration fee not paid
  - [ ] Mark users as incomplete if profile fields not completed
  - [ ] Auto-approve commuters who completed fields and made payment
- [ ] Implement global website alert message in base template
  - [ ] Display alert when user hasn't paid registration fee
  - [ ] Message: "User features are limited until registration fee payment"
- [ ] Implement user profile page
  - [ ] Complete profile fields after login
  - [ ] Display registration fee payment status
  - [ ] Submit registration fee from profile page (after fields completed)
  - [ ] JavaScript to hide/show fields based on user role
  - [ ] "South African citizen" checkbox field
  - [ ] Next of kin field
  - [ ] SA ID validation algorithm (length and structure)
  - [ ] JavaScript validation for SA ID when citizen checkbox checked
  - [ ] ID document upload validation
  - [ ] Global alert if ID not uploaded or rejected
  - [ ] Display ID verification status (verified, pending, rejected)
  - [ ] Display rejection reasons if ID rejected
- [ ] Implement Password Reset/Update
- [ ] Implement Forgot Password Recovery

**Service Integration:**
- [ ] Implement email service (`/home/charles/Documents/projects/mzansi-serve/services/email`)
- [ ] Implement payment service (`/home/charles/Documents/projects/mzansi-serve/services/yoco-checkout-service`)
- [ ] Implement payment processing
- [ ] Implement admin endpoints

**Pages & Navigation:**
- [ ] Implement Pages layout and features
  - [ ] Site navigation bar: Home, Shop, Request a Cab, Request a Professional, Request a Service Provider
  - [ ] Request a Driver page with Google Maps integration
  - [ ] Request a Service Provider page
  - [ ] Request a Professional page
  - [ ] Shopping history page
  - [ ] Requested services page
  - [ ] Wallet page

---

## Database Schema Migration

### Core Tables

#### Users & Authentication

```sql
-- Unified users table (combines users, registrations, and admin_accounts)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email CITEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    
    -- User role and type
    role TEXT NOT NULL CHECK (role IN ('commuter', 'driver', 'professional', 'service-provider', 'admin')),
    
    -- Status flags
    is_admin BOOLEAN DEFAULT FALSE,
    is_paid BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    
    -- Profile data
    tracking_number TEXT UNIQUE,
    data JSONB DEFAULT '{}', -- Stores user profile data (name, surname, phone, SA ID, next of kin, etc.)
    file_urls JSONB DEFAULT '[]', -- Stores uploaded file URLs (ID documents, etc.)
    
    -- ID verification status
    id_verification_status TEXT DEFAULT 'pending' CHECK (id_verification_status IN ('pending', 'verified', 'rejected')),
    id_rejection_reason TEXT, -- Reason for ID rejection if status is 'rejected'
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_admin ON users(is_admin);
CREATE INDEX idx_users_is_paid ON users(is_paid);
CREATE INDEX idx_users_is_approved ON users(is_approved);
CREATE INDEX idx_users_tracking_number ON users(tracking_number);

-- Password reset tokens
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email verification tokens
CREATE TABLE email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User wallets
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    balance NUMERIC NOT NULL DEFAULT 0 CHECK (balance >= 0),
    currency TEXT NOT NULL DEFAULT 'ZAR',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wallets_user_id ON wallets(user_id);

-- Wallet transactions
CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('top-up', 'payment', 'refund', 'cancellation_refund', 'withdrawal')),
    amount NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'ZAR',
    balance_before NUMERIC NOT NULL,
    balance_after NUMERIC NOT NULL,
    external_id TEXT, -- Payment ID, Service Request ID, or Order ID
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX idx_wallet_transactions_external_id ON wallet_transactions(external_id);
CREATE INDEX idx_wallet_transactions_type ON wallet_transactions(transaction_type);
```

#### Service Requests

```sql
-- Service requests (main table)
CREATE TABLE service_requests (
    id TEXT PRIMARY KEY,
    request_type TEXT NOT NULL CHECK (request_type IN ('cab', 'professional', 'provider')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed', 'cancelled')),
    requester_id UUID REFERENCES users(id) ON DELETE SET NULL,
    provider_id UUID REFERENCES users(id) ON DELETE SET NULL,
    scheduled_date TEXT, -- 'YYYY-MM-DD'
    scheduled_time TEXT, -- 'HH:MM'
    location_data JSONB DEFAULT '{}', -- Stores pick-up, drop-off, or service location coordinates and addresses
    distance_km NUMERIC, -- Calculated distance in kilometers (for cab requests: pick-up to drop-off)
    details JSONB DEFAULT '{}', -- Stores preferences (car type, driver gender, etc.), bids, quotes, notes
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
    payment_amount NUMERIC,
    payment_currency TEXT DEFAULT 'ZAR',
    bid_amount NUMERIC, -- Driver bid amount (for cab requests)
    quote_amount NUMERIC, -- Service provider/professional quote amount
    cancellation_charge NUMERIC DEFAULT 0, -- Cancellation charge if applicable
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_service_requests_type ON service_requests(request_type);
CREATE INDEX idx_service_requests_status ON service_requests(status);
CREATE INDEX idx_service_requests_requester ON service_requests(requester_id);
CREATE INDEX idx_service_requests_provider ON service_requests(provider_id);
CREATE INDEX idx_service_requests_created_at ON service_requests(created_at);
```

#### E-commerce

```sql
-- Shop categories
CREATE TABLE shop_categories (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shop products
CREATE TABLE shop_products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    category_id TEXT REFERENCES shop_categories(id) ON DELETE SET NULL,
    in_stock BOOLEAN DEFAULT TRUE,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders
CREATE TABLE orders (
    id TEXT PRIMARY KEY,
    customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    customer_email TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled')),
    total NUMERIC NOT NULL,
    items JSONB NOT NULL,
    shipping JSONB,
    payment_id TEXT,
    placed_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Payments

```sql
-- Payment transactions
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id TEXT UNIQUE, -- Request ID or Order ID
    amount NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'ZAR',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded')),
    payment_method TEXT, -- 'paypal', 'yoco'
    payment_provider_id TEXT, -- PayPal order ID or Yoco checkout ID
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_external_id ON payments(external_id);
CREATE INDEX idx_payments_status ON payments(status);
```

#### Notifications

```sql
-- User notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    status TEXT DEFAULT 'unread' CHECK (status IN ('unread', 'read')),
    entity_type TEXT,
    entity_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
```

### Migrations Strategy

1. **Export existing data** from Supabase
2. **Create Flask-Migrate** migration scripts
3. **Run migrations** to create schema
4. **Import data** from Supabase exports
5. **Verify data integrity**

---

## API Endpoints Specification

### Base URL
- Development: `http://localhost:5000/api` (or relative `/api` since same origin)
- Production: `https://ag8te.com/api` (or relative `/api` since same origin)

**Note**: Since Flask serves both API and frontend from the same origin, the frontend can use relative URLs (`/api/*`) which simplifies CORS and eliminates cross-origin issues.

### Authentication
- **Method**: JWT Bearer tokens
- **Header**: `Authorization: Bearer <token>`
- **Token Expiry**: 24 hours (configurable)

### Response Format

#### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```

#### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... }
  }
}
```

### Endpoint Details

#### Authentication Endpoints

**POST /api/auth/register**
```json
Request:
{
  "email": "user@example.com",
  "password": "securepassword",
  "role": "commuter",
  "fullName": "John Doe",
  "phone": "+27123456789"
}

Response:
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "..." },
    "token": "jwt_token_here"
  }
}
```

**POST /api/auth/login**
```json
Request:
{
  "email": "user@example.com",
  "password": "securepassword"
}

Response:
{
  "success": true,
  "data": {
    "user": { ... },
    "token": "jwt_token_here"
  }
}
```

#### Request Endpoints

**POST /api/requests**
```json
Request:
{
  "type": "cab",
  "pickup": {
    "address": "123 Main St, Johannesburg",
    "lat": -26.2041,
    "lng": 28.0473
  },
  "dropoff": {
    "address": "456 Oak Ave, Pretoria",
    "lat": -25.7479,
    "lng": 28.2293
  },
  "date": "2024-12-25",
  "time": "14:30",
  "preferences": {
    "carType": "sedan",
    "driverGender": "any"
  },
  "paymentAmount": 300.00
}

Response:
{
  "success": true,
  "data": {
    "id": "REQ-1234567890",
    "status": "pending",
    "distance": 57.8,
    "paymentCheckoutUrl": "https://payments.yoco.com/...",
    "walletBalance": 500.00,
    "sufficientFunds": true
  }
}
```

**GET /api/requests?type=cab&status=pending&limit=50&offset=0**
```json
Response:
{
  "success": true,
  "data": {
    "requests": [
      {
        "id": "REQ-123",
        "type": "cab",
        "status": "pending",
        "distance": 15.5,
        "paymentAmount": 200.00,
        "pickup": { "address": "...", "lat": ..., "lng": ... },
        "dropoff": { "address": "...", "lat": ..., "lng": ... },
        "scheduledDate": "2024-12-25",
        "scheduledTime": "14:30",
        "createdAt": "..."
      }
    ],
    "total": 100,
    "limit": 50,
    "offset": 0
  }
}
```

**POST /api/requests/<id>/bid**
```json
Request:
{
  "bidAmount": 250.00
}

Response:
{
  "success": true,
  "data": {
    "requestId": "REQ-123",
    "bidAmount": 250.00,
    "status": "pending"
  }
}
```

**POST /api/requests/<id>/counter-bid**
```json
Request:
{
  "counterBidAmount": 220.00
}

Response:
{
  "success": true,
  "data": {
    "requestId": "REQ-123",
    "counterBidAmount": 220.00,
    "status": "pending"
  }
}
```

**POST /api/requests/<id>/quote**
```json
Request:
{
  "quoteAmount": 500.00,
  "notes": "Service will take approximately 2 hours"
}

Response:
{
  "success": true,
  "data": {
    "requestId": "REQ-123",
    "quoteAmount": 500.00,
    "status": "pending"
  }
}
```

**POST /api/requests/<id>/accept**
```json
Response:
{
  "success": true,
  "data": {
    "requestId": "REQ-123",
    "status": "accepted"
  }
}
```

**POST /api/requests/<id>/cancel**
```json
Request:
{
  "reason": "User requested cancellation"
}

Response:
{
  "success": true,
  "data": {
    "requestId": "REQ-123",
    "status": "cancelled",
    "refundAmount": 280.00,
    "cancellationCharge": 20.00,
    "walletBalance": 780.00
  }
}
```

#### Payment Endpoints

**POST /api/payments/create-checkout**
```json
Request:
{
  "amount": 30000,
  "currency": "ZAR",
  "externalId": "REQ-1234567890",
  "successUrl": "https://...",
  "cancelUrl": "https://..."
}

Response:
{
  "success": true,
  "data": {
    "checkoutId": "checkout_123",
    "redirectUrl": "https://payments.yoco.com/..."
  }
}
```

#### Dashboard Endpoints

**GET /api/dashboard**
```json
Response:
{
  "success": true,
  "data": {
    "wallet": {
      "balance": 500.00,
      "currency": "ZAR"
    },
    "recentOrders": [
      { "id": "...", "total": 250.00, "status": "delivered", "placedAt": "..." }
    ],
    "recentRequests": [
      { "id": "...", "type": "cab", "status": "accepted", "createdAt": "..." }
    ]
  }
}
```

**GET /api/dashboard/wallet**
```json
Response:
{
  "success": true,
  "data": {
    "balance": 500.00,
    "currency": "ZAR",
    "transactions": [
      {
        "id": "...",
        "type": "top-up",
        "amount": 100.00,
        "balanceAfter": 500.00,
        "createdAt": "..."
      }
    ]
  }
}
```

**POST /api/dashboard/wallet/top-up**
```json
Request:
{
  "amount": 200.00,
  "currency": "ZAR"
}

Response:
{
  "success": true,
  "data": {
    "checkoutId": "checkout_123",
    "redirectUrl": "https://payments.yoco.com/..."
  }
}
```

**GET /api/dashboard/requests?status=pending&limit=10&offset=0**
```json
Response:
{
  "success": true,
  "data": {
    "requests": [
      {
        "id": "REQ-123",
        "type": "cab",
        "status": "pending",
        "distance": 15.5,
        "paymentAmount": 300.00,
        "createdAt": "..."
      }
    ],
    "total": 25,
    "limit": 10,
    "offset": 0
  }
}
```

**GET /api/dashboard/orders/<id>/invoice**
```json
Response:
{
  "success": true,
  "data": {
    "pdfUrl": "/api/dashboard/orders/ORD-123/invoice/download",
    "invoiceNumber": "INV-123456"
  }
}
```

**GET /api/dashboard/requests/<id>/invoice**
```json
Response:
{
  "success": true,
  "data": {
    "pdfUrl": "/api/dashboard/requests/REQ-123/invoice/download",
    "invoiceNumber": "INV-123456"
  }
}
```

#### Location & Distance Endpoints

**POST /api/location/calculate-distance**
```json
Request:
{
  "origin": {
    "lat": -26.2041,
    "lng": 28.0473,
    "address": "Johannesburg, South Africa"
  },
  "destination": {
    "lat": -25.7479,
    "lng": 28.2293,
    "address": "Pretoria, South Africa"
  }
}

Response:
{
  "success": true,
  "data": {
    "distance": 57.8,
    "unit": "km",
    "duration": "45 minutes"
  }
}
```

**POST /api/location/geocode**
```json
Request:
{
  "address": "123 Main Street, Johannesburg, South Africa"
}

Response:
{
  "success": true,
  "data": {
    "lat": -26.2041,
    "lng": 28.0473,
    "formattedAddress": "123 Main St, Johannesburg, 2000, South Africa"
  }
}
```

---

## Authentication & Authorization

### Authentication Flow

1. **User Registration**
   - User submits email, password, role,
   - Password hashed with bcrypt
   - User record created in `users` table with:
     - `role` set to selected role (commuter, driver, professional, service-provider)
     - `is_admin` set to FALSE (admin users can only be created from admin portal)
     - `is_paid` set to FALSE (user hasn't paid registration fee yet)
     - `is_approved` set to FALSE (user not approved yet)
   - Email verification token generated
   - Verification email sent
   - JWT token returned (user can login immediately)

2. **User Login**
   - User submits email and password
   - Password verified with bcrypt
   - JWT token generated (24h expiry)
   - Token returned to client
   - Client stores token in localStorage

3. **Protected Routes**
   - Client includes token in `Authorization` header
   - Flask-JWT-Extended validates token
   - User context loaded from database
   - Request proceeds if authorized

### Authorization

#### Role-Based Access Control (RBAC)

**Roles:**
- `commuter` - Regular users requesting services
- `driver` - Cab drivers
- `professional` - Professional service providers
- `service-provider` - Service provider companies
- `admin` - Platform administrators

**Permission Matrix:**

| Endpoint | Commuter | Driver | Professional | Service-Provider | Admin |
|----------|----------|--------|--------------|------------------|-------|
| Create Request | ✓ | ✗ | ✗ | ✗ | ✓ |
| View Own Requests | ✓ | ✓ | ✓ | ✓ | ✓ |
| View All Requests | ✗ | ✗ | ✗ | ✗ | ✓ |
| Accept Job | ✗ | ✓ | ✓ | ✓ | ✓ |
| Complete Job | ✗ | ✓ | ✓ | ✓ | ✓ |
| Cancel Request | ✓ | ✗ | ✗ | ✗ | ✓ |
| Admin Dashboard | ✗ | ✗ | ✗ | ✗ | ✓ |

### Implementation

```python
# Flask decorator for role-based access
from functools import wraps
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

def require_role(*roles):
    def decorator(f):
        @wraps(f)
        @verify_jwt_in_request()
        def decorated_function(*args, **kwargs):
            user_id = get_jwt_identity()
            user = User.query.get(user_id)
            
            if not user or user.role not in roles:
                return jsonify({
                    "success": False,
                    "error": {"code": "FORBIDDEN", "message": "Insufficient permissions"}
                }), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# Usage
@app.route('/api/admin/requests')
@require_role('admin')
def admin_requests():
    ...
```

---

## Docker & Deployment

### Dockerfile Structure

#### Fullstack Flask Dockerfile
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Flask application code
COPY app.py ./
COPY backend ./backend
COPY templates ./templates
COPY static ./static
COPY migrations ./migrations

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 5000

# Run application with Gunicorn (production) or Flask dev server
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:app"]
```

#### Development Dockerfile
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 5000

# Run Flask development server with auto-reload
CMD ["flask", "run", "--host=0.0.0.0", "--port=5000", "--reload"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ag8te
      POSTGRES_USER: mzansi
      POSTGRES_PASSWORD: ${DB_PASSWORD:-changeme}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U mzansi"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "5000:5000"
    environment:
      DATABASE_URL: postgresql://mzansi:${DB_PASSWORD:-changeme}@db:5432/ag8te
      SECRET_KEY: ${SECRET_KEY:-dev-secret-key}
      JWT_SECRET_KEY: ${JWT_SECRET_KEY:-jwt-secret-key}
      FLASK_ENV: ${FLASK_ENV:-development}
      FLASK_DEBUG: ${FLASK_DEBUG:-1}
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT:-587}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASSWORD: ${SMTP_PASSWORD}
      PAYPAL_CLIENT_ID: ${PAYPAL_CLIENT_ID}
      PAYPAL_SECRET: ${PAYPAL_SECRET}
      PAYPAL_BASE_URL: ${PAYPAL_BASE_URL:-https://api-m.sandbox.paypal.com}
      YOCO_SECRET_KEY: ${YOCO_SECRET_KEY}
      DEFAULT_FROM_EMAIL: ${DEFAULT_FROM_EMAIL:-noreply@ag8te.com}
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - .:/app
      - ./static:/app/static
      - ./uploads:/app/uploads
    command: flask run --host=0.0.0.0 --port=5000

volumes:
  postgres_data:
```

### Flask Application Structure

The Flask application will serve both API endpoints and render HTML templates:

```python
# app.py structure
from flask import Flask, render_template

app = Flask(__name__, 
            static_folder='static', 
            static_url_path='/static',
            template_folder='templates')

# API routes
from backend.routes import auth, requests, payments, shop, admin
app.register_blueprint(auth.bp, url_prefix='/api/auth')
app.register_blueprint(requests.bp, url_prefix='/api/requests')
app.register_blueprint(payments.bp, url_prefix='/api/payments')
app.register_blueprint(shop.bp, url_prefix='/api/shop')
app.register_blueprint(admin.bp, url_prefix='/api/admin')

# Frontend routes (server-side rendered)
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login')
def login():
    return render_template('login.html')

@app.route('/forgot_password')
def login():
    return render_template('forgot_password.html')

@app.route('/register')
def login():
    return render_template('register.html')

@app.route('/dashboard')
@login_required
def dashboard():
    user = current_user
    return render_template('dashboard.html', user=user)

@app.route('/request')
def request():
    return render_template('request.html')

@app.route('/shop')
def request():
    return render_template('shop.html')

@app.route('/profile')
def request():
    return render_template('profile.html')

# ... more routes
```

**Key Points:**
- API routes are under `/api/*`
- Frontend routes render Jinja2 templates from `/templates`
- Static assets (JS, CSS, images) are served from `/static/*`
- Server-side rendering with template context
- Same-origin requests simplify CORS (no CORS needed for same origin)

### Environment Variables

#### Backend (.env)
```bash
# Database
DATABASE_URL=postgresql://mzansi:password@db:5432/ag8te

# Flask
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here
FLASK_ENV=development
FLASK_DEBUG=1

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=noreply@ag8te.com

# Payments
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_SECRET=your-paypal-secret
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com
YOCO_SECRET_KEY=your-yoco-secret-key

# Frontend
FRONTEND_URL=http://localhost:5173
```

#### Frontend Environment Variables
```bash
# No separate frontend environment variables needed
# All frontend configuration is handled server-side in Flask templates
# API calls use relative URLs (/api/*) since same origin
```

### Development Workflow

#### Option 1: Full Docker (Production-like)
1. **Start services**: `docker-compose up -d`
2. **Run migrations**: `docker-compose exec app flask db upgrade`
3. **View logs**: `docker-compose logs -f app`
4. **Stop services**: `docker-compose down`
5. **Reset database**: `docker-compose down -v && docker-compose up -d`

#### Option 2: Hybrid (Recommended for Development)
1. **Start database**: `docker-compose up -d db`
2. **Run Flask locally**: `flask run` (with virtual environment)
3. **Run migrations**: `flask db upgrade`

#### Flask Application Structure
```
app.py                    # Main Flask application
├── backend/
│   ├── models/          # SQLAlchemy models
│   ├── routes/          # API route blueprints
│   ├── services/        # Business logic
│   └── utils/           # Utility functions
├── templates/           # Jinja2 HTML templates
│   ├── base.html        # Base template
│   ├── index.html       # Home page
│   ├── login.html       # Login page
│   ├── dashboard.html   # Dashboard
│   └── ...              # Other pages
├── static/              # Static assets (CSS, JS, images)
│   ├── css/
│   ├── js/
│   └── images/
├── migrations/          # Flask-Migrate migrations
└── uploads/             # User uploads

Other pages:
password reset
forgot password
register
request
shop
profile
terms of use
privacy policy

```

---

## Migration Strategy

### Phase 1: Preparation (Week 1)

1. **Environment Setup**
   - Set up local PostgreSQL
   - Create Flask project structure
   - Set up Docker environment

2. **Schema Creation**
   - Create SQLAlchemy models
   - Generate migration scripts
   - Test schema creation

### Phase 2: Backend Development (Weeks 2-4)

1. **Core Infrastructure**
   - Flask app setup
   - Database connection
   - Authentication system
   - JWT implementation

2. **API Endpoints**
   - Authentication endpoints
   - Request management endpoints
   - Payment endpoints
   - Shop endpoints
   - Admin endpoints

3. **Testing**
   - Unit tests for models
   - Integration tests for endpoints
   - Authentication flow testing

### Phase 3: Frontend Integration (Weeks 5-6)

1. **Template Creation**
   - Create Jinja2 base template with common layout
   - Create page templates (home, login, dashboard, etc.)
   - Set up template inheritance and includes
   - Configure static file paths

2. **Frontend Routes**
   - Create Flask routes for all pages
   - Implement server-side rendering with context
   - Set up authentication decorators for protected routes

3. **JavaScript Integration**
   - Create vanilla JS or lightweight library integration
   - Implement AJAX/fetch calls to API endpoints
   - Update forms and interactive elements
   - Handle API responses and errors

4. **Styling**
   - Integrate Tailwind CSS (via CDN or compiled)
   - Style all templates consistently
   - Ensure responsive design

5. **Testing**
   - End-to-end testing
   - User acceptance testing
   - Test form submissions and API interactions

### Phase 4: Deployment (Week 8)

1. **Production Setup**
   - Configure production environment
   - Set up SSL certificates
   - Configure domain names

2. **Deployment**
   - Deploy to production server
   - Run migrations
   - Import production data
   - Switch DNS

3. **Monitoring**
   - Set up error logging
   - Set up performance monitoring
   - Set up backup procedures

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Tasks:**
- [ ] Set up Flask project structure
- [ ] Configure PostgreSQL database
- [ ] Create Docker Compose setup
- [ ] Set up SQLAlchemy models
- [ ] Create database migrations
- [ ] Implement basic authentication

**Deliverables:**
- Working Flask application
- Database schema created
- Docker environment running
- Basic authentication working

### Phase 2: Core Features (Week 3-5)

**Tasks:**
- [ ] Implement user registration/login
  - [ ] user registration should allow user to select the type/role of user they are (commuter, driver, professional, service-provider. admin users can only be created from the admin portal)
  - [ ] user registration should allow user to register with basic information (Name, Surname, Email, Password)
  - [ ] Include link to the Terms of Use close to register button.
  - [ ] If user is registered but has not paid, they must be marked as such.
  - [ ] If user is registered but has not completed all the fields, they must be marked as such.
  - [ ] If user is registered and is a commuter, and has completed all the fields, and has made payment, then they must be automatically approved.
  - [ ] User cannot complete registration unless they click the checkbox marked "I have read and agree to Terms of Use".
- [ ] Implement global website alert message in base template
  - [ ] When user has not paid registration fee, a message is displayed at the top of page that user features are limited until they've made payment of the registration fee
- [ ] Implement user profile page
  - [ ] after user logs in, they can complete all the other fields from their profile page.
  - [ ] user can also see on their profile page if they have paid the registration fee or not.
  - [ ] user can also submit registration fee from profile page once all user fields have been completed.
  - [ ] use javascript to hide/show input fields based on the selected user role on user role selection/change
  - [ ] Have field to mark "South African citizen"
  - [ ] Have field for next of kin
  - [ ] Implement a SA ID validation algorithm to validate Identity number aligns with for valid lentgth and structure.
  - [ ] If user checks the "South African citizen" option then use javascript to validate Identity number aligns with SA ID valid structure.
  - [ ] ID uploads must be validated.
  - [ ] If use has not uploaded an ID document or the ID document is marked as "rejected" then display global alert message  for user to re-submit document.
  - [ ] User should see in the profile page if ID is "verified", "pending" or "rejected"
  - [ ] If "rejected" user can see "reasons" field.
- [ ] Implement Password Reset/Update
- [ ] Implement Forgot Password Recovery 
- [ ] Implement email service (/home/charles/Documents/projects/mzansi-serve/services/email)
- [ ] Implement payment service (/home/charles/Documents/projects/mzansi-serve/services/yoco-checkout-service)
- [ ] Implement payment processing
- [ ] Implement admin endpoints
- [ ] Implement service request features
- [ ] Implement Pages layout and  features
  - [ ] Site navigation bar: Home, Shop, Request a Cab, Request a Professional, Request a Service Provider 

**Deliverables:**
- All core API endpoints working
- Payment integration complete
- Email service functional

### Phase 3: Frontend Migration (Week 6-7)

**Tasks:**
- [ ] Create Jinja2 base template
- [ ] Create all page templates (home, login, dashboard, etc.)
- [ ] Set up Flask routes for frontend pages
- [ ] Implement server-side rendering with context
- [ ] Create JavaScript for API interactions
- [ ] Replace Supabase client with fetch API
- [ ] Update forms and interactive elements
- [ ] Style templates with Tailwind CSS
- [ ] Test all pages and functionality

**Deliverables:**
- Flask serving HTML templates
- Frontend fully integrated with Flask API
- All features working end-to-end
- Server-side rendering working correctly

### Phase 4: Testing & Refinement (Week 8)

**Tasks:**
- [ ] Write comprehensive tests
- [ ] Fix bugs and issues
- [ ] Performance optimization
- [ ] Security audit
- [ ] Documentation

**Deliverables:**
- Test suite complete
- Application production-ready
- Documentation complete

### Phase 5: Deployment (Week 9)

**Tasks:**
- [ ] Set up production environment
- [ ] Deploy application
- [ ] Migrate production data
- [ ] Monitor and fix issues

**Deliverables:**
- Application live in production
- All data migrated
- Monitoring in place

---

## Technical Considerations

### Security

1. **Password Hashing**: Use bcrypt with salt rounds >= 12
2. **JWT Tokens**: Use secure secret keys, set appropriate expiry
3. **SQL Injection**: Use parameterized queries (SQLAlchemy handles this)
4. **CORS**: Configure CORS properly for production
5. **Rate Limiting**: Implement rate limiting for API endpoints
6. **Input Validation**: Validate all user inputs
7. **HTTPS**: Use HTTPS in production

### Performance

1. **Database Indexing**: Create indexes on frequently queried columns
2. **Connection Pooling**: Use SQLAlchemy connection pooling
3. **Caching**: Implement Redis caching for frequently accessed data
4. **Pagination**: Implement pagination for list endpoints
5. **Async Operations**: Use background tasks for email sending

### Scalability

1. **Horizontal Scaling**: Design for multiple backend instances
2. **Database Replication**: Plan for read replicas if needed
3. **Load Balancing**: Use Nginx or similar for load balancing
4. **File Storage**: Use S3 or similar for file storage

### Monitoring

1. **Error Logging**: Use Sentry or similar for error tracking
2. **Performance Monitoring**: Use APM tools
3. **Database Monitoring**: Monitor database performance
4. **Uptime Monitoring**: Set up uptime monitoring

---

## Risk Assessment

### High Risk

1. **Data Loss During Migration**
   - **Mitigation**: Full backup before migration, test migration on staging

2. **Authentication Issues**
   - **Mitigation**: Thorough testing, gradual rollout

3. **Payment Integration Issues**
   - **Mitigation**: Test thoroughly in sandbox, monitor closely

### Medium Risk

1. **Performance Degradation**
   - **Mitigation**: Load testing, optimization

2. **Feature Gaps**
   - **Mitigation**: Comprehensive feature inventory, testing

### Low Risk

1. **UI/UX Changes**
   - **Mitigation**: Maintain same UI, test thoroughly

---

## Success Criteria

1. ✅ All existing features working
2. ✅ All data migrated successfully
3. ✅ Performance equal or better than current
4. ✅ Security maintained or improved
5. ✅ Zero data loss
6. ✅ Successful production deployment

---

## Appendix

### A. Database Schema Diagrams
[To be created during implementation]

### B. API Documentation
[To be generated using Swagger/OpenAPI]

### C. Deployment Checklist
[To be created]

### D. Testing Strategy
[To be detailed during implementation]

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024 | Technical Team | Initial specification |

---

**End of Initial Technical Specification**
**Additional Technical Scope**
For all changes that follow be sure to update the readme where necessary.
----
Dashboard nav link should be next to the home nav link
----
If clicks on Request a cab, Request a service provider, or Request a professional
- if user is logged out
  - then user sees a modal that prompts user to log in or register before they can access services.
  - the modal cant be removed. modal has buttons for reister and login
  - the modal cant be removed. modal has buttons for reister and login
----
if user is not logged in they user can only see nav links for 
  - home, shop, login and register
----
add cli commands for adding admin user
add cli commands for adding user of all role types including number of users to generate
----
"User features are limited until registration fee payment" message mst only display when user is logged in.
----
When user is logged in:
Home Page has buttons
"Get started" links to dashboard
----
When user is logged out:
Home Page has buttons
"Get started" links to register
----
Add cli commands to add and delete common Shopping Categories (ShopCategory)
Add cli commands to add and delete common Shop Products (ShopProduct)
----
Implement Shop page according to the tech spec
----
Implement Profile page according to the tech spec
----
On profile page. when user updates profile. if there is an id document saved for the user. then there should be an action button on the "ID DOcument" section. button should load the file in a new browser tab
----
On Profile Page:
  Next of Kin should be expanded to be:
  Next of Kin
  Full name
  Contact number
  Contact Email
----
confirm that the ID document field is submitting the image data and that the image is being saved. 
----
http://127.0.0.1:5000/profile
implement yoco checkout feature for payment of the registration fee. 
 when user clicks on the pay registration fee button, a request should be made using the yoco secret key to generate a yoco checkout link. when the link is obtained, redirect user to yoco payments checkout, 
 on success:
1. verify user
2. set is_paid = true
3. if  is_paid == true

consider the yyoco checkout sevice. Use it as a guide for what can be done with checkout
 /home/charles/Documents/projects/jalusi-yoco-checkout-service
------------------------------
http://localhost:5000/wallet
clicking on the top up button triggers a modal with a input field for the amount of money being topped up. SUbmit button triggers yoco checkout. handle as per tech spec.
------------------------------
add a cart icon in the nav bar to track when theres items in the cart and when there's not and indicate with a green dot on the icon if theres items in the cart.
------------------------------
http://localhost:5000/shop
clicking on the image space of the product item cards, should link user to the product details page.
Create product details page if not exists.
------------------------------
http://localhost:5000/shop/product/1
Have a gallery of product images. When user is on product details page, the images are present. clicking on any image opens an image carousel.
------------------------------
http://localhost:5000/admin/
app_1  | 172.21.0.1 - - [18/Jan/2026 09:23:47] "GET /admin/ HTTP/1.1" 404 -
admin portal is not found.
------------------------------
http://localhost:5000/admin/
admin portal is only accessible to admin role users
------------------------------
http://localhost:5000/admin/
Implement admin dashboard according to the tech speech
------------------------------
http://localhost:5000/admin/
Implement admin dashboard according to the tech speech
------------------------------
http://localhost:5000/admin/
On user actions. if user is approved, then options to change/update the status. user status options should include suspended if not already there
------------------------------
http://localhost:5000/shop
when user clicks on cart icon, they should be redirected to shopping cart details page. for updates and checokout
------------------------------
http://localhost:5000/shop
when user clicks on "proceed to checkout" button, the user should be redirewcted to checkout page.
add new model "delivery address" for users. 
"delivery address" model includes address fields, user foreign key field, and is_default field.
on checkout page, user has a list of associated delivery addresses.User can select delivery address for the current checkout. User can change default delivery addresse from checkout page as well,
Add delivery address management options to profile page.
------------------------------
http://localhost:5000/checkout.
on click "Place order"
- save order to db with a pending status
- trigger yoco workflow
- handle payment success/cancel/failure
------------------------------
http://localhost:5000/checkout.
on click "Place order"
- save order to db with a pending status
- trigger yoco workflow
- handle payment success/cancel/failure

http://localhost:5000/checkout.
on payment success/cancel/failure, update the order status
http://localhost:5000/shopping-history?payment=success
implement shopping history and correctly display orders.
include filter for pending, success, cancelled and failed order payments.
on orders with status pending, have action button to complete order.

-----------
http://localhost:5000/dashboard
on "Recent Shop Orders" card, the listed orders should have a clickable link that redirects to order details page
Confirm order details page exists and create if it doesnt

-----------
http://localhost:5000/shopping-history
on click "COmplete order" implement yoco checkout workflow and mark status according to payment callback status

-----------
http://localhost:5000/shop
add product search input that searches against product name and descrption
-----------
http://localhost:5000/order/ORD-33C7906EF4AAFA3C
on click "Complete order" implement yoco checkout workflow and mark status according to payment callback status
-----------
http://localhost:5000/admin/
- add new model "inventory"
- Next to "User" and "Service Request" tabs, add  new tab "Products"
  - under "products" tab, list all products. Include actions column. user actions include:
    - "activate" button when priduct status is "inactiive"
    - "deactivate" button when priduct status is "actiive"
- Add new table button "Add"
  - "Add" button triggers modal for adding new product.
  - modal has "save product" button
    - the "save product" button saves product details
-----------
http://localhost:5000/shop
when user make a purchase/order for a product:
- when checkout succeful, be sure to track the inventotry change
-----------
http://localhost:5000/shop
when user make a purchase/order for a product:
- if the inventory value for that product is zero then mark item as out of stock
----------
design and implement the car configuration + pricing logic so that cab distance and price are calculated according to the spec.
Also we are no longer implementing bidding feature:
- Commuter will make request and get a quote for the distance based on the car selected
- Commuter will accept accept the quote and pay, or they will update their preferences.
- Once paid, drivers will then see the request on their dashboard. 
- Commuter will accept or reject. the rest of the logic remains unchanged.
----------
- Be returned by a dedicated endpoint like POST /api/requests/quote (no DB write)
----------
professionals should be able to add their services, service descriptions and their hourly rate
service providers  should be able to add their services and service descriptions
When requesting a service provider or professional, the commter/user is charged a call out fee
call out fee is paid via the payment workflow.
call out fee is configurable via the admin portal and is the same for service providers and professionals
Users searching for a professional should be able to view list of matching professionals, and can list them by rate per hour
----------
Add below car types and rates
Small Hatchback - R8.12
Sedan (1.6–2.0L) - R8.44
SUV / Crossover - R8.92
Bakkie / LDV - R9.40
Luxury Vehicle - R11.8
Hybrid Vehicle - R7.80
Electric Vehicle - R6.52
----------
http://localhost:5006/request-driver
Under "3. Review Quote & Pay"
When user clicks "Accept Quote & Create Request"
user should be taken through the yoco checkout workflow
when Callback comes back with success, then inform user with a brief 3-second modal display, then redirect to http://localhost:5006/requested-services
----------
http://localhost:5006/requested-services
"requested services" list items should have action button for cancelling request
----------
all of the following nav bar links should be hidden when user is unauthenticated. However "Request a Cab" is still visible. it should be hidden as well:
<a href="/request-driver" class="hidden hover:text-gray-300 request-link nav-link" data-requires-auth="true">Request a Cab</a>
<a href="/request-professional" class="hidden hover:text-gray-300 request-link nav-link" data-requires-auth="true">Request a Professional</a>
<a href="/request-service-provider" class="hidden hover:text-gray-300 request-link nav-link" data-requires-auth="true">Request a Service Provider</a>
<a href="/profile" id="nav-profile" class="hidden hover:text-gray-300 nav-link">Profile</a>
----------
when professional, service provider, or driver  goes to profle page they should be able to populate 
- Fields that commuter needs for matching preferences (e.g. gender )
- Confirm that these field, once added to profile page, will be matchable when user professional/service provider/driver looks at their list of requests
----------
professional profile:
Qualifications (including uploads for admin verification, but not visible to commuters)
Highest Qualification
Professional Body
Proof of Residence *
----------
Driver profile:
Driver's License *
Vehicle Details
Make, Model, Registration Number, Car type
Proof of Residence *
----------
Add file-upload input for admins. include any necessary backend image upload handler for product images; 
Admin must be able to upload via file upload dialog window instead of pasting a reachable image URL rather than uploading a file.
-------
make logo bigger
-------
remove "AG8TE" name next to the logo
-------
change nav bar and fotter color to AG8TE blue/purple gradient
-------
refactor make home page:
- "Welcome to AG8TE" section
  - "Convert into a carousel"
    - Section fades in from top
      - As it currently reads (Your trusted service ads), and the buttons
    - "Driver Services" section
      - "Sedan & Luxury Cars Vans & Trucks Distance-based pricing Verified drivers Insurance covered"
    - "Professional Services" section
      - "Accountants & Lawyers Doctors & Nurses Engineers & Architects IT Consultants 25+ professions Request Professional"
    - "Service Providers" section
      - "Home & Garden Services Event Management & DJ Cleaning & Maintenance Health & Beauty 20+ service types"

-------
- Remove nav links for "Request a Driver", "Request a Professional", "Request a Service Provider"
- Add "Make Request" nav link
  - On hover, expand and display "Driver", "Professional", "Service Provider"
  - Show even when logged out.
  - When logged out. those links redirect to login page
-------
Implement Fade in effect for apprpriate web paghes
-------
Implementing a responsive navigation bar with a hamburger menu. 
-------
https://mzansi-serve.jalusitech.com/request-driver
Under "Service Preferences" - under the date/time manual selection section, add option for requesting immeditaely "Request for now"
-------
https://mzansi-serve.jalusitech.com/requested-services
Change the layout of the listed services.
- instead of a conventional table, use cards that display details of the record
-------
On index page, inside the carousel
- the items listed inside of the "Driver Services" and "Service Providers" carousel slides should be 2 columns like "Professional Services" slide
-------
Footer
- Add FAQ link in the footer
- Add FAQ page
- FAQ page should display Questions and answers.
- Add a db model to persist FAQs and Answers.
- Add a admin page to manage FAQs and Answers.
-------
Nav bar:
when logged in user is an admin user then they should see a nav link option for the admin portal
- make this change to both the responsive nav and the standard nav
-------
https://mzansi-serve.jalusitech.com/dashboard
When page is at 125% zoom, the logo gets very squashed. make the size and shape of the the logo display consistent
-------
On admin page, add "Edit" action button
"Edit" action button triggers modal with profile info of the user that the admin can update and save
- triggered modals must display role specific fields
button "Edit"
-------
Implement the below, taking care not to break any existing features:
Registration and Profile pages
All the fields in the profile page should now be filled in and submitted on the registration page.
The submit button on the registration page should read "Pay and Signup".
The submit button should:
  - Persist the registration in local storage
  - Direct user to payment checkout workflow
  - On payment checkout workflow callback, direct back to the homepage with transaction params
  - if callback success
    - then present payment status modal
    - complete registration
    - login
    - redirect to profile page
    - profile page fields should all be readonly
  - if callback fail or cancel
    - then present payment status modal
    - redirect to registration page so user can try again
    - Populate  registration fields from local storage data

On Registration page
- after moving profile page's input fields to registration page
  - Change "Service Provider Services" to "Add Your Services"
  - Add model to track available Services Options
    - This should be different from model to perisist user's selected Service Options
    - Add a model to track services selected by Service provider at registration.
      - The model should include a field for a personalized description which is populated from the descripton field in the services selection description input on registratration page
  - Add CLI command for populating default Services
- Services under "Add Your Services" section
  - The Name input field should be read-only 
  - The Name input field should have a "Edit" button
  - The Name input field "Edit" button triggers Services modal
  - The Services modal should list service options from db
  - When user selects an item from the list of services:
    - The item is added to the selected service row item in the form
  - When user clicks the edit button on a new service item row, then the Services modal should show services but remove services that are already selected in other item rows so that services are not selected multiple times.
  - Service description field is optional.
    - Service options should be selected from db of pre-defined list
-------
Under "Add Your Services"
- User is not limited to how many services they can select
-------
Changes for the shop:
Add Category-Subcategory organization and design for products
Add the necessary models for Categories and Subcategories
Add CLI commands to auto-populate default categories and subcatergories for Categories and Subcategories
Update CLI commands that populate products to include categories and subcatergories relationships
Add new subcategories filter field to shop page 
When user Selects a catergory filter, it triggers the subcategories filter field to populate with all subcategories associated with that category
Ensure search still works with the filters and the search input field
-------
On Admin portal, add tab for managing Categories and Subcategories
On Admin portal, add tab for managing Available Services
On Admin portal, add tab for managing user sales. for recons and customer support
On Admin portal, user tab, remove paid/unpaid status as we are now handling payment at registration
On Admin portal, user tab - action options must have verify ID, View ID options put back.
On Admin portal, user tab - when editing service provider, the admin can add or remove services for the user - confirm if this feature exists, else add it
-------
On Admin portal, products tab - action options must have "Edit" option.
"Edit" option triggers modal that allows admin user to edit product details, including categories, sub categoriesd, and  product images.
Persist saved product images in image uploads directory
If necessary create new images model that links to the product model with fk relationship
Admin can add multiple images per product
-------
On "Request a driver" - on "Accept Quote & Create Request" change to "Accept Quote & Request"
-------
On registration page (https://mzansi-serve.jalusitech.com/register)
- Move "ID Document" upload input field to "Verification Documents" section
- Move "ID verification: Pending review" alert to the part of the registration form that has the ID upload input field
- Move "Registration fee not paid." alert to the part of the registration form that has the payment info and payment button
- If ID has not been uploaded - "ID verification: Pending review" should be read "ID verification: Please Upload ID Document for Review"
- If ID has been uploaded but not verified - "ID verification: Pending review" should be read "ID verification: Pending Review"
- Add countries model
- Add CLI command that will populate countries model with all the world's countries
- Under "Identity Information" section. Add nationality selection drop-down instead of "I am a South African citizen" checkbox. 
- nationality selection drop-down is populated with countries data
- Add nationality field to user model and persist this input selection in the new field
-On the registration form, change the label "Role" to "Register as a" 
-------
On registration page (https://mzansi-serve.jalusitech.com/register)
- If SA provide ID, else passport number
- Move ID upload field to the "Verification Documents" section
- "Basic Information" must be mandatory fields for registration
-------
On registration page (https://mzansi-serve.jalusitech.com/register)
- When user selects a role, the displayed input fields should change to reflect the select user role/type
- When user selects a commuter or service provider or professional role, driver's license is not mandatory
-------
https://mzansi-serve.jalusitech.com/request-driver
https://mzansi-serve.jalusitech.com/request-professional
https://mzansi-serve.jalusitech.com/request-service-provider

If clicks on Request a cab, Request a service provider, or Request a professional
- if user is logged out
  - then user sees a modal that prompts user to log in or register before they can access services.
  - the modal cant be removed. modal has buttons for reister and login
  - the modal cant be removed. modal has buttons for reister and login

-------
https://mzansi-serve.jalusitech.com/login
add link to register page

https://mzansi-serve.jalusitech.com/register
add link to login page
----------------------------
ensure we implement emails
- when user makes checkout payment for registration
- when user makes checkout payment for a shop purchase
- when user makes checkout payment for a call-out for a requested professional service or driver.
- when user ID is verified.
- when user is approved by admin.
- when user is suspended by admin.
--------------------------------------
https://mzansi-serve.jalusitech.com/profile Driver Services (Cars) section layout must be styled to look https://mzansi-serve.jalusitech.com/register page's Driver Services (Cars) section
--------------------------------------
Identity Information in profile page must be refactored to align with the registration page display, except read-only and set to the user's selected Nationality
--------------------------------------
Completed
• Password Confirmation
  ◦ Add Confirm Password field for all roles.
  ◦ With Validation:
• Create role-based dashboards:
  ◦ Professional Dashboard
  ◦ Service Provider Dashboard
  ◦ Driver Dashboard
• Add a “Recent Ride Requests” section on the driver dashboard.
• First Dropdown menu item on car type field must be blank or “Select option”.
• User must manually choose an option.
• Prevent form submission if no option is selected.
• Automatically calculate and update the quote immediately when a car type is selected.
• Remove the need for the “Get Updated Quote” button.

--------------------------------------
PUSHBACK
--------------------------------------
--------------------------------------
"On login, users must login then be able to see all accounts if more than one account, otherwise user have must be able to select their role (User / Driver / Professional / Service Provider"
- If users are able to login with any role other than the role they registered with, then it compromises the whole process of verifying and validating user's data for a particular role.In other words, if I register as a commuter and then login as a driver:
1. Then I have access to the driver dashboard without going throuhgh the verification process
2. Since the initial discussion was to make the profile page details viewable but unchangeable this means user cannot (at present) cannot update their changes for purposes of undergoing verification as a driver
Although the request has been made to make the profile fields editable again, this above change would constitute a significant material addition/enlargement of the current scope. It should rather be proposed as part of future change  requests outside of current scope.

"User Profile/Account
• Users must be able to view all their details, including Next of Kin information.
• Field must be editable, except ID number"
- "Fields must be editable, except ID number" - Due to the current behaviour and and architectural design, the role input field ("Register as a") will also be uneditable along with the ID


"Pick-up Location must include “Use Current Location” option that auto-detects the user’s location."
- This feature would represent a material expansion of the current scope of work beyond what I am aware of being part of the current scope.
- This feature is more reliable when implemented as a mobile app feature.

"On payment cancellation, redirect message must say “If you choose to do so, you will be directed back to AG8TE” (Replace “DIPSEL GROUP”)."
- Require clarity

--------------------------------------
Erata:
--------------------------------------
--------------------------------------
"Rename Passport Number to Passport / ID Number."
- Please note there was a technical code error that prevent the proper feature behavior previously agreed on:
 - When user selects South africa from teh drop down then "SA ID Number" is displayed, else "Passport number" is displayed.
 - Please confirm the feature and confirm if it is acceptable

--------------------------------------
TODO:
--------------------------------------
--------------------------------------
Home page carousel/slider must auto-slide every 5 seconds, displaying one image at a time.
  - Add a carousel item model to track:
    - carousel item image field
    - carousel item call to action link field
    - carousel item order field
    - carousel item is_active field
  - Add an admin tab in the admin portal that lets admin user
    - Manage carousel items, including uploading carousel image and other fields
    - Carousel changes image every 5 seconds
--------------------------------------
Add a model for managing footer content
Add cms tab in the admin portal to allow user to manage company contact details
- The Footer must display
  - company contact details (company name, email, phone number, physical address)
--------------------------------------
On shop page
- Confirm that with category and subcategory search:
  - When category is selected all associated subcategories are loaded into the subcategory drop down
  - Ensure when searching category
    - that user gets search results matching the selected category
  - Ensure when searching subcategory
    - that user gets search results matching the selected subcategory
    - match/search subcategory items by ID not name as diff categories can share similar subcategories
- Confirm the category and subcategory search should work fine
--------------------------------------
Request a Cab
  • Replace "Request a Driver" with "Request a Cab" everywhere in the code
  • Replace "Request Driver" with "Request Cab" everywhere in the code
--------------------------------------
User Profile
• Users must be able to view all their details, including Next of Kin information.
• Fields must be editable
  • Limitations: ID number, role (register as) will remain uneditable
--------------------------------------
On register page under "Identity Information" section:
- The "Passport Number *" input field is not accepting values and must be fixed.
--------------------------------------
Logo should be the same height as the nav bar
-----------------
https://mzansi-serve.jalusitech.com/admin
Under Categories tab
- Add new action option "add sub category"
- clikcing on "add sub category" trigger modal with option to add subcategory for the selected category
-----------------
Under Products tab
- add search field and to search products by name
- add filter field products status
- add filter field products status
- add filter field products catgegory
- add filter field products subcatgegory
- products subcatgegory field should populate based on category selection
-----------------
Edit Product
- Category and subcategory fields must populate correctly
-----------------
https://mzansi-serve.jalusitech.com/requested-services
under Requested Services
- If request type is cab then display car type

-----------
https://mzansi-serve.jalusitech.com/driver-dashboard
Available Ride Requests
- if request type is cab, then display distance in the ride request item details

-----------
https://mzansi-serve.jalusitech.com/driver-dashboard
Available Ride Requests
- display car typex

-----------
https://mzansi-serve.jalusitech.com/rides-made
Rides You've Made
- display car type on the rides

-----------
Requested Services
Track service request status
• If request type is cab and request is accepted by a driver:
- displayed cab item should have buttons
- "mark driver as no-show"
- "driver has arrived"
• on clicking "driver has arrived":
- displayed cab item should have button
  - "arrived at location"
• on clicking "arrived at location":
  - displayed cab item should have button "rate your driver"
    - button "rate your driver" triggers a modal that lets user rate the driver and leave a text review.
    - modal has a star-rating that lets user rate the driver and leave a text review.
    - add model to track driver ratings and reviews.

-----------
• on clicking "arrived at location":
  - set service request status = 'completed'
  - if service request status == 'completed'
    - displayed cab item should have button "rate your driver"
      - button "rate your driver" triggers a modal that lets user rate the driver and leave a text review.
      - button "rate your driver" triggers a modal that lets user rate the driver and leave a text review.
      - the ride has already been rated then disable the button.
-----------
Registration and profile pages:
-  Add model field for profile image/photo.
-  User can add a profile photo during registration.
-  User can edit profile photo on profile page.
-  Admin can also edit profile photo in admin portal under users tab.

-----------
Requested Services
- Add display field "Driver" which will display the name of the driver
- Name of driver should be displayed above car type
- Name of driver should be clickable
- On clicking name of driver, trigger modal that displays driver info including
  - profile image if available 
  - average rating and a link to list of all of a driver's previous reviews 
- The modal should include button "Request another driver" 
- On  clicking "Request another driver" 
  - Include reason for requesting driver change 
  - current acceptance status is changed back to pending 
  - current driver will no longer see the request, similar to how it should be when driver rejects a request
-----------
Requested Services
- On clicking name of driver on request cab, trigger user modal that displays driver info including profile image if available 
- modal should also have a button to "Request  different driver"
  - On cld also have a button to "Request  different driver"
  - On cicking the button to "Request different driver":
  - current driver is removed from the cab request 
  - the cab request reverts to pending for other drivers to accept
-----------
calculate earnings for current month to date
-----------
Available Ride Requests
- Add display field "Client" which will display the name of the client requesting the cab
- Name of client should be displayed above pickup
- Name of client should be clickable
- On clicking name of client, trigger modal that displays client info including
  - profile image if available 
  - average rating and a link to list of all of a client's previous reviews
  - add model to track client ratings and reviews.
-----------
Rides You've Made
- On clicking name of client, trigger modal that displays client info including
  - profile image if available 
  - average rating and a link to list of all of a client's previous reviews 
  - fields that let user rate the client and leave a text review.
    - if the driver has already rated the client then disable the button.
-----------
on "Request a Professional" page
- "Submit Request & Pay Call-out Fee" must go through payment checkout worflow.
-----------
Requested Services
Track professional service request status
• If request type is professional and request is accepted by a professional:
- displayed cab item should have buttons
- "mark as no-show"
- "professional has arrived"
• on clicking "professional has arrived":
- displayed cab item should have button "rate your service"
  - button "rate your service" triggers a modal that lets user rate the service of the professional and leave a text review.
  - add model to track professional ratings and reviews.
- set service request status = 'completed'

on "Request a Professional" page
- "Submit Request & Pay Call-out Fee" must go through payment checkout worflow.
-----------
Requested Services
Track service provider service request status
• If request type is professional and request is accepted by a professional:
- displayed cab item should have buttons
- "mark as no-show"
- "service provide has arrived"
• on clicking "service provide has arrived":
- displayed cab item should have button "rate your service"
  - button "rate your service" triggers a modal that lets user rate the service of the service provide and leave a text review.
  - add model to track service provide ratings and reviews.
- set service request status = 'completed'
-----------

Available Professional Requests
- items must properly display service type
- service requests (SP, Pro, cab) that have not been paid should not be displayed to service providers. status must be "unpaid" until it is paid then status becomes pending and resumes normal process sequences.
-----------

Remove cost per kilometer from driver registration and profile.
Pricing must be admin-configured and calculated automatically as it currently is
-----------
Pricing for call out fees for prosfessionals and service providers must be configurable in the admin portal must be
admin-configured, db-based call out fees must be applied to service providers and professionals respectively 
----------
Confirm if there is a admin portal tabs for managing "Terms of Use" and "Privacy Policy" content.
- Upload text or upload pdf.
- If PDF then open as such in the terms page or the privacy page.
- If text then open as such in the terms page or the privacy page.
----------
Drivers must not see shop or cart links in the nav bar
----------
earnings for pros, service providers are calculated when clients mark that provider has arrived (current logic). for drivers it's when client marks "arrived at location"(current logic). Those earnings are calculated on a month-to-date basis. then month-end, that earnings value transfers to wallet balance.
- add a recon table to track if earnings have been transfered to their wallets
- aedd a recon check that is triggered when user
  - accesses the dashabord page
  - accesses the wallet page
  - logs in
- Driver, SPs and Pros can request a withdrawal from their wallets with in the value of the wallet..
- add admin tab for manually triggering recons for all earner roles (sp, pro, driver) for a given month
- Add button to earner wallets to let them request a withdrawal
  - withdrawal requests depend on the balance in the user's wallet.
  - Add admin tab for withdrawal requests
  - Withdrawal requests pull money from the wallet into a suspense account.
  - Admin will see withdrawal requests from earners with a status of paid or pending or reversed
  - Admin will can update the status to paid, pending  or reversed
  - Withdrawal requests pull money from the wallet into a suspense account.
  ----------------------------
Users can log in with the same email address for different user roles. This means that the unique identifier should be the combination of user role and user email instead of just email.
On login, add the option to select what user role a user wants to log in as
If a user has not registered a user and role combination then they cannot login with that user and role combination

  ----------------------------
add a new admin login page.
admin users cannot use the front-end interface to login because that implies adding the admin role as a login option. 
this unnecessarily illicits potential cyber security concerns.
the solution is to create a seperate login page. on that page, role is assumed to be admin and the user only provides email and password to authenticate.