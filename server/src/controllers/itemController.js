const pool = require("../config/db");

/**
 * A wholesaler's rate list. Every query is scoped by the wholesaler id from
 * the token, so one rate list is never visible to another wholesaler. This is
 * the whole point of the closed network: his prices are his own.
 *
 * See server/migrations/wholesale3_items.sql for why an item belongs to one
 * wholesaler rather than to a shared product catalogue.
 */

const UNITS = ["pcs", "dozen", "case", "mtr", "kg", "box", "bundle"];

const clean = (value) => {
  const text = String(value ?? "").trim();
  return text === "" ? null : text;
};

// Returns the number, or null for anything that is not a usable one. Blank
// is a legitimate answer for pack size and MOQ, so it maps to null rather
// than to zero.
const optionalNumber = (value) => {
  if (value === undefined || value === null || String(value).trim() === "") {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
};

exports.listItems = async (req, res) => {
  const wholesalerId = req.user.id;
  const search = clean(req.query.search);
  const status = clean(req.query.status);

  try {
    const params = [wholesalerId];
    let where = "wholesaler_id = $1";

    if (search) {
      params.push(`%${search}%`);
      where += ` AND (name ILIKE $${params.length} OR category ILIKE $${params.length})`;
    }
    if (status === "active" || status === "inactive") {
      params.push(status);
      where += ` AND status = $${params.length}`;
    }

    const result = await pool.query(
      `SELECT id, name, category, unit, pack_size, rate, moq, hsn_code,
              gst_percent, notes, status, created_at
         FROM items
        WHERE ${where}
        ORDER BY name ASC`,
      params,
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error listing items:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getItemById = async (req, res) => {
  const wholesalerId = req.user.id;
  const { id } = req.params;

  try {
    const result = await pool.query(
      "SELECT * FROM items WHERE id = $1 AND wholesaler_id = $2",
      [id, wholesalerId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching item:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.createItem = async (req, res) => {
  const wholesalerId = req.user.id;
  const { name, category, unit, packSize, rate, moq, hsnCode, gstPercent, notes } =
    req.body;

  if (!clean(name)) {
    return res.status(400).json({ message: "Item name is required" });
  }

  if (unit && !UNITS.includes(unit)) {
    return res.status(400).json({ message: "Unknown unit" });
  }

  const rateValue = Number(rate ?? 0);
  if (!Number.isFinite(rateValue) || rateValue < 0) {
    return res.status(400).json({ message: "Enter a valid rate" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO items
         (wholesaler_id, name, category, unit, pack_size, rate, moq, hsn_code,
          gst_percent, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        wholesalerId,
        clean(name),
        clean(category),
        unit || "pcs",
        optionalNumber(packSize),
        rateValue.toFixed(2),
        optionalNumber(moq),
        clean(hsnCode),
        // Left null when not given, so the sale falls back to the wholesaler's
        // default rather than being pinned to a guess.
        optionalNumber(gstPercent),
        clean(notes),
      ],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    // The unique index on (wholesaler_id, lower(name)) catches the same item
    // being added twice, which is easy to do when typing a long rate list.
    if (err.code === "23505") {
      return res
        .status(409)
        .json({ message: "That item is already in your rate list" });
    }
    console.error("Error creating item:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateItem = async (req, res) => {
  const wholesalerId = req.user.id;
  const { id } = req.params;
  const { name, category, unit, packSize, rate, moq, hsnCode, gstPercent, notes, status } =
    req.body;

  if (name !== undefined && !clean(name)) {
    return res.status(400).json({ message: "Item name is required" });
  }
  if (unit !== undefined && unit !== null && !UNITS.includes(unit)) {
    return res.status(400).json({ message: "Unknown unit" });
  }
  if (status !== undefined && !["active", "inactive"].includes(status)) {
    return res.status(400).json({ message: "Unknown status" });
  }

  if (rate !== undefined && rate !== null && String(rate).trim() !== "") {
    const number = Number(rate);
    if (!Number.isFinite(number) || number < 0) {
      return res.status(400).json({ message: "Enter a valid rate" });
    }
  }

  // Built one column at a time rather than with COALESCE, because COALESCE
  // cannot express "clear this field". A wholesaler who empties the pack size
  // box means to remove it, and the old version silently kept the old value.
  // A key that is absent is left alone; a key sent as empty or null is
  // cleared. Rate is the exception: it is NOT NULL, so an empty rate box
  // means "leave it", and zero is a real rate that must be storable.
  const sets = [];
  const values = [id, wholesalerId];
  const put = (column, value) => {
    values.push(value);
    sets.push(`${column} = $${values.length}`);
  };

  if (name !== undefined) put("name", clean(name));
  if (category !== undefined) put("category", clean(category));
  if (unit !== undefined && unit !== null) put("unit", unit);
  if (packSize !== undefined) put("pack_size", optionalNumber(packSize));
  if (moq !== undefined) put("moq", optionalNumber(moq));
  if (hsnCode !== undefined) put("hsn_code", clean(hsnCode));
  if (gstPercent !== undefined) put("gst_percent", optionalNumber(gstPercent));
  if (notes !== undefined) put("notes", clean(notes));
  if (status !== undefined) put("status", status);
  if (rate !== undefined && rate !== null && String(rate).trim() !== "") {
    put("rate", Number(rate).toFixed(2));
  }

  if (sets.length === 0) {
    return res.status(400).json({ message: "Nothing to update" });
  }

  try {
    const result = await pool.query(
      `UPDATE items
          SET ${sets.join(", ")}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND wholesaler_id = $2
        RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res
        .status(409)
        .json({ message: "Another item in your rate list has that name" });
    }
    console.error("Error updating item:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Removing an item from the rate list. Safe to delete outright because
 * sale_lines keeps the item name as text, so old bills are untouched by this.
 */
exports.deleteItem = async (req, res) => {
  const wholesalerId = req.user.id;
  const { id } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM items WHERE id = $1 AND wholesaler_id = $2 RETURNING id",
      [id, wholesalerId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.status(200).json({ message: "Item removed from your rate list" });
  } catch (err) {
    console.error("Error deleting item:", err);
    res.status(500).json({ message: "Server error" });
  }
};
