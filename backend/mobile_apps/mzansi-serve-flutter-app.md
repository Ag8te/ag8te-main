# Flutter Mobile App – MzansiServe

Technical specification and project quote for a Flutter app that mirrors the existing MzansiServe web application and consumes the current backend API.

---

## 1. Executive Summary

The MzansiServe backend is a Flask API serving a service ads (cabs, professionals, service providers). This document specifies a **native Flutter mobile app** (iOS and Android) that reuses all existing API endpoints, authentication, and business logic. No backend changes are required beyond ensuring CORS/configuration allow mobile clients where applicable.

**Delivery:** 3 weeks from kick-off.  
**Quote:** See Section 7.

---

## 2. Current System Overview (Reference)

### 2.1 User Roles

| Role | Description |
|------|-------------|
| **client** | Requests services (cab, professional, service-provider). Pays, views orders and requests. |
| **driver** | Provides cab rides. Accepts cab requests, earns per ride (subject to admin fee). |
| **professional** | Offers professional services (e.g. Lawyer, Doctor). Accepts professional requests. |
| **service-provider** | Offers listed service types. Accepts provider requests. |
| **admin** | Portal-only (user approval, ID verification, stats, legal content, FAQs). |

*Note: Mobile app scope typically excludes admin; admin remains web-only unless stated otherwise.*

### 2.2 Core Backend Capabilities (Already Implemented)

- **Auth:** JWT; register (with registration fee + Yoco), login (email + password + role), logout, forgot/reset password, verify email, `GET /api/auth/me`, `GET /api/auth/roles-for-email`, countries, service-types (by category).
- **Profile:** Get/update profile (multipart for profile image and documents); ID document, proof of residence, driver’s license, CV/resume (professional); next of kin; addresses.
- **Service requests:** Create (cab / professional / provider), list, get by id, accept, cancel; cab quote (distance + price); status lifecycle.
- **Account Management:** Role-based account management area (wallet balance, recent orders, recent requests, driver/professional/provider earnings and available jobs).
- **Payments:** Yoco checkout (registration and shop), wallet balance, payment status; webhooks remain server-side.
- **Shop:** Products, categories, cart/orders (as per existing API).
- **Location:** Calculate distance (POST); countries and service-types for registration/requests.
- **Addresses:** CRUD delivery addresses.
- **FAQ:** List FAQs.
- **Admin:** (Web-only in this scope) Users, approve, verify ID, stats, legal, etc.

### 2.3 API Base and Auth

- **Base URL:** Configurable (e.g. `https://your-domain.com` or `http://localhost:5000`).
- **Auth:** Bearer JWT in `Authorization` header. Token from login or register-with-payment completion.
- **Response shape:** Consistent `{ success, data, error }` with HTTP status codes.

---

## 3. Flutter App – Technical Specification

### 3.1 Target Platforms and Tooling

- **Platforms:** Android (min SDK 21), iOS (min 12.0).
- **Framework:** Flutter 3.x (stable).
- **State management:** Provider and/or Riverpod (recommended).
- **HTTP:** `dio` or `http` with interceptors for base URL, JWT, and error handling.
- **Local storage:** `shared_preferences` and/or `flutter_secure_storage` for token and minimal user prefs.
- **Maps (where needed):** `google_maps_flutter` for pickup/dropoff (cab) and any address selection; API key from backend config or env.

### 3.2 App Architecture

- **Feature-first or layer-based structure**, e.g.:
  - `lib/core/` – theme, constants, API client, auth store, routing.
  - `lib/features/auth/` – login, register, forgot password, role selection.
  - `lib/features/profile/` – view/edit profile, documents, addresses.
  - `lib/features/requests/` – create request (cab/professional/provider), list, detail, accept/cancel, quote (cab).
  - `lib/features/dashboard/` – wallet, recent orders/requests, role-specific account management tiles.
  - `lib/features/shop/` – products, categories, cart, checkout (if in scope).
  - `lib/features/payments/` – registration fee flow (redirect to Yoco / in-app webview or browser), wallet display.
- **API client:** Single module that:
  - Reads base URL from env/config.
  - Adds `Authorization: Bearer <token>` when token exists.
  - Maps 401 to “session expired” and triggers re-login or token refresh if implemented.
  - Parses standard `{ success, data, error }` and surfaces to UI.

### 3.3 Authentication and Onboarding

- **Login:** Email + password + role. Use `GET /api/auth/roles-for-email` to show role selector when multiple roles exist for one email.
- **Registration:** Multi-step flow aligned with web:
  - Account (email, password, role).
  - Basic info (full name, surname, phone, gender, nationality, ID number, profile photo, next of kin).
  - Role-specific: professional (qualifications, professions from service-types, CV, qualification docs); service-provider (proof of residence, selected services); driver (proof of residence, driver’s license, cars).
  - Verification documents (ID document mandatory for all; role-specific docs as per backend).
  - Terms of use (modal or screen); checkbox required.
  - Registration fee: call backend to create checkout; open URL in browser or in-app WebView; handle return (e.g. deep link or callback URL) and call complete-registration if applicable.
- **Forgot / reset password:** Request reset, then reset with token (screens + API).
- **Persistence:** Store JWT securely; on launch, if token present optionally call `GET /api/auth/me` and redirect to home or login.

### 3.4 Service Requests

- **Create request:**
  - **Cab:** Pickup/dropoff (map or address), preferences (e.g. car type). Optional: use quote endpoint for price preview; then create request.
  - **Professional:** Select profession (from service-types), description, scheduling if supported by API.
  - **Provider:** Select service type(s), description, scheduling if supported.
- **List and detail:** My requests (as client); for drivers/professionals/providers, “available” and “my jobs” as per account management/requests API.
- **Actions:** Accept, cancel (per API rules and role).

### 3.5 Account Management and Wallet

- **Account Management:** Single screen with role-based content from `GET /api/dashboard`: wallet balance, recent orders, recent requests; for driver/professional/provider add earnings summary and available jobs with deep links to request detail/accept.
- **Wallet:** Display balance; any top-up or payment flows as per existing API (e.g. Yoco redirect).

### 3.6 Profile and Settings

- **Profile:** Load from `GET /api/profile` (or equivalent); edit with `PATCH` and multipart for profile photo and documents (ID, proof of residence, driver license, CV for professionals).
- **Addresses:** List and CRUD delivery addresses via addresses API.
- **Logout:** Clear token and navigate to login.

### 3.7 Shop (If In Scope)

- **Catalog:** Categories and products from shop API.
- **Cart and checkout:** As per existing API (e.g. create order, payment redirect).

### 3.8 Location and Maps

- **Maps:** Use Google Maps (or fallback) for cab pickup/dropoff and any address picker; pass coordinates to backend.
- **Distance:** Use backend `POST /api/location/calculate-distance` when needed, or rely on backend logic if request creation already accepts coordinates.

### 3.9 Offline and UX

- **Offline:** Optional: cache account management and “my requests” for read-only offline viewing; write actions require network.
- **Loading and errors:** Consistent loading indicators and error messages; retry where appropriate.
- **Deep linking:** Optional: support `mzansiserve://` for post-payment return and password reset.

### 3.10 Security and Compliance

- **TLS:** All API calls over HTTPS in production.
- **Storage:** JWT in secure storage; no sensitive data in plain SharedPreferences where avoidable.
- **Compliance:** Align with existing web app (e.g. terms of use, privacy policy; links or in-app views).

---

## 4. Out of Scope (Unless Agreed)

- **Admin portal:** User management, ID verification, stats, legal/FAQ management remain on web.
- **Backend changes:** No new API endpoints required; optional small tweaks (e.g. CORS or config) for mobile only.
- **Real-time:** No WebSocket or push notifications specified here; can be added as a separate phase.
- **Tablet-specific layouts:** Single responsive layout acceptable for 3-week delivery.

---

## 5. Deliverables (3-Week Plan)

| Week | Focus | Deliverables |
|------|--------|--------------|
| **1** | Setup, auth, profile, API client | Flutter project; login/register/forgot-password; role selection; profile view/edit and documents; token storage and account management shell. |
| **2** | Requests, account management, payments | Create/list/detail for cab and professional/provider requests; accept/cancel; account management with wallet and role-specific content; registration fee flow (redirect/return). |
| **3** | Shop (if in scope), polish, QA | Shop browse and checkout (or skip and use time for QA); error handling and loading states; testing on Android and iOS; handover and short doc. |

---

## 6. Assumptions and Dependencies

- Backend API is stable and documented (or OpenAPI/Swagger available); no breaking changes during the 3 weeks.
- **Base URL** for API is provided (staging/production).
- **Google Maps API key** (and any mobile-specific restrictions) available for cab/address flows.
- **Yoco (or current payment provider)** checkout works via redirect/return URL; deep link or scheme for “return to app” is configured.
- One point of contact for product/backend questions; access to staging (or production) for testing.
- Design: use existing web UI as reference; no separate full design phase within 3 weeks (optional small style guide or Figma if already available).

---

## 7. Project Quote – 3-Week Delivery

### 7.1 Scope Summary

- **In scope:** Flutter app (Android + iOS) with auth, registration (with fee), profile, service requests (cab + professional + provider), account management, wallet, addresses, and (optionally) shop. Uses existing MzansiServe API only.
- **Out of scope:** Admin app, backend feature work, push notifications, formal UX design phase.

### 7.2 Quote (Indicative)

| Item | Description | Amount (ZAR) |
|------|-------------|--------------|
| **Development** | Flutter app as per this spec, 3 weeks delivery | 85,000 – 120,000 |
| **Optional: Shop module** | Full shop browse + cart + checkout in app | +15,000 – 25,000 |
| **Optional: Push notifications** | Setup FCM/APNs and one “request assigned” style flow | +10,000 – 18,000 |

**Total (base, 3 weeks):** **R 85,000 – R 120,000** (ex. VAT).  

### 7.3 Payment Milestones (Example)

- **40%** on kick-off (signed scope and access to API/staging).
- **40%** at end of week 2 (auth, profile, requests, account management, registration fee working).
- **20%** on delivery (source code, build instructions, short user/install doc, and acceptance).

### 7.4 What You Get

- Flutter project (source code and repository access as agreed).
- Android APK (and optionally App Bundle) and iOS build/archive (or TestFlight link).
- Short setup/run and environment doc (base URL, keys, build commands).
- 3-week window from kick-off to delivery; one round of defect fixes within 1 week after delivery (within agreed scope).

---

## 8. Document Control

- **Version:** 1.0  
- **Based on:** MzansiServe backend and web app as of current form (roles: client, driver, professional, service-provider, admin; APIs: auth, profile, requests, dashboard, payments, shop, location, addresses, FAQ).  
- **Assumption:** Backend API remains stable; Flutter app consumes it without new endpoints.  
- **Quote validity:** 30 days from date of proposal.
