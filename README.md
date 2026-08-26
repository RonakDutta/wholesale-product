# Vyapari, Wholesale Trade Platform

Vyapari is a B2B wholesale platform for Indian retailers and wholesalers. It
supports product discovery, supplier storefronts, bulk ordering, UPI payment
collection, GST invoicing, delivery tracking, messaging, and wholesale sales
record keeping.

The repository currently contains two connected product directions:

- The marketplace workflow lets retailers browse active public listings,
  choose a wholesaler, place an order, pay by UPI, and track delivery.
- Wholesale 3.0 adds a wholesaler-first customer book, private rate list,
  manual sales ledger, party payments, and sale-linked invoices.

## Features

### Accounts and access

- Registration and login with JWT authentication.
- Buyer, seller, both, and admin roles with protected routes.
- Seller upgrade flow for an existing buyer account.
- Buyer and wholesaler profiles with business details, GSTIN, contact data,
  UPI ID, city, country, and warehouse address.
- Role-aware buyer and wholesaler dashboards.

### Product discovery and listings

- Responsive marketplace home page with hero content, categories, and market
  promotions.
- Product browsing, search results, category filtering, and product detail
  pages.
- Wholesaler profile and shop pages.
- Product listings with price, optional discount price, minimum order quantity,
  stock, shipping days, category, description, and images.
- Listing visibility levels: `public`, `storefront`, and `private`.
- Private listings can be shared through an unlisted UUID link.
- Seller inventory create, edit, view, and delete operations.
- Product image uploads through the configured Cloudinary client settings.

### Buyer tools

- Cart drawer with quantity updates and checkout preparation.
- Wishlist management.
- Delivery and billing address capture.
- Order history, order detail pages, payment pages, and order success flow.
- Supplier contact flow with WhatsApp-ready contact information where
  configured.
- Buyer notification center and unread notification indicators.
- Verified-purchase product and seller reviews where the review workflow is
  available.

### Wholesaler tools

- Seller dashboard with overview, inventory, orders, invoices, promotions,
  reports, settings, and message center.
- Inventory stock and price management.
- Incoming order list and order status updates.
- Wholesaler profile and warehouse location management.
- Shop page for active public and storefront listings.
- Promotion and flash-sale management endpoints and seller screens where
  enabled.

### Orders, payments, and fulfilment

- Multi-line orders containing products from one wholesaler.
- Server-side price, stock, and MOQ resolution at checkout. Client-submitted
  prices are not trusted.
- Stock reservation during order creation and restoration on eligible
  cancellation or abandoned payment paths.
- Full payment and 50/50 installment payment plans.
- Seller-configured UPI payment details and dynamic UPI QR payment data.
- Buyer payment initiation and self-declared payment status updates. This
  repository does not currently use a payment gateway such as Razorpay.
- Validated order lifecycle with status history and timeline events, including
  payment, processing, packing, shipping, delivery, cancellation, returns,
  refunds, and replacement states.
- Buyer returns and supplier/admin status management.
- Packing slip generation.
- Delivery tracking with warehouse coordinates, checkpoints, map support, and
  shareable driver tracking links.
- Installment payment reminders.

### Invoices and GST

- Automatic invoice creation from eligible marketplace orders.
- Manual invoice creation for wholesaler-managed sales.
- Invoice numbering and per-seller invoice settings.
- GST calculation with taxable amount, discount, shipping, total tax, CGST,
  SGST, IGST, and rounding.
- PDF tax invoice generation with invoice status watermark and UPI QR code.
- Invoice detail, download, email, resend, payment recording, reminder, and
  cancellation workflows.
- Invoice audit logs.
- Dashboard statistics and date-filtered reports.
- CSV, Excel-compatible, and PDF summary exports.
- Invoice support for both legacy order records and Wholesale 3.0 sales.

### Messaging and notifications

- Buyer-wholesaler in-app messaging backed by Socket.IO.
- Conversation, message, unread-count, and message notification flows.
- In-app notification center with notification preferences.
- Optional email, SMS, WhatsApp, and push notification providers. These
  integrations degrade quietly when their environment variables are absent.

### Wholesale 3.0 management modules

These modules provide a wholesaler-first sales management workflow alongside
the older marketplace tables:

- Private customer book using parties linked to one wholesaler.
- Customer details including phone, address, GSTIN, notes, and status.
- Wholesaler-owned items and rate list with unit, pack size, rate, MOQ, HSN,
  notes, and active/inactive state.
- Manual sale recording against a customer, including item lines, quantity,
  rate, discount, notes, sale number, and sale status.
- Sale detail and sale history.
- Party payments using cash, UPI, bank, cheque, or other methods.
- Running customer balance data through the sales and payment records.
- Invoice creation from a recorded sale, with recipient details snapshotted on
  the invoice.

### Credit limit and Pay Later

- Wholesalers can configure a credit limit, credit period, and account status
  for each customer in their private customer book.
- Credit status is recalculated from real balances: `active` below 80% usage,
  `warning` from 80% through the limit, and `blocked` above the limit or when
  manually blocked.
- Eligible linked retailers can select Pay on Credit at checkout. Eligibility
  is checked on the server against customer ownership, account status, and
  available credit.
- Credit orders create an invoice, due date, order payment state, and ledger
  transaction in the same PostgreSQL transaction.
- Every credit sale and payment is recorded in `credit_transactions`, with
  balance-after snapshots, due dates, invoice/order references, and optional
  idempotency keys.
- Seller Credit accounts includes account search, balance summaries, ledger
  history, limit and period editing, account blocking/reactivation, payment
  collection, and CSV statements.
- Buyer Credit Wallet shows limit, outstanding, available, overdue amount, due
  date, usage, recent transactions, and PDF/CSV statement downloads.
- Partial payments use row-level locking and cannot exceed the outstanding
  balance. Duplicate payment requests with the same idempotency key are
  ignored.
- Due reminders run at server startup and every six hours for three days
  before due, due today, three days overdue, and seven days overdue.
- Credit analytics includes total outstanding, overdue totals, customers using
  credit, and accounts-receivable aging buckets.

## Technology

### Client

- React 19 and React DOM
- Vite with Rolldown
- React Router v7
- Tailwind CSS v4
- Axios
- Socket.IO client
- GSAP animations
- MapLibre GL maps
- Lucide React icons
- QRCode React
- Sonner notifications

### Server

- Node.js and Express 5
- PostgreSQL, using the `pg` client
- Socket.IO
- JWT and bcryptjs authentication
- PDFKit and QRCode for invoice documents
- Multer for uploads
- Nodemailer, SendGrid, Twilio, and Firebase Admin integrations
- Nodemon for development

## Project structure

```text
wholesale-product/
├── client/
│   ├── public/                       Static assets
│   └── src/
│       ├── components/              Shared UI components
│       ├── config/                  Feature flags and client config
│       ├── context/                 Auth, cart, wishlist, socket, notifications
│       ├── hooks/                   Reusable React hooks
│       ├── layouts/                 Application and seller layouts
│       ├── pages/                   Buyer, seller, auth, invoice, and tracking pages
│       └── utils/                   Axios and client utilities
├── server/
│   ├── migrations/                  Hand-applied PostgreSQL migrations
│   ├── src/
│   │   ├── config/                  Database configuration
│   │   ├── controllers/             Request handlers and business logic
│   │   ├── middlewares/             Authentication, roles, and validation
│   │   ├── repositories/            Invoice persistence helpers
│   │   ├── routes/                  API route modules
│   │   └── services/                Orders, invoices, GST, tracking, notifications
│   ├── storage/                     Generated invoice files
│   └── tests/                       Node test runner tests
├── docs/                            Product and redesign documentation
└── README.md
```

## Requirements

- Node.js 18 or newer
- npm
- PostgreSQL database, local or hosted such as Neon
- Git

## Installation

```bash
git clone <repository-url>
cd wholesale-product
npm install
npm install --prefix client
npm install --prefix server
```

## Environment variables

Create `server/.env`:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/wholesale_marketplace
JWT_SECRET=replace-with-a-long-random-secret
PORT=5000

# Optional service configuration
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
FIREBASE_SERVICE_ACCOUNT_JSON=
```

Create `client/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000
VITE_CLOUDINARY_CLOUD_NAME=
VITE_CLOUDINARY_UPLOAD_PRESET=
```

The optional provider variables are only needed for the corresponding email,
SMS, WhatsApp, push, or image-upload workflow. There is no Razorpay setup
required by the current payment implementation.

## Database setup

Create the PostgreSQL database, then apply the SQL files in
`server/migrations/` against it. Migrations are not applied automatically when
the server starts. Apply them in their rough date order and apply
`z_fix_order_payment_status_constraint.sql` last.

The Wholesale 3.0 functionality requires these migrations in addition to the
base schema:

- `wholesale3_items.sql`
- `wholesale3_parties_and_sales.sql`
- `wholesale3_invoice_from_sale.sql`
- `credit_limit_pay_later.sql`

The credit migration must run after the order, invoice, and Wholesale 3.0
tables exist. It updates the final order payment-status allow-list to include
`credit_pending`; keep that value when applying the final
`z_fix_order_payment_status_constraint.sql` migration.

## Running the application

Run both applications from the repository root:

```bash
npm run dev
```

Or run them separately:

```bash
# Terminal 1
cd server
npm run dev

# Terminal 2
cd client
npm run dev
```

Default URLs:

- Client: `http://localhost:5173`
- API: `http://localhost:5000`

## Useful commands

```bash
npm run dev --prefix server
npm run dev --prefix client
npm run lint --prefix client
npm run build --prefix client
node --test server/tests/*.test.js
```

## API groups

The Express API is mounted under `/api`:

| Group            | Purpose                                                         |
| ---------------- | --------------------------------------------------------------- |
| `/auth`          | Registration, login, current user, seller upgrade               |
| `/products`      | Catalog, product details, shop pages, listings, inventory       |
| `/dashboard`     | Seller dashboard data                                           |
| `/profile`       | Wholesaler profile and warehouse settings                       |
| `/orders`        | Create, view, pay, update, track, return, and document orders   |
| `/messages`      | Conversations and in-app messages                               |
| `/notifications` | Notification center and preferences                             |
| `/promotions`    | Promotion and flash-sale operations                             |
| `/reviews`       | Product and seller reviews                                      |
| `/track`         | Public driver tracking links                                    |
| `/invoices`      | Invoice management, GST documents, reports, and exports         |
| `/parties`       | Wholesale customer book                                         |
| `/items`         | Wholesaler-owned rate list                                      |
| `/sales`         | Manual sales and sale payments                                  |
| `/overview`      | Wholesale management overview                                   |
| `/credit`        | Credit accounts, Pay on Credit, payments, statements, analytics |

Protected endpoints require the JWT returned by `/api/auth/login`.

## Current limitations and roadmap

- The repository is transitioning from an open marketplace to a closed
  wholesaler network. The older public marketplace tables and screens remain
  while the new Wholesale 3.0 modules are introduced.
- Cross-seller discovery and comparison still exist in legacy marketplace code,
  but they are not the target direction for the closed-network redesign.
- No current screen advances marketplace orders beyond
  `payment_completed` into supplier fulfilment automatically. Supplier action
  is still required.
- Flash-sale creation is admin-only and there is no admin console in the
  client.
- Bulk import and retailer invite workflows are planned, not complete.
- GST product HSN handling still needs product-specific HSN data throughout the
  invoice pipeline before invoices should be treated as production tax
  compliance documents.
- Security and compliance hardening for the prototype is still pending.

See `docs/PRODUCT_BLUEPRINT.md` for the original marketplace product context
and `docs/CLOSED_NETWORK_REDESIGN.md` for the newer closed-network direction.

## License

This project currently uses the ISC license declared in the package metadata.
