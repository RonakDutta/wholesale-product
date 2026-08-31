/**
 * Does each wholesaler get his own unbroken run of invoice numbers?
 *
 * The counter was keyed on the year alone, so one run served the whole
 * platform: Ram billed and got 000001, Suresh billed and got 000002, Ram
 * billed again and got 000003. Each man's own book had holes in it, and the
 * size of each hole told him how much business the other had done.
 *
 * Rule 46(b) wants a consecutive serial number per supplier, so this bills
 * alternately as two wholesalers and checks each one's numbers come out 1, 2,
 * 3 with nothing missing.
 *
 *     node scripts/invoice_number_check.js <database>
 */
const Module = require("module");
const { Pool } = require("pg");

const DB = process.argv[2] || "invnum";
const dbPath = require.resolve("../src/config/db");
const testPool = new Pool({ connectionString: `postgres://postgres@127.0.0.1:5433/${DB}` });
const stub = new Module(dbPath, null);
stub.exports = testPool; stub.loaded = true;
require.cache[dbPath] = stub;

const repo = require("../src/repositories/invoiceRepository");
const numbers = require("../src/services/invoiceNumberService");

let fails = 0;
const check = (cond, label, v) => { if (!cond) fails++;
  console.log(`  ${cond ? "PASS" : "FAIL"} ${String(label).padEnd(46)} ${JSON.stringify(v)}`); };
const q = (sql, args) => testPool.query(sql, args);

const stamp = Date.now();
let seq = 0;
const mkSeller = async (name) => (await q(
  `INSERT INTO users (first_name,last_name,email,role,phone,password_hash)
   VALUES ($1,'T',$2,'seller',$3,'x') RETURNING id`,
  [name, `s${stamp}${seq}@x.local`, `90000000${seq++}`],
)).rows[0].id;

(async () => {
  console.log(`\n=== invoice numbering, ${DB} ===`);
  await repo.findInvoices({ userId: null, role: "admin", limit: 1 });
  repo.resetSchemaExtras();
  const has = await repo.schemaExtras();
  console.log(`  per wholesaler counter: ${has.has_invoice_sequence_owner}`);

  const ram = await mkSeller("Ram");
  const suresh = await mkSeller("Suresh");

  // Bill alternately, the way two wholesalers on one platform actually would.
  const issued = { ram: [], suresh: [] };
  for (let i = 0; i < 3; i++) {
    issued.ram.push(await numbers.generateInvoiceNumber(null, "INV", 2026, ram));
    issued.suresh.push(await numbers.generateInvoiceNumber(null, "INV", 2026, suresh));
  }

  console.log(`  Ram:    ${issued.ram.join(", ")}`);
  console.log(`  Suresh: ${issued.suresh.join(", ")}`);

  const tail = (n) => Number(n.split("-").pop());
  const consecutive = (list) => list.every((n, i) => tail(n) === i + 1);

  if (has.has_invoice_sequence_owner) {
    check(consecutive(issued.ram), "Ram's numbers run 1, 2, 3 with no gaps",
      { his: issued.ram.map(tail) });
    check(consecutive(issued.suresh), "Suresh's numbers run 1, 2, 3 with no gaps",
      { his: issued.suresh.map(tail) });
    check(issued.ram[0] === issued.suresh[0],
      "both start at the same number, which is the point", { n: issued.ram[0] });

    // The same wholesaler must still never issue one number twice.
    const rowsA = await q(
      `SELECT last_number FROM invoice_sequences WHERE wholesaler_id = $1 AND year = 2026`, [ram]);
    check(Number(rowsA.rows[0].last_number) === 3,
      "his counter stands at 3, not 6", { at: rowsA.rows[0].last_number });

    // Two wholesalers can now hold the same invoice_number. Prove the database
    // allows that and still refuses a duplicate from one wholesaler.
    const buyer = await mkSeller("Buyer");
    const insert = (supplier, number) => q(
      `INSERT INTO invoices (invoice_number, supplier_id, buyer_id, issue_date)
       VALUES ($1,$2,$3,CURRENT_DATE)`, [number, supplier, buyer]);
    await insert(ram, "INV-2026-000001");
    let sharedOk = true;
    try { await insert(suresh, "INV-2026-000001"); } catch { sharedOk = false; }
    check(sharedOk, "two wholesalers may both hold INV-2026-000001", {});

    let duplicateRefused = false;
    try { await insert(ram, "INV-2026-000001"); } catch { duplicateRefused = true; }
    check(duplicateRefused, "one wholesaler may not issue it twice", {});
  } else {
    // Older shape. The numbers interleave, which is the bug, but nothing may
    // crash: an invoice that cannot be numbered cannot be raised.
    check(issued.ram.length === 3 && issued.suresh.length === 3,
      "numbering still works before the migration", { ram: issued.ram.map(tail) });
  }

  console.log(fails ? `\n${fails} FAILED\n` : "\nall good\n");
  await testPool.end();
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error("THREW", e); process.exit(1); });
