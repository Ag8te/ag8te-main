# MzansiServe Evidence Pack

This folder collects non-confidential evidence that can support investor, partner, grant, store-review, or internal progress materials.

Collection rules:

- Capture only public pages, sanitized test data, or deliberately approved demo accounts.
- Do not include customer personal data, payment card data, secrets, access tokens, private addresses, or real support conversations.
- Record source URL, capture date, and confidentiality status for each item.
- Prefer PNG screenshots for UI evidence and Markdown/Mermaid for architecture sketches.

## Requested Evidence Tracker

| Evidence item | Status | Location | Notes |
| --- | --- | --- | --- |
| Website screenshots | Started | `screenshots/` | Public live-site captures. Home content-section capture is stronger than the hero capture. |
| MzansiServe app screenshots | Started | `screenshots/2026-07-13-google-play-listing.jpg` | Store listing captured; native in-app screens still need emulator/device screenshots. |
| Google Play Store listing | Captured | `screenshots/2026-07-13-google-play-listing.jpg` | Public listing for package `co.za.mzansiserve.app`. |
| Login page | Captured | `screenshots/2026-07-13-live-login.jpg` | Public live-site capture. |
| Booking page | Partial | `screenshots/2026-07-13-live-transport-booking.jpg` | Route redirects to login when unauthenticated. Needs demo account for actual booking form. |
| Payment page | Partial | `screenshots/2026-07-13-live-checkout-protected.jpg` | Checkout route captured without real payment/session data. Needs sandbox payment flow for stronger evidence. |
| Admin dashboard | Pending | `screenshots/` | Needs demo admin account or sanitized screenshot; admin login page captured. |
| GitHub contribution graph | Captured | `screenshots/2026-07-13-github-profile-contributions.jpg` | Public GitHub profile for `ntshabelengt`. |
| Architecture sketches | Started | `architecture/` | Initial high-level sketch added. |

## Manifest

| File | Evidence type | Source | Captured | Confidentiality | Claim supported |
| --- | --- | --- | --- | --- | --- |
| `architecture/mzansiserve-system-overview.md` | Architecture sketch | Repository structure and deployment config | 2026-07-13 | Non-confidential | Shows major app components and production deployment shape. |
| `screenshots/2026-07-13-live-home.jpg` | Website screenshot | `https://mzansiserve.co.za/` | 2026-07-13 | Non-confidential | Shows public MzansiServe web presence. |
| `screenshots/2026-07-13-live-home-services.jpg` | Website screenshot | `https://mzansiserve.co.za/` | 2026-07-13 | Non-confidential | Shows homepage service categories and booking/shop entry points. |
| `screenshots/2026-07-13-live-shop.jpg` | Website screenshot | `https://mzansiserve.co.za/shop` | 2026-07-13 | Non-confidential | Shows public e-shop/product marketplace page. |
| `screenshots/2026-07-13-live-login.jpg` | Login screenshot | `https://mzansiserve.co.za/login` | 2026-07-13 | Non-confidential | Shows user authentication entry point. |
| `screenshots/2026-07-13-live-transport-booking.jpg` | Booking screenshot | `https://mzansiserve.co.za/transport` | 2026-07-13 | Non-confidential | Shows unauthenticated booking access flow redirecting to login; not the full booking form. |
| `screenshots/2026-07-13-live-checkout-protected.jpg` | Payment/checkout screenshot | `https://mzansiserve.co.za/checkout` | 2026-07-13 | Non-confidential | Shows checkout route exists; not proof of completed payment. |
| `screenshots/2026-07-13-live-admin-login.jpg` | Admin screenshot | `https://mzansiserve.co.za/admin/login` | 2026-07-13 | Non-confidential | Shows admin access entry point; dashboard still needs sanitized authenticated capture. |
| `screenshots/2026-07-13-google-play-listing.jpg` | Store listing screenshot | `https://play.google.com/store/apps/details?hl=en_US&id=co.za.mzansiserve.app` | 2026-07-13 | Non-confidential | Shows public Google Play listing. |
| `screenshots/2026-07-13-github-profile-contributions.jpg` | GitHub screenshot | `https://github.com/ntshabelengt?tab=overview` | 2026-07-13 | Non-confidential | Shows public GitHub profile and contribution area. |
