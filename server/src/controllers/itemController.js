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
              notes, status, created_at
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
  const { name, category, unit, packSize, rate, moq, hsnCode, notes } =
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
         (wholesaler_id, name, category, unit, pack_size, rate, moq, hsn_code, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
  const { name, category, unit, packSize, rate, moq, hsnCode, notes, status } =
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

  let rateValue = null;
  if (rate !== undefined && rate !== null && String(rate).trim() !== "") {
    const number = Number(rate);
    if (!Number.isFinite(number) || number < 0) {
      return res.status(400).json({ message: "Enter a valid rate" });
    }
    rateValue = number.toFixed(2);
  }

  try {
    // COALESCE so changing one rate does not blank every other field. The
    // rate list is edited a column at a time, not a form at a time.
    const result = await pool.query(
      `UPDATE items SET
         name       = COALESCE($3, name),
         category   = COALESCE($4, category),
         unit       = COALESCE($5, unit),
         pack_size  = COALESCE($6, pack_size),
         rate       = COALESCE($7, rate),
         moq        = COALESCE($8, moq),
         hsn_code   = COALESCE($9, hsn_code),
         notes      = COALESCE($10, notes),
         status     = COALESCE($11, status),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND wholesaler_id = $2
       RETURNING *`,
      [
        id,
        wholesalerId,
        clean(name),
        clean(category),
        unit ?? null,
        optionalNumber(packSize),
        rateValue,
        optionalNumber(moq),
        clean(hsnCode),
        clean(notes),
        status ?? null,
      ],
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
