const pool = require("../config/db");
const saleInvoiceService = require("../services/saleInvoiceService");
const creditNoteService = require("../services/creditNoteService");
const invoiceRepository = require("../repositories/invoiceRepository");
const gstService = require("../services/gstService");

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
 * What a sale comes to, tax included.
 *
 * The rate a wholesaler quotes is BEFORE GST: "142 a metre" means the shop
 * pays 142 plus tax. So the tax belongs on the sale, not only on the bill.
 * The customer's khata is what he owes, and he owes the tax too.
 *
 * Run through gstService, the same function the invoice uses, rather than
 * worked out separately here. Two implementations of the same sum drift, and
 * the one thing that must never happen is a bill that disagrees with the sale
 * it was raised from.
 */
const priceSale = (lines, discountPaise) =>
  gstService.calculateGST({
    items: lines.map((line) => ({
      productName: line.itemName,
      quantity: line.quantity,
      unitPrice: line.rate,
      gstPercent: line.gstPercent,
      hsnCode: line.hsnCode || undefined,
    })),
    discount: fromPaise(discountPaise),
    shippingCharge: 0,
    isTaxInclusive: false,
  });

/**
 * The GST rate for a line: what was typed on it, else what the rate list says
 * for that item, else the wholesaler's own default.
 *
 * Resolved once when the sale is recorded and snapshot onto the line, so
 * changing a default next year cannot restate a sale from this year.
 */
const resolveRates = async (client, wholesalerId, lines) => {
  const settings = await invoiceRepository.getSettings(wholesalerId);
  const fallback = Number(settings.defaultTaxRate ?? 18);

  const named = lines.map((line) => line.itemName.toLowerCase());
  const known = await client.query(
    `SELECT lower(name) AS name, gst_percent FROM items
      WHERE wholesaler_id = $1 AND gst_percent IS NOT NULL
        AND lower(name) = ANY($2::text[])`,
    [wholesalerId, named],
  );
  const byName = new Map(known.rows.map((row) => [row.name, Number(row.gst_percent)]));

  return lines.map((line) => ({
    ...line,
    gstPercent:
      line.gstPercent ??
      byName.get(line.itemName.toLowerCase()) ??
      fallback,
  }));
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

    // Only taken when it was actually sent. Undefined means "use the rate
    // list, or my default"; zero is a real answer for an exempt item.
    const rawRate = raw.gstPercent ?? raw.gst_percent;
    let gstPercent;
    if (rawRate !== undefined && rawRate !== null && String(rawRate).trim() !== "") {
      gstPercent = Number(rawRate);
      if (!Number.isFinite(gstPercent) || gstPercent < 0 || gstPercent > 100) {
        return { error: `Enter a GST rate between 0 and 100 for ${itemName}` };
      }
    }

    lines.push({
      itemName,
      quantity,
      unit: clean(raw.unit),
      rate,
      gstPercent,
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

    const priced = await resolveRates(client, wholesalerId, lines);
    const gst = priceSale(priced, discountPaise);
    const taxPaise = toPaise(gst.totalTax);
    const totalPaise = toPaise(gst.grandTotal);

    // Checked against the tax inclusive total, which is what the customer
    // actually hands over. Against the pre-tax figure it would refuse money
    // the shop had genuinely paid.
    const paidPaise = Math.max(0, toPaise(amountPaid));
    if (paidPaise > totalPaise) {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ message: "Amount received cannot be more than the bill" });
    }

    const saleNumber = await nextSaleNumber(client, wholesalerId);

    const sale = await client.query(
      `INSERT INTO sales
         (wholesaler_id, party_id, sale_number, sale_date, source, status,
          subtotal, discount, tax_amount, total, notes)
       VALUES ($1, $2, $3, COALESCE($4::date, CURRENT_DATE), 'wholesaler',
               $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        wholesalerId,
        partyId,
        saleNumber,
        clean(saleDate),
        saleStatus,
        fromPaise(subtotalPaise),
        fromPaise(discountPaise),
        fromPaise(taxPaise),
        fromPaise(totalPaise),
        clean(notes),
      ],
    );
    const saleId = sale.rows[0].id;

    for (const line of priced) {
      await client.query(
        `INSERT INTO sale_lines
           (sale_id, item_name, quantity, unit, rate, amount, hsn_code, gst_percent)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          saleId,
          line.itemName,
          line.quantity,
          line.unit,
          line.rate,
          fromPaise(line.amountPaise),
          line.hsnCode,
          line.gstPercent,
        ],
      );
    }

    // Money handed over at the same time as the goods is the normal case,
    // so it is recorded here rather than forcing a second trip.
    //
    // Dated with the sale, not with today. A wholesaler writing up Monday's
    // sales on Thursday would otherwise get a statement showing the goods on
    // Monday and the cash on Thursday, when both changed hands together.
    if (paidPaise > 0) {
      await client.query(
        `INSERT INTO party_payments
           (wholesaler_id, party_id, sale_id, amount, method, paid_on)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          wholesalerId,
          partyId,
          saleId,
          fromPaise(paidPaise),
          paymentMethod || "cash",
          sale.rows[0].sale_date,
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

    const [lines, payments, creditNote] = await Promise.all([
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
      // Usually null. When it is not, the bill for this sale has been
      // reversed and the page has to say so, or the invoice reads live.
      creditNoteService.findBySaleId(id, wholesalerId),
    ]);

    res.status(200).json({
      sale: sale.rows[0],
      lines: lines.rows,
      payments: payments.rows,
      creditNote,
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
    // customer. Voiding the invoice was the old answer and it was the wrong
    // instrument: once a bill has been handed over, the way to reverse it is
    // a credit note, which is a document of its own that the customer can put
    // in his books too. The invoice stands. See creditNoteService.
    let creditNote = null;
    if (status === "cancelled") {
      try {
        const invoice = await saleInvoiceService.findBySaleId(id, wholesalerId);
        if (invoice) {
          const result = await creditNoteService.createCreditNote({
            invoiceId: invoice.id,
            wholesalerId,
            reason: "sale_cancelled",
            reasonNote: `Sale ${updated.rows[0].sale_number} was cancelled`,
          });
          creditNote =
            result.creditNote ||
            (await creditNoteService.findByInvoiceId(invoice.id, wholesalerId));
        }
      } catch (creditError) {
        // The sale is already cancelled and committed. Failing the whole
        // request now would tell him it did not work when it did, so this is
        // logged and the note is left to be raised by hand from the bill.
        console.error("Could not raise a credit note for this sale:", creditError);
      }
    }

    res.status(200).json({ ...updated.rows[0], creditNote });
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
    const priced = await resolveRates(client, wholesalerId, lines);
    const gst = priceSale(priced, discountPaise);
    const taxPaise = toPaise(gst.totalTax);
    const totalPaise = toPaise(gst.grandTotal);

    const receivedPaise = toPaise(receivedRow.rows[0].total);
    if (totalPaise < receivedPaise) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: `₹${fromPaise(receivedPaise)} has already been received against this sale, so the total cannot go below that`,
      });
    }

    await client.query(
      `UPDATE sales SET
         sale_date  = COALESCE($2::date, sale_date),
         subtotal   = $3,
         discount   = $4,
         tax_amount = $5,
         total      = $6,
         notes      = $7,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [
        id,
        clean(saleDate),
        fromPaise(subtotalPaise),
        fromPaise(discountPaise),
        fromPaise(taxPaise),
        fromPaise(totalPaise),
        clean(notes),
      ],
    );

    // Lines are replaced wholesale. Nothing references a sale line, so there
    // is nothing to preserve by trying to match them up one by one.
    await client.query("DELETE FROM sale_lines WHERE sale_id = $1", [id]);
    for (const line of priced) {
      await client.query(
        `INSERT INTO sale_lines
           (sale_id, item_name, quantity, unit, rate, amount, hsn_code, gst_percent)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          id,
          line.itemName,
          line.quantity,
          line.unit,
          line.rate,
          fromPaise(line.amountPaise),
          line.hsnCode,
          line.gstPercent,
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
