/**
 * The same code against a database that has the purchase book but NOT
 * wholesale3_supplier_payment_details.sql. Its own process, because the
 * schema probe caches its answer for the life of one.
 *
 * The asymmetry being checked is the same one the customer's state has, and
 * for the same reason: a wholesaler told his supplier's bank details saved
 * when they were not will pay the wrong person later, so that is refused
 * loudly. Saving a supplier WITHOUT them has to go on working exactly as it
 * did, or the form becomes unusable to protect a value that is not there.
 *
 *     node scripts/supplier_pay_premigration.js <unmigrated-db>
 */
const Module = require("module");
const { Pool } = require("pg");

const DB = process.argv[2] || "pur1";
const dbPath = require.resolve("../src/config/db");
const testPool = new Pool({ connectionString: `postgres://postgres@127.0.0.1:5433/${DB}` });
const stub = new Module(dbPath, null);
stub.exports = testPool;
stub.loaded = true;
require.cache[dbPath] = stub;

const suppliers = require("../src/controllers/supplierController");
const invoiceRepository = require("../src/repositories/invoiceRepository");

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
  console.log(`  ${cond ? "PASS" : "FAIL"} ${String(label).padEnd(58)} ${JSON.stringify(detail ?? {})}`);
};
const uniq = () => String(Date.now()) + Math.floor(Math.random() * 1000);

(async () => {
  const id = (await testPool.query(
    `INSERT INTO users (first_name,last_name,email,phone,password_hash,role)
     VALUES ('Old','T',$1,$2,'x','seller') RETURNING id`,
    [`old${uniq()}@sp.local`, `9${uniq().slice(-9)}`])).rows[0].id;
  await testPool.query(
    `INSERT INTO wholesaler_profiles (user_id, company_name, warehouse_state, city)
     VALUES ($1,'Old Textiles','Gujarat','Surat')`, [id]);
  const asSeller = {
    user: { id, role: "seller" },
    business: { id, isOwner: true, staffId: null, name: null, permissions: [] },
  };

  const extras = await invoiceRepository.schemaExtras();
  check(extras.has_purchases, "the purchase book IS set up here", {});
  check(!extras.has_supplier_pay_details,
    "but the pay detail columns are NOT", {});

  const typed = await call(suppliers.createSupplier, {
    ...asSeller,
    body: { name: "Wants UPI", phone: `78${uniq().slice(-8)}`, upiId: "mill@okaxis" },
  });
  check(typed.statusCode === 503 &&
        typed.body?.code === "SUPPLIER_PAY_DETAILS_NOT_SET_UP",
    "entering a UPI ID is refused loudly, not dropped",
    { got: typed.statusCode, code: typed.body?.code });

  const plain = await call(suppliers.createSupplier, {
    ...asSeller, body: { name: "Ordinary Mill", phone: `77${uniq().slice(-8)}`, city: "Surat" },
  });
  check(plain.statusCode === 201,
    "a supplier with no pay details saves exactly as before", { got: plain.statusCode });

  // The regression this guards: the form sends every field, empty ones too.
  const edited = await call(suppliers.updateSupplier, {
    ...asSeller, params: { id: plain.body.id },
    body: { name: "Ordinary Mill", city: "Rajkot", upiId: "", bankIfsc: "",
            bankAccountNumber: "", bankAccountName: "" },
  });
  check(edited.statusCode === 200 && edited.body?.city === "Rajkot",
    "and editing him with the boxes empty still works",
    { got: edited.statusCode, city: edited.body?.city });

  // A payment still records; only the reference is quietly not kept.
  const paid = await call(suppliers.recordSupplierPayment, {
    ...asSeller, params: { id: plain.body.id },
    body: { amount: 1000, method: "upi", reference: "451234567890" },
  });
  check(paid.statusCode === 201,
    "and a payment is still recorded, reference or not", { got: paid.statusCode });

  await testPool.end();
  process.exit(fails ? 1 : 0);
})().catch((err) => { console.error("THREW", err); process.exit(1); });
