const Module = require("module");
const { Pool } = require("pg");
const DB = process.argv[2];
const dbPath = require.resolve("../src/config/db");
const p = new Pool({ connectionString: `postgres://postgres@127.0.0.1:5433/${DB}` });
const s = new Module(dbPath, null); s.exports = p; s.loaded = true;
require.cache[dbPath] = s;
const repo = require("../src/repositories/invoiceRepository");
const products = require("../src/controllers/productController");
const dash = require("../src/controllers/dashboardController");
const mk = () => { const r = { statusCode: 200, body: null };
  r.status = c => (r.statusCode = c, r); r.json = b => (r.body = b, r); return r; };
const call = async (fn, req) => { const r = mk(); await fn(req, r); return r; };
let fails = 0;
const check = (c, l, v) => { if (!c) fails++; console.log(`  ${c?"PASS":"FAIL"} ${String(l).padEnd(38)} ${JSON.stringify(v)}`); };
(async () => {
  repo.resetSchemaExtras();
  const has = await repo.schemaExtras();
  console.log(`\n=== ${DB} (billing columns: ${has.has_listing_billing}) ===`);
  const u = await p.query(`INSERT INTO users (first_name,last_name,email,role,phone,password_hash)
    VALUES ('Ram','T',$1,'seller','9000000009','x') RETURNING id`, [`s${Date.now()}@x.local`]);
  const user = { id: u.rows[0].id };

  const add = await call(products.addProduct, { user, body: {
    name: "Cotton shirting", category: "Fabric", price: 142, moq: 10, stock: 0,
    shippingDays: 5, visibility: "private",
    unit: "mtr", packSize: 100, hsnCode: "5208", gstPercent: 5, notes: "Best seller" } });
  check(add.statusCode === 201, "add product with billing fields", { s: add.statusCode, m: add.body?.message });

  const list = await call(dash.getInventory, { user });
  const row = (list.body || [])[0] || {};
  check(list.statusCode === 200, "product list loads", { s: list.statusCode });
  if (has.has_listing_billing) {
    check(row.unit === "mtr" && row.hsn_code === "5208" && Number(row.gst_percent) === 5,
      "billing fields saved and served", { unit: row.unit, hsn: row.hsn_code, gst: row.gst_percent });
    check(row.notes === "Best seller", "private note saved", { notes: row.notes });
  } else {
    check(row.unit === "pcs" && row.hsn_code === null, "older shape degrades quietly", { unit: row.unit });
  }

  // The inline rate edit sends only a price. Everything else must survive.
  const upd = await call(products.updateInventoryItem, { user, params: { id: row.id }, body: { price: 155 } });
  check(upd.statusCode === 200, "price-only update accepted", { s: upd.statusCode });
  const after = ((await call(dash.getInventory, { user })).body || [])[0] || {};
  check(Number(after.price) === 155, "price changed", { price: after.price });
  check(after.visibility === "private", "visibility untouched by a price edit", { v: after.visibility });
  if (has.has_listing_billing) {
    check(after.unit === "mtr" && after.hsn_code === "5208", "billing fields untouched", { unit: after.unit, hsn: after.hsn_code });
  }

  const vis = await call(products.updateInventoryItem, { user, params: { id: row.id }, body: { visibility: "public" } });
  check(vis.statusCode === 200 && vis.body.visibility === "public", "shop switch works", { v: vis.body?.visibility });

  console.log(fails ? `\n${fails} FAILED` : "\nall good");
  await p.end();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(DB, "THREW", e.message); process.exit(1); });
