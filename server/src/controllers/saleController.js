const pool = require("../config/db");
const saleInvoiceService = require("../services/saleInvoiceService");

/**
 * Recording a sale is the wholesaler's core action. He is usually writing
 * down something that already happened, so a new sale is 'confirmed' rather
 * than 'draft' unless he says otherwise.
 *
 * Every query is scoped by the wholesaler id from the token. A party id in
 * the request body is checked against that scope before anything is written,
 * so a sale can never be attached to somebody else's customer.
 */

// Rupee amounts are summed in paise. A 3 line bill of odd amounts loses a
// paisa per line in floating point, and a wholesaler notices a total that is
// one rupee off.
const toPaise = (rupees) => Math.round(Number(rupees || 0) * 100);
const fromPaise = (paise) => Number((Number(paise || 0) / 100).toFixed(2));

const clean = (value) => {
  const text = String(value ?? "").trim();
  return text === "" ? null : text;
};

/**
 * Takes the next number in this wholesaler's own series. Must be called
 * inside a transaction: the upsert locks the sequence row until commit.
 */
const nextSaleNumber = async (client, wholesalerId) => {
  const result = await client.query(
    `INSERT INTO sale_sequences (wholesaler_id, last_number)
     VALUES ($1, 1)
     ON CONFLICT (wholesaler_id)
     DO UPDATE SET last_number = sale_sequences.last_number + 1
     RETURNING last_number`,
    [wholesalerId],
  );
  return `S-${String(result.rows[0].last_number).padStart(4, "0")}`;
};

/**
 * Validates and normalises the lines on a sale. Returns either an error
 * message or the cleaned lines with their amounts already worked out.
 */
const buildLines = (rawLines) => {
  if (!Array.isArray(rawLines) || rawLines.length === 0) {
    return { error: "Add at least one item to this sale" };
  }

  const lines = [];
  for (const raw of rawLines) {
    const itemName = clean(raw.itemName ?? raw.item_name);
    if (!itemName) return { error: "Every line needs an item name" };

    const quantity = Number(raw.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return { error: `Enter a quantity for ${itemName}` };
    }

    const rate = Number(raw.rate);
    if (!Number.isFinite(rate) || rate < 0) {
      return { error: `Enter a rate for ${itemName}` };
    }

    lines.push({
      itemName,
      quantity,
      unit: clean(raw.unit),
      rate,
      // Snapshot from the rate list, so editing an item later cannot change
      // the HSN printed on a bill already raised.
      hsnCode: clean(raw.hsnCode ?? raw.hsn_code),
      amountPaise: Math.round(toPaise(rate) * quantity),
    });
  }

  return { lines };
};

exports.createSale = async (req, res) => {
  const wholesalerId = req.user.id;
  const {
    partyId,
    saleDate,
    status,
    discount,
    notes,
    lines: rawLines,
    amountPaid,
    paymentMethod,
  } = req.body;

  if (!clean(partyId)) {
    return res.status(400).json({ message: "Choose a customer" });
  }

  const { lines, error } = buildLines(rawLines);
  if (error) return res.status(400).json({ message: error });

  const saleStatus = status || "confirmed";
  if (!["draft", "confirmed", "delivered"].includes(saleStatus)) {
    return res.status(400).json({ message: "Unknown status" });
  }

  const subtotalPaise = lines.reduce((sum, line) => sum + line.amountPaise, 0);
  const discountPaise = Math.max(0, toPaise(discount));
  if (discountPaise > subtotalPaise) {
    return res
      .status(400)
      .json({ message: "Discount cannot be more than the total" });
  }
  const totalPaise = subtotalPaise - discountPaise;

  const paidPaise = Math.max(0, toPaise(amountPaid));
  if (paidPaise > totalPaise) {
    return res
      .status(400)
      .json({ message: "Amount received cannot be more than the bill" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // The party must be in this wholesaler's own book.
    const party = await client.query(
      "SELECT id, name FROM parties WHERE id = $1 AND wholesaler_id = $2",
      [partyId, wholesalerId],
    );
    if (party.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Customer not found" });
    }

    const saleNumber = await nextSaleNumber(client, wholesalerId);

    const sale = await client.query(
      `INSERT INTO sales
         (wholesaler_id, party_id, sale_number, sale_date, source, status,
          subtotal, discount, total, notes)
       VALUES ($1, $2, $3, COALESCE($4::date, CURRENT_DATE), 'wholesaler',
               $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        wholesalerId,
        partyId,
        saleNumber,
        clean(saleDate),
        saleStatus,
        fromPaise(subtotalPaise),
        fromPaise(discountPaise),
        fromPaise(totalPaise),
        clean(notes),
      ],
    );
    const saleId = sale.rows[0].id;

    for (const line of lines) {
      await client.query(
        `INSERT INTO sale_lines
           (sale_id, item_name, quantity, unit, rate, amount, hsn_code)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          saleId,
          line.itemName,
          line.quantity,
          line.unit,
          line.rate,
          fromPaise(line.amountPaise),
          line.hsnCode,
        ],
      );
    }

    // Money handed over at the same time as the goods is the normal case,
    // so it is recorded here rather than forcing a second trip.
    if (paidPaise > 0) {
      await client.query(
        `INSERT INTO party_payments
           (wholesaler_id, party_id, sale_id, amount, method)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          wholesalerId,
          partyId,
          saleId,
          fromPaise(paidPaise),
          paymentMethod || "cash",
        ],
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      ...sale.rows[0],
      party_name: party.rows[0].name,
      amount_received: fromPaise(paidPaise),
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error recording sale:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

exports.listSales = async (req, res) => {
  const wholesalerId = req.user.id;
  const { partyId, status } = req.query;

  try {
    const params = [wholesalerId];
    let where = "s.wholesaler_id = $1";

    if (clean(partyId)) {
      params.push(partyId);
      where += ` AND s.party_id = $${params.length}`;
    }
    if (clean(status)) {
      params.push(status);
      where += ` AND s.status = $${params.length}`;
    }

    const result = await pool.query(
      `SELECT
         s.id, s.sale_number, s.sale_date, s.status, s.source, s.total,
         p.name AS party_name, p.business_name AS party_business_name,
         (SELECT COUNT(*) FROM sale_lines sl WHERE sl.sale_id = s.id) AS line_count,
         COALESCE((SELECT SUM(pp.amount) FROM party_payments pp
                    WHERE pp.sale_id = s.id), 0) AS received
       FROM sales s
       JOIN parties p ON p.id = s.party_id
       WHERE ${where}
       ORDER BY s.sale_date DESC, s.created_at DESC
       LIMIT 200`,
      params,
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error listing sales:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getSaleById = async (req, res) => {
  const wholesalerId = req.user.id;
  const { id } = req.params;

  try {
    const sale = await pool.query(
      `SELECT s.*, p.name AS party_name, p.business_name AS party_business_name,
              p.phone AS party_phone, p.city AS party_city, p.gstin AS party_gstin
         FROM sales s
         JOIN parties p ON p.id = s.party_id
        WHERE s.id = $1 AND s.wholesaler_id = $2`,
      [id, wholesalerId],
    );

    if (sale.rows.length === 0) {
      return res.status(404).json({ message: "Sale not found" });
    }

    const [lines, payments] = await Promise.all([
      pool.query(
        `SELECT id, item_name, quantity, unit, rate, amount, hsn_code
           FROM sale_lines WHERE sale_id = $1 ORDER BY created_at ASC`,
        [id],
      ),
      pool.query(
        `SELECT id, amount, method, paid_on, note
           FROM party_payments WHERE sale_id = $1 ORDER BY paid_on DESC`,
        [id],
      ),
    ]);

    res.status(200).json({
      sale: sale.rows[0],
      lines: lines.rows,
      payments: payments.rows,
    });
  } catch (err) {
    console.error("Error fetching sale:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// The four states are a deliberate spine, not a lifecycle. Once a wholesaler
// describes how he actually works, this is where the real stages go.
const ALLOWED_NEXT = {
  draft: ["confirmed", "cancelled"],
  confirmed: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

exports.updateSaleStatus = async (req, res) => {
  const wholesalerId = req.user.id;
  const { id } = req.params;
  const { status } = req.body;

  try {
    const current = await pool.query(
      "SELECT status FROM sales WHERE id = $1 AND wholesaler_id = $2",
      [id, wholesalerId],
    );
    if (current.rows.length === 0) {
      return res.status(404).json({ message: "Sale not found" });
    }

    const from = current.rows[0].status;
    if (!ALLOWED_NEXT[from]?.includes(status)) {
      return res.status(400).json({
        message:
          ALLOWED_NEXT[from]?.length === 0
            ? `A ${from} sale cannot be changed`
            : `A ${from} sale cannot become ${status}`,
      });
    }

    const updated = await pool.query(
      `UPDATE sales SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND wholesaler_id = $3 RETURNING *`,
      [status, id, wholesalerId],
    );

    // A cancelled sale must not leave a live bill standing against the
    // customer. The invoice is marked Cancelled, not deleted, because an
    // issued document is not something you erase.
    let cancelledInvoice = null;
    if (status === "cancelled") {
      try {
        cancelledInvoice = await saleInvoiceService.cancelInvoiceForSale(
          id,
          wholesalerId,
        );
      } catch (cancelError) {
        console.error("Could not cancel the bill for this sale:", cancelError);
      }
    }

    res.status(200).json({ ...updated.rows[0], cancelledInvoice });
  } catch (err) {
    console.error("Error updating sale status:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Raises the bill for a sale, or hands back the one already raised. A sale
 * gets exactly one invoice: a second would give the same goods two numbers.
 */
exports.createInvoiceForSale = async (req, res) => {
  const wholesalerId = req.user.id;
  const { id } = req.params;

  const REASONS = {
    notFound: [404, "Sale not found"],
    cancelled: [400, "A cancelled sale cannot be billed"],
    draft: [400, "Confirm this sale before raising a bill"],
    empty: [400, "This sale has no items to bill"],
  };

  try {
    const result = await saleInvoiceService.createInvoiceFromSale(id, wholesalerId);

    if (result.error) {
      const [status, message] = REASONS[result.error] || [400, "Cannot bill this sale"];
      return res.status(status).json({ message });
    }

    res.status(result.created ? 201 : 200).json(result.invoice);
  } catch (err) {
    console.error("Error raising invoice for sale:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getInvoiceForSale = async (req, res) => {
  const wholesalerId = req.user.id;
  try {
    const invoice = await saleInvoiceService.findBySaleId(req.params.id, wholesalerId);
    if (!invoice) return res.status(404).json({ message: "No bill raised yet" });
    res.status(200).json(invoice);
  } catch (err) {
    console.error("Error fetching invoice for sale:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Changes a recorded sale. A typo in a bill silently corrupts a customer's
 * balance, and until now it was permanent.
 *
 * Three things are deliberately not editable.
 *
 * The customer. Moving a sale to a different party would move money between
 * two khatas and orphan any payment attached to it. If the wrong customer was
 * picked, cancel the sale and record it again: the cancelled row stays, which
 * is the honest history.
 *
 * A sale that has been billed. An invoice is a fixed document with a fixed
 * number. Under GST you correct one with a credit note, not by rewriting it,
 * and credit notes are launch phase work.
 *
 * The sale number and its status, which are not content.
 */
exports.updateSale = async (req, res) => {
  const wholesalerId = req.user.id;
  const { id } = req.params;
  const { saleDate, discount, notes, lines: rawLines } = req.body;

  const { lines, error } = buildLines(rawLines);
  if (error) return res.status(400).json({ message: error });

  const subtotalPaise = lines.reduce((sum, line) => sum + line.amountPaise, 0);
  const discountPaise = Math.max(0, toPaise(discount));
  if (discountPaise > subtotalPaise) {
    return res
      .status(400)
      .json({ message: "Discount cannot be more than the total" });
  }
  const totalPaise = subtotalPaise - discountPaise;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existing = await client.query(
      "SELECT id, status, sale_number FROM sales WHERE id = $1 AND wholesaler_id = $2 FOR UPDATE",
      [id, wholesalerId],
    );
    if (existing.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Sale not found" });
    }

    const sale = existing.rows[0];
    if (sale.status === "cancelled") {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ message: "A cancelled sale cannot be changed" });
    }

    const billed = await client.query(
      "SELECT invoice_number FROM invoices WHERE sale_id = $1",
      [id],
    );
    if (billed.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: `Bill ${billed.rows[0].invoice_number} has been raised for this sale, so it cannot be changed`,
      });
    }

    // Editing the total down below what has already come in would leave the
    // customer having overpaid a bill that no longer exists at that amount.
    const receivedRow = await client.query(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM party_payments WHERE sale_id = $1",
      [id],
    );
    const receivedPaise = toPaise(receivedRow.rows[0].total);
    if (totalPaise < receivedPaise) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: `₹${fromPaise(receivedPaise)} has already been received against this sale, so the total cannot go below that`,
      });
    }

    await client.query(
      `UPDATE sales SET
         sale_date = COALESCE($2::date, sale_date),
         subtotal  = $3,
         discount  = $4,
         total     = $5,
         notes     = $6,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [
        id,
        clean(saleDate),
        fromPaise(subtotalPaise),
        fromPaise(discountPaise),
        fromPaise(totalPaise),
        clean(notes),
      ],
    );

    // Lines are replaced wholesale. Nothing references a sale line, so there
    // is nothing to preserve by trying to match them up one by one.
    await client.query("DELETE FROM sale_lines WHERE sale_id = $1", [id]);
    for (const line of lines) {
      await client.query(
        `INSERT INTO sale_lines
           (sale_id, item_name, quantity, unit, rate, amount, hsn_code)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          id,
          line.itemName,
          line.quantity,
          line.unit,
          line.rate,
          fromPaise(line.amountPaise),
          line.hsnCode,
        ],
      );
    }

    await client.query("COMMIT");

    const updated = await pool.query(
      `SELECT s.*, p.name AS party_name FROM sales s
         JOIN parties p ON p.id = s.party_id
        WHERE s.id = $1`,
      [id],
    );
    res.status(200).json(updated.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error updating sale:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};
