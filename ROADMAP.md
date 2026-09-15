# What we are building next

Agreed 15 Sept 2026. Nine items, none of them built yet.

`PROGRESS.md` is the record of what HAS been built. This is the record of what
has been decided and not yet started, so the two do not get mixed up.

Read the assessment at the bottom before promising a date on any of this. Two
of these nine cannot be finished by writing code alone.

**Start here: the task inventory is at the bottom of this file, under THE FULL
LIST OF WORK. The sections between are the reasoning behind each item.**

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

1. **UQC and HSN digits (3, part)** and **state code on the invoice (2)** are
   small, self-contained, and are prerequisites for the e-invoice JSON anyway.
2. **Invoice fields (9, minus IRN)** and **transport details (8)**, because
   between them they are most of what an e-invoice payload needs. Doing them
   first means the compliance work is filling in a form rather than inventing
   a data model.
3. **Series per channel (6)** and **GST terms and cess (5)**, the two that
   touch numbering and arithmetic, one at a time.
4. **Rename and de-gender (4)**, which is best done as one sweep when nothing
   else is mid-flight, because it touches almost every file.
5. **ZIP export (1)**, which is independent and can be slotted anywhere.
6. **e-invoice and e-way bill**, last, by which point the data they need
   already exists. Start the GSP conversation at step 1, not here.

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

## Where to start

Items 1, 11, 14 and 17: the invoice data model, frozen correctly, on the form
and on the PDF.

Everything else leans on it. The e-invoice payload is a projection of exactly
those fields, so doing them first turns the compliance work into filling in a
form rather than inventing a data model. And every one of those fields earns
its place on the printed bill whether or not the GSP question ever resolves.
