# MzansiServe Android App Functionality Verification Checklist

This document serves as the master checklist to ensure that the Expo/Android application matches the "entire functionality" of the web frontend and that all Flows and CTAs are production-ready.

## 1. Environment & Configuration
- [ ] **Production Environment:** Verify `.env` uses `EXPO_PUBLIC_` prefixes for all variables from `.env.production`.
- [ ] **API Connectivity:** Confirm `api/client.ts` correctly points to `https://mzansiserve.co.za/api`.
- [ ] **Android Package:** Confirm `app.json` has `package: "com.mzansiserve.mobile"`.
- [ ] **Android Scheme:** Confirm `scheme: "mzansiserve-mobile"` is set for deep linking.

## 2. Authentication Flow (Critical)
- [ ] **Login:** CTA works, handles errors (invalid creds), and redirects to Home on success.
- [ ] **Persistence:** Token is saved in `SecureStore`. App stays logged in after restart.
- [ ] **Logout:** CTA in Profile clears `SecureStore` and redirects to Login/Home.
- [ ] **Registration:** Multi-step or single-form registration matches web logic.
- [ ] **Role Detection:** App correctly identifies if user is a `client`, `driver`, `professional`, or `provider`.

## 3. Service Discovery Flow
- [ ] **Service Listing:** Fetches both Professionals and Service Providers.
- [ ] **Categorization:** "Transport", "Professionals", and "Services" filters work.
- [ ] **Search:** Search bar filters the list in real-time or via API call.
- [ ] **Provider Details:** Clicking a provider opens a detail view with their services, bio, and "Book Now" CTA.
- [ ] **Booking CTA:** "Book Now" triggers the booking flow (or "Login to Book" if guest).

## 4. E-commerce & Shopping Flow
- [ ] **Shop Catalog:** Product grid displays image, name, and price correctly.
- [ ] **Cart Management:** "Add to Cart" CTA updates the `CartContext` and reflects in `AsyncStorage`.
- [ ] **Quantity Controls:** Increasing/decreasing quantities in the cart works.
- [ ] **Checkout Flow:** 
    - [ ] Shipping information entry.
    - [ ] Payment Gateway Integration (Yoco/Webview).
    - [ ] Order Success/Failure redirection.

## 5. ads Flow
- [ ] **Browse Ads:** View all ads ads.
- [ ] **Ad Details:** View specific ad details with contact info.
- [ ] **Post Ad:** Auth-protected CTA to upload images and description for a new ad.

## 6. Role-Specific Account Management
- [ ] **Driver Account Management:** View assigned trips/transport requests.
- [ ] **Professional/Provider Account Management:** View bookings and manage availability.
- [ ] **Agent/Advertiser:** View specialized metrics as per web frontend.

## 7. UI/UX & Native Polish
- [ ] **Navigation Tabs:** Home, Services, Shop, and Profile icons/labels are correct.
- [ ] **Safe Area:** Content does not overlap with the Android status bar or navigation pill.
- [ ] **Loading States:** `ActivityIndicator` shows during all API fetches.
- [ ] **Empty States:** "No results found" or "Cart is empty" messages are clear.
- [ ] **Images:** All remote images load correctly from the production backend.

## 8. Calls to Action (CTA) Audit
- [ ] **Home Page CTAs:** "Request Service", "Browse Shop" buttons redirect correctly.
- [ ] **Footer/Tab CTAs:** Instant switching between main app sections.
- [ ] **Contextual CTAs:** "Login to continue" prompts when accessing protected routes.

---

### Verification Log
| Date | Feature | Status | Notes |
| :--- | :--- | :--- | :--- |
| 2026-03-08 | Initial Scaffold | [x] | Basic structure and navigation ready |
| | | [ ] | |
