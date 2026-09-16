# What we are building next

Agreed 15 Sept 2026. Nine items. Work started 16 Sept.

`PROGRESS.md` is the record of what HAS been built. This is the record of what
has been decided, and how much of it is done, so the two do not get mixed up.
Phases 0 and 1 and most of 4 are finished. Everything else is still on paper.

Read the assessment at the bottom before promising a date on any of this. Two
of these nine cannot be finished by writing code alone.

**Start here: the plan of work is at the bottom of this file, under THE PHASES.
One phase at a time, each finished and verified before the next starts. Above
it, THE FULL LIST OF WORK is the numbered inventory the phases draw from, and
the sections between those two are the reasoning behind each item.**

---

## Decisions taken, 15 Sept

Asked for and settled, so nobody re-opens them by accident.

**The master area is renamed "Administration"**, route `/admin`. Not "Platform
settings", which collides with the wholesaler's own Settings page at
`/seller/settings` and so recreates the confusion the rename exists to remove.
Not "Control panel", which reads consumer-ish.

**Turnover is skipped.** It was going to drive the 4/6/8 HSN digit rule, and
without it that rule cannot be turnover-driven. So for now the minimum HSN
digit count is a SETTING in Administration, default 4. That is honest: it does
not invent a turnover figure, and swapping it for the real rule later is a
one line change. Say so on the screen.

**Cess defaults to 12 per cent, PER ITEM, and this is a TEST DEFAULT THAT MUST
NOT SHIP.** Real cess is commodity specific: 12 per cent on some goods, 60 on
others, a flat 400 rupees a tonne on coal. A global 12 per cent on a live bill
is a wrong number on a legal document, which is the one thing this codebase
has a standing rule against. Mark it in the code where it is set.

**Series prefixes.** `PREFIX/26-27/00001` spends 12 characters before the
prefix, and Rule 46(b) allows 16, so the budget is 4. Two characters each,
for symmetry and headroom:

| Series | Number | Length |
|---|---|---|
| Manual sale | `SM/26-27/00001` | 14 |
| From a shop order | `SA/26-27/00001` | 14 |
| Flipkart | `FK/26-27/00001` | 14 |
| Amazon | `AZ/26-27/00001` | 14 |

Two spare characters each, so a six digit sequence still fits at 15. The
originally suggested `FLPKT` would have produced a 17 character number, which
is illegal.

---

## 1. Exporting a wholesaler's own data

Invoices, sales, purchases, customers, out to a ZIP or to Google Sheets.

**ZIP is straightforward.** CSV per table plus the invoice PDFs, streamed as a
zip. No new dependency is strictly needed, though `archiver` would save
writing a zip encoder. Wholly ours, no third party, no credentials.

**Google Sheets is not the same job.** It needs a Google Cloud project, OAuth
consent (and Google's review if this ships to real users), a per-wholesaler
token store, and refresh handling. The export itself is the easy part.

Recommendation: build ZIP first and ship it. Treat Sheets as its own piece of
work with its own decision about who owns the Google project.

One rule to hold: an export is the wholesaler's own data and must be scoped by
`businessId` exactly like every screen. An export endpoint that takes an id
from the query string is how one wholesaler reads another's book.

## 2. More on invoices, starting with state code

See item 9, which is the full list. State code specifically is nearly done
already: `placeOfSupply.stateCode()` returns the two digit code and the
invoice already stores `place_of_supply`. What is missing is printing it
beside the state on the PDF and the screen.

## 3. UQC, e-invoice and e-way bill compliance, HSN digit rules

**UQC** is a fixed list from the GST portal: NOS, KGS, MTR, PCS, BOX, BAG and
so on, about forty of them. The units master currently holds free text. This
becomes: a UQC column on the units master, seeded with the official list, and
the UQC rather than the typed unit is what goes on an e-invoice.

**HSN digits by turnover.** The rule as the user stated it: 8 digits ideally,
6 if turnover is above 5 crore, 4 below. The actual notification is close to
that and worth getting exactly right before coding:

  - aggregate turnover up to 5 crore: 4 digits on B2B, optional on B2C
  - above 5 crore: 6 digits
  - exports and imports: 8 digits regardless

So this needs a turnover figure on the wholesaler's profile, and validation
that reads it. `hsnService` already checks the shape is 4, 6 or 8; what it
does not do is require a minimum, because nothing told it the turnover.

**e-invoice and e-way bill are the two items that are not just code.** See the
assessment.

## 4. Rename the master area, and drop gendered language

"Platform master" and "master table" to something plainer. Candidates:
Platform settings, Control panel, Administration. Decide before starting,
because the word appears in routes, nav, page titles and several comments.

**Gender neutral throughout.** This is a bigger sweep than it looks. The
codebase refers to the wholesaler as "he" and "him" in a great many comments,
and some UI copy does too ("what he owed you", "he is holding your money").
Every one of those becomes "they" or is rewritten to address the reader
directly, which is usually better anyway: "what you owed them".

It is a real change, not cosmetic. Half this product's users will be women and
the copy currently assumes otherwise.

## 5. GST terms and ledgers in the master area

A row in the master area for tax heads, where entering IGST derives the rest:

    IGST = 18  ->  CGST = 9, SGST = 9

That relationship is already true in `gstService`, which splits the rate in
half for an intra-state sale. What is new is naming the combination so it can
be picked by name on a line rather than typed as a number.

**Cess**, at 12 per cent for now. Cess is an additional levy on top of GST on
particular goods, not a share of it, so it is a separate column on the line
and a separate total on the bill. It does not come out of the 18.

## 6. Separate number series per sales channel

One series for automatic sales, one for manual, one for Flipkart, one for
Amazon, each independent.

`invoice_sequences` and `seriesNumbers.js` already do per-wholesaler,
per-financial-year numbering. This adds a series key to that.

**Rule 46(b) is the constraint:** an invoice number is at most 16 characters,
alphanumeric with dash and slash only, unique within the financial year, and
consecutive within its series. Four series means four counters and four
prefixes that must all still fit in 16 characters. `FLPKT/26-27/00001` is 17.
Plan the prefixes against the limit before building.

## 7. Sales type from the GSTIN

If the first two digits of both GSTINs match it is intra-state, so CGST plus
SGST; if they differ it is IGST.

**This is already built and working.** `services/placeOfSupply.js` does
exactly this, and it is the only thing allowed to decide. Nothing further is
needed here unless the intent is to SHOW the decision on the sale screen,
which would be worth doing: a wholesaler seeing "IGST, because he is in
Maharashtra" can catch a wrong customer record before the bill goes out.

## 8. Transport details on invoices and sales

Transport number, transporter name, mode (air, water, road, rail), transporter
ID or GSTIN, vehicle number.

These are the e-way bill fields, which is why they matter beyond printing. Data
model plus form plus PDF. No third party needed for the fields themselves.

## 9. Everything else the invoice needs

- Seller name, address, city, state, state code, pincode
- Dispatch-from address, which is not always the seller's registered address
- Customer's registered address as per GST
- Shipping address, which is not always the registered one
- GR number and date
- HSN summary table, totalled by HSN and rate
- Seller's bank details
- IRN, acknowledgement number and the e-invoice QR code

Most of this is data and layout. The last line is not: see below.

---

# Can this be built? An honest assessment

**Seven of the nine are ordinary work.** Items 1 (ZIP), 2, 4, 5, 6, 7, 8 and
most of 9 are schema, forms, PDF layout and validation. They are large but
there is nothing in them this codebase has not done before, and every one can
be verified here against a local Postgres and a real browser.

**Two cannot be finished by writing code alone**, and it is better to say so
now than to discover it at the end.

### e-invoice: IRN, acknowledgement number, QR code

An IRN is not something this product can generate. It is issued by the
Invoice Registration Portal after the invoice JSON is submitted and accepted,
and the QR code on the bill is a signed payload the IRP returns. Nothing
computed locally is valid.

To submit, you need either:
  - direct NIC IRP access, which requires enrolment and is normally limited to
    taxpayers above the e-invoicing threshold, or
  - a GSP or ASP, such as ClearTax, Masters India or similar, with an API
    contract and per-client credentials

So the work splits cleanly:
  - **buildable here**: the e-invoice JSON schema, every field it demands,
    validation before submission, storage of IRN and ack number, printing the
    returned QR, and the whole retry and cancellation flow
  - **not buildable here**: proving any of it against the real IRP

That is the same position Razorpay Route is in, and it turned out fine: written
to the documented contract, tested against a stubbed transport, with the first
live call treated as the real test. I would do the same again and say so in
the same words.

### e-way bill API

Same shape. NIC's e-way bill API needs credentials tied to a GSTIN, and in
practice a GSP. The fields, the validation, the distance and validity rules
and the storage are all buildable. The live call is not, from here.

### The honest version of "can you do all this?"

Yes, with two qualifications:

1. **Not in one pass.** This is several weeks of work. Items 4, 5 and 6 touch
   tax arithmetic and document numbering, which are the two areas of this
   codebase where a mistake shows up on a legal document rather than on a
   screen. They want doing one at a time with the database tests this
   repository already has the habit of.

2. **Two of them end in somebody else's hands.** e-invoice and e-way bill can
   be complete in code and still not working, because they need an account,
   credentials and a GSP contract. Get that decision started early: it has a
   lead time, and it does not depend on any of the code being finished.

### The order I would do them in

Superseded. See THE PHASES at the foot of this file, which is the same
reasoning turned into a sequence, with one change: the rename and de-gender
sweep moved from last to first. It was put last because it touches nearly every
file and wants a quiet moment. But phases 4 and 6 add three new screens to the
master area, and renaming after they exist means building them under the old
name and then renaming them. Nothing was mid-flight, so the quiet moment was
already here.

Item 7 needs nothing built. Item 1's Google Sheets half is its own decision.

---

# THE FULL LIST OF WORK

Everything outstanding as of 15 Sept, in three groups: the agreed features, the
debt already found, and the things that need somebody other than a programmer.

Nothing below is started.

## A. The nine agreed items, as tasks

### Schema, five migrations

1. `invoices` and `invoice_items`: seller address block (address, city, state,
   state code, pincode), dispatch-from address, shipping address, GR number and
   date, bank details, transport block, IRN and acknowledgement number and
   signed QR, cess columns, UQC on each line.
2. `master_units` gains a `uqc` column, seeded with the official list of about
   forty codes from the GST portal.
3. `invoice_sequences` gains a `series` key. The unique constraint becomes
   (wholesaler, series, financial year).
4. A new `master_tax_terms` table for the IGST to CGST/SGST grouping.
5. `master_settings` gains the minimum HSN digit count.

Every one of these is hand-run against Neon. No semicolons in comments, no
DO blocks: see CLAUDE.md for why, it cost a debugging round already.

### Server

6. `seriesNumbers.js` allocates per series, and refuses at write time anything
   that would exceed 16 characters rather than discovering it on a bill.
7. `gstService` treats cess as an additional levy, NOT a share of the GST rate.
   18 per cent GST plus 12 per cent cess is 30 per cent of the taxable value,
   not 18 split three ways.
8. **Cess has to reach the money path, not just the bill.** `grand_total` is
   read by the 50/50 instalment split, by `canAcceptPayment`, by
   `reconcileInvoiceForOrder` and by the khata mirror. Miss one and the
   customer's balance and his bill disagree by exactly the cess. This is the
   same shape as the double-counting race that was fixed on 14 Sept, and it is
   the single most dangerous item on this list.
9. `hsnService` enforces the minimum digit setting.
10. HSN summary: `GROUP BY hsn_code, gst_percent` over `invoice_items`, which
    already carries both. Cheap. Needs a cess column added to the grouping.
11. **Freeze the new addresses onto the invoice, never join them.** Invoices
    already copy the recipient onto the row on purpose, so a tax document does
    not change when somebody edits a contact afterwards. Dispatch-from,
    ship-to, the seller block and the bank details must follow the same rule,
    or a reprint six months later shows an address the customer never signed
    for.
12. ZIP export: a CSV per table plus the invoice PDFs. Scoped by `businessId`
    exactly like every screen. An export endpoint that takes an id from the
    query string is how one wholesaler reads another's book.
13. e-invoice JSON builder and validator. Payload and validation only, no
    submission. See group C.

### Client

14. Invoice form: seller block, dispatch-from, ship-to, GR number and date,
    transport block.
15. Sale form: transport block, and a series picker.
16. Administration: UQC column on units, the tax terms screen, the HSN digit
    setting.
17. PDF: every new field, the HSN summary table, bank details, and a slot for
    the QR that stays empty until an IRN exists.
18. Show WHY a sale is IGST, in words, on the sale screen. "IGST, because they
    are in Maharashtra" lets somebody catch a wrong customer record before the
    bill goes out, which is the cheapest possible moment to catch it.

### One sweep, best done when nothing else is mid-flight

19. Rename the master area to Administration: routes, nav, page titles,
    comments.
20. Remove gendered language throughout. The codebase calls the wholesaler
    "he" and "him" in a great many comments, and some UI copy does too, such
    as "what he owed you" and "he is holding your money". Rewrite to "they",
    or better, address the reader directly: "what you owed them". Half this
    product's users will be women and the copy currently assumes otherwise.

## B. Debt already found, not on the nine

21. Three overlays still do not close on Escape: `CartDrawer`, which is a side
    drawer and needs its own handler rather than ModalShell, plus
    `components/invoice/PaymentHistory.jsx` and
    `components/invoice/InvoicePreview.jsx`, which are document views.
22. **`trust_score` and `response_rate` columns still exist** on
    `wholesaler_profiles`, defaulting to `'95%'` and `'98%'`. Nothing displays
    them any more, but they are live invented data waiting to be picked up by
    accident. Drop them.
23. Rewrite the git history to remove the committed password and the invoice
    PDF. Needs a moment when nobody else is pushing.
24. **Rotate the Neon password.** It was pasted into a chat transcript and a
    screenshot on 14 Sept.
25. No screen advances an order past `payment_completed`. The API is correct
    and nothing calls it.
26. `/api/dashboard/stats` is dead.
27. Seller-side discovery, "textile wholesalers in Surat", is not built.
28. `README.md` is still substantially out of date.
29. Mobile OTP: deferred, no genuinely free SMS gateway in India.
30. `PROGRESS.md` "Left to do" is stale: its items 3 and 4, the invented demo
    products and the 4.5 star rating, were both done on 14 Sept.

## C. Needs somebody other than a programmer

31. **The GSP decision, which shapes the schema.** Free sandboxes DO exist for
    both: NIC e-invoice at `einv-apisandbox.nic.in` by self-registration, and a
    GSTN e-way bill pre-production sandbox whose credentials come by email from
    a GST registered address. So these CAN be tested, just not from inside this
    development environment, which blocks outbound hosts.

    The real blocker is not the sandbox. Both official sandboxes assume ONE
    taxpayer testing his own ERP. A platform raising documents for hundreds of
    different wholesalers cannot use one set of credentials: either every
    seller enrols his own API access and we hold his credentials, or we sign
    with a GSP licensed to act for many taxpayers. That is a commercial
    decision, it has a lead time, it does not depend on any code being
    finished, and it changes the schema. Start it now.

32. Razorpay: `RAZORPAY_WEBHOOK_SECRET` is unset, so the webhook endpoint
    refuses every delivery by design. Route is not enabled on the account.
    Whether Partner access exists, for creating linked accounts by API rather
    than by hand in the dashboard, is unknown.

33. The `razorpay-integration` branch changes, described on 15 Sept, are still
    not pushed anywhere. Checked `razorpay-integration`, `main`, `rimjhim` and
    `ronak`: none has the state dropdown, the supplier and purchase
    repositioning, or the add-supplier button. They are local on one machine.

---

# THE PHASES

One phase at a time. A phase is finished when it is verified, not when it is
written, and nothing from the next phase starts until then. The numbers in
brackets are the items above.

Phases 0, 1 and most of 4 are already done, on the `sanskriti` branch, merged
here on 16 Sept. What is left starts at phase 2.

## How a phase ends

The same bar every time, so "done" is not a matter of opinion:

- `npx vite build` clean
- `npm run lint` at or below the 39 problem baseline, and no new problems
- every controller or repository touched is driven against a local Postgres
  with a real `req` and `res`, not read and reasoned about
- every screen touched is rendered at phone width and at desktop
- every migration is split on semicolons and run one statement at a time, then
  run a second time, because a hand applied file gets pasted twice
- `PROGRESS.md` updated in the same commit as the work
- the migration named explicitly in the closing message, because nothing here
  applies them for you

## Phase 0. Clear the ground. DONE

No feature code. Debt that every later phase would otherwise inherit, plus the
things only a person can do.

- [x] Escape closes the last three overlays (21)
- [x] `trust_score` and `response_rate` dropped, code and column (22).
      Migration: `drop_trust_score_and_response_rate.sql`
- [x] `/api/dashboard/stats` deleted (26)
- [ ] **Rotate the Neon password (24). Yours, not a programmer's.** It was
      pasted into a chat transcript and a screenshot on 14 Sept and is still
      live.
- [ ] **Start the GSP conversation (31). Yours.** The longest lead time on this
      whole plan. Phases 9 and 10 cannot finish without it and it changes the
      schema, so it starts here and not at phase 9.
- [ ] **Razorpay dashboard (32). Yours.** `RAZORPAY_WEBHOOK_SECRET` is unset so
      the webhook refuses every delivery by design, Route is not enabled, UPI
      needs turning on.
- [ ] Rewrite the git history to drop the committed password and the invoice
      PDF (23). Needs a moment when nobody else is pushing.

## Phase 1. Administration, and language. DONE

Moved to the front, not the back. Three new screens arrive in phases 4 and 6,
and renaming after they exist means building them twice.

- [x] Master area renamed Administration at `/admin`: routes, nav, titles,
      comments (19)
- [x] Gendered language removed throughout (20)

## Phase 2. The invoice data model, frozen. DONE

Write path only. No form, no PDF, nothing on screen. The point of doing it
alone was that the freezing could be proved before anything depends on it.

- [x] Migration: the whole invoice column set in one file (1). File:
      `wholesale3_invoice_document_block.sql`. Seller block, dispatch-from,
      ship-to, GR number and date, bank details, transport block, IRN and
      acknowledgement placeholders, cess columns, UQC per line. One file rather
      than five, because each hand applied migration is a round trip through
      you. The unused columns are nullable until the phase that fills them.
- [x] The seller block and bank details are copied onto the invoice at
      creation, inside `createInvoice` itself rather than at its three call
      sites, so a fourth caller cannot forget to take the snapshot (11)
- [x] The recipient's state and state code frozen on the sale path (11)
- [x] **Frozen. Never joined.** (11)

Proved by raising a bill, changing the firm name, GSTIN, address, state and
bank account it was copied from, and showing not one field on the bill moved,
while the next bill picked up all of it. Eighteen checks against a local
Postgres.

Two deliberate gaps. `parties` holds no pincode, so the recipient pincode stays
blank rather than being invented. `invoice_items.uqc` has no foreign key onto
`master_uqc`, because a frozen line must not be coupled to a table somebody can
edit.

## Phase 3. The invoice on screen and on paper. DONE

- [x] PDF: the seller block with its address, both addresses when they differ,
      GR number and date, the transport band, bank details, UQC beside each
      quantity, and an e-invoice block that appears only once an IRN exists (17)
- [x] The state code printed beside the state, on both sides of the bill (2)
- [x] Say WHY the tax split is what it is, in words, on the invoice screen (18)
- [x] The printed HSN summary had the same arithmetic fault as the SQL one and
      was overstating the taxable value on every tax inclusive bill. Fixed and
      it now ties to the total above it.
- [x] Invoice form: the new fields entered rather than only printed (14). A
      "Dispatch, delivery and transport" section, closed by default because
      most bills need none of it, plus a Unit picker on each line that carries
      the UQC. State codes are derived from the state name on the server, never
      typed: it is the number that decides CGST and SGST against IGST.

Rendered and looked at, not just written: a bill with every field filled in, a
bill with an IRN and a signed QR, and an old bill carrying none of them, which
still prints exactly as it did before.

The explanation of the tax split is shown only when the invoice actually
recorded both states it compared. Guessing at the reason would be worse than
saying nothing.

## Phase 4. UQC, HSN digits, HSN summary. DONE

- [x] Migration: `master_uqc` holding the official list, `master_units.uqc`
      with a foreign key onto it (2). File:
      `wholesale3_uqc_master_units.sql`
- [x] HSN summary grouped by HSN and rate, tying to the bill (10). No cess
      column yet, that arrives in phase 6.
- [x] Document numbers refused at write time if they break Rule 46(b), with a
      reason the wholesaler can act on
- [x] Administration: the UQC on the units screen (16, one of its three).
      Every unit lists the code it is filed as, or says "UQC not set", and the
      editor offers the statutory list as a dropdown. Blank is allowed and
      means nobody has decided.
- [x] Migration: minimum HSN digit count on `master_settings` (5). Already
      existed as `default_hsn_min_digits` in `wholesale3_master_settings.sql`,
      with a CHECK of 4, 6 or 8. No new migration was needed.
- [x] Administration: the HSN digit setting (16, its second). Already on the
      settings screen. It was being read and ignored.
- [x] `hsnService` enforces the minimum digit setting (9). It checked the shape
      and nothing else, so the setting had no effect anywhere. Enforced now on
      sales, purchases, products and manual invoices. The manual invoice path
      was not checking the HSN at all, so a bill could go out with a code the
      same product would have been refused for.

`checkHsn` stays pure and synchronous and takes the minimum as an argument.
The caller reads the setting once with `minHsnDigits()` before looping over
lines, rather than every line awaiting a cached read.

The units master leaves Case blank on purpose. Nothing is defaulted to OTH. The
Administration screen is where somebody decides the blanks and the decision is
recorded, which is why it says "not set" rather than filling it in quietly.

## Phase 5. Transport details. NEXT, and half of it is done

The columns landed in phase 2 and the invoice side landed in phases 3 and 4,
so what is left is the sale.

- [x] Transporter name, ID or GSTIN, mode, vehicle number, transport document
      number and date, on an INVOICE, entered and printed (8)
- [ ] The same block on a SALE (15 in part). A sale has no invoice until one is
      raised from it, so the details have to be captured where the wholesaler
      actually records the despatch.

## Phase 6. Tax terms and cess. THE DANGEROUS ONE

Alone in its phase on purpose. This is the one that puts a wrong number in
somebody's ledger rather than on a screen.

- [ ] Migration: `master_tax_terms` for the IGST to CGST and SGST grouping (4)
- [ ] Naming a tax combination so a line can pick it by name (5)
- [ ] `gstService` treats cess as an additional levy, NOT a share of the rate.
      18 per cent GST plus 12 per cent cess is 30 per cent of the taxable
      value, not 18 split three ways (7)
- [ ] **Cess reaches the money path, not just the bill** (8). Every reader of
      `grand_total` has to agree: the 50/50 instalment split, `canAcceptPayment`,
      `reconcileInvoiceForOrder`, and the khata mirror. Miss one and the
      customer's balance and their bill disagree by exactly the cess.
- [ ] The tax terms screen in Administration (16, its third screen)
- [ ] A cess column in the HSN summary grouping (10)

Cess is 12 per cent flat and marked in the code as a TEST DEFAULT THAT MUST NOT
SHIP. Verified by: an order carrying cess, paid in halves, proving the balance
and the bill agree to the paisa, then reconciled and proved again. In paise.

## Phase 7. A number series per channel

- [ ] Migration: `series` key on `invoice_sequences`, unique on (wholesaler,
      series, financial year) (3)
- [ ] `seriesNumbers` allocates per series (6). The 16 character refusal is
      already built and tested, so this phase inherits the guard.
- [ ] A series picker on the sale form (15 in part)

Prefixes `SM`, `SA`, `FK`, `AZ`, fourteen characters each. Verified by:
allocating concurrently and proving no gap and no duplicate within a series and
a financial year.

## Phase 8. Export

- [ ] ZIP: a CSV per table plus the invoice PDFs (12)

Scoped by `businessId`, taken from the token and never from the query string.
Verified by signing in as one wholesaler and asking for another's export by
every route the endpoint allows.

Google Sheets is NOT in this phase. It needs a Google Cloud project, OAuth
consent and a per-wholesaler token store, and first a decision about who owns
the project.

## Phase 9. e-invoice payload

- [ ] The JSON builder, the validator, IRN and acknowledgement storage, the
      retry and cancellation flow, and the QR slot filled (13)

Buildable here. Proving it against the real IRP is not, and that half waits on
item 31. Written to the documented contract against a stubbed transport, with
the first live call treated as the real test, and said in those words rather
than claimed as working. That is how Razorpay Route was done and it held up.

## Phase 10. e-way bill payload

Same shape. Fields, validation, the distance and validity rules, storage.

## Phase 11. The rest

- [ ] A screen that advances an order past `payment_completed` (25). The API is
      correct and nothing calls it, so orders stall there in practice.
- [ ] Seller-side discovery, "textile wholesalers in Surat" (27)
- [ ] `README.md` (28)
- [ ] Mobile OTP (29), still deferred, no genuinely free Indian SMS gateway
- [ ] Google Sheets export, if the Google project question is answered
- [ ] The `razorpay-integration` branch changes, still local on one machine (33)
