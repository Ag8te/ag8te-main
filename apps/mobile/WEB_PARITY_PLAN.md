# AG8TE Mobile Web-Parity Plan

This plan aligns the existing Expo mobile app in `apps/mobile` with the current web feature set.

Admin is excluded from mobile by design and remains web-only.

## Current Situation
- The repository already contains a mobile app at `apps/mobile`.
- The web app remains the reference implementation for feature scope.
- Several core mobile flows already exist, but parity is incomplete.
- The older Flutter proposal in `backend/mobile_apps/ag8te-flutter-app.md` is useful as historical scope context, but the active mobile implementation in this repo is Expo React Native.

## Scope Included on Mobile
- `client`
- `driver`
- `professional`
- `service-provider`
- `agent`
- `advertiser`

## Scope Explicitly Excluded from Mobile
- `admin`
- all admin dashboards and admin-only tools
- user approvals and ID verification operations
- platform settings, finance admin, CMS/legal management, API log inspection

## Web Feature Surface to Match

### Public and auth routes
- `/`
- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- `/verify-email`
- `/payment-status`
- `/payment-error`
- `/terms`
- `/privacy`
- `/cookies`

### Client routes
- `/services`
- `/transport`
- `/professionals`
- `/provider/:category/:id`
- `/book/:category/:id`
- `/my-bookings`
- `/shop`
- `/shop/product/:id`
- `/checkout`
- `/shopping-history`
- `/profile`
- `/ads`
- `/ads/ad/:id`
- `/ads/post`

### Role dashboards
- `/dashboard/driver`
- `/dashboard/professional`
- `/dashboard/provider`
- `/dashboard/agent`
- `/dashboard/advertiser`

## Parity Workstreams

### 1. Auth and onboarding parity
- Match the current web registration rules.
- Keep `client` free at signup.
- Require Yoco registration payment for non-client signup roles.
- Support unpaid-user login redirect back into registration payment.
- Support forgot-password and reset-password deep-link entry.

### 2. Client service-request parity
- Cab booking flow
- Professional booking flow
- Service-provider booking flow
- Booking history and status tracking
- Ratings and review actions

### 3. Commerce parity
- Shop catalog
- Product detail
- Cart
- Checkout
- Shopping history
- Payment return handling

### 4. Account management parity
- Profile update
- Documents
- Addresses
- Wallet
- Payment status

### 5. Driver parity
- Driver dashboard metrics
- Available ride inbox
- Active ride actions
- Wallet and earnings
- Vehicle management
- Live location sharing for nearby ride suggestions

### 6. Professional and service-provider parity
- Dashboard overview
- Available jobs
- Active job handling
- Profile/service management
- Wallet and earnings

### 7. Agent and advertiser parity
- Agent metrics and referrals surface
- Advertiser dashboard
- Ads creation and management

## Recommended Implementation Order

### Phase 1: critical auth and payment
- login
- register
- forgot password
- reset password
- registration payment
- payment return screens

### Phase 2: client bookings
- transport
- service booking
- booking detail
- ratings

### Phase 3: shop and profile
- shop
- cart
- checkout
- shopping history
- profile
- addresses

### Phase 4: provider-side parity
- driver dashboard and live location
- professional dashboard
- service-provider dashboard
- wallets and earnings

### Phase 5: ads and long-tail roles
- ads browse and detail
- post ad
- agent dashboard
- advertiser dashboard

## Technical Expectations
- Use existing backend APIs as the source of truth.
- Do not recreate business rules locally when the backend already enforces them.
- Keep mobile routing and terminology aligned with web to reduce support confusion.
- Deep links must support:
  - password reset
  - registration payment return
  - checkout/payment return

## Definition of Done
- A user can complete on mobile every non-admin action they can complete on web.
- Role behavior and restrictions match web.
- Payment and registration flows behave the same as web.
- Error messages are specific enough for users to recover without guessing.
- Mobile no longer depends on the web app for ordinary user tasks.
