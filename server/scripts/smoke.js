/**
 * Smoke test for the wholesaler flows.
 *
 * Not a test framework, and not pretending to be one. It is the pattern from
 * CLAUDE.md made repeatable: start a local Postgres, build the schema, drive
 * the real controllers with a fake req and res, and check the answers.
 *
 * It runs against two database shapes on purpose, because migrations here are
 * applied by hand and the code has to survive being ahead of them. Twice now a
 * query has named a column that had not been added yet and taken a whole
 * screen down with a 500.
 *
 *   node scripts/smoke.js notax     without wholesale3_tax_on_top.sql
 *   node scripts/smoke.js withtax   every migration applied
 *
 * Expects a local Postgres on 127.0.0.1:5433 with that database already
 * carrying users, wholesaler_profiles, parties, sales and items. See CLAUDE.md
 * for why it cannot use the app's own pool.
 *
 * Exits non zero on the first failure, so it can gate a commit.
 */
const Module = require("module");
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const DB = process.argv[2] || "withtax";
const dbPath = require.resolve("../src/config/db");
const testPool = new Pool({ connectionString: `postgres://postgres@127.0.0.1:5433/${DB}` });
const stub = new Module(dbPath, null);
stub.exports = testPool; stub.loaded = true;
require.cache[dbPath] = stub;

const repo = require("../src/repositories/invoiceRepository");
const items = require("../src/controllers/itemController");
const parties = require("../src/controllers/partyController");
const sales = require("../src/controllers/saleController");
const invoices = require("../src/controllers/invoiceController");
const creditNotes = require("../src/controllers/creditNoteController");
const pdf = require("../src/services/pdfService");

const mig = (n) => fs.readFileSync(path.join(__dirname, "..", "migrations", n), "utf8");
const mk = () => { const r = { statusCode: 200, body: null };
  r.status = c => (r.statusCode = c, r); r.json = b => (r.body = b, r); return r; };
const call = async (fn, req) => { const r = mk(); await fn(req, r); return r; };
let fails = 0;
const check = (cond, label, v) => { if (!cond) fails++;
  console.log(`  ${cond ? "PASS" : "FAIL"} ${String(label).padEnd(34)} ${JSON.stringify(v)}`); };

(async () => {
  console.log(`\n=== ${DB} ===`);
  await repo.findInvoices({ userId: null, role: "admin", limit: 1 });
  repo.resetSchemaExtras();
  for (const m of ["wholesale3_fractional_invoice_quantity.sql","wholesale3_invoice_from_sale.sql",
                   "wholesale3_credit_notes.sql","wholesale3_drop_invented_hsn.sql"]) await testPool.query(mig(m));
  if (DB === "withtax") await testPool.query(mig("wholesale3_tax_on_top.sql"));
  repo.resetSchemaExtras();

  // password_hash and phone are NOT NULL on the real schema. Leaving them out
  // worked for a long time only because this ran against a hand built stub
  // that was missing those constraints.
  const u = await testPool.query(`INSERT INTO users (first_name,last_name,email,phone,password_hash,role)
    VALUES ('Ram','T',$1,$2,'x','seller') RETURNING id`,
    [`ram+${Date.now()}@${DB}.local`, `9${String(Date.now()).slice(-9)}`]);
  const wid = u.rows[0].id;
  await testPool.query(`INSERT INTO wholesaler_profiles (user_id,company_name,gstin,city,warehouse_state)
    VALUES ($1,'Ram Textiles','24AAAAA0000A1Z8','Surat','Gujarat')`, [wid]);
  const user = { id: wid, role: "seller" };

  const it = await call(items.createItem, { user, body: { name: "Cotton shirting", unit: "mtr", rate: 142, hsnCode: "5208", gstPercent: 5 } });
  check(it.statusCode === 201, "create product", { s: it.statusCode });
  check((await call(items.listItems, { user, query: {} })).statusCode === 200, "list products", {});

  const p = await call(parties.createParty, { user, body: { name: "Kishan Cloth House", city: "Surat", gstin: "24BBBBB1111B1ZT", phone: "9820011223" } });
  check(p.statusCode === 201, "create customer", { s: p.statusCode });

  const s = await call(sales.createSale, { user, body: { partyId: p.body.id, status: "confirmed",
    lines: [{ itemName: "Cotton shirting", quantity: 2.5, unit: "mtr", rate: 142 }], amountPaid: 100 } });
  check(s.statusCode === 201, "record sale", { s: s.statusCode, total: s.body.total, tax: s.body.tax_amount });

  const d = await call(sales.getSaleById, { user, params: { id: s.body.id } });
  check(d.statusCode === 200 && d.body.lines.length === 1, "read sale", { s: d.statusCode });

  const e = await call(sales.updateSale, { user, params: { id: s.body.id },
    body: { lines: [{ itemName: "Cotton shirting", quantity: 3, rate: 142 }] } });
  check(e.statusCode === 200, "edit sale", { total: e.body.total });

  const b = await call(sales.createInvoiceForSale, { user, params: { id: s.body.id } });
  check(b.statusCode === 201, "raise invoice", { total: b.body.grand_total });
  check(Number(b.body.grand_total) === Number(e.body.total), "bill equals sale", { sale: e.body.total, bill: b.body.grand_total });

  const full = await repo.findInvoiceById(b.body.id);
  check((await pdf.generateInvoicePDF(full)).length > 1000, "invoice pdf", {});

  const pay = await call(parties.recordPayment, { user, params: { id: p.body.id }, body: { amount: 50, method: "upi" } });
  check(pay.statusCode === 201, "record payment", {});

  const st = await call(parties.getPartyStatement, { user, params: { id: p.body.id }, query: {} });
  const bal = await call(parties.getPartyById, { user, params: { id: p.body.id } });
  check(Number(st.body.closingBalance) === Number(bal.body.party.outstanding), "statement equals khata",
    { statement: st.body.closingBalance, khata: bal.body.party.outstanding });
  check((await pdf.generateStatementPDF(st.body, {})).length > 1000, "statement pdf", {});

  const cn = await call(creditNotes.createCreditNote, { user, body: { invoiceId: b.body.id, reason: "goods_returned" } });
  check(cn.statusCode === 201, "credit note", { n: cn.body.note_number });
  const note = await require("../src/services/creditNoteService").getCreditNote(cn.body.id, wid);
  check((await pdf.generateCreditNotePDF(note)).length > 1000, "credit note pdf", {});

  const list = await call(invoices.getInvoices.bind(invoices), { user, query: { side: "sales" } });
  check(list.body.invoices?.length === 1, "invoice list", { n: list.body.invoices?.length });
  const stats = await call(invoices.getDashboardStats.bind(invoices), { user, query: { side: "sales" } });
  check(stats.body.success === true, "dashboard totals", {});

  await testPool.end();
  console.log(fails === 0 ? "  all good" : `  ${fails} FAILED`);
  process.exit(fails === 0 ? 0 : 1);
})().catch(e => { console.error("HARNESS ERROR", e.message); process.exit(1); });
