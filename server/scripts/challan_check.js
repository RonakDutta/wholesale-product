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
  check(/^DC-\d{4}$/.test(madeOne.body?.challan_number || ""), "in its own number run, not the invoice run", {
    number: madeOne.body?.challan_number,
  });
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
  check(billed.statusCode === 201, "now the bill is raised", { s: billed.statusCode });

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
  const late = await call(sales.createInvoiceForSale, { ...asOwner, params: { id: half.id } });
  check(late.statusCode === 201, "the rest arrives and the bill follows", { s: late.statusCode });

  const stamped = await testPool.query(
    "SELECT invoice_id FROM delivery_challans WHERE sale_id = $1", [half.id]);
  check(
    stamped.rows.length === 2 && stamped.rows.every((r) => r.invoice_id),
    "both its challans point at the bill that superseded them",
    { rows: stamped.rows.length, stamped: stamped.rows.filter((r) => r.invoice_id).length },
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
