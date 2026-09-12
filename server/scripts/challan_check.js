/**
 * The delivery challan rule, and the invoice particulars that go with it.
 *
 * The rule under test, specified 10 Sept 2026: while a sale is unpaid or part
 * paid the wholesaler gets a delivery challan, and the tax invoice waits
 * until the money is in. The challan carries no tax.
 *
 * That is NOT what section 31(1) says, which ties the invoice to removal of
 * the goods rather than to payment. It is built because it was asked for,
 * behind a flag, and it is going to a legal advisor. See challanService.js.
 * These checks pin the behaviour that was asked for; they are not a claim
 * that the behaviour is compliant.
 *
 *     node scripts/challan_check.js <database>
 */
const Module = require("module");
const { Pool } = require("pg");

const DB = process.argv[2] || "qa_challan";
const dbPath = require.resolve("../src/config/db");
const testPool = new Pool({ connectionString: `postgres://postgres@127.0.0.1:5433/${DB}` });
const stub = new Module(dbPath, null);
stub.exports = testPool;
stub.loaded = true;
require.cache[dbPath] = stub;

const sales = require("../src/controllers/saleController");
const parties = require("../src/controllers/partyController");
const challans = require("../src/controllers/challanController");
const orders = require("../src/controllers/orderController");
const orderSale = require("../src/services/orderSaleService");
const challanService = require("../src/services/challanService");
const numbering = require("../src/services/invoiceNumberService");
const pdfService = require("../src/services/pdfService");
const invoiceRepository = require("../src/repositories/invoiceRepository");
const { amountInWords } = require("../src/utils/amountInWords");

const mk = () => {
  const r = { statusCode: 200, body: null };
  r.status = (c) => ((r.statusCode = c), r);
  r.json = (b) => ((r.body = b), r);
  return r;
};
const call = async (fn, req) => { const r = mk(); await fn(req, r); return r; };

let fails = 0;
const check = (cond, label, detail) => {
  if (!cond) fails++;
  console.log(`  ${cond ? "PASS" : "FAIL"} ${String(label).padEnd(52)} ${JSON.stringify(detail ?? {})}`);
};

const uniq = () => String(Date.now()) + Math.floor(Math.random() * 1000);

(async () => {
  console.log(`\n=== delivery challans against ${DB} ===\n`);
  challanService.resetChallanTables();

  const seller = (await testPool.query(
    `INSERT INTO users (first_name,last_name,email,phone,password_hash,role)
     VALUES ('Ram','Textiles',$1,$2,'x','seller') RETURNING id`,
    [`ram+${uniq()}@dc.local`, `90${uniq().slice(-8)}`])).rows[0].id;
  await testPool.query(
    `INSERT INTO wholesaler_profiles (user_id, company_name, warehouse_state, gstin, upi_id)
     VALUES ($1,'Ram Textiles','Gujarat','24AAACC1206D1ZM','ram@upi')`, [seller]);
  const asOwner = { user: { id: seller, role: "seller" }, business: { id: seller, owner: true } };

  const party = await call(parties.createParty, {
    ...asOwner,
    body: { name: "Kishan Cloth House", city: "Surat", gstin: "24BBBBB1111B1ZT", phone: `98${uniq().slice(-8)}` },
  });

  const makeSale = async (paid = 0) => {
    const s = await call(sales.createSale, {
      ...asOwner,
      body: {
        partyId: party.body.id,
        status: "confirmed",
        lines: [{ itemName: "Cotton shirting", quantity: 10, unit: "mtr", rate: 100, gstPercent: 5, hsnCode: "5208" }],
        amountPaid: paid,
        paymentMethod: paid ? "cash" : undefined,
      },
    });
    return s.body;
  };

  // ---------------------------------------------------------------
  console.log("Nothing paid");
  // ---------------------------------------------------------------
  const unpaid = await makeSale(0);
  check(Number(unpaid.total) === 1050, "a 1050 sale, nothing received", { total: unpaid.total });

  const refused = await call(sales.createInvoiceForSale, { ...asOwner, params: { id: unpaid.id } });
  check(refused.statusCode === 409, "the bill is refused", { s: refused.statusCode });
  check(refused.body?.code === "UNPAID", "with a code the screen can act on");
  check(
    Number(refused.body?.outstanding) === 1050,
    "and how much is left, so it need not go and look",
    { outstanding: refused.body?.outstanding },
  );

  const madeOne = await call(challans.createForSale, { ...asOwner, params: { id: unpaid.id }, body: {} });
  check(madeOne.statusCode === 201, "a challan can be made instead", { s: madeOne.statusCode });
  // The three documents are numbered the same way now: prefix, serial,
  // financial year, restarting each 1 April. They used to be INV-000001,
  // S-0001 and DC-0001, three shapes with three padding widths and no year on
  // any of them. Falls back to DC-0001 until the series migration is run, so
  // both shapes are accepted here and the suite runs on either database.
  check(
    /^DC[-/]/.test(String(madeOne.body?.challan_number || "")),
    "in its own number run, not the invoice run",
    { number: madeOne.body?.challan_number },
  );
  if (String(madeOne.body?.challan_number || "").includes("/")) {
    check(
      /^DC\/\d+\/\d\d-\d\d$/.test(madeOne.body.challan_number),
      "carrying the financial year, like the invoice and the sale",
      { number: madeOne.body.challan_number },
    );
  }
  check(
    madeOne.body?.is_rule_55 === false,
    "flagged as not a Rule 55 challan, which it is not",
  );
  check(
    Number(madeOne.body?.total_value) === 1050 && Number(madeOne.body?.amount_paid) === 0,
    "carrying the value and what had been received",
    { value: madeOne.body?.total_value, paid: madeOne.body?.amount_paid },
  );
  check(
    madeOne.body?.recipient_name === "Kishan Cloth House",
    "addressed the same way the invoice would be",
    { got: madeOne.body?.recipient_name },
  );

  const lines = await testPool.query(
    "SELECT * FROM delivery_challan_items WHERE challan_id = $1", [madeOne.body.id]);
  check(lines.rows.length === 1, "with its lines copied", { n: lines.rows.length });
  check(
    !("tax_amount" in lines.rows[0]) && !("gst_percent" in lines.rows[0]),
    "and no tax columns at all, as specified",
    { columns: Object.keys(lines.rows[0]).join(",") },
  );

  // ---------------------------------------------------------------
  console.log("\nHalf paid");
  // ---------------------------------------------------------------
  const half = await makeSale(500);
  const stillRefused = await call(sales.createInvoiceForSale, { ...asOwner, params: { id: half.id } });
  check(stillRefused.statusCode === 409, "half paid is still not billed", { s: stillRefused.statusCode });
  check(
    Number(stillRefused.body?.outstanding) === 550,
    "and the outstanding figure is right",
    { outstanding: stillRefused.body?.outstanding },
  );

  const halfChallan = await call(challans.createForSale, { ...asOwner, params: { id: half.id }, body: {} });
  check(
    Number(halfChallan.body?.amount_paid) === 500,
    "the challan records what had come in",
    { paid: halfChallan.body?.amount_paid },
  );

  // Two lorries, two challans against one sale.
  const second = await call(challans.createForSale, { ...asOwner, params: { id: half.id }, body: {} });
  check(second.statusCode === 201, "a second challan on the same sale is allowed", {
    s: second.statusCode,
    why: "goods can go out in more than one lot",
  });
  check(
    second.body?.challan_number !== halfChallan.body?.challan_number,
    "with its own number",
    { first: halfChallan.body?.challan_number, second: second.body?.challan_number },
  );

  // ---------------------------------------------------------------
  console.log("\nPaid in full");
  // ---------------------------------------------------------------
  const settled = await makeSale(1050);
  const billed = await call(sales.createInvoiceForSale, { ...asOwner, params: { id: settled.id } });
  // 201 if this call made it, 200 if the sale had already billed itself in the
  // background. Either is right; asserting 201 made the suite race its own
  // auto-billing.
  check(
    (billed.statusCode === 201 || billed.statusCode === 200) && Boolean(billed.body?.id),
    "now the bill is raised",
    { s: billed.statusCode, number: billed.body?.invoice_number },
  );

  const noChallan = await call(challans.createForSale, { ...asOwner, params: { id: settled.id }, body: {} });
  check(noChallan.statusCode === 400, "and a challan is refused on a settled sale", {
    s: noChallan.statusCode,
    m: noChallan.body?.message,
  });

  // The money arriving on the half paid sale should let it bill, and stamp
  // both its challans with the invoice that superseded them.
  await call(parties.recordPayment, {
    ...asOwner,
    params: { id: party.body.id },
    body: { amount: 550, method: "cash", saleId: half.id },
  });
  // The payment raises the bill on its own now, so the button is no longer
  // what does it. It used to be, and this check used to expect a 201 from it.
  const afterLast = await testPool.query(
    "SELECT id, invoice_number FROM invoices WHERE sale_id = $1", [half.id]);
  check(
    afterLast.rows.length === 1,
    "the rest arrives and the bill follows",
    { number: afterLast.rows[0]?.invoice_number },
  );
  const late = await call(sales.createInvoiceForSale, { ...asOwner, params: { id: half.id } });
  check(
    late.statusCode === 200 && String(late.body?.id) === String(afterLast.rows[0]?.id),
    "and pressing the button afterwards hands back the same one",
    { s: late.statusCode },
  );

  const stamped = await testPool.query(
    "SELECT invoice_id FROM delivery_challans WHERE sale_id = $1", [half.id]);
  check(
    stamped.rows.length === 2 && stamped.rows.every((r) => r.invoice_id),
    "both its challans point at the bill that superseded them",
    { rows: stamped.rows.length, stamped: stamped.rows.filter((r) => r.invoice_id).length },
  );

  // ---------------------------------------------------------------
  console.log("\nThe bill raises itself once the sale is settled");
  // ---------------------------------------------------------------
  // The last step used to be a button nobody had to press, so a wholesaler
  // could settle a sale and his customer would never get a bill. The order
  // side has always done this; the sales book did not.
  const auto = await makeSale(0);
  const noneYet = await testPool.query(
    "SELECT id FROM invoices WHERE sale_id = $1", [auto.id]);
  check(noneYet.rows.length === 0, "unpaid, so no bill", { n: noneYet.rows.length });

  await call(parties.recordPayment, {
    ...asOwner, params: { id: party.body.id },
    body: { amount: 600, method: "cash", saleId: auto.id },
  });
  const stillNone = await testPool.query(
    "SELECT id FROM invoices WHERE sale_id = $1", [auto.id]);
  check(stillNone.rows.length === 0, "part paid, still no bill", { n: stillNone.rows.length });

  await call(parties.recordPayment, {
    ...asOwner, params: { id: party.body.id },
    body: { amount: 450, method: "cash", saleId: auto.id },
  });
  const raised = await testPool.query(
    "SELECT invoice_number, payment_status FROM invoices WHERE sale_id = $1", [auto.id]);
  check(
    raised.rows.length === 1,
    "the last rupee raises the bill on its own",
    { number: raised.rows[0]?.invoice_number, was: "nothing until somebody pressed a button" },
  );
  check(
    raised.rows[0]?.payment_status === "Paid",
    "stamped Paid, not Pending",
    { got: raised.rows[0]?.payment_status },
  );

  // A counter sale written down as already paid is settled the moment it
  // exists, so it should not wait either.
  const cashSale = await makeSale(1050);
  await new Promise((r) => setTimeout(r, 400));
  const cashBill = await testPool.query(
    "SELECT invoice_number FROM invoices WHERE sale_id = $1", [cashSale.id]);
  check(
    cashBill.rows.length === 1,
    "a cash sale paid at the counter bills itself too",
    { number: cashBill.rows[0]?.invoice_number },
  );

  // Twice must not make two.
  await call(parties.recordPayment, {
    ...asOwner, params: { id: party.body.id },
    body: { amount: 1, method: "cash", saleId: auto.id },
  });
  const stillOne = await testPool.query(
    "SELECT id FROM invoices WHERE sale_id = $1", [auto.id]);
  check(stillOne.rows.length === 1, "a further payment does not make a second bill", {
    n: stillOne.rows.length,
  });

  // Two callers at the same instant, which is what a settled sale now has:
  // the payment billing it in the background while the wholesaler presses the
  // button. Both used to read "no invoice yet" and both went on to write one.
  const racy = await makeSale(0);
  await Promise.all([
    call(parties.recordPayment, {
      ...asOwner, params: { id: party.body.id },
      body: { amount: 1050, method: "cash", saleId: racy.id },
    }),
    (async () => {
      await new Promise((r) => setTimeout(r, 5));
      return call(sales.createInvoiceForSale, { ...asOwner, params: { id: racy.id } });
    })(),
  ]);
  await new Promise((r) => setTimeout(r, 400));
  const once = await testPool.query(
    "SELECT id FROM invoices WHERE sale_id = $1", [racy.id]);
  check(
    once.rows.length === 1,
    "the button and the auto bill racing still make one",
    { n: once.rows.length },
  );

  // ---------------------------------------------------------------
  console.log("\nWhat the screens need to show the right buttons");
  // ---------------------------------------------------------------
  const shown = await call(sales.getSaleById, { ...asOwner, params: { id: unpaid.id } });
  check(
    shown.body?.settlement && shown.body.settlement.settled === false,
    "the sale detail says whether it is settled",
    { settlement: shown.body?.settlement },
  );
  check(
    Number(shown.body?.settlement?.total) === 1050,
    "with the figures behind it, so the screen need not add them up",
    { total: shown.body?.settlement?.total, received: shown.body?.settlement?.received },
  );
  check(shown.body?.challansOn === true, "and whether challans are switched on at all");

  const settledShown = await call(sales.getSaleById, { ...asOwner, params: { id: settled.id } });
  check(
    settledShown.body?.settlement?.settled === true,
    "a settled sale says so, so the offer is not made",
  );

  const listed = await call(sales.listSales, { ...asOwner, query: {} });
  const unpaidRow = (listed.body || []).find((r) => r.id === unpaid.id);
  check(
    Number(unpaidRow?.challan_count) === 1,
    "the sales list counts challans per sale",
    { got: unpaidRow?.challan_count },
  );
  const settledRow = (listed.body || []).find((r) => r.id === settled.id);
  check(
    Number(settledRow?.challan_count) === 0,
    "and shows zero where none went out",
    { got: settledRow?.challan_count },
  );

  const all = await call(challans.listChallans, asOwner);
  // Three by this point: one on the unpaid sale and two on the half paid one.
  // The settled sale was refused, and the old-invoice case below adds a
  // fourth after this.
  check(
    (all.body || []).length === 3,
    "the challans screen lists every one of them",
    { n: (all.body || []).length },
  );
  check(
    (all.body || []).every((c) => c.challan_number && c.recipient_name),
    "each carrying its number and who it went to",
  );
  check(
    (all.body || []).filter((c) => c.invoice_id).length === 2,
    "two of which are now billed",
    { billed: (all.body || []).filter((c) => c.invoice_id).length },
  );

  // A sale that already has a bill can still send goods out, because it can:
  // this is the case a wholesaler hit on 10 Sept with an invoice raised
  // before the rule existed.
  const billedButDue = await makeSale(0);
  await testPool.query(
    `INSERT INTO invoices (invoice_number, sale_id, party_id, supplier_id, buyer_id,
                           subtotal, taxable_amount, grand_total, payment_status,
                           invoice_status, issue_date, due_date)
     VALUES ($1,$2,$3,$4,NULL,1000,1000,1050,'Pending','Generated',CURRENT_DATE,CURRENT_DATE)`,
    [`OLD-${uniq().slice(-6)}`, billedButDue.id, party.body.id, seller],
  );
  const stillAllowed = await call(challans.createForSale, {
    ...asOwner, params: { id: billedButDue.id }, body: {},
  });
  check(
    stillAllowed.statusCode === 201,
    "a sale billed before it was settled can still send goods out",
    { s: stillAllowed.statusCode, why: "an invoice raised under the old rule does not trap the goods" },
  );

  // ---------------------------------------------------------------
  console.log("\nThe invoice number, Rule 46(b)");
  // ---------------------------------------------------------------
  check(numbering.financialYear(new Date("2026-03-31")) === "25-26", "31 March is the old year");
  check(numbering.financialYear(new Date("2026-04-01")) === "26-27", "1 April starts the new one");
  check(
    numbering.financialYear(new Date("2027-01-15")) === "26-27",
    "and January does NOT reset it",
    { was: "it did, so January reused a number from the same year" },
  );
  check(
    numbering.financialYearKey(new Date("2027-01-15")) === 2026,
    "the counter keys on the same year, so the run continues",
  );

  const busy = numbering.compose({ prefix: "OM/", suffix: "/{FY}", sequence: 2, padTo: 0, date: new Date("2026-05-04") });
  check(busy.number === "OM/2/26-27" && busy.ok, "the Busy shape is reproducible", { got: busy.number });

  const tooLong = numbering.compose({ prefix: "VERYLONGPFX-", sequence: 1, padTo: 6 });
  check(!tooLong.ok, "a number over 16 characters is refused", { got: tooLong.number, why: tooLong.reason });

  const badChar = numbering.compose({ prefix: "INV_", sequence: 1, padTo: 6 });
  check(!badChar.ok, "so is an underscore, which Rule 46(b) does not allow", { got: badChar.number });

  const realNumber = billed.body.invoice_number;
  check(
    realNumber.length <= 16,
    "and a real invoice number fits",
    { number: realNumber, length: realNumber.length },
  );

  // ---------------------------------------------------------------
  console.log("\nThe Rule 46 particulars on the bill");
  // ---------------------------------------------------------------
  const stored = await testPool.query(
    `SELECT place_of_supply, place_of_supply_code, supplier_state,
            reverse_charge, round_off
       FROM invoices WHERE id = $1`, [billed.body.id]);
  const row = stored.rows[0];
  check(row.place_of_supply === "Gujarat", "the place of supply is stored", { got: row.place_of_supply });
  check(row.place_of_supply_code === "24", "with its state code", { got: row.place_of_supply_code });
  check(row.supplier_state === "Gujarat", "and the supplier's own state beside it");
  check(row.reverse_charge === false, "reverse charge says no rather than staying silent");

  check(
    amountInWords(1050) === "Rupees One Thousand Fifty Only",
    "the amount in words reads properly",
    { got: amountInWords(1050) },
  );

  const full = await invoiceRepository.findInvoiceById(billed.body.id);
  const pdf = await pdfService.generateInvoicePDF(full);
  check(pdf.length > 1000, "the invoice PDF still renders", { bytes: pdf.length });

  const challanRow = await challanService.findById(madeOne.body.id, seller);
  const challanPdf = await pdfService.generateChallanPDF(challanRow);
  check(challanPdf.length > 1000, "and so does the challan PDF", { bytes: challanPdf.length });

  // ---------------------------------------------------------------
  console.log("\nThe same thing from the order screen");
  // ---------------------------------------------------------------
  orderSale.resetSaleLink();

  const buyer = (await testPool.query(
    `INSERT INTO users (first_name,last_name,email,phone,password_hash,role)
     VALUES ('Kishan','Kumar',$1,$2,'x','buyer') RETURNING id`,
    [`kishan+${uniq()}@dc.local`, `97${uniq().slice(-8)}`])).rows[0].id;

  /** An order for 1420, with `paid` of it received. */
  const makeOrder = async (paid = 0) => {
    const product = (await testPool.query(
      `INSERT INTO products (name, category) VALUES ($1,'Fabric') RETURNING id`,
      [`Cotton shirting ${uniq()}`])).rows[0].id;
    const listing = (await testPool.query(
      `INSERT INTO supplier_inventory
         (supplier_id, product_id, price, moq, stock, shipping_days, unit, hsn_code, gst_percent)
       VALUES ($1,$2,142,1,100,2,'mtr','5208',5) RETURNING id`,
      [seller, product])).rows[0].id;
    const id = (await testPool.query(
      `INSERT INTO orders (buyer_id, supplier_id, party_id, inventory_item_id, quantity,
                           total_amount, subtotal, amount_paid, status, payment_status, order_number)
       VALUES ($1,$2,$3,$4,10,1420,1420,$5,'supplier_accepted','pending',$6) RETURNING id`,
      [buyer, seller, party.body.id, listing, paid, `ORD${uniq().slice(-10)}`])).rows[0].id;
    await testPool.query(
      `INSERT INTO order_items (order_id, inventory_item_id, product_name, quantity, unit_price, total_price, moq)
       VALUES ($1,$2,'Cotton shirting',10,142,1420,1)`,
      [id, listing],
    );
    return id;
  };

  // Not accepted yet, so there is nothing in the book to send out against.
  const notAccepted = await makeOrder(0);
  const beforeAccept = await call(challans.listForOrder, { ...asOwner, params: { id: notAccepted } });
  check(
    beforeAccept.body?.hasSale === false,
    "an order with no sale behind it says so",
    { hasSale: beforeAccept.body?.hasSale },
  );
  const tooEarly = await call(challans.createForOrder, {
    ...asOwner, params: { id: notAccepted }, body: {},
  });
  check(tooEarly.statusCode === 400, "and refuses to make a challan", { s: tooEarly.statusCode });
  check(tooEarly.body?.code === "noSale", "with a reason the screen can read", {
    code: tooEarly.body?.code,
  });

  // Accepted, half paid: exactly the case the button exists for.
  const partOrder = await makeOrder(700);
  const clientA = await testPool.connect();
  await orderSale.createSaleFromOrder(clientA, partOrder);
  clientA.release();

  const before = await call(challans.listForOrder, { ...asOwner, params: { id: partOrder } });
  check(before.body?.hasSale === true, "an accepted order has its sale behind it");
  check(
    before.body?.settlement?.settled === false,
    "and the order screen is told it is not settled",
    { settlement: before.body?.settlement },
  );
  check(
    Number(before.body?.settlement?.received) === 700,
    "with what has come in read off the order, not the sale",
    { received: before.body?.settlement?.received },
  );
  check((before.body?.challans || []).length === 0, "no challans on it yet");

  const fromOrder = await call(challans.createForOrder, {
    ...asOwner, params: { id: partOrder }, body: {},
  });
  check(fromOrder.statusCode === 201, "a challan can be made from the order", {
    s: fromOrder.statusCode,
  });
  check(
    Number(fromOrder.body?.total_value) === 1420,
    "carrying the order's goods",
    { total: fromOrder.body?.total_value },
  );

  const after = await call(challans.listForOrder, { ...asOwner, params: { id: partOrder } });
  check(
    (after.body?.challans || []).length === 1,
    "and it is listed against the order afterwards",
    { n: (after.body?.challans || []).length },
  );

  const supplierList = await call(orders.getSupplierOrders, asOwner);
  const withChallan = (supplierList.body || []).find((o) => String(o.id) === String(partOrder));
  check(
    Number(withChallan?.challan_count) === 1,
    "the orders list counts challans per order",
    { got: withChallan?.challan_count },
  );
  const withoutChallan = (supplierList.body || []).find((o) => String(o.id) === String(notAccepted));
  check(
    Number(withoutChallan?.challan_count) === 0,
    "and shows zero where none went out",
    { got: withoutChallan?.challan_count },
  );

  // Paid in full, so the button should not be offered at all.
  const paidOrder = await makeOrder(1420);
  const clientB = await testPool.connect();
  await orderSale.createSaleFromOrder(clientB, paidOrder);
  clientB.release();
  const paidView = await call(challans.listForOrder, { ...asOwner, params: { id: paidOrder } });
  check(
    paidView.body?.settlement?.settled === true,
    "a fully paid order says settled, so the offer is not made",
    { settlement: paidView.body?.settlement },
  );

  // ---------------------------------------------------------------
  console.log("\nAnother wholesaler cannot reach any of it");
  // ---------------------------------------------------------------
  const other = (await testPool.query(
    `INSERT INTO users (first_name,last_name,email,phone,password_hash,role)
     VALUES ('Other','Seller',$1,$2,'x','seller') RETURNING id`,
    [`other+${uniq()}@dc.local`, `80${uniq().slice(-8)}`])).rows[0].id;
  const asOther = { user: { id: other, role: "seller" }, business: { id: other, owner: true } };

  const peek = await call(challans.getChallan, { ...asOther, params: { id: madeOne.body.id } });
  check(peek.statusCode === 404, "his challan is not readable by anyone else", { s: peek.statusCode });
  const theirList = await call(challans.listChallans, asOther);
  check((theirList.body || []).length === 0, "and does not show in another book", {
    n: (theirList.body || []).length,
  });

  console.log(`\n${fails === 0 ? "all good" : `${fails} FAILED`}\n`);
  await testPool.end();
  process.exit(fails === 0 ? 0 : 1);
})().catch((err) => {
  console.error("THREW", err);
  process.exit(1);
});
