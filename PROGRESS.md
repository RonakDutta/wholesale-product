# Where things stand

A running record of what has been built, what is left, and what is known to
be wrong. Kept so a new session, or a new person, does not have to read the
git log to find out.

**Keep this current.** Add to it in the same commit as the work it describes.
A note written later is a note nobody writes.

Newest first. Dates are when the work landed on `claude/wholesale-3.0`.

---

## Needs running by hand

Migrations are not automatic. Nothing applies them on boot, so a feature can
be finished in code and still broken in production.

```bash
cd server && npm run migrate
```

| Migration | What it does | Run? |
|---|---|---|
| `wholesale3_order_number_sequence.sql` | Order numbers from a counter instead of dice | **outstanding** |

Backfills, safe to run more than once, in this order:

```bash
node scripts/backfill_order_parties.js    # every order gets a customer
node scripts/backfill_order_payments.js   # shop payments into the khata   (done)
node scripts/backfill_order_sales.js      # accepted orders into the book  (done)
```

---

## Done

### 3 Sept 2026

**Money that could not be trusted.** Three screens each carried their own idea
of what a customer owes, and they disagreed. The Overview billed from sales
alone while subtracting every payment including shop money, so an account
whose customers had paid through the marketplace showed a negative amount
still to collect. Measured at minus 1,000 on a single paid order.

Deeper than the copies: every screen asked one subtraction of the whole
business, total billed less total received. That lets one customer's credit
cancel another's debt, so a wholesaler chasing 5,000 is shown 3,000. Balances
are now worked out per customer and only then added up, debts into one figure
and credits into another. "Still to collect" is structurally incapable of
going negative; money held for customers has its own line.

The rule lives in `server/src/services/khataBalance.js`. Every screen reads
it. Do not write a fourth copy.

**The three Overview figures open the rows behind them.** `/seller/money/:metric`
shows each customer with his sales, his shop orders and what he has paid, so
the arithmetic is on the screen. Totals are added up from the rows on the page
rather than sent down, so a disagreement with the card would be visible.

**One order gets a page of its own,** `/seller/orders/:orderId`, beside the
list rather than instead of it. The list keeps its one tap step for clearing
orders fast; the page gathers the next action, the customer, the money, the
lines, the delivery checkpoints and the history.

**Returns go round.** Buyer asks with a reason, wholesaler accepts or refuses,
and "goods came back" cancels the sale and raises a credit note. The buyer's
way in is hidden behind `FEATURES.BUYER_RETURNS` by request; everything else
stays live, so turning it on is one line.

**Order numbers come from a sequence.** The old function had 10,000 numbers
per second and a retry loop that could not see other sessions. Measured: 11,000
rows in one statement never finished and wrote nothing; 1 in 1,250 concurrent
checkouts was refused. Both now zero.

**A wholesaler can refuse an order,** and a buyer can call his own off. One
transaction unwinds the order, its sale, its stock and its history. Money
already paid is deliberately left alone and the screen says so.

**GST numbers are checked** by their own check digit, free, no API. Caught
1,575 of 1,575 single character corruptions. Two screens disagreed about the
"GST registered" badge and both were wrong; both now read the number's shape.

**The notification bell has never worked.** `notifications.type` is NOT NULL
with no default and every insert wrote only `notification_type`, so every
insert failed and every caller swallowed the error. Fixed.

### Earlier

Parties as the spine; one ledger; products merged into one tab; the
order-to-sale bridge; accept and dispatch screens; per-wholesaler invoice
numbering; shop prices treated as tax inclusive.

---

## Left to do

Roughly in the order agreed.

1. **Location filter.** The navbar location picker does nothing.
   `wholesaler_profiles` already stores city, and lat/lng for pinned
   warehouses, and the catalogue already joins to it. Only the filter is
   missing.
2. **Invoice timeline should show payments.** `reconcileInvoiceForOrder` only
   fires on full settlement, so a part payment never appears on the invoice at
   all.
3. **Cancellation window.** Agreed rule: refuse or cancel up to packing;
   returns for 7 days after delivery; then closed forever. Needs the 7 day
   check and the missing refund step (`return_completed` to `refunded` exists
   in the lifecycle and nothing calls it).
4. **Staff accounts.** Agreed: staff may do everything except change business
   settings and GST details. Needs a staff table, invites, and every query
   scoped to the wholesaler being acted for.
5. **Trim the seller location.** The state is load bearing because it decides
   CGST plus SGST against IGST. The map pin is only for delivery. Ask the
   state once at signup and drop the pin unless marketplace delivery is on.
6. **Delete the invoice's "mark as delivered".** One event should not have two
   switches; the order lifecycle is the authority.
7. **HSN codes**, scoped small: validate the shape (4, 6 or 8 digits), suggest
   from what this wholesaler has used before, and a short curated list for
   textiles. Do NOT ship a rate table as authoritative: rates change, and the
   same HSN carries different rates by price slab.
8. **Delete the retired rate list code** (`RateList.jsx`, `AddItemModal.jsx`,
   eventually `itemController`) once the merge is confirmed good.
9. **Mobile OTP.** Deferred. There is no genuinely free SMS OTP in India that
   we know of; every gateway charges per message.

---

## Known problems, not yet fixed

- **Git history contains a committed password and an invoice PDF.** The Neon
  credential has been rotated. The history rewrite is outstanding.
- **The abandoned payment path invents stock.** `updatePaymentStatus` credits
  `stock + oi.quantity` unconditionally when a buyer walks away, but checkout
  floors its subtraction at zero while stock tracking is off, so a listing
  that gave nothing up gets stock back. `cancelOrder` was fixed; this path was
  not.
- **Credit notes do not move the khata.** Raising one by hand produces a
  document and changes no balance. Returns work because they cancel the sale
  instead. If credit notes are ever made to reduce a balance, they need a
  guard so a note against an already cancelled sale counts for nothing, or
  returns will be subtracted twice.
- **Three list endpoints are unpaginated,** `listParties` among them. Measured
  at 200,000 customers: a book of 5,000 takes 99ms and returns all 5,000 rows.
  Fine today, worth fixing before it is not.
- **The client bundle is about 1.8MB** and there are 14 non identical copies of
  a `money()` helper.
- **`README.md` is substantially out of date.**

---

## Testing

Thirteen suites in `server/scripts/*_check.js`. They drive the real
controllers against a local Postgres, so they catch schema drift that reading
the code does not.

```bash
# once
su postgres -c "initdb -D /var/tmp/pgt/data"        # see CLAUDE.md for why
createdb qa0 && npm run migrate                      # DATABASE_URL at qa0

# each suite takes a database name
node scripts/overview_check.js qa_overview
```

Build every database from the migrations, never by hand. Two real bugs were
found the week the hand built stub was replaced, both of them constraints the
stub did not have.

For UI work, render it. A mock API on port 5000 plus `npx vite --port 5174`
and Playwright at `/opt/pw-browsers/chromium`. Screenshotting has caught a
clipped tab, quantities printed as "10.000", a credit printed as "Rs.-2,000.00"
and cards half empty on a phone. None of those were visible in the code.
