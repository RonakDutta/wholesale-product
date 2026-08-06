# RARS Innoventa

### B2B Wholesale Marketplace — Product Blueprint

|                  |                                        |
| ---------------- | -------------------------------------- |
| **Product Name** | RARS Innoventa                         |
| **Document**     | Product Blueprint                      |
| **Version**      | 1.0                                    |
| **Date**         | 6 August 2026                          |
| **Prepared By**  | Product Team, RARS Innoventa           |
| **Status**       | Working draft, based on the current codebase |

> This document describes what the product does today, based on a review of the
> actual code, database migrations and API routes. Anything not yet built is
> listed under Future Enhancements rather than written up as a feature. Where a
> number or a market claim could not be verified from the code, it is marked as
> an assumption.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Introduction](#2-introduction)
3. [Problem Statement](#3-problem-statement)
4. [Where Existing Platforms Fall Short](#4-where-existing-platforms-fall-short)
5. [Vision and Mission](#5-vision-and-mission)
6. [About Our Product](#6-about-our-product)
7. [Product Objectives](#7-product-objectives)
8. [Target Audience](#8-target-audience)
9. [User Personas](#9-user-personas)
10. [Solution](#10-solution)
11. [Core Features](#11-core-features)
12. [Unique Selling Points](#12-unique-selling-points)
13. [Competitor Analysis](#13-competitor-analysis)
14. [Gap Analysis](#14-gap-analysis)
15. [Business Model](#15-business-model)
16. [Pricing Strategy](#16-pricing-strategy)
17. [Future Enhancements](#17-future-enhancements)
18. [Success Metrics](#18-success-metrics)
19. [Conclusion](#19-conclusion)

---

## 1. Executive Summary

RARS Innoventa is a B2B wholesale marketplace built for Indian trade. A
wholesaler lists what they stock. A retailer finds them, compares them against
other wholesalers selling the same product, places an order, pays by UPI, and
watches the consignment move on a map until it arrives.

Most of that already works. The platform handles listings, supplier comparison,
single-wholesaler orders with multiple items, UPI payment collection, GST tax
invoices with proper CGST/SGST/IGST treatment, delivery tracking, in-app chat
and verified-purchase reviews.

Two things make it different from a directory. First, the order is a real
transaction with money and paperwork attached, not a lead handed off to a phone
call. Second, prices are recalculated on the server at checkout, so what the
retailer pays is what the wholesaler actually listed.

The product is not finished. There is no admin interface, the order lifecycle
cannot yet be advanced past payment from the UI, and the credit ledger that
would let a retailer pay part now and part later has not been built. Those are
covered honestly in Section 17.

---

## 2. Introduction

### How Indian wholesale actually works

Indian retail runs on a long chain. A manufacturer sells to a distributor, the
distributor sells to a wholesaler, and the wholesaler supplies the neighbourhood
kirana, the chemist, the hardware shop, the garment store. Most of these
businesses are small, family-run, and have been trading with the same two or
three suppliers for years.

The relationships are the business. A retailer stays with a wholesaler because
that wholesaler answers the phone at nine at night, sends stock on credit before
Diwali, and takes back what did not sell. None of that is written down anywhere.

### Why digitisation is picking up

Three things have changed at the same time. UPI made small-value business
payments instant and free, so a retailer can pay a wholesaler in seconds without
either of them touching a bank branch. GST made invoicing a legal requirement
rather than an optional courtesy, which pushed even small traders towards
keeping records. And smartphones reached the counter, so the person running the
shop is already comfortable doing business on a screen.

### Why B2B commerce is harder than B2C

A consumer buying a phone case wants speed and a good price. A retailer buying
stock wants something else entirely.

| B2C shopping         | B2B wholesale buying                            |
| -------------------- | ----------------------------------------------- |
| One or two units     | Minimum order quantities, often 50 or 100+       |
| One fixed price      | Price depends on quantity, relationship, season  |
| Pay now, always      | Part payment, credit, settle next order          |
| Buy once, move on    | Same supplier every month for years              |
| Receipt is optional  | GST invoice is a legal and accounting necessity  |

A platform that treats wholesale like a bigger version of retail shopping will
get the important parts wrong. That is the starting assumption behind this
product.

---

## 3. Problem Statement

### What the retailer deals with

A shop owner who wants to restock has to work the phone. They call the two
wholesalers they know, ask what today's rate is, and take whatever they are
told. There is no easy way to check whether a third wholesaler two districts
away is selling the same thing for less, because there is no list to check.

Once the order is placed, it disappears. The retailer does not know if it has
been packed, if it has left, or when it will arrive. They call to ask, and get
told "aa raha hai." Stock planning becomes guesswork.

Payment and paperwork are equally loose. Money moves over UPI or in cash, and
the invoice, if it comes at all, arrives later on a WhatsApp photo of a
handwritten bill. At GST filing time, someone has to reconstruct months of this
from memory.

### What the wholesaler deals with

The wholesaler's problem is the mirror image. Their customer base is whoever
happens to know them. Growing means physically travelling to new markets or
paying for a listing on a directory that delivers phone numbers rather than
orders.

They spend a large part of the day repeating themselves on the phone — quoting
rates, confirming stock, chasing payment. Every one of those calls is a
transaction that could have been a form.

They also carry real risk. Stock goes out on trust, and payment comes in later,
if it comes. There is no record of who pays reliably and who does not, other
than what they remember.

### What both sides lose

| Problem                      | Cost to the business                                      |
| ---------------------------- | --------------------------------------------------------- |
| No price visibility          | Retailers overpay; good wholesalers cannot prove they are cheaper |
| No order visibility          | Retailers hold extra stock as a buffer, tying up cash      |
| Paperwork after the fact     | GST filing is painful and error-prone for both sides       |
| Trust is undocumented        | A good payment record is worth nothing to a new supplier   |
| Everything runs on calls     | The working day is consumed by coordination, not selling   |

---

## 4. Where Existing Platforms Fall Short

There is no shortage of B2B platforms in India. The gap is that most of them
solve only one slice of the problem.

**Directories stop at the introduction.** IndiaMART and TradeIndia are very good
at helping a buyer find a supplier. They then hand over a phone number, and
everything after that — negotiation, order, payment, invoice, delivery — happens
off-platform with no record. The platform earns from the introduction, so it has
little reason to care what happens next.

**Managed marketplaces take over the relationship.** Udaan buys and resells,
which makes the experience consistent but puts the platform between the
wholesaler and their customer. The wholesaler becomes a supplier to Udaan rather
than a business with its own customers, and loses control over pricing and terms.

**Storefront tools assume you already have customers.** Shopify and similar
products are excellent for running your own shop, but they are not a
marketplace. A wholesaler on Shopify still has to find every buyer themselves.

**Almost none of them handle Indian trade credit.** The single most important
commercial mechanism in Indian wholesale — goods now, part payment now, balance
against the next order — is largely absent from these platforms. Traders keep
doing it in a paper khata on the side.

---

## 5. Vision and Mission

### Vision

To make wholesale trade in India work the way retail already does: you can see
what things cost, you can see where your order is, and you have the paperwork
when you need it.

### Mission

To reduce the distance between wholesalers and retailers. Practically, that
means:

- Letting a retailer compare real suppliers on real numbers before ordering
- Making every order produce a proper GST invoice without extra work
- Showing the retailer where their consignment is, without needing a driver app
- Keeping the wholesaler's customer relationship theirs, not ours
- Eventually putting the credit that already happens informally onto a record
  both sides can trust

---

## 6. About Our Product

RARS Innoventa is a marketplace with two connected sides.

### The buying side

A retailer lands on the marketplace and browses by category or search. Products
are shared entities — one "Steel Bolt" listing that several wholesalers sell
against. When a retailer opens a product, they see every wholesaler offering it
side by side, with price, minimum order quantity, stock, shipping days, rating
and orders delivered.

They pick a supplier, set a quantity, and check out. An order can hold several
products but only from one wholesaler, because one order should mean one
consignment on one truck. Payment is a UPI QR generated from that wholesaler's
own UPI ID, so money goes directly from retailer to wholesaler.

After paying, the retailer can follow the delivery on a map and download the GST
invoice from the order page.

### The selling side

A wholesaler gets a separate workspace, deliberately styled differently from the
storefront so it reads as its own tool. They list products, manage stock and
pricing, see incoming orders, raise and track invoices, run GST and ageing
reports, and message buyers.

The workspace is restricted to wholesalers. Retailers cannot open it, which is
why anything a retailer needs — their orders, their invoices — lives on the
buying side instead.

### Who it is built for

Small and mid-sized Indian wholesalers who want more customers without giving up
control of their pricing, and independent retailers who are tired of buying
blind. It assumes both parties are comfortable with UPI and WhatsApp, which most
already are.

---

## 7. Product Objectives

| # | Objective                     | What it means concretely                                                    |
| - | ----------------------------- | --------------------------------------------------------------------------- |
| 1 | Make prices comparable        | Show every supplier for a product on one screen with the numbers that matter |
| 2 | Make the order a real record  | Server-side pricing, stock checks, line items, an audit trail                |
| 3 | Remove invoice work           | A GST invoice is generated automatically from the order                      |
| 4 | Make delivery visible         | Track a consignment without asking the driver to install anything            |
| 5 | Keep the relationship direct  | Payment goes wholesaler-to-retailer; we do not sit in the middle             |
| 6 | Build a usable trust record   | Verified-purchase reviews and delivered-order counts, not invented scores    |

On the last point: the product previously showed a "trust score" and "response
rate" that were never calculated. Both were removed and replaced with figures
counted from real orders and reviews. Showing an invented number is worse than
showing nothing.

---

## 8. Target Audience

| Segment           | Who they are                                                   | What they need from us                                              | Supported today                     |
| ----------------- | -------------------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------- |
| **Wholesalers**   | Small to mid-sized traders supplying a district or region       | More customers, fewer phone calls, automatic invoicing               | Yes — the full seller workspace       |
| **Retailers**     | Kirana stores, chemists, hardware and garment shops             | Honest price comparison, order visibility, proper bills              | Yes — the full buying experience      |
| **Distributors**  | Sit between manufacturer and wholesaler; buy and sell in bulk   | Both sides of the platform at once                                   | Partly — the `both` role exists       |
| **Manufacturers** | Sell direct to wholesalers, in large lots                       | Bulk listings, dealer management, territory control                  | Not specifically — they can list as wholesalers, but there is no dealer or territory management |

**Assumption:** we expect early traction to come from wholesalers first. A
marketplace with no supply is useless to retailers, so the seller side has to be
populated before the buying side is worth visiting.

---

## 9. User Personas

### Ramesh Gupta — the wholesaler

Ramesh, 44, runs a hardware wholesale business in Nashik with a small godown and
two staff. He supplies around forty shops across the district and has done for
eleven years.

His day is phone calls. Rates, stock checks, "bhej diya kya", payment reminders.
He knows he could serve more shops, but he has no way to reach ones he has not
personally met, and he is wary of platforms that would put themselves between
him and his customers.

He wants his existing customers to be easier to serve, and a few new ones a
month. He is not interested in becoming somebody's supplier.

**What he uses:** the seller workspace — listings, orders, invoices, and the
driver link so he stops fielding "where is my order" calls.

### Kavita Shah — the retailer

Kavita, 31, runs a general store in a Pune suburb. She restocks every two weeks
and buys from two wholesalers, mostly out of habit.

She suspects she is paying more than she should on some items but has no way to
check. When an order is late she loses sales, and she has started over-ordering
to compensate, which ties up money she would rather not have sitting in a
storeroom.

At GST time she and her accountant piece together bills from a WhatsApp folder.

**What she uses:** supplier comparison before ordering, the tracking map after,
and the invoice download at filing time.

### Imran Sheikh — the distributor

Imran, 38, buys textiles in bulk from mills in Surat and breaks them down for
wholesalers across two states. He is a buyer and a seller in the same week.

He needs both sides of the platform in one account, and he needs his purchase
records and his sales records kept apart so his books make sense.

**What he uses:** the `both` role. His purchases appear on the buying side, his
sales in the seller workspace. This separation is deliberate — an earlier version
scoped invoices by account role and hid one side of his books from him entirely.

### Meena Rao — the accountant

Meena, 29, does the books for a dozen small traders including Kavita. She is not
a platform user in the usual sense; she cares about one thing, which is whether
the paperwork is clean.

**What she uses:** the GST invoice PDFs and, through her clients, the GST summary
and ageing reports.

---

## 10. Solution

Each problem in Section 3 maps to something specific in the product.

| Problem                                | What we do about it                                                                                     |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| No way to compare prices               | One product, many suppliers, shown side by side with price, MOQ, stock, shipping, rating, orders delivered |
| Orders vanish after placement          | A status trail on every order, plus a live map from warehouse to destination                              |
| Invoices are an afterthought           | A GST invoice is raised automatically when the order is placed and settled when payment lands            |
| Everything runs on phone calls         | In-app chat over websockets, with a WhatsApp fallback for people who prefer it                            |
| Prices can be manipulated at checkout  | The server re-prices every line against live inventory and ignores whatever amount the client sends       |
| Overselling                            | Stock deduction is a guarded update that fails rather than going negative                                 |
| Trust is undocumented                  | Reviews restricted to verified buyers; delivered-order counts computed from real orders                   |

---

## 11. Core Features

### 11.1 Authentication and Access

Registration captures name, email, phone, password and a role. Passwords are
hashed with bcrypt. Sessions are JWTs carrying the user id and role.

There are three roles. A `buyer` shops, a `seller` sells, and `both` does either.
A buyer who wants to start selling can upgrade through a dedicated endpoint,
which moves them to `both` rather than replacing their history.

The seller workspace is guarded on the route and again on every API call. A
retailer who reaches a seller URL is redirected with an explanation instead of
being shown a broken page.

**Why it matters:** roles decide what someone sees, so they have to be right.
An earlier bug treated a 403 as a dead session and logged users out mid-browse;
now only a genuine 401 clears the session.

### 11.2 Vendor Management

Each wholesaler has a business profile: company name, GSTIN, contact phone, city,
UPI ID and warehouse address with state and pincode. The warehouse is stored on
the business rather than per product, because deliveries leave from the same yard
regardless of what is in the box.

Public wholesaler profiles show verification status, years in business, city,
orders delivered, rating, review count and the full catalogue.

**Why it matters:** a retailer buying from someone they have never met needs
something to go on. Everything shown here is either declared by the wholesaler or
counted from real activity.

### 11.3 Product Management

Products are shared. When a wholesaler lists an item, they either attach to an
existing product or create a new one, then add their own listing against it with
their price, bulk price, MOQ, stock, shipping days and image.

This is what makes comparison possible — several wholesalers against one product
rather than fifty near-duplicate listings. A wholesaler cannot list the same
product twice; they are asked to edit the existing listing instead.

Images upload directly to Cloudinary from the browser.

**Why it matters:** without a shared catalogue, comparison is impossible and
search returns the same item forty times.

### 11.4 Inventory

Stock, MOQ, price and status live on the listing. The seller dashboard reports
active listings, total stock value, items out of stock, and items that have
fallen below their own MOQ — a listing nobody can legally order from is as good
as unavailable.

Stock is deducted when an order is placed, and returned if payment never
completes, so abandoned checkouts do not quietly consume inventory.

**Why it matters:** an accurate stock number is the difference between a
confirmed order and an apology.

### 11.5 Pricing

Each listing carries a standard price and an optional bulk price that applies
once quantity reaches the MOQ threshold. The wholesaler sets both.

The important part is where pricing is decided. At checkout the server looks up
every line against live inventory and recalculates the total. Any amount sent by
the client is ignored.

**Why it matters:** this closes the most obvious way to attack a marketplace.
It also means a price change between adding to cart and paying is handled
correctly rather than silently honoured.

### 11.6 Orders

An order can contain several products but only from one wholesaler. Attempting
to mix suppliers is rejected. One order means one consignment.

Every order writes line items, a delivery address with optional map-pinned
coordinates, and a status history entry. The lifecycle is a 22-state machine with
validated transitions, so an order cannot jump from placed to delivered.

**Current limitation:** the API to advance status exists and is correct, but no
screen calls it. In practice an order stops at `payment_completed`. This is the
most significant gap in the product today and is listed in Section 17.

### 11.7 Payments

Payment is UPI, direct between the two businesses. The platform generates a QR
from the wholesaler's own UPI ID with the amount and order reference pre-filled.
The retailer scans it in any UPI app, pays, and confirms on the platform.

There is **no payment gateway**. Money never passes through us, which means no
settlement delay for the wholesaler and no gateway fee on either side.

The trade-off is honest: payment is currently self-declared by the buyer. The
wholesaler is not yet asked to confirm receipt. That confirmation step is the
prerequisite for the credit system and is covered in Section 17.

**Why it matters:** UPI is how this trade already settles. Forcing a gateway in
between would add cost and delay for no benefit.

### 11.8 Invoicing and GST

Every order produces a proper tax invoice. The system handles:

| Element             | How it works                                                                    |
| ------------------- | -------------------------------------------------------------------------------- |
| Numbering           | Sequential per year, with a prefix each wholesaler configures                     |
| Tax split           | CGST and SGST within a state, IGST across states, resolved by state not city      |
| Line detail         | HSN code, quantity, unit price, GST percent, tax and line total                   |
| Both parties        | Names, GSTINs and contact details for supplier and buyer                          |
| Payment             | UPI QR embedded in the PDF, and a PAID / UNPAID / CANCELLED watermark             |
| Defaults            | Payment window, tax rate, notes and terms, saved per wholesaler                   |
| Reporting           | GST summary and receivables ageing buckets                                        |
| Export              | CSV, Excel and a PDF summary, all matching the filters on screen                  |

There is exactly one invoice per order, issued by the seller. The buyer downloads
that same document from their order page.

**Why it matters:** this is the part that turns an informal transaction into a
record both sides can file. It is also the feature most likely to bring a
reluctant trader onto the platform, because it removes work they currently do by
hand.

### 11.9 Delivery Tracking

Tracking is deliberately built around what actually exists on the ground. Most
delivery in this trade is done by a driver in a hired vehicle who is not a
platform user and will not install an app.

So the wholesaler generates a link and sends it over WhatsApp or SMS. The driver
opens it in whatever browser their phone has and taps once to share location. The
page reports position while it stays open. No account, no app, no background
permission. Links are scoped to one order and expire.

The wholesaler can also add checkpoints by hand, which covers the case where the
driver does not use the link at all.

The retailer sees a map with the warehouse, the checkpoints passed so far, the
current position and the destination.

**Why it matters:** every tracking design that depends on a driver app fails in
this market. This one degrades gracefully — worst case, the wholesaler adds
checkpoints manually and the retailer still sees progress.

### 11.10 Communication

Real-time chat runs over websockets, with unread counts and read receipts. Users
cannot message themselves. For traders who prefer WhatsApp, a deep link opens a
chat with the product details pre-filled — this is a link, not the WhatsApp
Business API.

Notifications cover in-app and email. SMS, WhatsApp API and push have service
code in place but stay inactive until credentials are configured.

### 11.11 Reviews and Ratings

Retailers can review products and sellers, but only for things they have actually
bought — the check is enforced server-side. Reviews support helpful votes, seller
replies and reporting.

Ratings feed the supplier comparison and the wholesaler profile.

**Why it matters:** an open review system on a B2B marketplace becomes a
competitive weapon within weeks. Restricting it to verified purchases is the
minimum that makes it meaningful.

### 11.12 Seller Analytics

The dashboard shows revenue received over 30 days with a trend against the
previous 30, value awaiting payment, distinct customers, average order value and
buyer rating. Alongside that is a fulfilment pipeline and inventory health.

Every figure is computed from orders, inventory and reviews. Where there is no
data — no previous period to compare against, no reviews yet — the product shows
nothing rather than a zero that reads as failure.

### 11.13 Administration

**This does not exist yet as a product surface.** Admin-scoped API routes are in
place for review moderation, notification broadcasts and promotion management,
and the role is enforced. There is no admin interface of any kind.

Promotions are in the same position: flash sales, coupons, loyalty points,
referrals and gift cards all have working backends and database tables, and the
client can read them, but creation is admin-only with no screen to do it from.

Listing these honestly matters more than listing them impressively. Both are in
Section 17.

---

## 12. Unique Selling Points

**The order is a transaction, not a lead.** Directories introduce you and step
away. Here the order, the money, the invoice and the delivery all live in one
place with one record.

**Payment goes direct.** UPI from retailer to wholesaler, no gateway, no
settlement wait, no cut. For a wholesaler used to waiting on marketplace payouts,
this is the difference between cash today and cash next week.

**GST invoicing is real, not a receipt.** Correct interstate treatment, HSN
codes, per-seller numbering, ageing reports. Built for the filing, not just for
the customer.

**Tracking that does not need a driver app.** A one-tap browser link and manual
checkpoints. Designed for how goods actually move here.

**Comparison on facts we can stand behind.** Orders delivered, verified-purchase
ratings, live stock. We removed the invented trust scores rather than keep them
because they looked good.

**The wholesaler keeps their customer.** We do not buy and resell. The
relationship, the pricing and the terms stay with the trader.

---

## 13. Competitor Analysis

### Positioning

| Platform           | What it fundamentally is        | Who pays it              | Role in the transaction    |
| ------------------ | -------------------------------- | ------------------------ | -------------------------- |
| **IndiaMART**      | Supplier directory + lead engine | Suppliers, for leads     | Introduces, then exits     |
| **TradeIndia**     | Supplier directory               | Suppliers, for listings  | Introduces, then exits     |
| **ExportersIndia** | Export-focused directory         | Suppliers, for listings  | Introduces, then exits     |
| **Udaan**          | Managed B2B marketplace          | Margin on goods          | Buys and resells           |
| **Shopify**        | Storefront software              | Merchants, subscription  | Not a marketplace          |
| **RARS Innoventa** | Transactional B2B marketplace    | Commission / subscription | Hosts the whole transaction |

### Feature comparison

| Capability                      | IndiaMART | TradeIndia | ExportersIndia | Udaan   | Shopify | RARS Innoventa |
| ------------------------------- | --------- | ---------- | -------------- | ------- | ------- | -------------- |
| Supplier discovery              | Strong    | Strong     | Strong         | Yes     | No      | Yes            |
| Compare suppliers on one product| No        | No         | No             | Limited | No      | **Yes**        |
| Order placed on platform        | No        | No         | No             | Yes     | Yes     | **Yes**        |
| Server-verified pricing         | n/a       | n/a        | n/a            | Yes     | Yes     | **Yes**        |
| Direct UPI, no gateway          | n/a       | n/a        | n/a            | No      | No      | **Yes**        |
| GST invoice generated           | No        | No         | No             | Yes     | Add-on  | **Yes**        |
| Delivery tracking               | No        | No         | No             | Yes     | Add-on  | **Yes**        |
| Tracking without a driver app   | n/a       | n/a        | n/a            | No      | n/a     | **Yes**        |
| Verified-purchase reviews       | Limited   | Limited    | Limited        | Yes     | Add-on  | **Yes**        |
| Trade credit / khata            | No        | No         | No             | Yes     | No      | Planned        |
| Seller keeps the customer       | Yes       | Yes        | Yes            | **No**  | Yes     | **Yes**        |
| Admin / moderation console      | Yes       | Yes        | Yes            | Yes     | Yes     | Not yet        |
| Mobile apps                     | Yes       | Yes        | Yes            | Yes     | Yes     | Not yet        |
| Scale and network               | Very large| Large      | Medium         | Large   | n/a     | Pre-launch     |

We are honest about the last three rows. Established players have reach, apps and
operational tooling we do not. Our argument is not that we are bigger; it is that
we handle the part of the trade they leave out.

---

## 14. Gap Analysis

| Gap in the market                                            | Who leaves it open       | How we address it                                               | Status         |
| ------------------------------------------------------------ | ------------------------ | ---------------------------------------------------------------- | -------------- |
| Buyer cannot compare suppliers on identical goods            | All directories          | Shared product catalogue with side-by-side supplier comparison    | Built          |
| Transaction happens off-platform, leaving no record          | All directories          | Order, payment, invoice and delivery all recorded together        | Built          |
| Platform inserts itself between the two businesses           | Udaan                    | Direct UPI, no reselling, wholesaler keeps pricing and terms      | Built          |
| GST paperwork is manual                                      | Directories, Shopify     | Automatic tax invoice with correct interstate treatment           | Built          |
| Tracking assumes a driver app                                | Most logistics tooling   | One-tap browser link plus manual checkpoints                      | Built          |
| Reviews are gameable                                         | Directories              | Verified-purchase only, enforced server-side                      | Built          |
| Informal trade credit has no record                          | Almost everyone          | Credit ledger with per-pair terms and no interest                 | **Planned**    |
| Buyer self-declares payment                                  | —                        | Wholesaler confirmation step                                      | **Planned**    |
| No operational tooling for the platform team                 | —                        | Admin console                                                     | **Planned**    |

The last three are ours, not the market's. They are listed here so the gap
analysis is a balance sheet rather than a sales pitch.

---

## 15. Business Model

The platform does not buy or hold stock, so revenue has to come from the service
rather than a margin on goods.

### Revenue streams

| Stream                     | How it works                                                              | When to introduce      |
| -------------------------- | ------------------------------------------------------------------------- | ---------------------- |
| **Wholesaler subscription** | Monthly or annual fee for the seller workspace beyond a free listing tier | At launch              |
| **Transaction commission**  | Small percentage on completed orders                                      | Once volume is steady  |
| **Verification**            | Paid badge after checking GSTIN and business documents                    | Early, low effort      |
| **Featured placement**      | Paid position in category and search results                              | Once traffic justifies it |
| **Credit facilitation**     | Fee for underwriting or guaranteeing trade credit                         | After the ledger ships |
| **Logistics partnerships**  | Referral share from transport partners booked through us                 | Later                  |

### Why commission is not the day-one model

Because payment goes directly between the businesses over UPI, we cannot deduct
a commission at source. Collecting it means invoicing the wholesaler separately,
which only works once they can see the platform is bringing them orders.

**Recommendation:** lead with subscription and verification, both of which are
collectable from day one. Introduce commission later, once order volume makes the
value obvious. **This is a judgement call, not something derived from the code.**

---

## 16. Pricing Strategy

Pricing has to respect what a small trader will actually pay. A wholesaler doing
₹15 lakh a month is not going to sign up for a plan priced like enterprise
software.

### Wholesaler plans

| Plan         | Price (assumed) | Listings  | Included                                                                 |
| ------------ | --------------- | --------- | ------------------------------------------------------------------------ |
| **Free**     | ₹0              | Up to 10  | Listings, orders, UPI payment, basic invoicing, chat                     |
| **Growth**   | ₹999 / month    | Up to 100 | Everything in Free, plus verification badge, GST and ageing reports, delivery tracking, full analytics |
| **Business** | ₹2,499 / month  | Unlimited | Everything in Growth, plus featured placement, priority support, multiple staff logins |

### Retailer pricing

Free, permanently. Retailers are the demand side; charging them would kill the
network before it forms.

### Notes on these numbers

**All prices above are assumptions.** They are not derived from the codebase or
from market research, and they should be tested with real wholesalers before
launch. The reasoning behind them:

- The free tier has to be genuinely usable, or wholesalers will not list at all
- ₹999 is roughly one small order's margin — an easy amount to justify
- Invoicing and GST reports sit in the paid tier because they replace real work
- Verification is paid because it costs us effort to actually check

---

## 17. Future Enhancements

Listed roughly in the order they should be built.

### Near term — needed for the product to be complete

**Order status controls.** The single biggest gap. The API works; no screen calls
it, so orders never move past payment. Everything downstream is blocked by this:
the dashboard pipeline, delivered-order counts, and reviews, which require a
delivered order. The plan is four buttons — Accept, Packed, Dispatch, Delivered —
each walking the intermediate states server-side so the wholesaler does not click
through eight.

**Wholesaler payment confirmation.** Today the buyer declares payment and the
system believes them. The wholesaler should confirm receipt. This is also the
prerequisite for credit.

**Admin console.** The API routes and role checks exist; there is no interface.
Needed for review moderation, promotion management and support.

### Medium term — the commercial differentiator

**Trade credit ledger.** Terms agreed per wholesaler-retailer pair, a down
payment on delivery and the balance carried to the next order. No interest — the
point is to formalise what already happens, not to lend. Warn when a limit is
crossed at first; block later. Needs a retailer reliability score built from
payment history.

**Promotions interface.** Flash sales, coupons, loyalty, referrals and gift cards
are all built on the server with tables in place. They need screens.

**Regional pricing.** Prices varying by region based on demand. Currently a flat
price with an optional bulk price. This needs care — the pricing logic would need
to be clear enough that a wholesaler can predict what their customer sees.

### Longer term

| Enhancement            | Why                                                                    |
| ---------------------- | ----------------------------------------------------------------------- |
| Mobile apps            | Most of this trade happens on a phone at a counter                       |
| Regional languages     | Hindi, Marathi, Gujarati, Tamil — English is a real barrier              |
| RFQ / negotiation      | Large orders get negotiated; the product assumes list prices             |
| Logistics integration  | Book transport through the platform                                     |
| GSTIN verification API | Automatic verification instead of manual document checks                |
| Return management      | Tables and an endpoint exist; no workflow or interface                  |
| Demand forecasting     | Suggest restocking from order history                                   |

### Engineering work not visible to users

There are no automated tests and no CI pipeline. The README is substantially out
of date — it describes a Razorpay integration, a `models/` directory and several
pages that do not exist. Both should be fixed before the team grows.

---

## 18. Success Metrics

### The metric that matters most

**Repeat order rate** — the share of retailers who place a second order within 60
days. A wholesale marketplace lives or dies on repeat purchasing. One order can
be curiosity; the second means we solved something.

### Growth

| Metric                       | What it tells us                              | Year-one target (assumed) |
| ---------------------------- | ---------------------------------------------- | ------------------------- |
| Registered wholesalers       | Supply depth                                   | 500                       |
| Registered retailers         | Demand                                         | 2,500                     |
| Active listings              | Catalogue usefulness                           | 10,000                    |
| Wholesalers with 5+ listings | Genuinely committed sellers, not just sign-ups | 60% of wholesalers        |

### Transaction health

| Metric                          | What it tells us                                    | Target (assumed) |
| ------------------------------- | ---------------------------------------------------- | ---------------- |
| Orders per month                | Core volume                                          | Growing 20% MoM  |
| Repeat order rate (60 days)     | Whether the product actually works                   | Above 40%        |
| Average order value             | Whether real restocking happens, not trial orders    | ₹15,000+         |
| Payment completion rate         | How many started checkouts finish                    | Above 85%        |
| Orders reaching delivered       | End-to-end completion — **blocked until status controls ship** | Above 90% |

### Quality

| Metric                    | What it tells us                           | Target (assumed) |
| ------------------------- | ------------------------------------------- | ---------------- |
| Average seller rating     | Supply-side quality                         | Above 4.0        |
| Orders with a review      | Whether the trust signal has enough data    | Above 25%        |
| Disputes per 100 orders   | Friction between the parties                | Below 2          |
| Invoice download rate     | Whether the GST feature is genuinely used   | Above 50%        |

### Commercial

| Metric                         | What it tells us                        |
| ------------------------------ | ---------------------------------------- |
| Free to paid conversion        | Whether the paid tier is worth its price |
| Monthly recurring revenue      | Predictable income                       |
| Subscription retention         | Whether value persists past month one    |
| Gross merchandise value        | Total trade flowing through the platform |

All targets above are **assumptions** for planning. They should be replaced with
real baselines after the first quarter of live usage.

---

## 19. Conclusion

RARS Innoventa sets out to do the part of wholesale trade that existing platforms
leave to phone calls and paper. A retailer can compare real suppliers on real
numbers, order from one of them, pay directly by UPI, watch the consignment
arrive, and download a GST invoice that their accountant can actually use. A
wholesaler gets customers beyond the ones they have personally met, without
handing over their pricing or their relationships.

A good part of that is built and working. The marketplace, ordering with
server-verified pricing, UPI collection, GST invoicing, delivery tracking,
messaging and verified reviews are all in place.

The honest position is that the product is not finished. Orders cannot yet be
marked delivered from the interface, which blocks several features behind it.
There is no admin console. The credit ledger — arguably the most commercially
important thing on the roadmap, because it addresses a need every trader has and
almost no platform serves — has not been started.

None of those are hard problems. They are sequencing. The foundations that are
difficult to change later, like the data model, the pricing authority and the
invoice numbering, are the ones that are already right.

The next milestone is straightforward: finish the order lifecycle, add
wholesaler payment confirmation, and then build credit on top of it.

---

*Version 1.0 · 6 August 2026 · RARS Innoventa*
*Prepared from a review of the codebase, database migrations and API surface as
of this date. Items marked as assumptions are planning inputs, not findings.*
