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
| `wholesale3_order_number_sequence.sql` | Order numbers from a counter instead of dice | run 7 Sept |
| `wholesale3_one_invoice_per_order.sql` | Unique index so one order cannot hold two invoices | run 7 Sept |
| `wholesale3_staff_accounts.sql` | Employees who work on a wholesaler's book | run 7 Sept |

| `wholesale3_delivery_challans.sql` | Goods-out note when a sale is not fully paid | run 10 Sept |
| `wholesale3_invoice_number_format.sql` | Invoice number prefix, suffix and padding | run 10 Sept |
| `wholesale3_invoice_rule46_fields.sql` | Place of supply, reverse charge, round off | run 10 Sept |
| `wholesale3_platform_masters.sql` | Super admin flag, and the state, unit, tax rate and HSN masters | run 12 Sept |
| `wholesale3_series_financial_year.sql` | Sale and challan numbers restart each financial year | run 12 Sept, confirmed by a sale coming out `S/10/26-27` |
| `wholesale3_purchases.sql` | Suppliers, purchases, purchase lines, money paid out, purchase numbering | **NOT RUN** |

One outstanding, added 12 Sept. Until it is run every purchase and supplier
route answers `503 PURCHASES_NOT_SET_UP` and the four screens say "the
purchase book is not switched on yet". Nothing else in the product is
affected, and no existing screen changes. Verified against a database without
the tables: all eleven routes degrade, none returns a 500.

Restart the server after running it. The schema probe is cached per process,
so a running server goes on believing the tables are absent, which is what
caught the sale numbering out on 12 Sept.

After running it, make the first admin by hand. There is no way to do it from
inside the product, by design:

```sql
UPDATE users SET is_platform_admin = TRUE WHERE email = 'you@example.com';
```

Nothing added on 11 Sept needs one: the credit feature moves existing rows and
adds no columns, and removing the "Partial" payment status is code only, since
`invoices.payment_status` carries no CHECK constraint.

To confirm the earlier three landed, since two of them use
IF NOT EXISTS and one can be refused by existing data without stopping the run:

```sql
SELECT
  (SELECT count(*) FROM pg_class
     WHERE relname = 'order_number_seq' AND relkind = 'S')          AS order_seq,
  (SELECT count(*) FROM pg_indexes
     WHERE indexname = 'idx_invoices_order')                        AS invoice_index,
  (SELECT count(*) FROM information_schema.tables
     WHERE table_name = 'staff_members')                            AS staff_table;
-- all three should read 1
SELECT generate_order_number();  -- ORD + today's date + six digits
```

`idx_invoices_order` is the one that can be missing while the others are fine:
it refuses to build if an order already holds two invoices. If it reads 0, the
query at the top of that migration lists the offenders. Sorting them out is a
judgement call, because a duplicate carrying payments needs those payments moved
onto the surviving invoice first, so do not delete on the strength of the query
alone. The application takes a lock before creating either way, so new
duplicates cannot appear whether or not the index exists.

Backfills, safe to run more than once, in this order:

One more, for the customer names already stored wrong. Dry run by default,
and safe to run more than once:

```bash
node scripts/repair_invoice_names.js            # show what would change
node scripts/repair_invoice_names.js --apply    # fill blanks, re-address
```

Documents issued before 12 Sept keep their old numbers, INV-000001 and S-0001
and DC-0001, because a document that has gone out is not renumbered on its own.
To bring a wholesaler's history across, after running the series migration:

```bash
node scripts/renumber_series.js "$DATABASE_URL" seller@example.com                  # dry run
node scripts/renumber_series.js "$DATABASE_URL" seller@example.com --write
node scripts/renumber_series.js "$DATABASE_URL" seller@example.com --write --skip-invoices
```

Scoped to one wholesaler, one transaction, dry run by default, and it refuses
to run at all until the series migration is in, because renumbering history
into a shape the live code will not continue leaves a worse mess than it found.

**Renumbering a tax invoice is not a neutral act.** Its number is what the
customer's books reference and what his input tax credit is claimed against.
For test data this is fine and it is what the script was written for; against
real trading history use `--skip-invoices`.

Part 3 of it only REPORTS orders holding two invoices. Do not merge those with
a script: payments can be split across the two numbers, and which one stands is
a judgement call.

```bash
node scripts/backfill_order_parties.js    # every order gets a customer
node scripts/backfill_order_payments.js   # shop payments into the khata   (done)
node scripts/backfill_order_sales.js      # accepted orders into the book  (done)
```

---

## Done

### 12 Sept 2026

**Razorpay, scaffolded.** Asked for as "absolutely no need to make it working,
just setup fake", then completed "with modal and all, in testing only". Three
endpoints under `/api/orders/:orderId/razorpay/`, a full checkout window, and
no gateway behind any of it.

`RazorpayCheckoutModal` imitates the real window: merchant, amount, gateway
order id, the four methods, a form per method, and a declined path because a
checkout that can only succeed teaches nobody what the screen behind it does
when it does not. Nothing typed into it is read, validated or posted, and the
file is written to be DELETED rather than extended when the real gateway goes
in, since Razorpay collects card details inside its own iframe precisely so
they never touch our code. The test banner is not dismissible: a convincing
fake payment screen is the one thing here that could mislead somebody into
thinking money had moved.

**The one decision worth knowing:** the stub signs its fake payments with REAL
HMAC-SHA256, over the same string Razorpay signs, and `verifySignature` is the
same function in both modes. Returning `true` in stub mode would have been less
code and is how a fake gateway becomes a live hole: somebody sets a key one
afternoon, the branch is the wrong way round, and the verify endpoint accepts a
payment id posted by anyone holding the order number. Money is the one place
where the untested path must not be the one that says yes. Going live changes
the keys and the order-creation call, and changes nothing about what is trusted.

Stub mode is the ABSENCE of a secret, not a flag: a flag and a credential can
disagree, and the failure when they do is the expensive one. The `simulate`
endpoint, which mints valid signatures, 404s the moment a real secret exists.

Nothing in the Razorpay code settles money. Once a signature checks out it
hands to `orderController.updatePaymentStatus`, which is the one place that
knows what is owed, caps at it, mirrors into the khata, reconciles the invoice
and moves the order. A second settlement path would be a second copy of those
rules.

**Found while building it:** order creation leaves its own pending
`payment_transactions` row, for the whole subtotal, which `initiatePayment`
later supersedes with the correct instalment. Opening a gateway order against
that placeholder would have asked a buyer on the 50/50 plan for the full amount
instead of his first half. The session is now matched on `buyer_id`, which only
`initiatePayment` fills. Not on `payment_type`, which looks like the obvious
choice and is not: a legacy BEFORE INSERT trigger on that table copies
`payment_method` into `payment_type`, so the placeholder comes out with a type
nobody set.

**Still needed before it is real**, all listed in `razorpayService.js`: the
Basic-auth POST to `api.razorpay.com/v1/orders`, which is refused loudly rather
than faked; a webhook at `/api/webhooks/razorpay` verifying
`X-Razorpay-Signature` over the raw body, because the browser handler never
arrives if the buyer's browser dies after paying; and Razorpay Route with
linked accounts, since every rupee here would land in ONE account and this is a
marketplace where the money belongs to whichever wholesaler was bought from.
That last one is the real work behind "the UPI needs to be of each wholesaler
we are buying from".

**Verified:** 29 checks in `razorpay_check.js`, weighted towards what it
refuses: a forged signature, a signature that is genuinely valid for a pair the
attacker chose (which catches trusting the order id in the request body), an
empty payload, another buyer driving someone else's payment, an amount in the
request body, and replaying a handler payload to pay twice. 890 checks across
27 suites all green.

**The purchase book,** the other half of the trader's day. Goods coming in,
who they came from, what is owed for them, and what tax on them can be
claimed back. Five screens under `/seller/purchases` and `/seller/suppliers`,
and the deliberate mirror of the sales spine rather than a new idea:

| Sales | Purchases |
|---|---|
| `parties` | `suppliers` |
| `sales` | `purchases` |
| `sale_lines` | `purchase_lines` |
| `party_payments` | `supplier_payments` (money out) |
| `sale_sequences` | `purchase_sequences` |
| `khataBalance.js` | `supplierBalance.js` |

**Suppliers are a separate table, not a `kind` column on parties.** That was
the first idea and it is the wrong one. A party row means "he owes me", and
that meaning is baked into seventeen queries across five files: the customer
list, the overview totals, the statement, the credit service, `khataBalance`.
Every one would need a new filter, and the first one missed puts a supplier in
the customer list with his balance pointing the wrong way. The cost is that a
firm a wholesaler both buys from and sells to is two rows, which is the same
trade `parties` already made, and it fails in the safe direction.

**Three things a purchase has that a sale does not:**

- **The supplier's own bill number and its date**, because that is what GSTR-2B
  matches on and it cannot be reconstructed later. Unique per supplier per
  wholesaler, so the same bill cannot be entered twice. That is not tidiness:
  entering a purchase bill twice claims its input tax credit twice, and both
  rows look correct on their own afterwards.
- **`itc_eligible` per line.** Section 17(5) blocks credit on a list of things
  a trader genuinely buys, and one supplier bill can carry both kinds. The
  purchase page reports claimable credit separately from the bill's own GST,
  and says so when they differ.
- **No invoice.** The bill is the supplier's document, not ours.

**Nothing touches stock, on purpose.** The obvious next thought is that a
purchase should raise stock. It must not yet, because a sale does not lower
it: `sale_lines` stores an item name as text and touches no inventory row.
Wiring one side only gives a figure that climbs forever and is wrong from the
first purchase onward, which is worse than the honest nothing there is today.

**Known limit, stated rather than hidden.** The bill total is computed through
`gstService`, the same function the sale and the invoice use, so there is one
arithmetic. But the authority on a purchase is the paper the supplier handed
over, and his software may round a line differently, so a computed total can
land a rupee from the printed one. That gap matters when it is claimed and
matched against GSTR-2B. The form tells the wholesaler to check against the
printed figure and that the printed one is the one that counts. Letting him
state the tax off the bill is the correct next step.

**The permission is new and fails closed.** `purchases` is its own key, kept
apart from `sales` because a man trusted to write sales is not automatically
trusted to see what stock costs, and apart from `payments` because that is the
right to take money IN. An employee taken on before this existed has a stored
list that does not contain it, so the owner has to tick it. That is the
direction `staffAccess` already chose deliberately.

**Two bugs fixed while sweeping, both found by running the code:**

- **A bill reversed by a credit note still counted as money to collect.**
  `getDashboardStats` excluded cancelled invoices and not credited ones.
  Cancelling and crediting are different instruments, and a credit note
  deliberately leaves the invoice `Generated` and `Pending`, because under GST
  the document stands and is reversed by another document. So a fully credited
  bill went on counting towards "still to come in", towards revenue, and
  towards the unpaid count. The list beside the card already showed the row as
  "Credited": the card and the row underneath it disagreed, and the wholesaler
  was shown money to chase that he had already credited back. Reproduced with
  four bills, fixed, and locked down by four new checks in
  `invoice_payment_check.js`. This is the same shape as the complaint on
  11 Sept about bills reading unpaid when they were paid.
- **The two purchase detail screens said "not found" when the migration had
  not been run.** The server answers `503 PURCHASES_NOT_SET_UP`; the list
  screens read it, the detail screens read anything-but-404 as a generic
  failure and fell through to "Purchase not found". Telling a wholesaler his
  bill does not exist when the truth is the feature is not installed is the
  wrong answer to give about his records. Found by rendering the screens
  against a mock in that state.

**`client/src/utils/money.js`,** the destination the eighteen local `money()`
helpers collapse into. Not a nineteenth copy: the purchase screens use it from
the day they are written so the new work does not add to the pile, and the
existing screens move onto it one at a time. That ordering is what unblocks
`/master/settings`, which cannot control decimals and grouping while eighteen
components each format their own.

**Verified:** 861 checks across 26 suites, every database carrying every
migration. A new `purchase_check.js` drives 55 of them through the real
controllers: scoping on every id, the duplicate supplier bill, paying more
than a bill owes, editing a total below what has been paid, cancelling
releasing payments onto the account rather than deleting them, the totals not
netting across suppliers, blocked input credit, and eight concurrent
purchases taking eight distinct numbers. The five screens rendered at 1280px
and 400px, plus the not-set-up and empty states, with no sideways scroll and
no `NaN` or `undefined` on any of them.

**The platform master dashboard,** at `/master`, its own area with its own
layout and its own guard. States, units, tax rates and HSN codes, all
editable, plus an overview that says what is there.

A separate area rather than a page inside the seller workspace, for three
reasons pointing the same way: `/seller/*` is guarded by role seller|both, so
a Master screen inside it would be unreachable to a platform admin who does
not also sell; CLAUDE.md already says the seller dashboard is for wholesalers;
and they are different jobs. An admin who is also a wholesaler gets a
"Platform master" link in his sidebar footer and his account label reads
"Admin account" rather than "Wholesaler account". That label is presentation
only, the role stays what it is.

**Deactivate, never delete.** Every list carries `active`, switching a row off
stops it being offered, and the row stays because a document already issued
may name it. The screen says so where a person can see it. The last active row
in a list cannot be switched off, and the attempt is put back rather than left
half done.

**What is deliberately NOT in master:** a wholesaler's invoice prefix, his due
days, his default tax rate, his terms. Those are his and they stay on his own
Invoice defaults screen; if they lived in master, one wholesaler changing his
prefix would change everybody's. The overview screen says this outright,
because somebody looking for "invoice settings" will look there first.

Writes sit behind `requirePlatformAdmin`, which reads the flag from the
database on the request. The client guard only decides whether to draw the
screens; anyone past it finds every button returning 403. Editing a curated
HSN row leaves it marked curated rather than quietly relabelling it as the
admin's own.

**A white screen on the Overview, found while rendering this.** For an
employee without the money permission `overviewController` sends `money: null`
rather than zeros, deliberately, so the screen can say "not shown to you"
instead of claiming the business is owed nothing. The server had done its half
since the permission was built and the screen never did its own, so that
employee got a blank page on the first screen he lands on. It now says the
figures are withheld and shows him the rest of the page.


**All three documents are numbered the same way now.** They were three shapes
with three padding widths and no year on any of them:

    invoice   INV-000001   restarted yearly
    sale      S-0001       never restarted
    challan   DC-0001      never restarted

They read `INV/1/26-27`, `S/1/26-27` and `DC/1/26-27`, all restarting each
1 April. `wholesale3_series_financial_year.sql` adds the financial year to the
two counters that lacked it and makes it part of their key, carrying existing
counters into the CURRENT year rather than resetting, so nobody's next sale
collides with one he issued last week. Numbers already printed on a document
are left exactly as they are.

Only the invoice series is a legal requirement; a sale is the wholesaler's own
record and a challan under this product's rule is explicitly not a tax
document. The reason for the other two is legibility.

**And a third copy of the sale numbering, found by breaking it.** There were
two `nextSaleNumber` functions, one in saleController for a sale typed by hand
and one in orderSaleService for a sale written when an order is accepted.
Changing the shape in one and not the other is exactly what happened: sales
from the sales book took the new number and sales from an accepted order
crashed on an ON CONFLICT that no longer matched. Both, and the challan
counter, now come from `services/seriesNumbers.js`.


**The invoice number carries its financial year now.** A new wholesaler's
default shape is `INV/1/26-27` rather than `INV-000001`: six leading zeros and
no hint of which year it belonged to. Busy's own sample is `OM/1/26-27` and
our compose() reproduces it exactly.

The `{FY}` placeholder is substituted when the number is taken, so it follows
the year forward on its own. A suffix typed as the literal "26-27" would still
say 26-27 next April, which is a wrong year on a legal document, and the field
hint says so.

Padding drops to 0 by default because the year already makes it read as a
series. `INV/1/26-27` is eleven characters with room for six digits inside
Rule 46(b)'s sixteen; `INV/000001/26-27` is sixteen exactly, with no room at
all. A wholesaler who has already saved a format keeps it; this only decides
what somebody who has never opened the screen gets.

**Two dead paths found while doing it.** `invoice_settings` has carried
`number_suffix` and `number_pad_to` since 10 Sept, and the repository has
always written them, but the save route dropped both from the request and the
save mapping dropped both from the reply. So the columns were unreachable from
either direction and every wholesaler was stuck on the default whatever he
set. Both are wired now.

**A live sample, which Busy has and we did not.** `compose()` and `roomFor()`
were written on 10 Sept, exported, and never called by anything.
`GET /api/invoices/number-preview` now serves them and the settings screen
shows the sample as he types, with the financial year and how far the shape
can run. Asked of the server rather than worked out in the client, so the
sixteen character rule is checked by the same function that enforces it: a
second copy in the client is how a screen ends up promising a number the
server then refuses. An illegal shape is also refused at save time, tested
against the widest sequence it will ever reach rather than against number 1.


**Platform masters, and the super admin who owns them.** Four lists that were
constants in code, so correcting one meant a deploy: 37 states with their GST
codes, 7 units, 7 tax slabs, 32 HSN codes. `wholesale3_platform_masters.sql`
creates and seeds them, the seed generated from the running constants rather
than typed, so the tables cannot start life disagreeing with the code still
falling back to them.

The admin is a FLAG, `users.is_platform_admin`, not a fourth role. `users.role`
carries a CHECK allowing only buyer, seller and both, and an admin is not a
fourth kind of trader. It is read from the database on every admin request
rather than carried in the token, because a revoked admin has to lose his
powers at once and not whenever his session happens to expire.

That makes flash sales reachable for the first time. `promotionController` had
three checks against role `'admin'`, a value the constraint can never hold, so
the feature was unreachable rather than merely unbuilt. The dead checks are
gone and the routes use `requirePlatformAdmin`.

Every master read falls back to the constant it replaced, and an EMPTIED table
falls back too, because an empty list is a mistake rather than an instruction
and serving it would empty every dropdown in the product. `master_check.js`
runs both ways, with the migration and without.

**What still reads the constant, deliberately.** `placeOfSupply` resolves a
state name to its GST code synchronously, at module load, on the path that
decides CGST plus SGST against IGST. Making that asynchronous so it could read
a table is a separate change with its own risk. So the state master feeds the
dropdowns and the admin console; adding a state there does NOT yet change how
tax is computed for it. Written down rather than discovered later.

**A settled bill read as wholly unpaid on the Invoices header.** Reported with
a screenshot: two invoices both marked PAID in the list, above a card reading
"1,35,700 still to come in, 2 unpaid", which was their exact sum.

Yesterday's fix made the three cards sums of each bill's balance, worked out
from the invoice module's `payments` table. But a bill raised from the SALE
side deliberately writes no row there: that money is already in party_payments
against the sale, and writing it twice is what once made a bill read Paid while
the customer still owed the lot. So every sale-side bill counted as fully
outstanding. Since a bill is now Paid or Pending and nothing between, the stamp
answers it outright, and the payment rows are consulted only for one that is
not settled.


**"Partial" is gone from invoices.** Decided today, closing the conflict this
file had carried since the 10th. A bill exists only once the money is all in,
so it can never honestly be half paid: `payment_status` is Pending or Paid and
nothing between. What HAS come in is still carried by the payment rows, which
is where the Invoices header reads it from, so nothing is lost and only the
status word stopped describing a state that is not supposed to exist. The list
filter for "Not paid" also matches legacy `Partial` rows, or a bill with money
owing would drop out of the list meant to chase it.

**One rule for what has come in against a sale,** in `services/saleSettlement.js`.
Three places each kept their own copy and no two agreed. Money on an
order-backed sale sits in two places, and the khata holds two KINDS of row:

  - a mirror of the shop payment, written with `order_id` and
    `payment_transaction_id` set, so the customer's balance is right
  - money the wholesaler took himself and typed in, with a `sale_id` and
    neither of those

Adding them counts the shop payment twice, which is why the rule had been
GREATEST. But GREATEST has the opposite fault and it is worse: a wholesaler
who takes the second instalment in cash and records it adds a row that never
exceeds `orders.amount_paid` on its own, so it is swallowed whole. The sale
never settles, the bill is never raised, and the customer's page says he is
square while the sale page says he still owes. The same complaint made on
11 Sept, arriving by the other road. The rule is now `orders.amount_paid` plus
only the khata rows carrying no `order_id`.

**A returned order could be left with a tax invoice and nothing reversing it.**
`unwindReturnedOrder` looked only at `invoices.order_id` and missed two cases:

  - a bill raised from the SALE, which is what a cash settled order-backed
    sale produces: it carries a `sale_id` and no `order_id`
  - a bill that had not landed yet, because both billing paths run in the
    background, so a briskly completed return outran it

It now finds the bill by either road, and raises it first if the order is
settled but its bill has not caught up, because the sale is cancelled moments
later and both billing paths correctly refuse a cancelled sale.

This is the fault that had been showing up as `return_check` failing only when
the suites were run back to back and the database was busy. It was dismissed
as a flake on 11 Sept. It was not a flake.

### 11 Sept 2026

A day of hunting rather than building. Two faults a wholesaler reported, seven
more of the same kind found by going looking, and one feature that turned out
to be the real answer to the second report.

**The challan reached the order side.** The button and the challan list are on
the seller's order detail screen, not only on the sale page, and the orders
list carries a challan count the way the sales list does. Both go through the
sale behind the order, so there is still one document trail. `createForOrder`
returns `noSale` for an order nobody has accepted yet, and the screen is told
`hasSale` so it can stay quiet rather than offer a button that will refuse.

**A settled sale bills itself.** `billIfSettled` runs after a payment is
recorded and after a cash sale is written, so the last rupee raises the bill
instead of it waiting for somebody to remember. The "Make invoice" button now
only appears when the sale is actually settled; it used to show on any
confirmed sale, and pressing it on an unpaid one returned a 409 and redrew the
same screen, which read as a button that did nothing.

That second caller exposed a hole in the first: `createInvoiceFromSale`
checked for an existing invoice outside its transaction, so the auto bill and
the button could both read "none yet" and both write one. Harmless while a
person was the only caller. The check is now repeated under an advisory lock
on the sale, and the loser hands back the winner's invoice.

**The status route was leaving two things behind.** Found by walking every
cell of the challan grid against the route the screens actually use rather
than the service behind it.

- Marking an order delivered did not deliver its sale. The mirror lived in
  `orderStatusService`, and the "Mark delivered" button does not go there: it
  PATCHes `/orders/:id/status`, which writes the status itself. So the order
  read delivered and the sale read confirmed for ever, which is the exact
  drift the sale's own delivered button was removed to prevent.
  `follows_order_check` passed throughout because it drives the service, which
  was the half that was right. One helper now, `markSaleDelivered`, called
  from both, and the suite checks both.
- The same route would also cancel an order, writing the word and nothing
  else: sale left standing, stock left reserved, customer still owing for
  goods that were never coming. Cancelling belongs to `POST /cancel` and
  refunding to `POST /refund`; both are refused here now with a message saying
  where to go. Nothing in the product used that path, so no visible behaviour
  changed. The route allowed it, which was enough.

**Four screens were answering one question with different sums.** The first
was reported: an order reading "all paid" whose sale read "the whole amount
still due".

- **The sale.** Money from a shop order lands on `orders.amount_paid` and
  nothing tags a `party_payments` row to the sale, so the Sales list and the
  sale page, which both added up `party_payments` alone, answered zero. Both
  now read the figure the server already computes for the challan rule, which
  takes the greater of the two rather than the sum: that is one lot of money
  written down twice, not twice in the till. The sale page also says where the
  money came in, so an empty payments list is explained instead of puzzling.
- **The Customers page header.** Total billed counted sales alone while "Still
  to collect" beside it counted shop orders too, so a wholesaler with an order
  he had not accepted read "Total billed 0" next to "Still to collect 710". It
  reads `khataBalance`'s one rule now, the same one the Overview reads.
- **The Invoices tab header, all three cards.** "Still to come in" took the
  whole `grand_total` of a part paid bill, so 710 already received still
  showed as 1,420 to come. "Received" counted only bills stamped Paid, so that
  710 appeared on neither card: money in the till, on no card. And the count
  beside the first counted Pending while its amount included Partial, so the
  card could read "1,420 - 0 unpaid". Each bill's own balance is worked out
  first now and the cards are sums of balances.
- **A race hid that last one.** Checkout raises the bill in the background, so
  a buyer who pays at once has two callers arriving together: checkout
  creating the bill from an order with nothing on it, and the reconcile
  finding no bill, creating, losing under the lock and being handed the other
  one back with the payment never recorded. The bill then sat Pending with
  nothing on it until the final instalment healed it. `reconcileInvoiceForOrder`
  asks once more after creating. Only reachable with `CHALLAN_WHEN_UNPAID=false`.

**A challan raised against an order stayed "Not billed" for ever.** The sale
side stamped its challans when it billed; the order side, which is where a
shop order's bill comes from, never did. `markInvoicedForOrder` closes it,
called from both creation and reconcile.

**Setting a customer's credit against his order.** The second report, in the
wholesaler's own words: "I was owed nothing, he paid me, and now I owe him 2
lakh."

Every figure along the way was arithmetically right:

    he returns a 2 lakh order, not refunded    you owe him 2,00,000
    he orders 4 lakh, pays half                he owes 0
    he pays the other half                     you owe him 2,00,000

The credit was never spent. The khata is one netted number per customer, so
billing him 4 lakh cancelled his 2 lakh on the display and settling that bill
uncovered it again. Underneath, he had been asked to pay the whole 4 lakh
while 2 lakh of his money sat in the till, because nothing could set a credit
against an order, although two screens offered to: the Overview says "Refund
it, or set it against their next order", and the refuse modal says the same.
Neither had ever meant anything.

`services/creditApplyService.js` implements it, as a panel on the customer's
page. It does not invent a payment: those rupees are already counted in what
he has paid, which is why he is in credit, so a fresh row would count them
twice and double the problem. It re-addresses the payments that no live goods
are standing against, pointing them at the bill the wholesaler chooses, and
splits a row where the credit is bigger than the bill. His balance does not
move, because nothing has happened between the two of them; the bill reads as
paid because it now is; and the credit is gone. The order is told too, so it
stops asking for money already handed over, with a line in its history saying
where that money came from.

The credit is measured as the loose rows rather than as the balance, because
the balance is exactly what hid it: asked at the moment it mattered, it
answered "no credit" while 2 lakh was plainly in the till.

Cancelling was considered for removal and kept. It is not the source: the case
above is a RETURN, and refunds and overpayments do the same thing.

**Two new suites, and a reset.**

- `challan_matrix_check.js`, 130 checks: every sale status against every
  settlement state, the order lifecycle walked end to end three ways, the
  feature flag both ways, the migration missing, every challan reason, and
  both screens agreeing about the same goods. It found the two status-route
  faults.
- `flow_check.js`: one order from listing to catalogue to checkout to
  acceptance to challan to delivery to bill to return to refund, checking at
  every step that the khata, the Overview, the statement, the order and the
  sale still agree. It found three of the four sum mismatches.
- `credit_check.js`, 22 checks, pinning the report above and the split case.
- `scripts/reset_books.js` for starting fresh. Scoped to one wholesaler by
  email, dry run by default, one transaction, explicit deletes in dependency
  order rather than TRUNCATE CASCADE so it cannot quietly empty a table nobody
  listed. Clears orders, sales, invoices, challans, credit notes, payments,
  customers and the numbering counters; keeps logins, profile, staff, products,
  listings and invoice settings. It does NOT put reserved stock back, because
  nothing records what the figure was before, so it prints every listing and
  says to correct them by hand. Rehearsed against a local Postgres holding two
  wholesalers: 93 rows cleared for the named one, the other untouched.

**Not finished, and worth knowing.** The browser sweep covered 19 of 22 seller
screens clean; three are still flagged (`overview`, `products`, `promotions`)
and it is not yet established whether those are real or artefacts of the
throwaway mock. The buyer side was never rendered at all, and nothing was shot
at phone width.


### 10 Sept 2026, third batch

**Renamed to KhazanaBMS.** Five screens each held their own copy of the
wordmark; they now read from one constant through a `Wordmark` component. The
browser tab said "wholesale-product". Server side too: email header, welcome
notification, and the fallback on an invoice when a wholesaler has not filled
in his own company name. The support address and the mail sender still point
at marketplace domains, because inventing an address that bounces is worse
than the inconsistency.

**The sign in buttons stopped jumping.** Pressing "Create Account" moved them
126px up the screen, out from under the cursor that had just clicked them,
because the column was vertically centred and Create Account is 252px taller.
Reserving a height would not have fixed it: the column is 436, 688, 790 and
798px in four reachable states. The top edge is anchored instead. Measured
zero movement at 900, 800 and 720.

**Promotions is hidden** behind `FEATURES.PROMOTIONS`, not deleted. The route
redirects rather than 404s. It was never usable: creating a flash sale is
admin only and there is no admin console.

**Delivery challans, to the specification given.** While a sale is unpaid or
part paid the wholesaler gets a challan and the tax invoice waits. No tax on
the challan. This is NOT what section 31(1) says, the wholesaler knows, and it
is going to a legal advisor; it is behind `CHALLAN_WHEN_UNPAID` so it can be
switched off in one word. Rule 55's three copies, provisional quantity and the
six month approval window were deferred by instruction.

One conflict came out of it and is recorded rather than hidden: this rule and
the 50/50 instalment plan cannot both be true, because an invoice that only
exists once settled can never be in the Partial state. `invoice_payment_check`
now sets the flag off and says why.

**The invoice number ring.** Both defects fixed. The counter keys on the
FINANCIAL year, so it no longer rolls over on 1 January and reuses a serial
inside one return period. The whole composed number is checked against Rule
46(b)'s 16 characters and allowed characters, where before only the prefix was
clipped. The shape follows the Busy dialog: prefix, number, suffix, optional
padding, so `OM/2/26-27` is reproducible, and `compose()` is pure so a screen
can show a live sample.

**Six Rule 46 particulars now print.** Copy title, supplier PAN (read out of
the GSTIN, not a second field), total quantity, amount in words, and the
HSN-wise tax summary needed no new data. Place of supply with its state code,
reverse charge and round off got columns. Old invoices are untouched, because
a tax document must not change after it has been handed over.

Verified: 21 suites, 515 checks, plus both smoke shapes. Both PDFs rendered
and looked at, which caught the challan disagreeing with itself: its line
column summed to the pre-tax figure while its total showed the tax inclusive
one.

### 10 Sept 2026, later

**The name on the bill did not match the name on the order.** Reported from
real use, reproduced, and it was two faults sitting on top of each other.

The Orders tab reads `wholesaler_profiles.company_name` off the buyer's
account. The invoice reads the party, and the party created at checkout was
given the delivery address name and nothing else. So the same man was "Kishan
Cloth House" on one tab and "Kishan Kumar" on the other. Checkout now passes
his firm and his GST number into the customer book, filling blanks only, so
nothing a wholesaler wrote himself is rewritten.

The GST number is the half that costs money: no order placed through the shop
has ever carried the customer's GSTIN onto the invoice snapshot, and a bill
without it is one his customer cannot claim input credit against. It only
looked right on screen because the list falls back to joining the account,
which is the fallback the snapshot columns exist to avoid.

**And there were genuinely two invoices.** Checkout raises one from the order
in the background; pressing "raise bill" on the sale raised a second, because
that path only looked for an invoice against the sale. One lot of goods, two
numbers, two rows in the tab, under two different names. Both directions are
closed now and both take the same advisory lock, which matters because the
checkout one is not awaited and loses the race about half the time.

`scripts/repair_invoice_names.js` handles rows already stored. Dry run by
default; `--apply` does the two safe parts. Duplicates are REPORTED only,
because payments may be split across the two numbers and deciding which one
stands is a person's job.

### 10 Sept 2026

**Which state the wholesaler sells from, asked once.** The field that decides
whether a bill charges CGST plus SGST or IGST was never asked for anywhere.
`wholesaler_profiles.city` defaults to `'Delhi'`, so a Surat wholesaler's first
invoice was worked out as though he sat in Delhi. Signup now asks, of anybody
who says he sells, from a list rather than a box: "Gujrat" typed by hand
matches no customer's state and would send every local sale out as
inter-state. Settings has the same list and the server refuses a value that is
not a state.

The question is now asked in one place, `services/placeOfSupply.js`. It was
asked three ways: `invoiceService` read one chain of columns, `saleInvoiceService`
read a slightly different one, and `gstService` then guessed a state by looking
the answer up in a hand written map of about fifty cities. The order is now by
what each source knows: the state he declared, then the state his GST number
carries, then his city. A GSTIN's first two digits ARE the state, which is not
a guess, and that matters most for a customer, who is usually entered with a
name and a phone and nothing else.

Unknown stays null and reads as the same state, so a walk in customer is billed
CGST plus SGST, which is what a local sale is. Same answer as before, honest
route: the old code got there by asserting both sides were in Delhi.

The map pin was already behind `FEATURES.MARKETPLACE`, so that half needed no
change.

**One switch for one delivery.** An accepted order writes a sale, so one lot of
goods was two rows and neither was in charge. The order has the 22 state
lifecycle that stamps a delivery date and opens the return window; the sale had
a plain "Mark delivered" that knew nothing about it. Press the order and the
sale sat at confirmed for ever; press the sale and the order sat at shipped
with no delivery date, so the seven day return window had nothing to count
from. The order is now the only switch and the sale mirrors it, the way
cancelling already worked.

Editing was refused on the same rows, found while writing the tests: nothing
stopped a wholesaler retyping the lines of an order backed sale and moving the
debt away from the figure the customer pressed pay on. `orderSaleService` has
said that was the one rule that matters since it was written, and nothing
enforced it.

**HSN codes, kept to what can be checked.** The shape is enforced, 4, 6 or 8
digits, on listings and on sale lines, with the message naming the line. Blank
stays allowed: most of what a small wholesaler sells was never classified, and
a gap on a bill beats a false description. The box suggests the codes he has
already put on his own goods, commonest first, read from his listings and his
sale lines, and behind those 32 common textile headings labelled Common with
a note telling him to read the description first.

No rate table, and a test asserts there is none. Rates change, the same heading
carries different rates by price slab, and a rate presented as authoritative
puts a wrong tax on a legal document.

**The retired rate list is gone.** `RateList.jsx`, `AddItemModal.jsx`,
`itemController`, `itemRoutes` and the `/api/items` mount, deleted. Two places
were still reading the dead table and both were quietly wrong: `resolveRates`
took a sale line's GST rate from `items`, so a rate changed on the product page
changed nothing it could see, and the overview counted `items` for "products",
so that number froze on the day of the merge. Both now read the listings. The
`items` table itself stays: its rows are the audit trail for the merge, and
dropping data is a separate decision.

**The invoice total is ruled, not filled.** It sat in a rounded dark pill with
white text, which is a web button dropped onto a document, and it is the first
thing a customer looks at. Rules above and below on the PDF and both screens,
plus the credit note total and the statement's closing balance, which had the
same bar.

Verified: 19 suites, 456 checks, plus both smoke shapes. Three of the suites are
new, `place_check.js`, `hsn_check.js` and `follows_order_check.js`. The PDF and
the screens were rendered and looked at rather than read.

### 5 Sept 2026

**The sign in screens fit a laptop.** They were sized for a hoarding: the panel
took 55 percent of the width with a 48px headline, and the form sat at the top
of a tall column with a third of the screen empty below it. Header, form and
small print now share one column. The panel carried an eyebrow, a three line
headline, a paragraph, three feature bullets and an early access card, plus
twelve drifting dots; it now shows one thing, a page of the book, marked as an
example.

**Staff, after real use.** An invite that was turned off could not be turned
back on, which was a trap of my own making: the row sat disabled for ever and a
second invite was the only way out. Somebody who never joined now returns to
invited with a fresh code. Removing a person is possible at all now, and safe:
history rows point at `users.id`, not at `staff_members`, so his name stays on
what he did.

**Switching dashboard tabs.** Hovering a nav item fetches its code. Measured on
the production build over a 250kbps link with 300ms latency: a cold click took
369 to 638ms, the same click after the pointer rested on it took 61ms.

**Staff accounts.** A wholesaler's people can work on his book with their own
logins. Until now every employee used the owner's, so nothing could say who did
a thing and access could not be taken back from somebody who had left.

The feature is one substitution and everything else is consequence. Two ideas
that were the same variable are now apart: the person signed in, who owns the
history entries and the notifications, and the business being acted on, whose
customers and money these are. For an owner they are the same id, which is why
`req.user.id` was doing both jobs and why getting it wrong is invisible in any
test that only has owners in it. `middlewares/businessContext` resolves it once,
chained into `authenticateToken` so a route cannot forget it.

Sixty odd call sites were gone through one at a time rather than swept.
`performedBy` on an invoice log, the name on a status history row and the
recipient of a notification are all still the person; swapping those would have
been the same bug pointing the other way.

Permissions are per employee and changeable whenever. A new employee starts
with everything, which is the rule already agreed, and the owner takes things
away. Four things are owner only and deliberately not grantable: business
settings, the GST number, the UPI id, and staff management itself.

Two decisions worth keeping. Turning somebody off is not the same as never
having employed him: resolving a disabled employee as his own owner handed a
sacked man a working, empty seller dashboard, so he is now refused outright. And
an employee without the money permission still gets the Overview, because the
lists on it are his work; the money block is withheld rather than zeroed, so the
screen can say it is not shown to him instead of telling him the business is
owed nothing.

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

## Next session, agreed 12 Sept

Taken off the master overview screen and put here, because the screen is for
doing the work and this is the reasoning behind it.

### Why our own checkout window and not Razorpay's?

Asked 12 Sept. Left open deliberately, not answered.

What exists today is `RazorpayCheckoutModal`, a local imitation of the checkout
window: our markup, our method list, our fields. The real integration loads
`checkout.razorpay.com/v1/checkout.js` and calls
`new window.Razorpay(options).open()`, which renders Razorpay's own window in
an iframe they control.

The question to settle is whether the imitation should have been built at all,
or whether the real script should have gone in from the start with test keys
(`rzp_test_...`) driving Razorpay's own sandbox.

Worth weighing tomorrow, without prejudging it:

- What the imitation costs if it is thrown away, against what it taught.
- Whether Razorpay's test mode needs an account and keys before anything can
  be seen on screen, and whether we have them.
- That card details must never reach our code, which is the reason their window
  is an iframe. Any path where our fields become real is the wrong path.
- Whether the sandbox works offline and in this repository's test setup.
- What is genuinely shared either way: the two server calls around the window,
  which is where the signature check lives and which do not change.

### The UPI QR code: how do we know he actually paid?

Raised 12 Sept, and it is the sharpest open question in the product.

**Today there is no verification at all.** The buyer scans the wholesaler's UPI
QR, pays in his own bank app, comes back, and presses a button to say he paid.
`updatePaymentStatus` caps the claim at what is owed, and that is the entire
check. Nothing confirms the money moved. A buyer can press the button having
paid nothing, and the order will read paid, the khata will credit him, and the
invoice will be raised.

It has held so far because this is a closed network where the two parties know
each other and the wholesaler sees his own bank alerts. It does not scale, and
the reconcile button is the wholesaler's only recourse.

**The options, roughly in order of cost:**

| Approach | What it buys | What it costs |
|---|---|---|
| Wholesaler confirms receipt | A second pair of eyes before the khata moves | A step, and a delay, on every order |
| UPI reference typed by the buyer | Something to match against a bank statement | Still self-declared, just harder to fake casually |
| Bank statement import, matched on reference and amount | Real confirmation, no gateway needed | Parsing per bank, and a matching rule |
| A payment gateway with a webhook (Razorpay) | Actual confirmation from the network | Fees, KYC, and Route for per-wholesaler settlement |

The reference field already exists and is already stored, so option two is
mostly wiring. Option four is scaffolded, see the Razorpay note above, and the
real blocker there is not the integration but Razorpay Route: money must land
with the wholesaler who was bought from, not in one platform account.

**The question to settle before building any of it:** does the wholesaler want
the money confirmed before the customer's khata moves, or after? Confirming
first is correct and slows every order down. Confirming after is what happens
now and means a khata that can be wrong until somebody notices. That is a
trade for the wholesaler to make, not for us.

### The purchase side, next steps

Built on 12 Sept, and these are the pieces deliberately left out.

- **Let the wholesaler state the tax off the supplier's bill** instead of only
  computing it. See the known limit above: a computed total can land a rupee
  from the printed one, and the printed one is what GSTR-2B matches.
- **Stock movement, both directions at once.** A purchase raising stock while
  a sale does not lower it is worse than neither. Doing it means giving
  `sale_lines` and `purchase_lines` a real link to an inventory row, which is
  a piece of work in its own right, not a column.
- **A purchase return, or debit note.** The mirror of the credit note. Goods
  going back to a supplier reverses part of a claim already made.
- **An input credit total for a period**, across purchases, set against the
  GST charged on sales. Each bill already reports its own claimable figure;
  what is missing is the sum over a month and the comparison.
- **A supplier statement and its PDF**, the mirror of the party statement.
- **Purchases on the Overview.** The home screen answers "who owes me" and
  says nothing yet about who he owes. `payableTotals()` already returns the
  two figures it would need.
- **Enter a purchase from a product.** The form takes typed item names only;
  the sale form has `ItemPicker` reading his own listings, but a supplier's
  description of the goods is usually not his own, so this needs thought
  rather than copying the component across.

### What belongs in master, and what stays with the wholesaler

The split is the thing most likely to be got wrong, and somebody looking for
"invoice settings" will look in the master area first.

**His, and staying on his own Invoice defaults screen:** invoice prefix,
suffix and padding, payment due days, default GST rate, notes, terms, bank
details, GSTIN. If any of those lived in master, one wholesaler changing his
prefix would change everybody's.

**The platform's, and still to build in master:**

| Setting | Why it is platform level |
|---|---|
| Currency decimal places | one convention for every Indian trader |
| Number format mask `9,99,99,999.99` | the lakh and crore grouping is not a preference |
| Currency symbol, character, string and sub-string | the string is what builds the amount in words |
| Date format | same |
| Tax rate decimal places | Busy keeps it separate from currency and so should we |
| Rule 46(b) limits: 16 characters, allowed alphabet | law, so read only in the UI |
| The number shape a brand new wholesaler starts from | a default, not a rule |
| Feature flags | marketplace, promotions, the challan rule |

**Per wholesaler with a platform default:** minimum HSN digits. It follows HIS
turnover, six above 5 crore and four below, so it cannot be one platform
number. Busy makes it a setting with 0 meaning "do not validate".

**The order still matters.** `/master/settings` can be built and can save, but
it must not be wired to the display until the fourteen `money()` copies are
collapsed into one formatter. Wiring it first gives a setting that reaches
some screens and not others, which is worse than the inconsistency it was
meant to fix.

### The state master does not yet decide tax

Adding a state in master fills the dropdowns. It does NOT change how tax is
worked out for it. `placeOfSupply` turns a state name into its GST code
synchronously, at module load, from a built in list, on the path that decides
CGST plus SGST against IGST. Making that path asynchronous so it can read the
table is its own change with its own risk and was deliberately not carried on
the back of the master work.

Until it is done, a state added in master is a label. The place it would bite:
a new state or union territory appears, an admin adds it, a wholesaler there
sets it on his profile, and his bills come out CGST plus SGST when they should
be IGST. There has been one such change recently enough to matter, Ladakh in
2019 and the Daman and Diu merger in 2020, so it is not hypothetical.

---

## The next phase, noted 10 Sept, nothing built yet

Requested in one go and deliberately not started. Written down here so the
shape is agreed before any of it is typed. Photos of the app this is modelled
on are coming; several of the decisions below wait on them.

**Read `docs/MASTER_AND_TRANSACTIONS.md` and `docs/BUSY_MODEL.md` first.**
The first is the plan: what the master dashboard holds, what a purchase record
needs, what to refine in sales and orders, and everything parked. The second is
the reading it came from.

**Read `docs/BUSY_MODEL.md` first.** Fourteen screenshots of a live Busy 21
were shared on 10 Sept and are written up there field by field: the Masters
menu, the whole Transactions menu, a real tax invoice with its IRN and e-way
bill number, the voucher numbering dialog, the regional settings and the GST
config. Most of the questions below are answered by it, and several guesses in
this section turned out to be right for the wrong reasons.

### The shape: masters, transactions, reports

This is how Tally, Busy and Marg are laid out, and it is what a wholesaler who
has used any of them expects. Masters are the things that exist; transactions
are the things that happen; reports read both.

  masters        customers, suppliers, items, units, tax rates, states, HSN
  transactions   sales, purchases, receipts, payments, credit and debit notes
  reports        khata, statement, GST returns, stock

We already have most of the nouns, under other names: `parties` is the party
master, `supplier_inventory` is the item master, `sales` is the sales register.
What is missing is a **purchase** side, which is half the transactions column,
and the menu that says which is which. A wholesaler buys as well as sells, and
right now the product can only describe one direction.

### Super admin, and the platform masters

Some masters belong to the platform, not to any one wholesaler: the state list,
the HSN list, tax rates, the number formats. Today they are constants in the
code, so changing one is a deploy.

**One thing found while looking:** `users.role` carries a CHECK constraint
allowing only `buyer`, `seller` and `both`. `promotionController` already
tests for role `'admin'`, which the database can never contain, so that code
is unreachable rather than merely unbuilt. A super admin needs that constraint
changed, which is a migration, and it is the first step of this whole block.

### GST Rule 46, and two real defects in what we ship

Rule 46 of the CGST Rules lists 16 mandatory particulars for a tax invoice.
Missing or wrong ones cost the customer his input credit and carry a penalty
of up to Rs 25,000 per invoice under Section 122. Against our invoice today,
two are genuinely wrong rather than merely absent:

**The invoice number resets on the wrong day.** `invoiceNumberService` uses
`new Date().getFullYear()`, so the counter rolls over on 1 January. Rule 46(b)
wants a serial unique for the FINANCIAL year, 1 April to 31 March. An invoice
raised in January 2027 would reuse a number already issued in FY 2026-27.
This is live today and it will bite on 1 January.

**The number can exceed 16 characters.** Rule 46(b) caps the serial at 16.
`INV-2026-000001` is 15 and fine, but the prefix is only clipped at 10
characters, so a wholesaler who sets a 10 character prefix gets a 22 character
number. `invoices.invoice_number` is `varchar(50)`, so nothing refuses it.
This is what "fixing the length" means, and the fix is to cap the whole
composed number, not the prefix.

Also missing from the document: **place of supply** is computed but never
printed, the **reverse charge** indicator does not exist, and the delivery
address is not shown for an unregistered buyer over Rs 50,000. Signature is
handled by the "computer generated, no signature required" line, which is
accepted practice.

### Delivery challan, Rule 55

Correctly understood as not a tax invoice. Worth being precise about why,
because the reason matters for what it may say: a challan is for moving goods
where a tax invoice cannot yet be raised, and it carries a **provisional**
quantity and value. Rule 55(2) wants three copies, marked Original for
Consignee, Duplicate for Transporter, Triplicate for Consigner.

One correction to the plan as put: a challan is not "the document you use when
the whole amount has not been paid". Part payment does not change what a
supply is. A tax invoice is still due on a credit sale, which is most of what
a wholesaler does, and that invoice is what the customer claims his credit
against. The challan belongs with **movement**, not with payment. This one
needs settling before it is built, or we will hand wholesalers a document that
does not do what they think it does.

### Razorpay

For verifying that a UPI payment really happened, which is the honest gap in
what we have: payments today are self declared, the buyer presses a button to
say he paid.

Two things to design around, both found while reading:

  the signature   a webhook is signed with an HMAC SHA256 of the raw body
                  under the webhook secret, in `X-Razorpay-Signature`. The
                  raw body, so the JSON body parser has to be bypassed on
                  that route or the signature will never match
  UPI Collect     deprecated by NPCI from 28 February 2026, which has already
                  passed. Any integration has to use UPI Intent or UPI QR

Handlers have to be idempotent, because the same event arrives more than once.
That is the same discipline the invoice reconcile already needed.

### Keyboard first

No mouse: numpad for moving up and down, shortcut keys for everything else.
This is the single thing most likely to decide whether a working wholesaler
adopts this over the software he already has, and it is also the one that has
to be designed before it is built rather than sprinkled on afterwards, because
it constrains every screen. It wants its own pass.

### Numbers

Decimal and thousands separators, configurable. Worth doing carefully: the
Indian grouping is 12,34,567 not 1,234,567, and the codebase already calls
`toLocaleString("en-IN")` in about fourteen places with its own copy of a
`money()` helper. Those want collapsing into one formatter first, or a setting
will reach some screens and not others.

---

## Left to do

Roughly in the order agreed.

Items 1 to 4 were done on 10 Sept, see above.

1. **Mobile OTP.** Deferred. There is no genuinely free SMS OTP in India that
   we know of; every gateway charges per message.
2. **e-Way Bill against the free sandbox**, once the GSP question below is
   settled. It is the one GST integration worth doing, see the note.
3. **The invented demo products on the home page.** Delete them and show the
   failure. Now also out of step with the city filter.
4. **The 4.5 star rating search invents** for a wholesaler with none, which it
   then sorts and filters on. Same rule that removed `trust_score`.
5. **Rewrite the git history** to take out the committed password and the
   invoice PDF. The Neon credential is already rotated. Needs a moment when
   nobody else is pushing, because it changes every commit hash.

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
- **A seller only account is half a buyer, which is nobody's intention.**
  Deferred on purpose, noted so it is not rediscovered. Signing up as "I sell
  wholesale" gives role `seller`, and that account sees the cart, the wishlist
  and "Your Orders" in the navbar. Checkout has no role check, so he can
  genuinely place an order; `contactSupplier` does have one, so he cannot then
  message the wholesaler he just ordered from. Whichever way this is settled,
  the two ends need to agree: either he buys and can talk to his seller, or he
  does not buy and the navbar stops offering it. `upgradeToSeller` only ever
  writes `both`, so there is no path from seller back to buying either.
- **The home page falls back to invented demo products** when the catalogue
  fails to load. Two made up wholesalers in Mumbai and Delhi, with prices. The
  toast says "demo data", which is the only thing stopping it being a straight
  lie, and it is now also out of step with the city filter: a buyer filtered to
  Surat would be shown a Mumbai seller. Delete it and show the failure.
- **Search invents a 4.5 star rating** for any wholesaler who has none, and
  then sorts and filters on it. Same rule that removed `trust_score`.
- **The client bundle is about 1.8MB** and there are 14 non identical copies of
  a `money()` helper. Those copies are why the site shows 12,000 and the
  invoice shows 12000.00: there is no one place to change it. Collapsing them
  is the prerequisite for the number formatting the master dashboard is meant
  to control, and should be done before that setting is added, not after.
- ~~**The invoice number rolls over on 1 January, not 1 April.**~~ Fixed
  10 Sept; the "Rule 46(b)" section of `challan_check.js` pins that January
  does not reset the run and that 1 April starts a new one.
- ~~**A long prefix makes an invoice number over 16 characters.**~~ Fixed
  10 Sept; a number over 16 characters, or carrying a character Rule 46(b)
  does not allow, is refused. Same section of `challan_check.js`.
- **`promotionController` checks for role `'admin'`,** which the `chk_role`
  constraint on `users` can never contain. That code is unreachable, not
  merely unbuilt.
- **`README.md` is substantially out of date.**
- **`/api/dashboard/stats` is dead code.** Nothing in the client calls it. Its
  "revenue" sums whole order totals for orders marked paid while the comment
  claims the figure means received, and `awaiting_payment_value` uses the full
  order total rather than what is outstanding. Same class as the header faults
  fixed on 11 Sept, but not reachable, so either delete the endpoint or fix it.
- **`scale_check.js` crashes on an empty database** with a TypeError instead
  of saying it needs a seeded one. It is a performance script, not part of the
  correctness battery.
- **The browser sweep is unfinished.** Three seller screens flagged and not
  chased down, the whole buyer side never rendered, and no phone-width pass.
  See 11 Sept above.

---

## Testing

Twenty four suites in `server/scripts/*_check.js`. They drive the real
controllers against a local Postgres, so they catch schema drift that reading
the code does not.

Three of them are worth knowing by name, because they are the ones that find
things the others cannot:

- `flow_check.js` walks one order the whole way and checks after every step
  that the khata, the Overview, the statement, the order and the sale agree
  with each other. Cross-screen disagreement is the failure mode this codebase
  actually has, and a suite that leans on one seam will never see it.
- `challan_matrix_check.js` walks the grid rather than the story: every status
  against every settlement state, and the order lifecycle driven through the
  CONTROLLER rather than the service. Two faults hid in exactly that gap.
- `credit_check.js` covers a customer's money being held and then spent.

**Drive the route the screens use, not the service behind it.** Both faults
found on 11 Sept had a passing suite standing next to them, because the suite
asked `orderStatusService` and the button asks `PATCH /orders/:id/status`.

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
