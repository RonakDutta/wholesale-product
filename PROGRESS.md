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
| `wholesale3_one_invoice_per_order.sql` | Unique index so one order cannot hold two invoices | **outstanding** |

`wholesale3_one_invoice_per_order.sql` opens with a query that lists any order
already holding two invoices. It returns nothing on a healthy database. If it
returns rows, the index will refuse to build until they are sorted out, and
that is a judgement call: a duplicate carrying payments needs those payments
moved onto the surviving invoice first. Do not delete on the strength of the
query alone. The application takes a lock before creating either way, so new
duplicates cannot appear whether or not this has been run.

Backfills, safe to run more than once, in this order:

```bash
node scripts/backfill_order_parties.js    # every order gets a customer
node scripts/backfill_order_payments.js   # shop payments into the khata   (done)
node scripts/backfill_order_sales.js      # accepted orders into the book  (done)
```

---

## Done

### 4 Sept 2026

**The location picker does something.** It was ten hardcoded city names, a
piece of local state, and nothing downstream: picking Surat changed a label and
showed the same catalogue, which is worse than having no picker, because the
buyer believes he is looking at Surat. Cities now come from the listings
themselves, so every line in the menu has stock behind it and carries a seller
count. The filter removes listings rather than products, so a filtered card
cannot quote a price or a seller from another city. Warehouse city beats signup
city; spellings are folded; "Delhi" and "New Delhi" are deliberately not merged.

Two invented facts went with it: "Delivering to Delhi NCR" was printed on every
screen in the country with nothing behind it, and search showed every
wholesaler's location as "India" because the catalogue never returned the city.

The picker could not be clicked with a mouse at all, and worked perfectly from
a script. The navbar mounts two copies, one for phones and one for desktop, and
hides the wrong one with CSS. Sharing one open flag meant the hidden copy read
a click on the visible one as a click outside itself and closed the menu on
mousedown, destroying the button before the mouseup could land.

**Part payments reach the invoice.** The bill only heard about a payment once
the whole amount was in, so a buyer who had paid his first instalment looked,
on his own bill, exactly like one who had paid nothing. It now mirrors what the
order says has been received, reads Partial while money is owed, and gets a
timeline entry per payment. Two races were found and fixed on the way, both
older than the change: two callers could each raise an invoice for the same
order (measured: three invoice numbers on one order), and two payment events
could each record the same instalment (measured: 892.50 recorded three times).
Both now take a lock.

**The cancellation window is real, and refunds finish.** Cancel until packed,
return within seven days of delivery, then closed. The map allowed cancelling
from packed, ready_for_pickup and shipped, so the generic status route went
round the refuse button; `failed_delivery` keeps its exit because the goods
never arrived. `actual_delivery_date` is finally written, which is what the
seven days are counted from. `return_completed` to `refunded` existed and
nothing called it, so every returned order stopped one step short with the
customer's money in the till; the wholesaler can now record the refund, capped
at what he received, and the khata adds it back so the customer returns to zero.

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

### Start here, 5 Sept

Before writing anything, confirm the two migrations above have actually been
run against Neon. The order number sequence in particular is a live risk: until
it is applied, two checkouts in the same second can be handed the same number.

0. **Check the deploy is healthy.** The Neon password was rotated and Render was
   left holding the old one, so every request failed with `28P01, password
   authentication failed`. The connection string has been updated. Confirm the
   home page loads and the city menu fills before starting on anything else,
   and check `server/.env` has the new string too or the migrations will not
   run either.
1. **Staff accounts.** The biggest of the remaining items, so it gets the
   fresh day. Agreed: staff may do everything except change business settings
   and GST details. Needs a staff table, an invite flow, and, the part that
   actually decides whether this works, every query scoped to the wholesaler
   being acted for rather than to the logged in user. Search for `req.user.id`
   used as a wholesaler id: that is the list of places to change, and missing
   one leaks another wholesaler's book. Worth writing the scoping helper first
   and making the controllers read it, the way khataBalance was done.
2. **Trim the seller location.** The state is load bearing because it decides
   CGST plus SGST against IGST. The map pin is only for delivery. Ask the
   state once at signup and drop the pin unless marketplace delivery is on.
3. **Delete the invoice's "mark as delivered".** One event should not have two
   switches; the order lifecycle is the authority.
4. **HSN codes**, scoped small: validate the shape (4, 6 or 8 digits), suggest
   from what this wholesaler has used before, and a short curated list for
   textiles. Do NOT ship a rate table as authoritative: rates change, and the
   same HSN carries different rates by price slab.
5. **Delete the retired rate list code** (`RateList.jsx`, `AddItemModal.jsx`,
   eventually `itemController`) once the merge is confirmed good.
6. **Mobile OTP.** Deferred. There is no genuinely free SMS OTP in India that
   we know of; every gateway charges per message.

### GST APIs, looked into 4 Sept

Answering "is there a free one we can test against". There is, for both.

**e-Way Bill is the one worth doing.** GSTN runs a free pre-production sandbox;
credentials come by emailing `ewaybill.api.helpdesk@gmail.com` from a GST
registered address. It applies to any consignment over ₹50,000 regardless of
turnover, which is a wholesaler's ordinary week, so it is relevant to the people
actually using this.

**e-Invoice can wait.** NIC's sandbox at `einv-apisandbox.nic.in` is free and
self-registration, but e-invoicing is only mandatory above ₹5 crore annual
turnover. Most of our sellers are below that, so it would be compliance nobody
on the platform needs. Revisit when we go after larger sellers.

Faster to prototype against: WhiteBooks, Masters India and sandbox.co.in hand
out free sandbox keys instantly rather than by email. Production is paid and
couples us to that provider, so keep any integration behind an interface.

**Settle this before writing code.** Both official sandboxes assume one taxpayer
testing his own ERP. A platform raising e-way bills for hundreds of different
wholesalers cannot use one set of credentials: either each seller enrols his own
API access and we hold his credentials, or we sign with a GSP licensed to act
for many taxpayers. That is a commercial decision and it shapes the schema.

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
- **The home page falls back to invented demo products** when the catalogue
  fails to load. Two made up wholesalers in Mumbai and Delhi, with prices. The
  toast says "demo data", which is the only thing stopping it being a straight
  lie, and it is now also out of step with the city filter: a buyer filtered to
  Surat would be shown a Mumbai seller. Delete it and show the failure.
- **Search invents a 4.5 star rating** for any wholesaler who has none, and
  then sorts and filters on it. Same rule that removed `trust_score`.
- **The client bundle is about 1.8MB** and there are 14 non identical copies of
  a `money()` helper.
- **`README.md` is substantially out of date.**

---

## Testing

Sixteen suites in `server/scripts/*_check.js`. They drive the real
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
