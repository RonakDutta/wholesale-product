# CLAUDE.md

Notes for Claude Code, or any AI assistant, working in this repository.
Written to save the next session from rediscovering things the hard way.

## What this is

A B2B wholesale marketplace for Indian trade. Retailers browse products,
compare wholesalers, and order. Wholesalers list stock, take orders, and
raise GST invoices.

- `client/` React 19 + Vite (rolldown), React Router v7, Tailwind v4
- `server/` Express 5 + Socket.IO + PostgreSQL (Neon)

## Running it

```bash
cd server && npm run dev     # nodemon src/server.js, port 5000
cd client && npm run dev     # vite
cd client && npm run lint    # eslint
cd client && npx vite build  # the quickest full check that nothing is broken
```

There is no server test script. `node --check <file>` catches syntax errors;
real verification means driving the code against a database (see below).

Required env: `DATABASE_URL`, `JWT_SECRET` on the server;
`VITE_API_BASE_URL`, `VITE_CLOUDINARY_CLOUD_NAME`,
`VITE_CLOUDINARY_UPLOAD_PRESET` on the client. Email, SMS, WhatsApp and push
providers are all optional and degrade quietly when unset.

## Migrations are not automatic

`server/migrations/*.sql` are run by hand against Neon. Nothing applies them
on boot, so a feature can be complete in code and still broken in production
because its migration has not been run. When you add a column, say so
explicitly in your final message.

Files are applied in rough date order, except `z_fix_order_payment_status_constraint.sql`,
which is named to sort last because it re-applies a CHECK constraint that
earlier files drop.

## Verifying database work

The pattern that has caught the most real bugs here: start a local Postgres,
build the schema, and drive the actual controller with a fake `req`/`res`.

```js
// The app's pool hardcodes ssl, which a local server does not offer.
// Preload the module cache so the controller under test is the real one.
const Module = require("module");
const { Pool } = require("pg");
const dbPath = require.resolve("./src/config/db");
const testPool = new Pool({ connectionString: "postgres://postgres@127.0.0.1:5433/test" });
const stub = new Module(dbPath, null);
stub.exports = testPool; stub.loaded = true;
require.cache[dbPath] = stub;

const ctrl = require("./src/controllers/orderController");
const makeRes = () => { const r = { statusCode: 200, body: null };
  r.status = c => (r.statusCode = c, r); r.json = b => (r.body = b, r); return r; };
```

Postgres cannot run as root and the unix socket path has a 107 byte limit, so
initdb as the `postgres` user under a short path such as `/var/tmp/pgt` and
connect over `127.0.0.1`, not a socket in a deep scratch directory.

For UI work, a small mock API on port 5000 plus `npx vite --port 5174` and
Playwright (`executablePath: "/opt/pw-browsers/chromium"`) renders real pages.
Screenshotting has repeatedly caught things reading the code did not, such as
broken images sprawling alt text across a card. Seed `localStorage.token` and
mock `GET /api/auth/me` to get past the auth guard.

## Conventions that matter

**Theme.** Tailwind v4 `@theme` tokens in `client/src/index.css`:
cream `#faf6ef`, clay `#c56b4a`, espresso `#3d2e24`, sage `#7a8b6f`. Use these
rather than raw Tailwind colours. Tailwind v4 renamed gradients, so it is
`bg-linear-to-r`, not `bg-gradient-to-r`.

**No em dashes** in code, comments, commit messages or documents. Use a comma
or a full stop.

**No invented data.** Do not display a metric the system does not really
compute. Two vanity fields, `trust_score` and `response_rate`, were removed
for exactly this reason and must not come back. A new seller showing zero is
correct; a plausible-looking number is not.

**The seller dashboard is for wholesalers.** `/seller/*` is guarded by
`RequireRole`. Do not put buyer concepts such as loyalty points or gift card
balances on it.

**Plain English in the UI.** Users are Indian traders who may not read English
as a first language. Say "shop page", not "storefront"; "Everyone", not
"public catalogue".

## Things that are easy to get wrong

**Order lifecycle.** `server/src/services/orderStatusService.js` holds a 22
state machine. `validateStatusTransition` is the authority. Four states are
terminal: `cancelled`, `refunded`, `payment_failed`, `return_rejected`. Never
write `orders.status` without validating the transition, and never write a
status the map does not contain.

The map is an object literal with several duplicate keys, so a later entry
silently wins over an earlier one. They currently agree, but check before
trusting a line you read in isolation.

**Payments are self-declared.** There is no payment gateway. The buyer scans a
UPI QR code and presses a button to say they paid. `initiatePayment` opens a
server-side session so the browser never names an amount; `updatePaymentStatus`
settles it, capped at the outstanding balance.

Orders support a 50/50 instalment plan. A part-paid order still owes money, so
"can this be paid" cannot be asked of the lifecycle alone: see
`canAcceptPayment` in `orderController.js`, which checks both that the order is
not dead and that a balance remains.

**Money in paise.** Use `toPaise`/`fromPaise` when splitting or summing an
amount. Floating point rupees lose a paisa on a 50/50 split of an odd total.

**Stock is reserved at order creation** and credited back only when a payment
is abandoned. If you add a path that kills an order, return its stock from
`order_items`, and only when nothing has been paid yet.

**Listing visibility.** `supplier_inventory.visibility` is `public`,
`storefront` or `private`. Any new query that surfaces listings to buyers must
filter it, or private stock leaks. `private` listings are reachable only
through `/listing/:inventoryId`, an unlisted page whose UUID is the secret.

**Orders can hold several products.** `order_items` is the real content;
`orders.inventory_item_id` is a single-item leftover kept for older readers.
A change that only reads `inventory_item_id` silently drops the rest of the
cart. A branch was rejected for exactly this.

**A 403 is not a dead session.** `client/src/utils/axios.js` clears the token
on 401 only. Clearing it on 403 logs users out mid-browse.

**Invoices are reconciled, not recreated.** `createInvoiceFromOrder` returns
early when an invoice exists, so calling it again after payment leaves the
invoice stamped UNPAID. Use `reconcileInvoiceForOrder`.

## Repository layout

```
server/src/
  controllers/   route handlers, most business logic lives here
  services/      orderStatusService (lifecycle), invoiceService, pdfService,
                 gstService, notificationManager, geocodingService
  repositories/  invoiceRepository, the only repository-style module
  routes/        mounted under /api/* in app.js
  migrations/    hand-applied SQL
client/src/
  pages/         top level screens; pages/dashboard/* is the seller workspace
  layouts/       SellerLayout holds the dashboard shell and nav
  components/    shared UI; components/invoice/* is invoice specific
  context/       Auth, Cart, Socket, Notification, Unread, Wishlist
```

## Where things stand

`PROGRESS.md` at the repository root is the running record: what has been
built, what is left, what is known to be broken, and which migrations still
need running by hand. Read it before starting, and add to it in the same
commit as the work it describes. It is kept out of this file on purpose, so
the instructions every session loads do not grow a changelog inside them.

## Known gaps, as of this writing

- No screen advances an order past `payment_completed`. The API exists and is
  correct, but nothing calls it, so orders stall there in practice.
- No admin console. Flash sale creation is admin-only and unreachable.
- Seller-side search ("textile wholesalers in Surat") is not built. The shop
  page exists; discovery of it does not.
- `README.md` is substantially out of date.
- Git history contains a committed password and an invoice PDF. Rotating the
  credential and rewriting history is outstanding.

## Working style expected here

Verify rather than assert. Several bugs in this repository were found only by
running the code against a real database or rendering it in a real browser,
and several plausible-sounding claims turned out to be wrong when tested.
State plainly what was checked and what was not.
