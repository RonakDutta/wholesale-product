const pool = require("../config/db");
const { INDIAN_STATES } = require("../utils/gstin");
const { stateCode } = require("./placeOfSupply");

/**
 * The platform's masters: states, units, tax slabs, HSN codes.
 *
 * A master is a thing that EXISTS, as against a transaction, which is a thing
 * that HAPPENS. These four belong to the platform rather than to any one
 * wholesaler, and until `wholesale3_platform_masters.sql` was written each of
 * them was a constant in the code, so correcting one meant a deploy.
 *
 * EVERY READ FALLS BACK TO THE CONSTANT. Migrations in this repository are run
 * by hand, so the code is routinely deployed before its SQL. A screen that
 * cannot list units because a table is missing is a worse outcome than a list
 * that is briefly out of date, and the constants are what the product has been
 * running on all along.
 *
 * WHAT STILL READS THE CONSTANT EVEN AFTER THE MIGRATION, and why:
 *
 *   placeOfSupply and utils/gstin resolve a state name to its GST code, and
 *   they do it SYNCHRONOUSLY, at module load, on the path that decides CGST
 *   plus SGST against IGST. Making that path asynchronous so it could read a
 *   table is a separate change with its own risk, and it is not worth carrying
 *   it on the back of this one. So the state master feeds the dropdowns and
 *   the admin console today; adding a state there does NOT yet change how tax
 *   is computed for it. That is a real limitation and it is written down here
 *   rather than discovered later.
 */

/** Rows change rarely and are read constantly, so they are cached. */
const TTL_MS = 5 * 60 * 1000;

/**
 * A TTL as well as an explicit reset, not one or the other.
 *
 * The reset is for this process: an admin saving a unit clears it and sees his
 * change. The TTL is for every OTHER process, which has no way of being told.
 * Without it, a platform running two instances would serve a stale list from
 * one of them until it restarted.
 */
const cache = new Map();
const cachedAt = new Map();

const resetMasters = () => {
  cache.clear();
  cachedAt.clear();
};

/** Is the migration in? Probed once, like every other schema check here. */
let ready = null;
const mastersExist = async (db = pool) => {
  if (ready !== null) return ready;
  try {
    const probe = await db.query(
      "SELECT to_regclass('public.master_states') IS NOT NULL AS yes",
    );
    ready = Boolean(probe.rows[0]?.yes);
  } catch {
    ready = false;
  }
  return ready;
};
const resetMastersSchema = () => { ready = null; };

/**
 * One read, cached, falling back to `whenMissing` if the table is not there or
 * the query fails.
 *
 * A failure falls back rather than throwing on purpose. These lists fill
 * dropdowns on screens that have real work to do; none of them is worth taking
 * a screen down over.
 */
const read = async (key, sql, shape, whenMissing) => {
  const at = cachedAt.get(key);
  if (at && Date.now() - at < TTL_MS) return cache.get(key);

  if (!(await mastersExist())) return whenMissing();

  try {
    const rows = await pool.query(sql);
    const value = rows.rows.map(shape);
    // An empty table is not an answer. It means somebody emptied it or the
    // seed did not run, and serving nothing would empty every dropdown in the
    // product.
    if (value.length === 0) return whenMissing();
    cache.set(key, value);
    cachedAt.set(key, Date.now());
    return value;
  } catch (err) {
    console.error(`Could not read the ${key} master, using the built in list:`, err.message);
    return whenMissing();
  }
};

// ---------------------------------------------------------------------------
// The built in lists. These are what the product ran on before the masters
// existed and they stay as the floor under it.
// ---------------------------------------------------------------------------

const BUILT_IN_UNITS = [
  { code: "pcs", name: "Pieces", allowsDecimals: false },
  { code: "dozen", name: "Dozen", allowsDecimals: false },
  { code: "case", name: "Case", allowsDecimals: false },
  { code: "mtr", name: "Metre", allowsDecimals: true },
  { code: "kg", name: "Kilogram", allowsDecimals: true },
  { code: "box", name: "Box", allowsDecimals: false },
  { code: "bundle", name: "Bundle", allowsDecimals: false },
];

const BUILT_IN_RATES = [0, 0.25, 3, 5, 12, 18, 28].map((rate) => ({
  rate,
  label: rate === 0 ? "Nil" : `GST ${rate}%`,
}));

// null, not false. The constant never recorded which of these are union
// territories, and answering "no" to a question it cannot answer is the kind
// of plausible wrong value this codebase has had to delete before.
const builtInStates = () =>
  INDIAN_STATES.map((name) => ({ code: stateCode(name), name, isUnionTerritory: null }))
    .filter((row) => row.code)
    .sort((a, b) => a.code.localeCompare(b.code));

exports.states = () =>
  read(
    "states",
    `SELECT code, name, is_union_territory FROM master_states
      WHERE active ORDER BY code`,
    (r) => ({ code: r.code, name: r.name, isUnionTerritory: r.is_union_territory }),
    builtInStates,
  );

exports.units = () =>
  read(
    "units",
    `SELECT code, name, allows_decimals FROM master_units
      WHERE active ORDER BY sort_order, name`,
    (r) => ({ code: r.code, name: r.name, allowsDecimals: r.allows_decimals }),
    () => BUILT_IN_UNITS,
  );

exports.taxRates = () =>
  read(
    "taxRates",
    "SELECT rate, label FROM master_tax_rates WHERE active ORDER BY rate",
    (r) => ({ rate: Number(r.rate), label: r.label }),
    () => BUILT_IN_RATES,
  );

/**
 * The curated HSN list.
 *
 * Codes and descriptions, never a rate. Rates change and the same heading
 * carries different rates by price slab, so anything mapping one to the other
 * is inventing a number that ends up on a tax document.
 */
exports.hsn = () =>
  read(
    "hsn",
    "SELECT code, description FROM master_hsn WHERE active ORDER BY code",
    (r) => ({ code: r.code, label: r.description }),
    () => require("./hsnService").TEXTILE_HSN,
  );

exports.mastersExist = mastersExist;
exports.resetMasters = resetMasters;
exports.resetMastersSchema = resetMastersSchema;
exports.BUILT_IN_UNITS = BUILT_IN_UNITS;
exports.BUILT_IN_RATES = BUILT_IN_RATES;
