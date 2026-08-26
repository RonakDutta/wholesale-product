const pool = require("../config/db");
const { clean, fromPaise, toPaise } = require("../utils/money");
const saleInvoiceService = require("../services/saleInvoiceService");
const pdfService = require("../services/pdfService");

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

// Rupees are summed in paise. A statement is a running total down a column,
// so a paisa lost per row shows up as a closing balance that disagrees with
// the customer's own page, and that is the one number he will check.

/**
 * One customer's account over a date range: what he was carrying at the
 * start, every bill and every payment since, and what he owes now.
 *
 * This is the thing a wholesaler sends on WhatsApp when he wants paying, so
 * it has to reconcile exactly with the balance on the customer page. It is
 * built from the same two facts that balance is: confirmed and delivered
 * sales on one side, party_payments on the other.
 *
 * Cancelled and draft sales are left out, for the same reason they are left
 * out of the balance. A draft is not yet a debt and a cancelled bill is not
 * owed, so listing either would show the customer a figure he does not owe.
 * A payment that was made against a sale later cancelled still appears,
 * because the money really did change hands, and its line says so.
 *
 * Leaving `from` off means "since the beginning", which makes the opening
 * balance zero rather than a number nobody can check.
 */
const isDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value);

/**
 * Validates the window and builds the statement. Shared by the screen and by
 * the PDF, so the document and the page can never disagree.
 *
 * Returns { error } for anything the caller should refuse, otherwise the
 * statement itself.
 */
const buildStatement = async (id, wholesalerId, rawFrom, rawTo) => {
  const from = clean(rawFrom);
  const to = clean(rawTo);

  if ((from && !isDate(from)) || (to && !isDate(to))) {
    return { error: { status: 400, message: "Dates must be YYYY-MM-DD" } };
  }
  if (from && to && from > to) {
    return {
      error: { status: 400, message: "The From date is after the To date" },
    };
  }

  {
    const party = await pool.query(
      `SELECT pt.*, ${BALANCE_SELECT}
         FROM parties pt
        WHERE pt.id = $1 AND pt.wholesaler_id = $2`,
      [id, wholesalerId],
    );
    if (party.rows.length === 0) {
      return { error: { status: 404, message: "Customer not found" } };
    }

    // Everything before the window, netted into one number.
    const opening = from
      ? await pool.query(
          `SELECT
             COALESCE((SELECT SUM(s.total) FROM sales s
                        WHERE s.party_id = $1 AND s.wholesaler_id = $2
                          AND s.status IN ('confirmed', 'delivered')
                          AND s.sale_date < $3::date), 0) AS billed,
             COALESCE((SELECT SUM(pp.amount) FROM party_payments pp
                        WHERE pp.party_id = $1 AND pp.wholesaler_id = $2
                          AND pp.paid_on < $3::date), 0) AS received`,
          [id, wholesalerId, from],
        )
      : null;

    const openingPaise = opening
      ? toPaise(opening.rows[0].billed) - toPaise(opening.rows[0].received)
      : 0;

    const [sales, payments] = await Promise.all([
      pool.query(
        `SELECT s.id, s.sale_number, s.sale_date AS on_date, s.total, s.created_at,
                (SELECT COUNT(*) FROM sale_lines sl WHERE sl.sale_id = s.id) AS line_count
           FROM sales s
          WHERE s.party_id = $1 AND s.wholesaler_id = $2
            AND s.status IN ('confirmed', 'delivered')
            AND ($3::date IS NULL OR s.sale_date >= $3::date)
            AND ($4::date IS NULL OR s.sale_date <= $4::date)
          ORDER BY s.sale_date ASC, s.created_at ASC`,
        [id, wholesalerId, from, to],
      ),
      pool.query(
        `SELECT pp.id, pp.amount, pp.method, pp.paid_on AS on_date, pp.note,
                pp.created_at, s.sale_number, s.status AS sale_status
           FROM party_payments pp
           LEFT JOIN sales s ON s.id = pp.sale_id
          WHERE pp.party_id = $1 AND pp.wholesaler_id = $2
            AND ($3::date IS NULL OR pp.paid_on >= $3::date)
            AND ($4::date IS NULL OR pp.paid_on <= $4::date)
          ORDER BY pp.paid_on ASC, pp.created_at ASC`,
        [id, wholesalerId, from, to],
      ),
    ]);

    const entries = [
      ...sales.rows.map((row) => ({
        kind: "sale",
        id: row.id,
        date: row.on_date,
        createdAt: row.created_at,
        ref: row.sale_number,
        lineCount: Number(row.line_count),
        debitPaise: toPaise(row.total),
        creditPaise: 0,
      })),
      ...payments.rows.map((row) => ({
        kind: "payment",
        id: row.id,
        date: row.on_date,
        createdAt: row.created_at,
        ref: row.sale_number,
        method: row.method,
        note: row.note,
        // Worth saying on the line. Money against a bill that was later
        // cancelled is why a customer can end up in credit, and without this
        // the statement looks like a payment against nothing.
        againstCancelled: row.sale_status === "cancelled",
        debitPaise: 0,
        creditPaise: toPaise(row.amount),
      })),
    ].sort(
      (a, b) =>
        new Date(a.date) - new Date(b.date) ||
        new Date(a.createdAt) - new Date(b.createdAt),
    );

    let runningPaise = openingPaise;
    let billedPaise = 0;
    let receivedPaise = 0;
    const rows = entries.map((entry) => {
      runningPaise += entry.debitPaise - entry.creditPaise;
      billedPaise += entry.debitPaise;
      receivedPaise += entry.creditPaise;
      return {
        kind: entry.kind,
        id: entry.id,
        date: entry.date,
        ref: entry.ref,
        lineCount: entry.lineCount,
        method: entry.method,
        note: entry.note,
        againstCancelled: entry.againstCancelled,
        debit: fromPaise(entry.debitPaise),
        credit: fromPaise(entry.creditPaise),
        balance: fromPaise(runningPaise),
      };
    });

    return {
      statement: {
        party: party.rows[0],
        from: from || null,
        to: to || null,
        openingBalance: fromPaise(openingPaise),
        rows,
        totals: {
          billed: fromPaise(billedPaise),
          received: fromPaise(receivedPaise),
        },
        closingBalance: fromPaise(runningPaise),
      },
    };
  }
};

exports.getPartyStatement = async (req, res) => {
  try {
    const result = await buildStatement(
      req.params.id,
      req.user.id,
      req.query.from,
      req.query.to,
    );
    if (result.error) {
      return res.status(result.error.status).json({ message: result.error.message });
    }
    res.status(200).json(result.statement);
  } catch (err) {
    console.error("Error building statement:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * The same statement as a document, so it can be handed over or sent on.
 */
exports.getPartyStatementPDF = async (req, res) => {
  const wholesalerId = req.user.id;
  try {
    const result = await buildStatement(
      req.params.id,
      wholesalerId,
      req.query.from,
      req.query.to,
    );
    if (result.error) {
      return res.status(result.error.status).json({ message: result.error.message });
    }

    const supplier = await pool.query(
      `SELECT u.first_name, u.last_name, u.email, u.phone,
              wp.company_name, wp.gstin, wp.city
         FROM users u
         LEFT JOIN wholesaler_profiles wp ON wp.user_id = u.id
        WHERE u.id = $1`,
      [wholesalerId],
    );

    await pdfService.generateStatementPDF(
      result.statement,
      supplier.rows[0] || {},
      res,
    );
  } catch (err) {
    console.error("Error generating statement PDF:", err);
    res.status(500).json({ message: "Could not generate the statement" });
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
