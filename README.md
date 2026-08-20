# AG8TE Flask Application and React

A service ads platform connecting users with vetted service providers (cabs, professionals, service providers).

### Features (high level)

- **Agents:** Optional agent tracking at registration. Admins manage agents (name, surname, id_number, agent_id) in the admin **Agents** tab; the registration dropdown and profile display show **agent_id** (e.g. AGT001). Seed the default list with `flask cli seed-agents` (see CLI).
- **Profile:** Name, Surname, and Phone are read-only on the profile (set at registration). Verification documents (ID, Proof of Residence, Driver's License) show a "View …" button when a document has been uploaded.

## Technology Stack

- **Backend**: Flask 3.0+ (Python 3.11+)
- **Database**: PostgreSQL 15+
- **ORM**: SQLAlchemy 2.0+
- **Migrations**: Flask-Migrate (Alembic)
- **Authentication**: Flask-Login + Flask-JWT-Extended
- **Email**: Flask-Mail
- **Containerization**: Docker + Docker Compose

## Setup Instructions

### Prerequisites

- Docker and Docker Compose installed
- Python 3.11+ (for local development without Docker)

### Installation

1. **Clone the repository**
   ```bash
   cd /home/charles/Documents/projects/ag8te
   ```

2. **Create environment file**
   ```bash
   cp .env.production.example .env
   # Edit .env with your configuration if needed (see ENV VARS below)
   ```

3. **Start with Docker Compose**

   **For Local Development (Recommended):**
   ```bash
   # Use the development override to skip SSL requirements locally
   docker compose -f docker-compose.yml -f docker-compose.local.override.yml up -d
   ```

   **For Production (Requires SSL):**
   ```bash
   docker compose up -d
   ```
   
   **Note:** Database migrations run automatically when the container starts via the entrypoint script. The first startup may take a few seconds as it initializes the database schema.

4. **Create admin user (Optional)**
   ```bash
   docker-compose exec app flask cli create-admin
   # Or locally: flask cli create-admin
   ```

### Development

#### Option 1: Full Docker (Production-like)
```bash
# Start services
docker-compose up -d

# Run migrations
docker-compose exec app flask db upgrade

# If you see "Can't locate revision identified by 'xxxx'" (e.g. after a missing or old migration):
# 1. Stamp the DB to the last known revision before the missing one, then upgrade:
#    docker-compose exec app flask db stamp vehicle_images_001
#    docker-compose exec app flask db upgrade
# 2. If the pending_profile_updates table already exists, just stamp to head:
#    docker-compose exec app flask db stamp pending_profile_001

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

#### Option 2: Hybrid (Recommended for Development)
```bash
# Start database only
docker-compose up -d db

# Run Flask locally (with virtual environment)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Set environment variables (see env.example for full list)
export DATABASE_URL=postgresql://ag8te:local-only-password@localhost:5432/ag8te
export SECRET_KEY=dev-secret-key
export JWT_SECRET_KEY=jwt-secret-key
export GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Initialize migrations
flask db init
flask db migrate -m "Initial migration"
flask db upgrade

# Run Flask
flask run --host=0.0.0.0 --port=5000
```

### Access the Application

- **Application**: http://localhost:5000
- **API Base**: http://localhost:5000/api

## Project Structure

```
ag8te/
├── app.py                  # Main Flask application
├── backend/
│   ├── config.py          # Configuration
│   ├── extensions.py      # Flask extensions
│   ├── models/            # SQLAlchemy models
│   ├── routes/            # API route blueprints
│   ├── services/          # Business logic services
│   └── utils/             # Utility functions
├── templates/             # Jinja2 HTML templates
├── static/                # Static assets (CSS, JS, images)
├── migrations/            # Flask-Migrate migrations
├── uploads/               # User uploads
├── docker-compose.yml     # Docker Compose configuration
├── Dockerfile             # Docker image configuration
└── requirements.txt       # Python dependencies
```

## API Endpoints

## Environment Variables (common)

- `DATABASE_URL` – PostgreSQL connection string  
- `SECRET_KEY`, `JWT_SECRET_KEY` – Flask app & JWT secrets  
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `DEFAULT_FROM_EMAIL` – email  
- `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME` – Brevo transactional email for login OTPs
- `OTP_SECRET_KEY`, `OTP_LOGIN_EXPIRES_MINUTES`, `OTP_MAX_ATTEMPTS` – email OTP security settings
- `FIREBASE_PROJECT_ID` – Firebase Authentication project used to verify phone OTP ID tokens for sensitive actions
- `PAYPAL_CLIENT_ID`, `PAYPAL_SECRET`, `PAYPAL_BASE_URL` – PayPal (optional)  
- `YOCO_SECRET_KEY` – Yoco payments (optional)  
- `FRONTEND_URL` – Frontend base URL (default: http://localhost:5006)  
- `GOOGLE_MAPS_API_KEY` – required for driver / professional / service-provider request pages that use Google Maps/Places  

See `env.example` for a full template.

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/register-with-payment` - User registration with registration fee checkout
- `GET /api/auth/agents` - List agents (for registration dropdown; displays agent_id)
- `POST /api/auth/login` - Validate credentials and send email OTP
- `POST /api/auth/verify-login-otp` - Verify email OTP and issue JWT
- `POST /api/auth/resend-login-otp` - Resend pending login OTP
- `POST /api/auth/verify-sensitive-sms` - Verify Firebase phone OTP for payouts and payment verification
- `POST /api/auth/verify-password-reset-sms` - Verify Firebase phone OTP and issue a password reset token
- `POST /api/auth/logout` - User logout
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `POST /api/auth/verify-email` - Verify email with token
- `GET /api/auth/me` - Get current user

### Service Requests
- `POST /api/requests` - Create service request
- `GET /api/requests` - List requests
- `GET /api/requests/<id>` - Get request details
- `POST /api/requests/<id>/accept` - Accept request
- `POST /api/requests/<id>/cancel` - Cancel request

### Payments
- `POST /api/payments/create-checkout` - Create payment checkout
- `GET /api/payments/status/<id>` - Get payment status
- `POST /api/payments/webhook` - Payment webhook handler

### Dashboard
- `GET /api/dashboard` - Get dashboard data
- `GET /api/dashboard/wallet` - Get wallet balance
- `GET /api/dashboard/requests` - Get user requests
- `GET /api/dashboard/orders` - Get user orders

### Admin
- `GET /api/admin/users` - List all users
- `PATCH /api/admin/users/<id>/approve` - Approve user
- `PATCH /api/admin/users/<id>/verify-id` - Verify ID document
- `GET /api/admin/stats` - Get dashboard statistics
- **Agents:** `GET /api/admin/agents`, `POST /api/admin/agents`, `PUT /api/admin/agents/<id>`, `DELETE /api/admin/agents/<id>` - Manage agents (name, surname, id_number, agent_id)

### Shop
- `GET /api/shop/products` - List products
- `GET /api/shop/products/<id>` - Get product
- `GET /api/shop/categories` - List categories
- `POST /api/shop/orders` - Create order

## CLI Commands

### User Management

#### Create Admin User

Create an admin user with full permissions:

```bash
# With Docker
docker-compose exec app flask cli create-admin

# Without Docker
flask cli create-admin
```

The command will prompt you for:
- Email address
- Password (with confirmation)
- Full name

#### Add User

Add a single user of any role:

```bash
# With Docker
docker-compose exec app flask cli add-user

# Without Docker
flask cli add-user
```

The command will prompt you for:
- Email address
- Password (with confirmation)
- Role (`client`, `driver`, `professional`, `service-provider`, or `admin`)
- Full name

Options:
- `--is-paid` - Mark user as paid
- `--is-approved` - Mark user as approved
- `--is-active` - Mark user as active (default: true)

Example:
```bash
flask cli add-user --email driver1@example.com --role driver --full-name "John Driver" --is-paid --is-approved
```

#### Delete User

Delete a user by email or ID:

```bash
# With Docker
docker-compose exec app flask cli delete-user --email user@example.com
# Or by ID
docker-compose exec app flask cli delete-user --id <user-uuid>

# Without Docker
flask cli delete-user --email user@example.com
flask cli delete-user --id <user-uuid>
```

Options:
- `--email` - User email address
- `--id` - User ID (UUID)
- `--force` - Force delete without confirmation

**Note:** Either `--email` or `--id` must be provided.

#### Change User Password

Change a user's password:

```bash
# With Docker
docker-compose exec app flask cli change-password --email user@example.com
docker-compose exec app flask cli change-password --email user@example.com --role driver
docker-compose exec app flask cli change-password --email info@ag8te.com
docker-compose exec app flask cli change-password --id <user-uuid>
winningqueen123

# Without Docker
flask cli change-password --email user@example.com
flask cli change-password --email user@example.com --role driver
flask cli change-password --id <user-uuid>
```

Options:
- `--email` - User email address
- `--role` - User role (required when multiple accounts exist for the same email)
- `--id` - User ID (UUID)

The command will prompt for the new password (with confirmation).

**Note:** Either `--email` (and optionally `--role`) or `--id` must be provided.

#### Create Multiple Users

Create multiple users of a specific role:

```bash
# With Docker
docker-compose exec app flask cli create-users

# Without Docker
flask cli create-users
```

The command will prompt you for:
- Role (`client`, `driver`, `professional`, or `service-provider`)
- Number of users to create
- Email prefix (default: `user`)
- Email domain (default: `example.com`)
- Password (default: `password123`)

Example:
```bash
flask cli create-users --role client --count 5 --email-prefix testuser --domain example.com --password password123

docker-compose exec app flask cli create-users --role commuter --count 5 --email-prefix commuteruser --domain example.com --password password123


```

This creates 5 client users:
- `testuser1@example.com`
- `testuser2@example.com`
- `testuser3@example.com`
- `testuser4@example.com`
- `testuser5@example.com`

All with password `testpass123`.

#### Seed Users (all roles)

Quickly seed demo users across all core roles (`commuter`, `driver`, `professional`, `service-provider`):

```bash
# With Docker
docker-compose exec app flask cli seed-users

# Without Docker
flask cli seed-users
```

By default this will create **5 users per role** (20 total) with emails like:

- `{prefix}client1@example.com`
- `{prefix}driver1@example.com`
- `{prefix}professional1@example.com`
- `{prefix}service-provider1@example.com`

Each user gets:
- A generated tracking number
- A wallet created via `WalletService`
- Profile `full_name` like `"Driver User 1"`

Options:
- `--count` - Number of users to create **per role** (default: `5`)
- `--email-prefix` - Email prefix (default: `user`, used as `{prefix}{role}{number}@domain`)
- `--domain` - Email domain (default: `example.com`)
- `--password` - Password for all seeded users (default: `password123`)
- `--paid` - Mark all seeded users as having paid the registration fee
- `--approved` - Mark all seeded users as approved

Examples:

```bash
# Seed 3 users per role, unpaid/unapproved
flask cli seed-users --count 3 --email-prefix demo --domain example.com

# Seed 10 paid & approved users per role for staging (Docker)
docker-compose exec app flask cli seed-users --count 10 --email-prefix stage --domain mydomain.test --password StrongP@ssw0rd --paid --approved

# Same command without Docker
flask cli seed-users --count 10 --email-prefix stage --domain mydomain.test --password StrongP@ssw0rd --paid --approved

# Minimal quick-start (Docker): 5 users per role, default password, unpaid/unapproved
docker-compose exec app flask cli seed-users

# Minimal quick-start (local): 5 users per role, default password, unpaid/unapproved
flask cli seed-users

# Seed only 2 test users per role with a short prefix (Docker)
docker-compose exec app flask cli seed-users --count 2 --email-prefix t --domain example.com

# Seed only clients (then filter in list-users)
docker-compose exec app flask cli seed-users --count 5 --email-prefix client --domain example.com
docker-compose exec app flask cli list-users --role client
```

#### List Users

List all registered users with their status fields:

```bash
# With Docker
docker-compose exec app flask cli list-users

# Without Docker
flask cli list-users
```

Options:
- `--role` - Filter by user role (`client`, `driver`, `professional`, `service-provider`, `admin`)
- `--paid` / `--unpaid` - Filter by payment status
- `--approved` / `--unapproved` - Filter by approval status
- `--active` / `--inactive` - Filter by active status
- `--verified` / `--unverified` - Filter by email verification status

Examples:
```bash
# List all clients
flask cli list-users --role client

# List only paid users
flask cli list-users --paid

# List unpaid and unapproved users
flask cli list-users --unpaid --unapproved

# List active and verified users
flask cli list-users --active --verified

# List drivers who are paid and approved
flask cli list-users --role driver --paid --approved
```

The command displays:
- User ID (UUID)
- Email
- Name and Phone (from profile data)
- Role
- Tracking Number
- Status flags (Admin, Paid/Unpaid, Approved/Pending, Active/Inactive, Email Verified/Unverified)
- ID Verification Status
- ID Rejection Reason (if applicable)
- Created Date

### Shop Management

#### Add Category

```bash
# With Docker
docker-compose exec app flask cli add-category

# Without Docker
flask cli add-category
```

Options:
- `--id` - Category ID (auto-generated from title if not provided)
- `--title` - Category title (required)

#### Delete Category

```bash
# With Docker
docker-compose exec app flask cli delete-category --id <category_id>

# Without Docker
flask cli delete-category --id <category_id>
```

Options:
- `--id` - Category ID to delete (required)
- `--force` - Force delete even if category has products

#### Add Product

```bash
# With Docker
docker-compose exec app flask cli add-product

# Without Docker
flask cli add-product
```

Options:
- `--id` - Product ID (auto-generated if not provided)
- `--name` - Product name (required)
- `--description` - Product description
- `--price` - Product price (required)
- `--category-id` - Category ID (optional)
- `--in-stock` / `--out-of-stock` - Stock status (default: in-stock)
- `--image-url` - Product image URL

Example:
```bash
flask cli add-product --name "Example Product" --price 99.99 --category-id electronics --description "A great product"
```

#### Delete Product

```bash
# With Docker
docker-compose exec app flask cli delete-product --id <product_id>

# Without Docker
flask cli delete-product --id <product_id>
```

#### List Categories

```bash
# With Docker
docker-compose exec app flask cli list-categories

# Without Docker
flask cli list-categories
```

#### List Products

```bash
# With Docker
docker-compose exec app flask cli list-products [--category-id <id>]

# Without Docker
flask cli list-products [--category-id <id>]
```

Example:
```bash
# List all products
flask cli list-products

# List products in a specific category
flask cli list-products --category-id electronics
```

#### List Orders

List all orders with optional filters:

```bash
# With Docker
docker-compose exec app flask cli list-orders

# Without Docker
flask cli list-orders
```

Options:
- `--status` - Filter by order status (`pending`, `paid`, `shipped`, `delivered`, `cancelled`)
- `--user-id` - Filter by user ID (UUID)
- `--email` - Filter by user email
- `--limit` - Limit number of results (default: 50)

Examples:
```bash
# List all orders
flask cli list-orders

# List pending orders
flask cli list-orders --status pending

# List orders for a specific user by email
flask cli list-orders --email user@example.com

# List orders for a specific user by ID
flask cli list-orders --user-id 123e4567-e89b-12d3-a456-426614174000

# List first 10 paid orders
flask cli list-orders --status paid --limit 10
```

The command displays:
- Order ID
- Customer name and email
- Customer ID
- Order status
- Total amount
- Items summary
- Delivery address (if available)
- Payment ID
- Placed and updated dates

#### Seed Products

Seed the shop with default products (25 products across 5 categories):

```bash
# With Docker
docker-compose exec app flask cli seed-products

# Without Docker
flask cli seed-products
```

Options:
- `--clear` - Clear all existing products before seeding

Examples:
```bash
# Seed products (will skip existing ones)
flask cli seed-products

# Clear all existing products and seed fresh data
flask cli seed-products --clear
```

This command:
- Creates 25 default products across 5 categories (Electronics, Clothing, Home & Kitchen, Sports & Outdoors, Books & Media)
- Auto-creates categories if they don't exist
- Skips products that already exist (by name)
- Assigns unique product IDs automatically

Example output:
```
Created category: electronics
Created category: clothing
...

Seeding complete!
  Created: 25 products
  Skipped: 0 existing products
  Categories: 5 categories
```

### Data Population Commands

#### Populate Countries

Populate the countries table with a comprehensive list of world countries (100+ countries with ISO codes):

```bash
# With Docker
docker-compose exec app flask cli populate-countries

# Without Docker
flask cli populate-countries
```

This command:
- Populates the `countries` table with 100+ countries
- Includes ISO country codes (e.g., 'ZA' for South Africa, 'US' for United States)
- Skips countries that already exist
- Sets all countries as active by default

Example output:
```
Countries populated: 100 created, 0 already existed
```

**Note:** This command is required for the nationality dropdown on the registration page to work properly.

#### Populate Categories

Populate shop categories and subcategories with default data:

```bash
# With Docker
docker-compose exec app flask cli populate-categories

# Without Docker
flask cli populate-categories
```

This command:
- Creates 5 main categories: Electronics, Clothing & Fashion, Home & Living, Sports & Outdoors, Books & Media
- Creates 20+ subcategories across all categories
- Skips categories/subcategories that already exist
- Maintains proper relationships between categories and subcategories

Categories created:
- **Electronics**: Phones & Accessories, Computers & Laptops, Audio & Headphones, Cameras & Photography, Gaming Consoles & Accessories
- **Clothing & Fashion**: Men's Clothing, Women's Clothing, Kids' Clothing, Shoes & Footwear, Fashion Accessories
- **Home & Living**: Furniture, Home Decor, Kitchen & Dining, Bedding & Bath, Storage & Organization
- **Sports & Outdoors**: Fitness & Exercise, Outdoor Recreation, Sports Equipment, Camping & Hiking
- **Books & Media**: Fiction, Non-Fiction, Academic & Textbooks, Movies & Music

Example output:
```
Categories: 5 created
Subcategories: 20 created
```

**Note:** This command is required for the shop category/subcategory filtering to work properly.

#### Populate Services

Populate default service types for service providers and professionals:

```bash
# With Docker
docker-compose exec app flask cli populate-services

# Without Docker
flask cli populate-services
```

This command:
- Creates 30+ service types across two categories:
  - **Service Provider** services (20 services): Home Cleaning, Garden Maintenance, Plumbing, Electrical Services, Painting, Carpentry, Event Management, DJ Services, Catering, Photography, Videography, Hair Styling, Beauty Services, Massage Therapy, Moving Services, Pet Care, Tutoring, IT Support, Appliance Repair, Locksmith
  - **Professional** services (10+ services): Legal Services, Accounting, Financial Planning, Business Consulting, Marketing, Web Development, Graphic Design, Architecture, Engineering, Medical Consultation, etc.
- Sets all services as active by default
- Assigns order values for proper sorting
- Skips services that already exist (by name)

Example output:
```
Services populated: 30 created, 0 already existed
```

**Note:** This command is required for the "Add Your Services" section on the registration page to work properly. Service providers and professionals can select from these predefined service types during registration.

#### Seed Agents

Populate the **agents** table (used for the optional "Agent" dropdown on registration). Creates 13 agents with IDs `AGT001`–`AGT013` from the default list:

```bash
# With Docker
docker-compose exec app flask cli seed-agents

# Without Docker
flask cli seed-agents
```

Options:
- `--clear` - Delete all existing agents, then seed the default list (useful for a clean re-seed)

Example:
```bash
flask cli seed-agents          # Add missing agents only (skips existing AGT001, etc.)
flask cli seed-agents --clear  # Replace all agents with the default 13
```

**Note:** Run `flask db upgrade` first so the `agents` table exists. The registration form shows agents by **agent_id** (e.g. AGT001); admins manage agents under the **Agents** tab in the admin portal.

## Environment Variables

See `.env.example` for all required environment variables.

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `SECRET_KEY` - Flask secret key
- `JWT_SECRET_KEY` - JWT signing key
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD` - Email configuration
- `YOCO_SECRET_KEY` - Yoco payment API key

## License

Proprietary - All rights reserved

--------------Deployed--------------
- Make  the shop and cart logic available for all roles.
- ID/Passport number is mandatory for all user roles on register
- Profile photo is mandatory for all user roles on register
- when user successfully registers they receive an email informing them of the succefful registration.
- Across the entire application, change "commuter" to "client". e.g. user role conditional comparisons, role displays, drop-downs
- Next of kin fields (Full name,Contact number, Contact Email) are mandatory for all user roles on register (include "*")
- "ID Document" upload field are mandatory for all user roles on register (change label to "ID Document *")
- "Proof of Residence" upload field is mandatory for all driver roles on register (change label to "Proof of Residence *")
- "Driver's License" upload field is mandatory for all driver roles on register (Driver's License)
- Use javascript to add asterisk to manadatory fields on role change
------------------------------------
Confirm that registration confirmation email logic is in place and  works.
------------------------------------
On the registration:
when user selects professional role, we need to replace the "Drivers License" option with a "CV/Resume" option
 "CV/Resume" option must be persisted on submission and be downloadable by the uploader on their profile
 "CV/Resume" option must be downloadable by admin users on the adminportal

On the checkbox "I have read and agree to Terms of Use *"
- when user clicks on the "Terms of Use" it must trigger a modal that displays the terms of use.
---------------------------------
Registration Page
Under "Professional Information"
"Highest Qualification" must be a required field. and have the "required" element property to omplement field validation
---------------------------------
Profile Page
All fields populated in registration must  be read-only fields
Except for "Professional Services" and "Add your service" fields. these are updatable.
---------------------------------
Profile Page
All the document and file upload input fields.
- If user has submitted/uploaded documents for input fields.Show submitted documents on profile page, allow viewing (in modal) but
---------------------------------
add model to track agents
- model: agent name, surname, id number, agent id
- the model relates by foreign key to the auth users.
- users at registration time can optionally select from t drop-down list of agents
- users can select the agent they were supported by 
- add the new drop-down field inside "Account Information" to track agents
- add a admin portal tab to add, update and manage agents
agent field dosplays agentID not agent's names

-------------------
Add a cli script that populates the agents model
Here is the list of agents:
1. Taole Lebenya
2. Itumeleng Monyake
3. Toivo Lebenya
4. Khwezi Macingwane 
5. Tshepo Rasiile
6. Phumlani Mfenyana 
7. Sebolelo Mpiko
8. Nakisane 
9. Uni Students
10. Mankoebe Letsie
11. Lintle Letsie
12. Ntshiuoa Macingwane
13. Andile Fusi
----------
- Impelement email notification format updates based on the copy text found at "/home/ec2-user/projects/ag8te/email_notifications.md"
----------
On admin portal, under agents. When creating agents, admin can leave out the agent id field. if left out then the field value will be a short autogenerated alphanumeric ID
----------
On registration page
the agent field should display agent name and in brackets display the agent ID 
----------
On registration page, Next of Kin Email Field
“Next of Kin Email” should not be mandatory. confirm this is case.
----------
Regarding Profile Visibility Before Approval
•	A user should only be able to view their profile.
•	They must not be able to upload documents or make updates until their account is approved.
----------
On registration page, under driver role:
Driver Services (Cars)
- Add new "vehicle images" model to track all images linked to a vehicle.
   - car id and image file
- User must be able to upload multiple images of the car they are selecting.
- Uploaded images of cars must be viewable by admin in the admin portal under users tab and actions field.
   - When clicking on "view car photos" action field button, a modal is triggered. the modal displays carousel of car photos.
----------
Driver Services (Cars)
Before approval, all fields in the Cars selection must be disabled
------------
Restrictions After Approval
- After approval, only allow unapproved changes to phone number and next of kin
- Next of kin email is not mandatory
- After approval, the only approved changes permitted are changes to:
   - For driver role:
      - Driver Services (Cars)
      - Proof of Residence
      - Driver's License
   - For service provider role:
      - Add Your Services
      - Proof of Residence
      - Driver's License
   - For professional role:
      - Professional Services
      - Proof of Residence
      - Highest Qualification *
      - Professional Body
      - Qualification Documents *

- When user makes changes to the above, the changes first need to be approved by an admin
- This means that changes should be persisted on another table (shadow model), presented to as the changes to be applied. When admin approves,  the changes from the shadow model are applied tot eh original model, and the shadow model instance is deleted once the change is saved.


- Troubleshoot email notifications are not sending
