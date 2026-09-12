const masterService = require("../services/masterService");
const { isPlatformAdmin } = require("../middlewares/platformAdmin");

/**
 * The platform masters, read.
 *
 * Writing them is the admin console's job and is not built yet; this is the
 * read side, which every screen with a unit or a tax rate dropdown needs.
 *
 * Readable by any signed in user, deliberately. These are the state list, the
 * units, the GST slabs and a short list of HSN codes: public facts, printed on
 * documents that go to customers. Gating them would only mean a buyer's
 * checkout could not name the state he lives in.
 */
exports.getMasters = async (req, res) => {
  try {
    const [states, units, taxRates, hsn] = await Promise.all([
      masterService.states(),
      masterService.units(),
      masterService.taxRates(),
      masterService.hsn(),
    ]);
    /**
     * Rows that have been switched off, when the console asks for them.
     *
     * The plain read returns only active rows, because that is what every
     * dropdown in the product wants. The master screens need the rest too, or
     * a row the admin has just switched off simply vanishes and looks deleted.
     * Asked for explicitly so no ordinary screen pays for it.
     */
    let off = {};
    if (req.query?.includeInactive && (await masterService.mastersExist())) {
      const pool = require("../config/db");
      const [s, u, t, h] = await Promise.all([
        pool.query("SELECT code, name, is_union_territory, active FROM master_states WHERE NOT active ORDER BY code"),
        pool.query("SELECT code, name, allows_decimals, active FROM master_units WHERE NOT active ORDER BY sort_order, name"),
        pool.query("SELECT rate, label, active FROM master_tax_rates WHERE NOT active ORDER BY rate"),
        pool.query("SELECT code, description, active FROM master_hsn WHERE NOT active ORDER BY code"),
      ]);
      off = {
        statesInactive: s.rows.map((r) => ({ code: r.code, name: r.name, isUnionTerritory: r.is_union_territory, active: false })),
        unitsInactive: u.rows.map((r) => ({ code: r.code, name: r.name, allowsDecimals: r.allows_decimals, active: false })),
        taxRatesInactive: t.rows.map((r) => ({ rate: Number(r.rate), label: r.label, active: false })),
        hsnInactive: h.rows.map((r) => ({ code: r.code, label: r.description, active: false })),
      };
    }

    res.status(200).json({
      states,
      units,
      taxRates,
      hsn,
      ...off,
      // So a screen can tell "the platform has no units" from "this database
      // has not had the migration run and you are seeing the built in list".
      fromMasters: await masterService.mastersExist(),
      isPlatformAdmin: await isPlatformAdmin(req.user?.id),
    });
  } catch (err) {
    console.error("Error reading the masters:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Writing a master.
 *
 * Everything here sits behind requirePlatformAdmin at the route. These lists
 * shape documents that go to customers and a tax rate on a bill is a number
 * somebody can be fined over, so the guard is the route's job and the checking
 * is this file's.
 *
 * DEACTIVATE, NEVER DELETE. A unit or an HSN code printed on an invoice
 * already issued must not vanish from that document because somebody tidied a
 * list a year later. Every list carries `active`, and switching it off is what
 * "remove" means here.
 */

const pool = require("../config/db");

// Each list, and what a valid row looks like. Kept as data rather than four
// near identical handlers, because four copies of "validate then upsert" is
// how three of them end up with subtly different rules.
const LISTS = {
  states: {
    table: "master_states",
    key: "code",
    label: "state",
    columns: ["name", "is_union_territory", "active"],
    check: (body) => {
      const code = String(body.code || "").trim();
      if (!/^[0-9]{2}$/.test(code)) {
        return { error: "A state code is exactly two digits, the first two of a GSTIN." };
      }
      if (!String(body.name || "").trim()) return { error: "A state needs a name." };
      return {
        key: code,
        values: {
          name: String(body.name).trim().slice(0, 100),
          is_union_territory: Boolean(body.isUnionTerritory),
          active: body.active === undefined ? true : Boolean(body.active),
        },
      };
    },
  },
  units: {
    table: "master_units",
    key: "code",
    label: "unit",
    columns: ["name", "allows_decimals", "active", "sort_order"],
    check: (body) => {
      const code = String(body.code || "").trim().toLowerCase();
      if (!/^[a-z0-9][a-z0-9_-]{0,15}$/.test(code)) {
        return { error: "A unit code is up to 16 letters, digits, hyphen or underscore." };
      }
      if (!String(body.name || "").trim()) return { error: "A unit needs a name." };
      return {
        key: code,
        values: {
          name: String(body.name).trim().slice(0, 64),
          allows_decimals: body.allowsDecimals === undefined ? true : Boolean(body.allowsDecimals),
          active: body.active === undefined ? true : Boolean(body.active),
          sort_order: Number.isFinite(Number(body.sortOrder)) ? Math.round(Number(body.sortOrder)) : 0,
        },
      };
    },
  },
  "tax-rates": {
    table: "master_tax_rates",
    key: "rate",
    label: "tax rate",
    columns: ["label", "active"],
    check: (body) => {
      const rate = Number(body.rate);
      if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
        return { error: "A GST rate is between 0 and 100." };
      }
      return {
        key: Number(rate.toFixed(2)),
        values: {
          label: String(body.label || (rate === 0 ? "Nil" : `GST ${rate}%`)).trim().slice(0, 32),
          active: body.active === undefined ? true : Boolean(body.active),
        },
      };
    },
  },
  hsn: {
    table: "master_hsn",
    key: "code",
    label: "HSN code",
    columns: ["description", "source", "active"],
    check: (body) => {
      const code = String(body.code || "").trim();
      if (!/^[0-9]{4}([0-9]{2}([0-9]{2})?)?$/.test(code)) {
        return { error: "An HSN code is 4, 6 or 8 digits." };
      }
      if (!String(body.description || "").trim()) {
        return { error: "An HSN code needs a description of what the goods are." };
      }
      return {
        key: code,
        values: {
          description: String(body.description).trim(),
          // Rows an admin adds are marked as his, so the curated list this
          // product shipped with stays tellable from what was added later.
          source: "admin",
          active: body.active === undefined ? true : Boolean(body.active),
        },
      };
    },
  },
};

/**
 * Create or update one row.
 *
 * An upsert rather than separate create and update routes: these lists are
 * keyed on the thing itself, a state code or a GST rate, so saving "24" twice
 * is an edit and not a duplicate. Saving a row that already exists keeps its
 * source, so an admin editing the description of a curated HSN code does not
 * silently reclassify it as his own.
 */
exports.saveMasterRow = async (req, res) => {
  const spec = LISTS[req.params.list];
  if (!spec) return res.status(404).json({ message: "No such master list" });

  const checked = spec.check(req.body || {});
  if (checked.error) return res.status(400).json({ message: checked.error });

  try {
    const cols = Object.keys(checked.values).filter((c) => spec.columns.includes(c));
    const placeholders = cols.map((_, i) => `$${i + 2}`);
    const updates = cols
      // `source` is set on insert and left alone on update, so editing a
      // curated row does not relabel it.
      .filter((c) => c !== "source")
      .map((c) => `${c} = EXCLUDED.${c}`);

    const saved = await pool.query(
      `INSERT INTO ${spec.table} (${spec.key}, ${cols.join(", ")})
       VALUES ($1, ${placeholders.join(", ")})
       ON CONFLICT (${spec.key}) DO UPDATE SET ${updates.join(", ")}
       RETURNING *`,
      [checked.key, ...cols.map((c) => checked.values[c])],
    );

    // So the admin sees his own change at once rather than in five minutes.
    masterService.resetMasters();

    res.status(200).json({ success: true, row: saved.rows[0] });
  } catch (err) {
    console.error(`Error saving a ${spec.label}:`, err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Switch a row off, or back on.
 *
 * Not a delete. See the note at the top of this block: a unit printed on an
 * invoice already issued must still read properly a year later.
 */
exports.setMasterRowActive = async (req, res) => {
  const spec = LISTS[req.params.list];
  if (!spec) return res.status(404).json({ message: "No such master list" });

  const active = Boolean(req.body?.active);
  try {
    const changed = await pool.query(
      `UPDATE ${spec.table} SET active = $2 WHERE ${spec.key} = $1 RETURNING *`,
      [req.params.key, active],
    );
    if (changed.rows.length === 0) {
      return res.status(404).json({ message: `That ${spec.label} is not in the list` });
    }

    // Switching off the last one would empty the dropdown everywhere. The read
    // side falls back rather than serving nothing, so this is not a disaster,
    // but it is worth refusing outright rather than leaving him wondering why
    // his change had no effect.
    if (!active) {
      const left = await pool.query(
        `SELECT COUNT(*)::int AS n FROM ${spec.table} WHERE active`,
      );
      if (left.rows[0].n === 0) {
        await pool.query(
          `UPDATE ${spec.table} SET active = TRUE WHERE ${spec.key} = $1`,
          [req.params.key],
        );
        return res.status(400).json({
          message: `That is the last ${spec.label} left. Add another before switching this one off.`,
        });
      }
    }

    masterService.resetMasters();
    res.status(200).json({ success: true, row: changed.rows[0] });
  } catch (err) {
    console.error(`Error switching a ${spec.label}:`, err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.MASTER_LISTS = Object.keys(LISTS);
