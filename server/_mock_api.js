const Module = require("module");
const { Pool } = require("pg");
const express = require("express");
const dbPath = require.resolve("./src/config/db");
const testPool = new Pool({ connectionString: "postgres://postgres@127.0.0.1:5433/qa_import" });
const stub = new Module(dbPath, null);
stub.exports = testPool; stub.loaded = true;
require.cache[dbPath] = stub;
const app = express();
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Expose-Headers", "*");
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});
(async () => {
  const owner = (await testPool.query(
    `SELECT u.id FROM users u JOIN wholesaler_profiles w ON w.user_id=u.id
      WHERE u.first_name='AAA' ORDER BY u.created_at DESC LIMIT 1`)).rows[0].id;
  app.use((req, _res, next) => {
    req.user = { id: owner, role: "seller" };
    req.business = { id: owner, isOwner: true, staffId: null, permissions: [] };
    next();
  });
  app.get("/api/auth/me", (_q, r) => r.json({ user: { id: owner, first_name: "Kamal", role: "seller", email: "a@x.com" } }));
  app.get("/api/profile", (_q, r) => r.json({ success: true, company_name: "Kamal Textiles",
    contact_phone: "9820011111", email: "a@x.com", gstin: "27AAAPA1234A1Z5",
    upi_id: "kamal@okaxis", city: "Bhiwandi", country: "India", warehouse_state: "Maharashtra" }));
  const TERMS = [
    { code: "GST0", label: "Nil rated", igstPercent: 0, cgstPercent: 0, sgstPercent: 0, cessPercent: 0, active: true },
    { code: "GST025", label: "GST 0.25%", igstPercent: 0.25, cgstPercent: 0.13, sgstPercent: 0.12, cessPercent: 0, active: true },
    { code: "GST3", label: "GST 3%", igstPercent: 3, cessPercent: 0, active: true },
    { code: "GST5", label: "GST 5%", igstPercent: 5, cessPercent: 0, active: true },
    { code: "GST12", label: "GST 12%", igstPercent: 12, cessPercent: 0, active: true },
    { code: "GST18", label: "GST 18%", igstPercent: 18, cessPercent: 0, active: true },
    { code: "GST28", label: "GST 28%", igstPercent: 28, cessPercent: 0, active: true },
    { code: "GST28_CESS12", label: "GST 28% plus cess 12%", igstPercent: 28, cessPercent: 12, active: true },
  ];
  app.get("/api/masters", (_q, r) => r.json({ states: [{ code: "27", name: "Maharashtra", active: true }, { code: "24", name: "Gujarat", active: true }],
    units: [{ code: "mtr", name: "Metre", uqc: "MTR", allowsDecimals: true, active: true }, { code: "pcs", name: "Pieces", uqc: "PCS", allowsDecimals: false, active: true }],
    taxRates: [{ rate: 5, label: "GST 5%", active: true }, { rate: 18, label: "GST 18%", active: true }],
    hsn: [{ code: "52081110", label: "Cotton shirting, plain weave", active: true }],
    taxTerms: TERMS, uqcCodes: [], settings: {}, fromMasters: true, isPlatformAdmin: true }));
  app.get("/api/masters/tax-terms", (_q, r) => r.json({ taxTerms: TERMS }));
  const mount = (base, routes) => {
    const r = express.Router();
    for (const l of routes.stack) {
      if (!l.route) continue;
      const [method] = Object.keys(l.route.methods);
      r[method](l.route.path, ...l.route.stack.slice(1).map((s) => s.handle));
    }
    app.use(base, r);
  };
  mount("/api/imports", require("./src/routes/importRoutes"));
  mount("/api/exports", require("./src/routes/exportRoutes"));
  app.use((_q, r) => r.json({}));
  app.listen(5000, () => console.log("api on 5000"));
})();
