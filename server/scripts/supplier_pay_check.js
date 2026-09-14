/**
 * How to pay a supplier, and what the payment was called.
 *
 * The product cannot move this money and must never look as though it can.
 * The wholesaler pays from his own UPI app, bank to bank, and comes back and
 * says what he paid. So what these columns have to do is narrow: hold details
 * good enough to build a UPI intent from, refuse ones that are not, and carry
 * the bank's reference so a person can reconcile a statement later.
 *
 * What has to hold:
 *   - a VPA with no @ in it is refused, because it would build an intent that
 *     fails silently inside his UPI app with nothing to explain why
 *   - a malformed IFSC is refused, since the format is published and checkable
 *     offline, unlike whether the account exists
 *   - an account number without an IFSC is refused, and the reverse too: one
 *     alone looks complete on screen and cannot be paid to
 *   - the details are PRIVATE to the wholesaler who entered them
 *   - a payment carries its reference, and paying still works without one
 *   - before the migration, entering details is refused loudly, and saving a
 *     supplier without them changes nothing
 *
 *     node scripts/supplier_pay_check.js <migrated-db> <unmigrated-db>
 */
const Module = require("module");
const { Pool } = require("pg");

const DB = process.argv[2] || "sup1";
const OLD_DB = process.argv[3] || "pur1";
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

const mkSeller = async (pool, tag) => {
  const id = (await pool.query(
    `INSERT INTO users (first_name,last_name,email,phone,password_hash,role)
     VALUES ('Ram','T',$1,$2,'x','seller') RETURNING id`,
    [`${tag}${uniq()}@sp.local`, `9${uniq().slice(-9)}`])).rows[0].id;
  await pool.query(
    `INSERT INTO wholesaler_profiles (user_id, company_name, warehouse_state, city)
     VALUES ($1,'Ram Textiles','Gujarat','Surat')`, [id]);
  return {
    user: { id, role: "seller" },
    business: { id, isOwner: true, staffId: null, name: null, permissions: [] },
  };
};

(async () => {
  console.log(`\n=== paying a supplier, against ${DB} ===\n`);
  const asSeller = await mkSeller(testPool, "ram");
  const asOther = await mkSeller(testPool, "other");

  check((await invoiceRepository.schemaExtras()).has_supplier_pay_details,
    "this database carries the pay detail columns", {});

  // ---------------------------------------------------------------
  console.log("-- what may be stored --");

  const good = await call(suppliers.createSupplier, {
    ...asSeller,
    body: {
      name: "Arvind Mills", phone: `88${uniq().slice(-8)}`,
      upiId: "arvind@okhdfcbank",
      bankAccountName: "Arvind Mills Pvt Ltd",
      bankAccountNumber: "50100123456789",
      bankIfsc: "hdfc0001234",
    },
  });
  check(good.statusCode === 201 && good.body.upi_id === "arvind@okhdfcbank",
    "a supplier is stored with his UPI ID",
    { got: good.body?.upi_id, code: good.statusCode, msg: good.body?.message });
  check(good.body?.bank_ifsc === "HDFC0001234",
    "and the IFSC is upper cased, so it reads back one way",
    { got: good.body?.bank_ifsc });

  const noAt = await call(suppliers.createSupplier, {
    ...asSeller,
    body: { name: "Bad VPA", phone: `87${uniq().slice(-8)}`, upiId: "9876543210" },
  });
  check(noAt.statusCode === 400,
    "a phone number typed into the UPI box is refused",
    { got: noAt.statusCode, msg: noAt.body?.message });

  const badIfsc = await call(suppliers.createSupplier, {
    ...asSeller,
    body: {
      name: "Bad IFSC", phone: `86${uniq().slice(-8)}`,
      bankAccountNumber: "50100123456789", bankIfsc: "HDFC1234567",
    },
  });
  check(badIfsc.statusCode === 400,
    "an IFSC without the zero in the fifth place is refused",
    { got: badIfsc.statusCode });

  const halfBank = await call(suppliers.createSupplier, {
    ...asSeller,
    body: { name: "Half", phone: `85${uniq().slice(-8)}`, bankAccountNumber: "50100123456789" },
  });
  check(halfBank.statusCode === 400,
    "an account number with no IFSC is refused, not half saved",
    { got: halfBank.statusCode, msg: halfBank.body?.message });

  const ifscOnly = await call(suppliers.createSupplier, {
    ...asSeller,
    body: { name: "Branch Only", phone: `84${uniq().slice(-8)}`, bankIfsc: "HDFC0001234" },
  });
  check(ifscOnly.statusCode === 400, "and so is an IFSC with no account number",
    { got: ifscOnly.statusCode });

  const none = await call(suppliers.createSupplier, {
    ...asSeller, body: { name: "Cash Only", phone: `83${uniq().slice(-8)}` },
  });
  check(none.statusCode === 201 && !none.body.upi_id,
    "a supplier with no details at all is ordinary and allowed",
    { got: none.statusCode });

  // ---------------------------------------------------------------
  console.log("\n-- they are his, and nobody else's --");

  const theirs = await call(suppliers.getSupplierById, {
    ...asOther, params: { id: good.body.id },
  });
  check(theirs.statusCode === 404,
    "another wholesaler cannot read them", { got: theirs.statusCode });

  const mine = await call(suppliers.getSupplierById, {
    ...asSeller, params: { id: good.body.id },
  });
  check(mine.body?.supplier?.upi_id === "arvind@okhdfcbank",
    "and the owner can", { got: mine.body?.supplier?.upi_id });

  // ---------------------------------------------------------------
  console.log("\n-- editing --");

  const changed = await call(suppliers.updateSupplier, {
    ...asSeller, params: { id: good.body.id },
    body: { name: "Arvind Mills", upiId: "arvind@ybl",
            bankAccountNumber: "50100123456789", bankIfsc: "HDFC0001234" },
  });
  check(changed.statusCode === 200 && changed.body.upi_id === "arvind@ybl",
    "a UPI ID can be corrected", { got: changed.body?.upi_id });

  const cleared = await call(suppliers.updateSupplier, {
    ...asSeller, params: { id: good.body.id }, body: { name: "Arvind Mills" },
  });
  check(cleared.statusCode === 200 && !cleared.body.upi_id,
    "and cleared, for a supplier who stops taking UPI", { got: cleared.body?.upi_id });

  // ---------------------------------------------------------------
  console.log("\n-- the payment, and its reference --");

  const paid = await call(suppliers.recordSupplierPayment, {
    ...asSeller, params: { id: good.body.id },
    body: { amount: 60000, method: "upi", reference: "451234567890" },
  });
  check(paid.statusCode === 201 && paid.body.reference === "451234567890",
    "a UPI payment carries the reference his app gave him",
    { got: paid.body?.reference, code: paid.statusCode });
  check(paid.body?.method === "upi", "recorded as UPI", { got: paid.body?.method });

  const noRef = await call(suppliers.recordSupplierPayment, {
    ...asSeller, params: { id: good.body.id },
    body: { amount: 5000, method: "cash" },
  });
  check(noRef.statusCode === 201 && !noRef.body.reference,
    "cash still needs no reference", { got: noRef.statusCode });

  const read = await call(suppliers.getSupplierById, {
    ...asSeller, params: { id: good.body.id },
  });
  const withRef = (read.body?.payments || []).find((p) => p.reference === "451234567890");
  check(Boolean(withRef), "and the reference comes back on his page", {
    found: Boolean(withRef),
  });

  // The balance is still the one rule, untouched by any of this.
  check(Number(read.body?.supplier?.balance) === -65000,
    "paying with nothing billed leaves money on account, as before",
    { balance: read.body?.supplier?.balance });

  await testPool.end();

  // ---------------------------------------------------------------
  console.log("\n-- before the migration is run --");
  const { execFileSync } = require("child_process");
  try {
    const out = execFileSync(process.execPath,
      [require.resolve("./supplier_pay_premigration.js"), OLD_DB],
      { encoding: "utf8" });
    process.stdout.write(out);
    if (/FAIL/.test(out)) fails += (out.match(/FAIL/g) || []).length;
  } catch (err) {
    console.log("  FAIL the unmigrated check threw", err.message);
    fails++;
  }

  console.log(fails ? `\n${fails} FAILED\n` : "\nall good\n");
  process.exit(fails ? 1 : 0);
})().catch((err) => { console.error("THREW", err); process.exit(1); });
