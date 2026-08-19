# Wholesale Product — Features Overview

This repository implements a B2B wholesale marketplace for Indian trade: buyers browse products, compare wholesalers, place orders, and wholesalers manage inventory, orders, and GST invoices.

## Architecture

- Client: React + Vite (client/)
- Server: Express 5 + Socket.IO + PostgreSQL (server/)
- Storage: server/storage and uploads for invoices and review images
- Migrations: SQL files in `server/migrations/` (applied manually)

## Key Features

- Buyer experience
  - Browse searchable product listings and supplier catalogues.
  - Product cards, supplier comparison, product thumbnails, and category sliders.
  - Add multiple items to a cart and place multi-item orders.
  - Self-declared payments (buyer confirms UPI payment) and order tracking.
  - Support for installment payments (50/50 plan supported).

- Seller (wholesaler) experience
  - Seller dashboard and routes under `/seller/*` guarded by role checks.
  - Inventory and listing management with visibility flags: `public`, `storefront`, `private`.
  - Receive orders, reserve stock at order creation, and raise GST invoices.
  - Messaging and notification handling for order and buyer interactions.

- Orders & lifecycle
  - Comprehensive order state machine in `server/src/services/orderStatusService.js`.
  - Use `validateStatusTransition` to ensure safe transitions; some states are terminal (`cancelled`, `refunded`, `payment_failed`, `return_rejected`).
  - Orders may contain multiple products (`order_items` is authoritative).
  - Stock is reserved when the order is created and returned only when appropriate.

- Payments & invoices
  - Payments are self-declared (no payment gateway). The UI opens a server session and the buyer confirms payment.
  - `createInvoiceFromOrder` will return early if an invoice exists; use `reconcileInvoiceForOrder` to reconcile.
  - Money is handled in paise; use `toPaise`/`fromPaise` helpers to avoid rounding errors.

- Notifications & messaging
  - In-app messaging system and notification system (see `server/migrations/messaging_system.sql` and `notification_system.sql`).

## Running the app (development)

From the repository root:

```bash
cd server && npm run dev    # starts Express server (port 5000 by default)
cd client && npm run dev    # starts Vite dev server
```

Building the client for production:

```bash
cd client && npx vite build
```

## Required environment variables

- Server: `DATABASE_URL`, `JWT_SECRET` (others optional: email/SMS providers)
- Client: `VITE_API_BASE_URL`, `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET`

## Database & migrations

- All raw SQL migrations are in `server/migrations/` and must be applied to your Postgres instance manually; they do not run on boot.
- A helper `server/run_migrations.js` is provided to assist, but migrations are intentionally manual in deployment workflows.
- For local verification, start a local Postgres, load the schema, and run controller functions against a test pool (see `CLAUDE.md` for an example test harness).

## Tests

- Server tests: `server/tests/` (e.g., `orderStatusService.test.js`)
- Client tests: `client/src/tests/` (e.g., `supplierUtils.test.js`)
- Run tests with the usual `npm test` inside `server` or `client` as configured in their `package.json` files.

## Conventions & important notes

- Theme colours and Tailwind tokens are defined in `client/src/index.css` and should be used over raw hex values.
- No invented/vanity metrics — fields such as `trust_score` and `response_rate` were removed intentionally.
- The seller dashboard is for wholesalers only; do not mix buyer-only concepts there.
- Orders can hold several products — read `order_items` rather than older single-item columns.
- A 403 response does not indicate a dead session; only 401 clears tokens in the client.

## Known gaps and caveats

- No UI path advances an order past `payment_completed` (API exists but UI may not call it).
- No admin console — some admin-only features are not reachable.
- Seller-side discovery is limited — search/discovery features are incomplete.
- Migrations are not automatic; missing migrations can make a feature appear implemented in code but broken in production.

## Contributing

- Follow the existing repo structure and conventions.
- When adding DB columns, add a migration in `server/migrations/` and note that migrations must be applied manually.

## Where to look in the codebase

- Client entry: `client/src/main.jsx` and `client/src/App.jsx`
- Server entry: `server/src/server.js` and `server/src/app.js`
- Controllers: `server/src/controllers/`
- Services (business logic): `server/src/services/`
- Repositories: `server/src/repositories/`

---

For operational notes, verification patterns and developer tips, see `CLAUDE.md` and the root `README.md`.
