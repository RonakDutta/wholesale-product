const pool = require("../config/db");
const saleInvoiceService = require("../services/saleInvoiceService");

/**
 * Parties are a wholesaler's own customer book. Every query in this file is
 * scoped by wholesaler_id from the token, never from the request body, so one
 * wholesaler can never read or write another's book.
 *
 * See server/migrations/wholesale3_parties_and_sales.sql for why a party is
 * private per wholesaler and does not need a login.
 */

// Outstanding is what has been billed minus what has come in. Cancelled sales
// are not owed, so they are left out of the billed side. Drafts are excluded
// too: a sale nobody has confirmed is not yet a debt.
const BALANCE_SELECT = `
  COALESCE((
    SELECT SUM(s.total) FROM sales s
     WHERE s.party_id = pt.id AND s.status IN ('confirmed', 'delivered')
  ), 0)
  -
  COALESCE((
    SELECT SUM(pp.amount) FROM party_payments pp WHERE pp.party_id = pt.id
  ), 0) AS outstanding
`;

const clean = (value) => {
  const text = String(value ?? "").trim();
  return text === "" ? null : text;
};

exports.listParties = async (req, res) => {
  const wholesalerId = req.user.id;
  const search = clean(req.query.search);

  try {
    const params = [wholesalerId];
    let where = "pt.wholesaler_id = $1";

    // Someone marked "not dealing with them any more" drops out of the book
    // by default. Their sales and balance are untouched, and passing
    // includeInactive brings them back into view.
    const includeInactive =
      String(req.query.includeInactive || "") === "1" ||
      String(req.query.includeInactive || "").toLowerCase() === "true";
    if (!includeInactive) {
      where += " AND pt.status = 'active'";
    }

    if (search) {
      params.push(`%${search}%`);
      where += ` AND (pt.name ILIKE $2 OR pt.business_name ILIKE $2 OR pt.phone ILIKE $2 OR pt.city ILIKE $2)`;
    }

    const result = await pool.query(
      `SELECT
         pt.id, pt.name, pt.business_name, pt.phone, pt.city, pt.gstin,
         pt.status, pt.created_at,
         (SELECT MAX(s.sale_date) FROM sales s
           WHERE s.party_id = pt.id AND s.status <> 'cancelled') AS last_sale_date,
         ${BALANCE_SELECT}
       FROM parties pt
       WHERE ${where}
       ORDER BY pt.name ASC`,
      params,
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error listing parties:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getPartyById = async (req, res) => {
  const wholesalerId = req.user.id;
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT pt.*, ${BALANCE_SELECT}
         FROM parties pt
        WHERE pt.id = $1 AND pt.wholesaler_id = $2`,
      [id, wholesalerId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Party not found" });
    }

    // The party page shows the running account, so the history comes with it
    // rather than in a second request.
    const [sales, payments] = await Promise.all([
      pool.query(
        `SELECT id, sale_number, sale_date, status, source, total
           FROM sales
          WHERE party_id = $1 AND wholesaler_id = $2
          ORDER BY sale_date DESC, created_at DESC
          LIMIT 50`,
        [id, wholesalerId],
      ),
      pool.query(
        `SELECT id, amount, method, paid_on, note, sale_id
           FROM party_payments
          WHERE party_id = $1 AND wholesaler_id = $2
          ORDER BY paid_on DESC, created_at DESC
          LIMIT 50`,
        [id, wholesalerId],
      ),
    ]);

    res.status(200).json({
      party: result.rows[0],
      sales: sales.rows,
      payments: payments.rows,
    });
  } catch (err) {
    console.error("Error fetching party:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.createParty = async (req, res) => {
  const wholesalerId = req.user.id;
  const { name, businessName, phone, city, address, gstin, notes } = req.body;

  if (!clean(name)) {
    return res.status(400).json({ message: "Name is required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO parties
         (wholesaler_id, name, business_name, phone, city, address, gstin, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        wholesalerId,
        clean(name),
        clean(businessName),
        clean(phone),
        clean(city),
        clean(address),
        clean(gstin),
        clean(notes),
      ],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    // The partial unique index on (wholesaler_id, phone) is what catches a
    // customer being added twice, which is easy to do from a phone book.
    if (err.code === "23505") {
      return res
        .status(409)
        .json({ message: "This phone number is already in your customer list" });
    }
    console.error("Error creating party:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateParty = async (req, res) => {
  const wholesalerId = req.user.id;
  const { id } = req.params;
  const { name, businessName, phone, city, address, gstin, notes, status } =
    req.body;

  if (name !== undefined && !clean(name)) {
    return res.status(400).json({ message: "Name is required" });
  }

  if (status !== undefined && !["active", "inactive"].includes(status)) {
    return res.status(400).json({ message: "Unknown status" });
  }

  // Built one column at a time rather than with COALESCE, because COALESCE
  // cannot express "clear this field". A wholesaler who empties the phone box
  // means to remove a wrong number, and the old version silently kept it. A
  // key that is absent is left alone; a key sent empty or null is cleared.
  // Name is the exception, since a party must have one.
  const sets = [];
  const values = [id, wholesalerId];
  const put = (column, value) => {
    values.push(value);
    sets.push(`${column} = $${values.length}`);
  };

  if (name !== undefined) put("name", clean(name));
  if (businessName !== undefined) put("business_name", clean(businessName));
  if (phone !== undefined) put("phone", clean(phone));
  if (city !== undefined) put("city", clean(city));
  if (address !== undefined) put("address", clean(address));
  if (gstin !== undefined) put("gstin", clean(gstin));
  if (notes !== undefined) put("notes", clean(notes));
  if (status !== undefined) put("status", status);

  if (sets.length === 0) {
    return res.status(400).json({ message: "Nothing to update" });
  }

  try {
    const result = await pool.query(
      `UPDATE parties
          SET ${sets.join(", ")}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND wholesaler_id = $2
        RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Party not found" });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res
        .status(409)
        .json({ message: "This phone number is already in your customer list" });
    }
    console.error("Error updating party:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const PAYMENT_METHODS = ["cash", "upi", "bank", "cheque", "other"];

/**
 * Money received from a customer. The sale it settles is optional on purpose:
 * a trader hands over a lump sum against several old bills without saying
 * which, so a payment can sit against the running balance instead.
 */
exports.recordPayment = async (req, res) => {
  const wholesalerId = req.user.id;
  const { id } = req.params;
  const { amount, method, paidOn, note, saleId } = req.body;

  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) {
    return res.status(400).json({ message: "Enter an amount" });
  }

  if (method && !PAYMENT_METHODS.includes(method)) {
    return res.status(400).json({ message: "Unknown payment method" });
  }

  try {
    const party = await pool.query(
      "SELECT id FROM parties WHERE id = $1 AND wholesaler_id = $2",
      [id, wholesalerId],
    );
    if (party.rows.length === 0) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // A payment may name a sale, but only one of this wholesaler's own.
    if (clean(saleId)) {
      const sale = await pool.query(
        "SELECT id FROM sales WHERE id = $1 AND wholesaler_id = $2 AND party_id = $3",
        [saleId, wholesalerId, id],
      );
      if (sale.rows.length === 0) {
        return res
          .status(404)
          .json({ message: "That sale is not on this customer's account" });
      }
    }

    const result = await pool.query(
      `INSERT INTO party_payments
         (wholesaler_id, party_id, sale_id, amount, method, paid_on, note)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6::date, CURRENT_DATE), $7)
       RETURNING *`,
      [
        wholesalerId,
        id,
        clean(saleId),
        value.toFixed(2),
        method || "cash",
        clean(paidOn),
        clean(note),
      ],
    );

    // Money against a billed sale has to move that bill's status too, or the
    // invoice and the customer's balance start telling different stories.
    if (clean(saleId)) {
      try {
        await saleInvoiceService.syncInvoiceFromLedger(saleId);
      } catch (syncError) {
        // The payment is recorded and that is what matters. A stale invoice
        // status is recoverable; losing the payment is not.
        console.error("Could not refresh the bill after payment:", syncError);
      }
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error recording payment:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Headline numbers for the customer book. Every value here is computed from
 * real rows. A wholesaler with no data sees zeroes, which is the truth.
 */
exports.getPartyStats = async (req, res) => {
  const wholesalerId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM parties
           WHERE wholesaler_id = $1 AND status = 'active') AS active_parties,
         (SELECT COUNT(*) FROM parties WHERE wholesaler_id = $1) AS total_parties,
         COALESCE((SELECT SUM(s.total) FROM sales s
            WHERE s.wholesaler_id = $1
              AND s.status IN ('confirmed', 'delivered')), 0) AS total_billed,
         COALESCE((SELECT SUM(pp.amount) FROM party_payments pp
            WHERE pp.wholesaler_id = $1), 0) AS total_received`,
      [wholesalerId],
    );

    const row = result.rows[0];
    res.status(200).json({
      activeParties: Number(row.active_parties),
      totalParties: Number(row.total_parties),
      totalBilled: Number(row.total_billed),
      totalReceived: Number(row.total_received),
      outstanding: Number(row.total_billed) - Number(row.total_received),
    });
  } catch (err) {
    console.error("Error fetching party stats:", err);
    res.status(500).json({ message: "Server error" });
  }
};
