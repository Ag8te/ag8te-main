# AG8TE System Documentation

This document provides a technical overview of the AG8TE ecosystem, comprising the Backend, Web Frontend, and Mobile Application systems.

## 1. System Overview

AG8TE is a multi-platform service marketplace and business management system. It leverages a modern, distributed architecture to provide high availability and scalability.

---

## 2. Backend System

The backend serves as the core engine of AG8TE, providing RESTful APIs, business logic, data persistence, and integration with third-party services.

### Core Technologies
- **Language:** Python 3.x
- **Framework:** Flask (High-performance web framework)
- **Database:** PostgreSQL (Relational database management)
- **ORM:** SQLAlchemy (Object-Relational Mapping for Python)
- **Migrations:** Flask-Migrate (Alembic-based database versioning)
- **Production Server:** Gunicorn (WSGI HTTP Server)
- **API Architecture:** RESTful API with JSON communication

### Key Features & Libraries
- **Authentication:** JWT (JSON Web Tokens) via `Flask-JWT-Extended` and session-based auth via `Flask-Login`.
- **Security:** Password hashing with `Bcrypt`.
- **Data Validation:** `marshmallow` for serialization and schema validation.
- **Background Tasks:** Direct integration for email notifications via `Flask-Mail`.
- **Integrations:**
    - **Payment Gateways:** Yoco and PayPal.
    - **Google Services:** Google Auth and Maps API.
    - **Cloud Storage:** Local and cloud-based file uploads (Pillow for image processing).

---

## 3. Frontend (Web) System

The frontend is a modern, responsive web application designed for users, service providers, and administrators.

### Core Technologies
- **Library:** React 18+
- **Build Tool:** Vite (Ultra-fast frontend build tool)
- **Language:** TypeScript (Type-safe JavaScript)
- **State Management:** TanStack Query (React Query) for server state and caching.
- **Styling:** Tailwind CSS (Utility-first CSS framework).

### UI/UX Components
- **Component Library:** shadcn/ui (Built on Radix UI primitives).
- **Icons:** Lucide React.
- **Animations:** Framer Motion for smooth transitions.
- **Charts:** Recharts for data visualization in dashboards.
- **Forms:** React Hook Form with Zod validation.

---

## 4. Mobile Application

The mobile system provides a native experience for users on both iOS and Android platforms, built for performance and accessibility.

### Core Technologies
- **Framework:** React Native
- **Platform:** Expo (Managed workflow)
- **Language:** TypeScript
- **Navigation:** Expo Router (File-based routing for React Native).

### Key Features
- **State Management:** TanStack Query (Shared pattern with web).
- **Storage:** Expo Secure Store for sensitive data (tokens) and Async Storage.
- **Native APIs:**
    - Image Picker and Camera integration.
    - Location services for service mapping.
    - File sharing and document picking.
- **UI Components:** Customized React Native components with Lucide React Native icons.

---

## 5. Hosting & Infrastructure

The AG8TE ecosystem is hosted on **Google Cloud Platform (GCP)**, ensuring robust performance and global availability.

### Hosting Details
- **Platform:** Google Cloud Platform (GCP).
- **Compute:** **Google Compute Engine** (Virtual Machines).
- **Deployment Location:** `us-central1-c` zone.
- **Orchestration:** **Docker & Docker Compose** (Containerized services for consistency across environments).
- **Web Server:** **Nginx** (Serving as a high-performance reverse proxy and SSL terminator).
- **Domain:** `ag8te.com` (with automated Let's Encrypt SSL management).

### Deployment Workflow
The system utilizes an automated deployment pipeline via a custom `deploy.sh` script that:
1. Syncs the latest code from GitHub.
2. Manages environment-specific configurations (.env).
3. Builds and orchestrates Docker containers.
4. Handles database migrations and health checks.
