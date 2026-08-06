# AG8TE System Overview

Captured: 2026-07-13

Confidentiality: Non-confidential; based on repository structure and public deployment shape.

```mermaid
flowchart LR
  User["Client / Provider / Admin"] --> Web["React web app"]
  User --> Mobile["Mobile app"]
  Web --> Nginx["Nginx reverse proxy"]
  Mobile --> API["Flask API"]
  Nginx --> API
  Nginx --> WebStatic["Frontend container"]
  API --> Postgres["PostgreSQL"]
  API --> Uploads["Uploads and static assets"]
  API --> Payments["Payment providers"]
  API --> Shipping["Courier / shipping provider"]
  Admin["Admin dashboard"] --> API
```

## Notes

- Frontend routes include shop, login, transport booking, checkout, booking history, user dashboards, and admin dashboard.
- Backend exposes `/api/shop`, `/api/admin`, `/api/requests`, `/api/payments`, `/api/dashboard`, and related service routes.
- Production deployment uses Docker Compose with app, frontend, PostgreSQL, and Nginx services on the `ag8te.com` domain.
