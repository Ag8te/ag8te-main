# AG8TE Mobile Web-Parity Checklist

This checklist is the working source of truth for bringing the existing Expo mobile app in `apps/mobile` to parity with the web application.

Admin is intentionally excluded from the mobile app and remains web-only.

## Parity Rules
- [ ] Mobile supports every client, driver, professional, service-provider, agent, and advertiser feature available on web.
- [ ] Backend business rules remain shared with web; mobile should consume the same APIs instead of duplicating logic.
- [ ] Payment flows, registration rules, approval rules, and role restrictions match web behavior.
- [ ] Admin functions stay web-only and are not exposed in the mobile navigation or API client UX.

## 1. Environment and Core App Setup
- [ ] `apps/mobile/api/client.ts` points at the correct environment-specific API base URL.
- [ ] Deep linking is configured for password reset, registration payment return, and checkout return.
- [ ] Auth token persistence works across app restarts.
- [ ] Protected routes redirect cleanly to login when the token is missing or expired.
- [ ] Error handling surfaces backend error messages instead of generic fallbacks.

## 2. Authentication and Onboarding
- [ ] Login matches web behavior for all supported roles.
- [ ] Multi-role email detection matches `/api/auth/roles-for-email`.
- [ ] Registration matches current web flow:
  - [ ] `client` registers without registration payment.
  - [ ] `driver`, `professional`, and `service-provider` complete Yoco registration payment.
  - [ ] No email-verification dependency in signup completion.
  - [ ] Unpaid non-client users are redirected back to payment instead of logging in.
- [ ] Forgot-password flow works end-to-end with app deep links and reset screen.
- [ ] Existing unpaid registration can resume payment instead of showing duplicate-account failure.

## 3. Public Discovery and Browse
- [ ] Home tab mirrors key web landing CTAs and entry points.
- [ ] Services browsing matches web category structure.
- [ ] Transport browsing/request entry matches web.
- [ ] Professionals browsing matches web.
- [ ] Provider detail pages match web feature set.
- [ ] Ads browsing and ad detail pages match web.
- [ ] Shop catalog, product detail, and category browsing match web.

## 4. Client Features
- [ ] Cab booking flow matches web:
  - [ ] pickup and dropoff selection
  - [ ] fare preview
  - [ ] ride type selection
  - [ ] nearby driver suggestions
  - [ ] ride scheduling
  - [ ] checkout and payment return
- [ ] Professional booking flow matches web.
- [ ] Service-provider booking flow matches web.
- [ ] My bookings matches web for:
  - [ ] list view
  - [ ] status updates
  - [ ] booking detail
  - [ ] cancellation rules
  - [ ] rating flows
- [ ] Cart, checkout, and shopping history match web.
- [ ] Wishlist behavior matches mobile/app scope expectations if kept.
- [ ] Profile editing, documents, and addresses match web behavior.

## 5. Driver Features
- [ ] Driver dashboard matches web summary cards and available jobs.
- [ ] Driver current location sharing works so cab suggestions can use registered drivers.
- [ ] Driver can view and accept available cab requests.
- [ ] Driver can manage active rides and ride state transitions.
- [ ] Driver can view earnings and wallet information.
- [ ] Driver can manage vehicles/profile fields needed by web.
- [ ] Driver reviews and ratings match web visibility and workflow.

## 6. Professional Features
- [ ] Professional dashboard matches web overview and available jobs.
- [ ] Professional can accept and manage assigned work.
- [ ] Professional can view earnings and wallet information.
- [ ] Professional profile/services editing matches web.
- [ ] Professional reviews and ratings match web.

## 7. Service-Provider Features
- [ ] Service-provider dashboard matches web overview and available jobs.
- [ ] Service-provider can accept and manage assigned work.
- [ ] Service-provider can view earnings and wallet information.
- [ ] Service-provider profile/services editing matches web.
- [ ] Service-provider reviews and ratings match web.

## 8. Agent and Advertiser Features
- [ ] Agent dashboard and metrics available on web are represented on mobile.
- [ ] Advertiser dashboard and ad-management flows available on web are represented on mobile.
- [ ] Posting ads from mobile matches the web flow where supported.

## 9. Payments and Wallet
- [ ] Registration payment flow matches web return/callback behavior.
- [ ] Shop checkout flow matches web return/callback behavior.
- [ ] Wallet balances, transactions, and withdrawal flows match web.
- [ ] Payment failure, cancel, and success screens match web states and wording.

## 10. Content, Legal, and Static Pages
- [ ] Terms, privacy, cookies, and other legal content are accessible in mobile.
- [ ] FAQ/content pages exposed on web are available where relevant in mobile.

## 11. Explicitly Web-Only
- [x] Admin login remains web-only.
- [x] Admin dashboard remains web-only.
- [x] User approval, ID verification, CMS, finance admin, and platform settings remain web-only.

## Suggested Delivery Order
- [ ] Phase 1: auth, onboarding, password reset, registration payment, deep linking
- [ ] Phase 2: public discovery, provider detail, client booking flows
- [ ] Phase 3: client bookings, cart, checkout, shopping history, profile
- [ ] Phase 4: driver parity including live location, rides, wallet, vehicles
- [ ] Phase 5: professional and service-provider parity
- [ ] Phase 6: agent, advertiser, ads posting, polish, QA

## Verification Log
| Date | Area | Status | Notes |
| :--- | :--- | :--- | :--- |
| 2026-04-22 | Checklist reset | [x] | Rewritten as full web-parity checklist for the existing Expo app |
| | | [ ] | |
