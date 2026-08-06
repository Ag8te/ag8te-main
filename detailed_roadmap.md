# AG8TE Detailed Project Schedule (4-Week Sprint)

## 📋 Document Overview
This document represents a **4-week aggressive delivery roadmap** starting **Wednesday, February 18, 2026** (Tomorrow).

**Schedule Constraints:**
- **Lead Dev (You):** Max 4 hours/day, 6 days/week (Mon-Sat). Sunday OFF.
- **Junior Dev:** Full-time (8 hours/day), 5 days/week (Mon-Fri). Sat/Sun OFF.

**Capacity:**
- **Lead Dev:** ~96 Hours (Architecture & Critical Path).
- **Junior Dev:** ~160 Hours (Execution & Polish).

---

## 📅 Week 1: Foundation & Core Logic (Feb 18 - Feb 21)
**Focus:** Infrastructure Setup, Junior Onboarding, and Pricing Engine.

| Status | Date | Task | Lead Dev Activities (4h Max) | Junior Dev Activities (8h) | Est. Hours |
| :---: | :--- | :--- | :--- | :--- | :--- |
| [ ] | **Wed Feb 18** | **DevOps & Onboarding** | • Setup Repo & CI/CD Pipelines (2h).<br>• **Session:** Walk Junior thru Architecture & Tasks (2h). | • Environment Setup (Docker, Python).<br>• Read Spec.<br>• Run Local Server & Fix warnings. | **Lead:** 4h<br>**Jun:** 8h |
| [ ] | **Thu Feb 19** | **Pricing Service Init** | • Architect `PricingService` Class.<br>• Code Review Junior's Unit Tests. | • **Coding:** Implement `calculate_distance` utility.<br>• Write Unit Tests for Pricing Scenarios. | **Lead:** 4h<br>**Jun:** 8h |
| [ ] | **Fri Feb 20** | **Tiered Logic** | • Implement Time/Distance Rules.<br>• Pair Programming: Debugging edge cases. | • Create Verification Script (`verify_pricing.py`).<br>• Populate Test Database with 50 diverse trips. | **Lead:** 4h<br>**Jun:** 8h |
| [ ] | **Sat Feb 21** | **Admin Config API** | • Build Backend API for `AppSettings`.<br>• Secure API with Role-Based Access. | *(Junior Off)* | **Lead:** 4h<br>**Jun:** 0h |

---

## 📅 Week 2: Invoicing & Notifications (Feb 23 - Feb 28)
**Focus:** PDF Generation, Email Service, and Mobile UI Polish.

| Status | Date | Task | Lead Dev Activities (4h Max) | Junior Dev Activities (8h) | Est. Hours |
| :---: | :--- | :--- | :--- | :--- | :--- |
| [ ] | **Mon Feb 23** | **Integrated Pricing** | • Integrate `PricingService` into `requests.py`.<br>• Final Code Review of Week 1 logic. | • **Frontend:** Build "Pricing Settings" Admin Page.<br>• Connect Form to Lead's API. | **Lead:** 4h<br>**Jun:** 8h |
| [ ] | **Tue Feb 24** | **PDF Service** | • Setup `WeasyPrint` & Docker Dependencies.<br>• Create `PdfService` base class. | • **Design:** HTML/CSS Templates for Invoice & Receipt.<br>• Ensure print styling is correct (A4 page breaks). | **Lead:** 4h<br>**Jun:** 8h |
| [ ] | **Wed Feb 25** | **Invoice Generation** | • Implement `generate_invoice_pdf` method.<br>• Create Download Endpoint. | • **UI:** Add "Download PDF" button to Order History.<br>• Manual Test: Generate PDF for 20 past orders. | **Lead:** 4h<br>**Jun:** 8h |
| [ ] | **Thu Feb 26** | **Email Infrastructure** | • Configure SMTP & Triggers.<br>• Handle Async/Queue logic. | • **Content:** Create 4 HTML Email Templates.<br>• Test Email Rendering on Mobile Clients. | **Lead:** 4h<br>**Jun:** 8h |
| [ ] | **Fri Feb 27** | **Mobile UX Review** | • Code Review Junior's CSS fixes.<br>• Audit "Critical Path" on Mobile. | • **CSS Fixes:** Navbar Collapsing, Touch Targets.<br>• Convert Data Tables to Card Views (Mobile). | **Lead:** 4h<br>**Jun:** 8h |
| [ ] | **Sat Feb 28** | **PWA Capability** | • Service Worker Strategy (Cache First).<br>• Offline Fallback Page. | *(Junior Off)* | **Lead:** 4h<br>**Jun:** 0h |

---

## 📅 Week 3: Cloud Migration (Mar 02 - Mar 07)
**Focus:** Moving Infrastructure to Google Cloud Platform.

| Status | Date | Task | Lead Dev Activities (4h Max) | Junior Dev Activities (8h) | Est. Hours |
| :---: | :--- | :--- | :--- | :--- | :--- |
| [ ] | **Mon Mar 02** | **GCP Setup** | • Setup GCP Project, IAM, & Billing.<br>• Create Cloud SQL Instance. | • Create PWA Manifest & Icons.<br>• Data Sanitization: Prepare Staging DB Dump. | **Lead:** 4h<br>**Jun:** 8h |
| [ ] | **Tue Mar 03** | **Docker Optimization** | • Multi-stage Docker Build.<br>• Push to Google Artifact Registry. | • Local Test: Connect App to Remote Cloud SQL.<br>• Load Test: Write/Run `locust` scripts. | **Lead:** 4h<br>**Jun:** 8h |
| [ ] | **Wed Mar 04** | **Cloud Run Deploy** | • Configure Cloud Run Service.<br>• Setup CD Pipeline (GitHub Actions -> GCP). | • Smoke Test: verifying all features on Staging URL.<br>• Report bugs found during smoke test. | **Lead:** 4h<br>**Jun:** 8h |
| [ ] | **Thu Mar 05** | **Project Switchover** | • DNS Configuration & SSL.<br>• Final Production Data Migration. | • Update Terms of Service / Privacy Policy content.<br>• SEO Audit: Meta tags verification. | **Lead:** 4h<br>**Jun:** 8h |
| [ ] | **Fri Mar 06** | **Android Init** | • Init CapacitorJS Project & Android Platform.<br>• Configure Splash Screen & Icons. | • Setup Android Studio Env.<br>• Generate High-Res Store Assets. | **Lead:** 4h<br>**Jun:** 8h |
| [ ] | **Sat Mar 07** | **Native Features** | • Implement Geolocation Plugin (Background Mode).<br>• Battery Optimization. | *(Junior Off)* | **Lead:** 4h<br>**Jun:** 0h |

---

## 📅 Week 4: Android App & Launch (Mar 09 - Mar 14)
**Focus:** Native Features, Testing, and Play Store Submission.

| Status | Date | Task | Lead Dev Activities (4h Max) | Junior Dev Activities (8h) | Est. Hours |
| :---: | :--- | :--- | :--- | :--- | :--- |
| [ ] | **Mon Mar 09** | **Push Notifications** | • Architecture: FCM Integration Backend.<br>• Handle Token Refresh Logic. | • Frontend: Request Permission UI.<br>• Test: Verify notifications arrival. | **Lead:** 4h<br>**Jun:** 8h |
| [ ] | **Tue Mar 10** | **Camera & Files** | • Implement Native Camera Intent.<br>• Handle Android Permissions. | • UX: "Upload ID" Flow testing.<br>• Regression Test: Full User Registration flow. | **Lead:** 4h<br>**Jun:** 8h |
| [ ] | **Wed Mar 11** | **Offline Sync** | • Design Local SQLite Schema.<br>• Implement "Sync Manager". | • UI: "You are Offline" banner/indicators.<br>• Test: Complete ride flow in Airplane Mode. | **Lead:** 4h<br>**Jun:** 8h |
| [ ] | **Thu Mar 12** | **App Bundling** | • Generate Signed App Bundle (`.aab`).<br>• Upload to Internal Test Track. | • **Store Listing:** Input Title, Desc, Graphics.<br>• Fill out Content Rating & Data Safety forms. | **Lead:** 4h<br>**Jun:** 8h |
| [ ] | **Fri Mar 13** | **Submission** | • Review Store Listing.<br>• **Action:** Submit for Production Review. | • Final Check: Prod URLs, Payment Gateways.<br>• Create "Release 1.0" Notes. | **Lead:** 4h<br>**Jun:** 8h |
| [ ] | **Sat Mar 14** | **Post-Launch** | • Monitor Error Logs (Sentry).<br>• Setup "Hotfix" workflow. | *(Junior Off)* | **Lead:** 4h<br>**Jun:** 0h |

---

## ⏱ Timeline Summary
**Project Start:** Wed Feb 18, 2026.
**Project End:** Sat Mar 14, 2026.

| Role | Schedule | Weekly Hours | Total Project Hours |
| :--- | :--- | :--- | :--- |
| **Lead Developer** | Mon-Sat (4h/day) | 24 Hours | **96 Hours** |
| **Junior Developer** | Mon-Fri (8h/day) | 40 Hours | **160 Hours** |
