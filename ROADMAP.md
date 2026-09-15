# What we are building next

Agreed 15 Sept 2026. Nine items, none of them built yet.

`PROGRESS.md` is the record of what HAS been built. This is the record of what
has been decided and not yet started, so the two do not get mixed up.

Read the assessment at the bottom before promising a date on any of this. Two
of these nine cannot be finished by writing code alone.

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
