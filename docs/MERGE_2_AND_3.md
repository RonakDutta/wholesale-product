# Merging wholesale 2.0 and 3.0

Draft for discussion. Nothing here is built.

The ask: bring the marketplace back, public and private listings and all,
keep the 3.0 seller dashboard, retire the 3.0 rate list in favour of the 2.0
product list, support both automatic and manual invoices, keep partial
payments visible as "how much is still due", and give every wholesaler his
handful of retailers to contact and send a shop link or a product link to.

## 1. What actually exists on each side

Read out of the code, not from memory.

| Concept | 2.0, the marketplace | 3.0, the sales book |
| --- | --- | --- |
| What you sell | `products` (shared) + `supplier_inventory` (your listing) | `items` (yours alone) |
| Who buys | `users` with a buyer role | `parties`, no login needed |
| The transaction | `orders` + `order_items`, 22 states | `sales` + `sale_lines`, 4 states |
| Money in | `orders.amount_paid`, `payment_transactions` | `party_payments` |
| The bill | `invoices` from an order | `invoices` from a sale |

Two of those rows are already one thing. `invoices` carries both `order_id`
and `sale_id`, each nullable, and the read queries COALESCE the two sources.
That is the pattern the rest of this merge should copy: one table, two
sources, nullable links, readers that cope with either. It is already
working in production code and it did not require rewriting the invoice
module.

**The single biggest gap:** `orders` never touches `parties`. Grep the order
controller for `party_id` and there is nothing. So a retailer who orders
through the marketplace does not appear in the wholesaler's customer book,
does not appear in his khata, and does not appear on a statement. Two
customers, two balances, one shop. Everything else in this document is
downstream of fixing that.

## 2. The principle

**Do not merge tables that mean different things.** An order is a fulfilment
record: 22 states, a driver, a tracking link, stock reserved. A sale is a
commercial record: what was sold, for how much, what is owed. Forcing them
into one table would either burden a hand written sale with 22 states or
strip an order of the states it needs.

Join them at the customer instead. `parties` becomes the spine, and every
kind of transaction hangs off a party.

## 3. Decisions, one at a time

### 3.1 Products: `items` retires into `supplier_inventory`

Agreed in principle, but it is not a delete. `supplier_inventory` today
carries `price`, `discount_price`, `moq`, `stock`, `shipping_days`,
`image_url`, `status`, `visibility`. It has **no unit, no pack size, no HSN
code and no GST rate**. Those four live only on `items`, and the sale flow
and the invoice both need them.

So the order is:

1. Add `unit`, `pack_size`, `hsn_code`, `gst_percent` to
   `supplier_inventory`.
2. Backfill every `items` row into a `products` + `supplier_inventory` pair,
   at `visibility = 'private'`, because a rate list was never public.
3. Repoint `ItemPicker`, `RecordSale` and the products screen at the
   listings endpoint.
4. Leave `items` in place, read only, for one release.
5. Drop it.

Two things to be careful about.

**`products` is shared.** Creating a listing creates a row in a catalogue
every other wholesaler can attach to. Migrating a private rate list into it
publishes the *names* of a wholesaler's range into shared space even though
the listings stay private. The catalogue queries do filter on visibility, so
nothing shows, but the row exists and a competitor could list against it.
Either accept that, or give private listings a product row that is flagged
as not shareable. **Needs a decision.**

**Stock. DECIDED: hide it for now.** Orders decrement
`supplier_inventory.stock` at creation and credit it back on cancellation.
Rate list items have no stock at all. Eventually a hand written sale should
decrement stock too, or the marketplace will sell goods that walked out of
the godown yesterday. For now stock comes off the screens entirely and is
revisited later.

What "hide" has to mean, so this does not become a trap:

- The column stays and keeps its values. Dropping it would lose counts that
  are correct today and would have to be re-entered.
- The order path keeps decrementing and crediting back. Turning that off
  while orders still run would leave the numbers silently wrong, and
  switching it back on later would need a stock take.
- Stock disappears from the listing form, the listing list and the buyer
  facing pages. Nothing shows "12 in stock" or "Out of stock".
- The **out of stock check on ordering must be decided separately**: with
  stock hidden, an order for 500 metres of something with 3 in stock either
  goes through, or is refused with a message the buyer cannot act on because
  he cannot see stock. Recommendation: let it through while hidden, since a
  wholesaler in a closed network confirms orders by hand anyway.
- This lands in Phase 1, when the marketplace comes back on, not before.
  With `FEATURES.MARKETPLACE` off there is nowhere stock is currently shown.

Nothing here rewrites history: `sale_lines` already snapshots the name, rate
and HSN, so retiring `items` cannot change a bill already raised.

### 3.2 Buyers: a party for everyone

`parties.user_id` already exists and is already nullable, for exactly this.

- A shop that has never logged in: a party with `user_id` null. Works today.
- A retailer with an account: the same party, with `user_id` set.
- An order arrives: find or create the party for
  `(wholesaler_id, buyer_id)`, then attach.

The "four or five personal retailers" is not a new feature. It is this list,
filtered to the ones with a `user_id`. An invite link sets `user_id` on an
existing party, which is how a wholesaler connects the shop he already has
in his book to the account they just made.

Hard rule, unchanged: `parties.notes` is the wholesaler's private note about
that customer and must never reach the retailer side.

### 3.3 Transactions: the order becomes the logistics, the sale becomes the commerce

Recommended shape:

- `orders` keeps its 22 states, its stock reservation, its driver link and
  its tracking page. It gains a nullable `party_id`.
- When an order reaches `payment_completed` or `supplier_accepted`, it
  creates a `sales` row with `source = 'retailer'` and a link back to the
  order. `sales.source` already has that value; it was built for this.
- From that point the money and the bill live on the sale, like every other
  sale.

The alternative, leaving orders separate and having the khata sum both
tables, was considered and rejected: every balance query, every statement,
the overview and the credit note logic would each have to union two sources
and never double count. One of them will eventually forget.

The cost of the recommended shape is one bridge to get right, in one place,
with a uniqueness constraint so an order can never mint two sales.

### 3.4 Money: one ledger, one answer to "how much is due"

Today there are four places money is recorded. Target:

- **`party_payments` is the ledger.** What a customer has paid a wholesaler,
  whether it came from a marketplace checkout or was cash across the counter.
- **`payment_transactions` stays an attempt log.** It records gateway and UPI
  attempts, including failures. It is not a balance and should never be
  summed as one.
- **`orders.amount_paid` and `remaining_amount` become derived,** either
  recomputed or dropped. Two stored copies of the same number will disagree.
- **`payments`,** the invoice module's own table, is already only consulted
  for marketplace invoices. Once orders produce sales it can go.

"Half paid, how much is due" then has one answer everywhere: the sale total
minus what `party_payments` holds against it. That is already how the
customer page, the statement and the invoice status work in 3.0.

### 3.5 Invoices: both kinds already exist

- Automatic from an order: `invoiceService.createInvoiceFromOrder`, fired on
  payment.
- On demand from a sale: `saleInvoiceService.createInvoiceFromSale`.
- Manual: `createManualInvoice`, behind the Create Invoice screen.

The work is not building a third path, it is making the three agree:

- one numbering series per wholesaler, not a global one
- the same tax model, now that rates are confirmed tax exclusive
- the recipient snapshot on all three, so a manual invoice also names who it
  was issued to at the time
- the manual invoice needs a `party_id`; today it attaches to nobody, so it
  never reaches the khata

### 3.6 The dashboard: 3.0 stays, 2.0 comes back as sections

The nav is already written for this. The marketplace entries are present and
flagged off, not deleted. Turning `FEATURES.MARKETPLACE` on restores
Listings, Orders and Promotions, the shop page link and the storefront.

One rename: the 3.0 "Products" screen and the 2.0 "Listings" screen become
one screen, at one route.

### 3.7 Sharing a link

Already built, and the cheapest win in this document. `/wholesaler/:id` is
the shop page. `/listing/:inventoryId` is an unlisted page whose UUID is the
secret, which is how a private line gets quoted without publishing it.

All that is missing is a "Send to this customer" action on the customer page
that opens WhatsApp with the link. A day's work, and it is the thing the
wholesaler will actually use every week.

## 4. Order of work

Nothing here is a big bang. Each phase leaves the product working.

**Phase 0, before anything.** Get the outstanding migrations run. Extend the
schema probe to cover every new column, so a half migrated database
degrades instead of 500ing, which it has done twice already. Build a smoke
harness that drives both worlds end to end, because from here a change on
one side can break the other silently.

**Phase 1. Turn the marketplace back on.** Flag on, then find out what has
rotted while it was off. Do this first and alone: it is the only phase where
the failures are pre existing rather than caused by the merge.

**Phase 2. Parties become the spine.** `orders.party_id`, find or create on
order, backfill existing orders. After this a marketplace customer appears
in the customer book. Nothing else changes yet.

**Phase 3. One ledger.** Marketplace payments land in `party_payments`.
`orders.amount_paid` becomes derived. After this the khata is right for both
kinds of customer.

**Phase 4. Products merge.** The risky one, and deliberately late, so it
happens on a codebase where the customer and money models have already
settled.

**Phase 5. The order to sale bridge.** Orders start producing sales. After
this there is one commercial record and the invoice, statement and credit
note flows work for marketplace orders for free.

**Phase 6. Polish.** Sharing links, manual invoices attaching to a party,
the retailer's own four screens.

## 5. What will break if we are not careful

Collected from the code, not imagined.

1. **The 22 state map has duplicate keys.** `payment_completed`,
   `return_approved`, `replacement_requested` and `replacement_issued` each
   appear twice in `orderStatusService`. The later entry silently wins. They
   agree today. Anyone editing one copy will not notice the other.
2. **`orders.inventory_item_id` is a single item leftover.** `order_items` is
   the real content. A branch was already rejected for reading only the
   former and silently dropping the rest of the cart.
3. **Stock is reserved at order creation** and credited back only when a
   payment is abandoned. Any new path that kills an order must return stock
   from `order_items`, and only when nothing has been paid.
4. **Every query that surfaces a listing must filter `visibility`,** or
   private stock leaks into the public catalogue.
5. **Self dealing.** Buyer and supplier being the same account is not a real
   invoice; the reporting queries already exclude it and new ones must too.
6. **A 403 is not a dead session.** The axios interceptor clears the token on
   401 only. Changing that logs people out mid browse.
7. **Four ledgers during the transition.** Between phases 3 and 5 a payment
   could be counted twice. Every phase needs a reconciliation check that the
   khata equals billed minus received, run against real rows.
8. **The cart is one global cart tied to one seller.** Switching supplier
   discards a half built order. It needs to become a saved draft per
   supplier before retailer ordering is usable.

## 5a. Accounts, KYC and OTP

**DECIDED: nobody browses without an account.** A visitor signs up, completes
KYC, and then chooses to be a wholesaler or a retailer. That makes the
catalogue queries simpler, since there is no anonymous case to serve, and it
makes the closed network real rather than a setting.

It also collides with one thing already agreed, and two of the three pieces
are not straightforward. Recording it here so it is not discovered late.

**The shared link cannot require a login.** A wholesaler sending his shop
page or a product link to a shop over WhatsApp is the single most useful
thing in this product. If that link lands on a login wall, the shop does not
sign up, it phones him instead, and the feature is dead. The shop link has
to stay readable by a stranger even when the rest of the catalogue does not.
Suggested split: **browsing the catalogue needs an account, following a
direct link does not.** The unlisted `/listing/:inventoryId` page already
works this way, and its UUID is the secret.

**Aadhaar KYC is not something we can just build.** Authenticating an Aadhaar
number against UIDAI requires being a licensed KUA or AUA, or going through
one. It is a regulated onboarding with contracts and audits, not an API key,
and eKYC access has been restricted to specific categories of entity.
Realistic options, in order of how quickly they can ship:

1. **Collect and store nothing.** Ask for a GSTIN instead. It identifies a
   business, it is already on every invoice, and its first two digits give
   the state, which the tax head calculation needs anyway.
2. **A third party KYC provider,** paid per verification, who holds the
   licence. Normal for a startup and the usual route.
3. **Direct UIDAI licensing.** Slow and probably not available to a company
   at this stage.

Storing Aadhaar numbers also brings obligations under the Aadhaar Act and the
DPDP Act, and a masked or tokenised reference is expected rather than the raw
number. Worth being sure it is needed before designing around it, because
GSTIN may do the whole job.

**Mobile OTP is not free, though it is cheap.** Sending SMS to Indian numbers
requires the sender ID and every message template to be registered under
TRAI's DLT regime, and messages are billed per send. Managed auth providers
have free tiers that a pilot will fit inside, but the DLT registration is
required regardless and takes time. WhatsApp OTP is worth pricing against SMS
since these wholesalers are on WhatsApp already.

None of this blocks the merge. It blocks the sign up screen, and it should be
priced and decided before that screen is designed.

## 6. Open questions, for you

Answered so far: stock is hidden for now (3.1), and nobody browses without an
account (5a). Still open:

1. **Do private listings get a shared `products` row, or a private one?**
   (3.1) Migrating a rate list into the shared catalogue publishes the names
   of a wholesaler's range into space competitors can attach to, even though
   the listings stay invisible.
2. **When an order becomes a sale, at which state?** On payment, or on the
   wholesaler accepting it? Earlier means the khata moves before he has
   agreed to supply; later means a paid order sits outside the khata for a
   while.
3. **Does a retailer with an account see the same rates as everyone else?**
   Or do we go straight to per customer rates? Per customer rates are the
   thing wholesalers actually do, and building the catalogue without them
   means rebuilding the price lookup later.
4. **Do orders from strangers land in the customer book?** Someone with no
   prior relationship who finds the shop page and orders: does a party get
   created for him, or does he stay a marketplace buyer until the wholesaler
   adopts him?
5. **Can one account be both?** The `users.role` column already has a `both`
   value and the code path exists. Does the KYC step let someone pick both,
   or does that mean two accounts?
6. **Does a shared link work without an account?** See 5a. This is the one
   with a business consequence rather than a technical one.

## 7. Still outstanding from before this

These do not block the merge but they are in the same code and will be
touched by it.

- Retailer GSTIN never reaches a marketplace invoice, so the buyer cannot
  claim input credit.
- The tax head is chosen by comparing city names against a hardcoded Delhi
  fallback, instead of reading the state from the GSTIN.
- `DELETE /api/invoices/:id` soft cancels and stamps "Refunded" when nothing
  was refunded. Credit notes exist now; this route should go.
- Credit notes reverse a whole bill. Part returns need a quantity per line.
- Nothing advances an order past `payment_completed` in the UI, so orders
  stall there. Harmless in a demo, fatal in a pilot with real deliveries.

## 8. Raised, parked for later

Noted so they are not lost, deliberately not planned yet.

**Importing old invoices from a GSTIN.** A wholesaler's own filed returns are
reachable through the GST system as GSTR-1 for what he sold and GSTR-2A or
2B for what he bought, but only through a licensed GST Suvidha Provider,
which is a paid procurement rather than a coding task. What comes back is
also invoice level summary data, not line items, so it would rebuild
customers and totals but not what was actually on each bill. Useful for
opening balances, not for history. A CSV or Excel import will do more for
less, and works for the wholesaler who was keeping a paper book.

**The rest of GST compliance.** Rule 46 particulars on the PDF, place of
supply, per HSN rates, GSTR-1 export, e-invoicing thresholds. Listed in
`CLOSED_NETWORK_REDESIGN.md` and unchanged by this merge.
