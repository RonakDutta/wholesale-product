const pool = require("../config/db");
const { clean, fromPaise, toPaise } = require("../utils/money");
const saleInvoiceService = require("../services/saleInvoiceService");
const creditNoteService = require("../services/creditNoteService");
const invoiceRepository = require("../repositories/invoiceRepository");
const gstService = require("../services/gstService");
const { checkHsn } = require("../services/hsnService");
const challanService = require("../services/challanService");
const { businessId } = require("../middlewares/businessContext");

/**
 * Recording a sale is the wholesaler's core action. He is usually writing
 * down something that already happened, so a new sale is 'confirmed' rather
 * than 'draft' unless he says otherwise.
 *
 * Every query is scoped by the wholesaler id from the token. A party id in
 * the request body is checked against that scope before anything is written,
 * so a sale can never be attached to somebody else's customer.
 */

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

  // Read off his shop listings, which is where a product's tax rate now
  // lives. It used to read the rate list, a second product table that has
  // since been merged into the listings and whose screen is gone: a rate
  // edited on the product page would have been ignored here, and a sale of
  // the same goods would have been taxed at whatever the dead table said.
  //
  // The column arrives with wholesale3_listing_billing_fields.sql. Until that
  // has been run every line falls back to the wholesaler's default rate.
  const has = await invoiceRepository.schemaExtras();
  if (!has.has_listing_billing) {
    return lines.map((line) => ({
      ...line,
      gstPercent: line.gstPercent ?? fallback,
    }));
  }

  const named = lines.map((line) => line.itemName.toLowerCase());
  const known = await client.query(
    `SELECT lower(p.name) AS name, si.gst_percent
       FROM supplier_inventory si
       JOIN products p ON p.id = si.product_id
      WHERE si.supplier_id = $1 AND si.gst_percent IS NOT NULL
        AND lower(p.name) = ANY($2::text[])`,
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

    // The HSN says what the goods ARE on a tax document. Blank is allowed and
    // common; a code of the wrong length is a slipped keystroke, and letting
    // it through prints a false description on a bill the customer claims his
    // input credit against.
    const hsn = checkHsn(raw.hsnCode ?? raw.hsn_code);
    if (!hsn.ok) return { error: `${hsn.reason} Check the HSN for ${itemName}.` };

    lines.push({
      itemName,
      quantity,
      unit: clean(raw.unit),
      rate,
      gstPercent,
      // Snapshot from the rate list, so editing an item later cannot change
      // the HSN printed on a bill already raised.
      hsnCode: hsn.hsn,
      amountPaise: Math.round(toPaise(rate) * quantity),
    });
  }

  return { lines };
};

exports.createSale = async (req, res) => {
  const wholesalerId = businessId(req);
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

    // Without the tax migration a sale has nowhere to put its tax, so it
    // behaves exactly as it did before: the total is the pre tax figure, and
    // the invoice backs the tax out of it. Half applying the new model would
    // be worse than either, so this falls back whole.
    const has = await invoiceRepository.schemaExtras();
    const priced = await resolveRates(client, wholesalerId, lines);
    const gst = has.has_sale_tax ? priceSale(priced, discountPaise) : null;
    const taxPaise = gst ? toPaise(gst.totalTax) : 0;
    const totalPaise = gst
      ? toPaise(gst.grandTotal)
      : subtotalPaise - discountPaise;

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
          subtotal, discount, ${has.has_sale_tax ? "tax_amount," : ""} total, notes)
       VALUES ($1, $2, $3, COALESCE($4::date, CURRENT_DATE), 'wholesaler',
               $5, $6, $7, ${has.has_sale_tax ? "$8, $9, $10" : "$8, $9"})
       RETURNING *`,
      [
        wholesalerId,
        partyId,
        saleNumber,
        clean(saleDate),
        saleStatus,
        fromPaise(subtotalPaise),
        fromPaise(discountPaise),
        ...(has.has_sale_tax ? [fromPaise(taxPaise)] : []),
        fromPaise(totalPaise),
        clean(notes),
      ],
    );
    const saleId = sale.rows[0].id;

    for (const line of priced) {
      await client.query(
        `INSERT INTO sale_lines
           (sale_id, item_name, quantity, unit, rate, amount, hsn_code
            ${has.has_line_gst ? ", gst_percent" : ""})
         VALUES ($1, $2, $3, $4, $5, $6, $7${has.has_line_gst ? ", $8" : ""})`,
        [
          saleId,
          line.itemName,
          line.quantity,
          line.unit,
          line.rate,
          fromPaise(line.amountPaise),
          line.hsnCode,
          ...(has.has_line_gst ? [line.gstPercent] : []),
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

    // A cash sale settled at the counter is settled the moment it is written
    // down, so its bill is raised here rather than waiting for a button. Does
    // nothing when money is still owed. After the commit, because the sale has
    // to exist before it can be billed, and never awaited into the response:
    // the sale is recorded either way and a bill can always be raised again.
    saleInvoiceService
      .billIfSettled(sale.rows[0].id, wholesalerId)
      .catch((err) => console.warn("Bill on a settled sale skipped:", err.message));

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
  const wholesalerId = businessId(req);
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

    // Goods out on a challan, counted per sale so the list can show it. Only
    // once the migration has been run; before that the column is a plain zero
    // rather than the query failing.
    const hasChallans = await challanService.challanTablesExist();
    const challanCount = hasChallans
      ? `,
         (SELECT COUNT(*) FROM delivery_challans dc WHERE dc.sale_id = s.id) AS challan_count`
      : ",\n         0 AS challan_count";

    const result = await pool.query(
      `SELECT
         s.id, s.sale_number, s.sale_date, s.status, s.source, s.total,
         p.name AS party_name, p.business_name AS party_business_name,
         (SELECT COUNT(*) FROM sale_lines sl WHERE sl.sale_id = s.id) AS line_count,
         COALESCE((SELECT SUM(pp.amount) FROM party_payments pp
                    WHERE pp.sale_id = s.id), 0) AS received${challanCount}
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
  const wholesalerId = businessId(req);
  const { id } = req.params;

  try {
    const has = await invoiceRepository.schemaExtras();

    // The order this sale came from, when it came from one. The page needs it
    // to send the wholesaler to the order rather than offering him a second
    // set of buttons for the same goods, see updateSaleStatus below.
    const fromOrder = has.has_sale_order_id;

    const sale = await pool.query(
      `SELECT s.*, p.name AS party_name, p.business_name AS party_business_name,
              p.phone AS party_phone, p.city AS party_city, p.gstin AS party_gstin
              ${fromOrder ? ", o.order_number, o.status AS order_status" : ""}
         FROM sales s
         JOIN parties p ON p.id = s.party_id
         ${fromOrder ? "LEFT JOIN orders o ON o.id = s.order_id" : ""}
        WHERE s.id = $1 AND s.wholesaler_id = $2`,
      [id, wholesalerId],
    );

    if (sale.rows.length === 0) {
      return res.status(404).json({ message: "Sale not found" });
    }

    const [lines, payments, creditNote] = await Promise.all([
      pool.query(
        // Carries the stored GST rate back to the edit form, so editing a
        // sale reprices it exactly as it was priced.
        `SELECT id, item_name, quantity, unit, rate, amount, hsn_code,
                ${has.has_line_gst ? "gst_percent" : "NULL AS gst_percent"}
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

    // Whether this sale is settled is the one question the billing rule turns
    // on, so it comes from the same function the server uses rather than
    // being worked out again on the screen from a different set of rows. An
    // order backed sale has money on the order as well as in party_payments,
    // which a client side sum would miss.
    const settlement = await challanService.settlementForSale(id, wholesalerId);

    res.status(200).json({
      sale: sale.rows[0],
      lines: lines.rows,
      payments: payments.rows,
      creditNote,
      settlement,
      // Whether a challan may be raised at all, so the screen does not have
      // to know the rule.
      challansOn: challanService.challanEnabled() && (await challanService.challanTablesExist()),
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
  const wholesalerId = businessId(req);
  const { id } = req.params;
  const { status } = req.body;

  try {
    const has = await invoiceRepository.schemaExtras();

    const current = await pool.query(
      `SELECT status${has.has_sale_order_id ? ", order_id" : ""}
         FROM sales WHERE id = $1 AND wholesaler_id = $2`,
      [id, wholesalerId],
    );
    if (current.rows.length === 0) {
      return res.status(404).json({ message: "Sale not found" });
    }

    /**
     * A sale that came from a shop order does not get its own switches.
     *
     * The goods being delivered is one event. It had two buttons: the order
     * had a lifecycle that stamps a delivery date and starts the return
     * window, and the sale had a plain "Mark delivered" that knew nothing
     * about any of it. Pressing the second one left an order still sitting at
     * "shipped" and a sale saying "delivered", with the return window counted
     * from a date the order never got.
     *
     * The order lifecycle is the authority. Move the order and the sale
     * follows, in orderStatusService.
     */
    if (current.rows[0].order_id) {
      return res.status(409).json({
        code: "FOLLOWS_ORDER",
        orderId: current.rows[0].order_id,
        message:
          "This sale came from a shop order, so it follows that order. Change the order and this will follow.",
      });
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
  const wholesalerId = businessId(req);
  const { id } = req.params;

  const REASONS = {
    notFound: [404, "Sale not found"],
    cancelled: [400, "A cancelled sale cannot be billed"],
    draft: [400, "Confirm this sale before raising a bill"],
    empty: [400, "This sale has no items to bill"],
    // Not a failure so much as "not yet". The screen turns this into an
    // offer to send the goods out on a delivery challan instead.
    unpaid: [409, "This sale is not fully paid yet, so the bill waits"],
  };

  try {
    const result = await saleInvoiceService.createInvoiceFromSale(id, wholesalerId);

    if (result.error) {
      const [status, message] = REASONS[result.error] || [400, "Cannot bill this sale"];
      // The unpaid case carries the numbers with it, so the screen can say
      // how much is left rather than making him go and look.
      if (result.error === "unpaid") {
        return res.status(status).json({
          message,
          code: "UNPAID",
          outstanding: result.outstanding,
          received: result.received,
          total: result.total,
        });
      }
      return res.status(status).json({ message, code: result.error });
    }

    res.status(result.created ? 201 : 200).json(result.invoice);
  } catch (err) {
    console.error("Error raising invoice for sale:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getInvoiceForSale = async (req, res) => {
  const wholesalerId = businessId(req);
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
  const wholesalerId = businessId(req);
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

    const has = await invoiceRepository.schemaExtras();
    const existing = await client.query(
      `SELECT id, status, sale_number${has.has_sale_order_id ? ", order_id" : ""}
         FROM sales WHERE id = $1 AND wholesaler_id = $2 FOR UPDATE`,
      [id, wholesalerId],
    );
    if (existing.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Sale not found" });
    }

    const sale = existing.rows[0];

    // The same rule as the status buttons, for the same reason. A sale
    // written from a shop order owes exactly what the customer agreed at
    // checkout, and part of it may already be paid. Retyping the lines here
    // would move the debt away from the figure he pressed pay on.
    if (sale.order_id) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        code: "FOLLOWS_ORDER",
        orderId: sale.order_id,
        message:
          "This sale came from a shop order, so its amounts are what the customer agreed at checkout and cannot be retyped here.",
      });
    }

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
    const gst = has.has_sale_tax ? priceSale(priced, discountPaise) : null;
    const taxPaise = gst ? toPaise(gst.totalTax) : 0;
    const totalPaise = gst
      ? toPaise(gst.grandTotal)
      : subtotalPaise - discountPaise;

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
         ${has.has_sale_tax ? "tax_amount = $5, total = $6, notes = $7" : "total = $5, notes = $6"},
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [
        id,
        clean(saleDate),
        fromPaise(subtotalPaise),
        fromPaise(discountPaise),
        ...(has.has_sale_tax ? [fromPaise(taxPaise)] : []),
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
           (sale_id, item_name, quantity, unit, rate, amount, hsn_code
            ${has.has_line_gst ? ", gst_percent" : ""})
         VALUES ($1, $2, $3, $4, $5, $6, $7${has.has_line_gst ? ", $8" : ""})`,
        [
          id,
          line.itemName,
          line.quantity,
          line.unit,
          line.rate,
          fromPaise(line.amountPaise),
          line.hsnCode,
          ...(has.has_line_gst ? [line.gstPercent] : []),
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
