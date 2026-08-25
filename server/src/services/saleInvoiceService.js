const pool = require("../config/db");
const invoiceRepository = require("../repositories/invoiceRepository");
const invoiceNumberService = require("./invoiceNumberService");
const gstService = require("./gstService");

/**
 * Turns a recorded sale into an invoice.
 *
 * Sits beside invoiceService.createInvoiceFromOrder rather than replacing it.
 * Marketplace invoices still come from orders; everything recorded in 3.0
 * comes through here. Numbering, GST maths, the PDF and payment recording are
 * all the existing module's, unchanged.
 *
 * The rates on a sale are TAX EXCLUSIVE. This was a guess for a while and it
 * was the wrong one; a real wholesaler has since confirmed that "142 a metre"
 * means the shop pays 142 plus GST.
 *
 * The khata moved with it, which was the whole worry. A sale now works out
 * its own tax and stores it, so sales.total is the tax inclusive figure the
 * customer actually owes, and it equals this invoice's grand total. Both go
 * through gstService with the same inputs, and the per line rate is read off
 * the sale rather than from today's settings, so a bill can never disagree
 * with the sale it was raised from.
 */

const TAX_INCLUSIVE = false;

const fullName = (first, last) =>
  [first, last].filter(Boolean).join(" ").trim() || null;

class SaleInvoiceService {
  /**
   * Loads everything an invoice needs about one sale, scoped to its owner.
   * Returns null when the sale is not this wholesaler's.
   */
  async loadSale(saleId, wholesalerId, client) {
    const db = client || pool;

    const sale = await db.query(
      `SELECT s.*,
              p.id AS party_id, p.name AS party_name,
              p.business_name AS party_business_name,
              p.gstin AS party_gstin, p.city AS party_city,
              p.address AS party_address, p.phone AS party_phone,
              p.user_id AS party_user_id
         FROM sales s
         JOIN parties p ON p.id = s.party_id
        WHERE s.id = $1 AND s.wholesaler_id = $2`,
      [saleId, wholesalerId],
    );
    if (sale.rows.length === 0) return null;

    const [lines, received] = await Promise.all([
      db.query(
        `SELECT item_name, quantity, unit, rate, amount, hsn_code, gst_percent
           FROM sale_lines WHERE sale_id = $1 ORDER BY created_at ASC`,
        [saleId],
      ),
      db.query(
        "SELECT COALESCE(SUM(amount), 0) AS total FROM party_payments WHERE sale_id = $1",
        [saleId],
      ),
    ]);

    return {
      sale: sale.rows[0],
      lines: lines.rows,
      received: Number(received.rows[0].total),
    };
  }

  /**
   * Creates the invoice, or returns the one that already exists. Never
   * creates a second bill for the same sale: the unique index on sale_id
   * enforces that too, but returning early keeps the caller simple.
   */
  async createInvoiceFromSale(saleId, wholesalerId) {
    // Scoped by owner, not just by sale. Looking this up on sale_id alone
    // handed another wholesaler's invoice, recipient GSTIN and all, to anyone
    // who asked to bill a sale that was not theirs.
    const existing = await pool.query(
      `SELECT i.* FROM invoices i
         JOIN sales s ON s.id = i.sale_id
        WHERE i.sale_id = $1 AND s.wholesaler_id = $2`,
      [saleId, wholesalerId],
    );
    if (existing.rows.length > 0) {
      return { invoice: existing.rows[0], created: false };
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const loaded = await this.loadSale(saleId, wholesalerId, client);
      if (!loaded) {
        await client.query("ROLLBACK");
        return { error: "notFound" };
      }

      const { sale, lines, received } = loaded;

      if (sale.status === "cancelled") {
        await client.query("ROLLBACK");
        return { error: "cancelled" };
      }
      if (sale.status === "draft") {
        await client.query("ROLLBACK");
        return { error: "draft" };
      }
      if (lines.length === 0) {
        await client.query("ROLLBACK");
        return { error: "empty" };
      }

      const supplier = await client.query(
        `SELECT u.first_name, u.last_name, u.email,
                wp.company_name, wp.gstin, wp.city, wp.warehouse_city,
                wp.warehouse_state
           FROM users u
           LEFT JOIN wholesaler_profiles wp ON wp.user_id = u.id
          WHERE u.id = $1`,
        [wholesalerId],
      );
      const seller = supplier.rows[0] || {};
      const settings = await invoiceRepository.getSettings(wholesalerId);

      // Sales recorded before GST moved onto the sale were entered under the
      // old reading, where the quoted rate already included tax, and their
      // totals are what those customers were told they owed. Billing one with
      // tax added on top would hand over a bill higher than the balance on
      // that customer's account. Every line written since carries a resolved
      // rate, so a sale where no line has one is unambiguously an old one,
      // and a genuinely tax free sale is not confused with it: its lines
      // carry a real zero.
      const legacyInclusive =
        lines.length > 0 &&
        lines.every((line) => line.gst_percent === null || line.gst_percent === undefined);

      const gst = gstService.calculateGST({
        items: lines.map((line) => ({
          productName: line.item_name,
          quantity: Number(line.quantity),
          unitPrice: Number(line.rate),
          // Off the line, not out of today's settings. The rate was resolved
          // and snapshot when the sale was recorded, and the sale's total was
          // worked out from it. Reading the setting here would let a default
          // changed since then produce a bill that disagrees with the sale.
          // Older lines, recorded before the column existed, have none.
          gstPercent:
            line.gst_percent !== null && line.gst_percent !== undefined
              ? Number(line.gst_percent)
              : settings.defaultTaxRate,
          hsnCode: line.hsn_code || undefined,
        })),
        discount: Number(sale.discount || 0),
        shippingCharge: 0,
        supplierLocation:
          seller.warehouse_state || seller.warehouse_city || seller.city || "Delhi",
        buyerLocation: sale.party_city || seller.city || "Delhi",
        isTaxInclusive: legacyInclusive ? true : TAX_INCLUSIVE,
      });

      const invoiceNumber = await invoiceNumberService.generateInvoiceNumber(
        client,
        settings.prefix,
      );

      const issueDate = new Date(sale.sale_date || Date.now());
      const dueDate = new Date(issueDate);
      dueDate.setDate(issueDate.getDate() + settings.dueDays);

      // "Pending" covers anything not fully received. The reporting queries
      // only count Paid and Pending, so inventing a third value here would
      // quietly drop those invoices out of every total.
      const paid = received >= Number(sale.total) && Number(sale.total) > 0;

      const invoiceData = {
        invoiceNumber,
        orderId: null,
        buyerId: sale.party_user_id || null,
        supplierId: wholesalerId,
        subtotal: gst.subtotal,
        discount: gst.discount,
        shippingCharge: gst.shippingCharge,
        taxableAmount: gst.taxableAmount,
        cgst: gst.cgst,
        sgst: gst.sgst,
        igst: gst.igst,
        totalTax: gst.totalTax,
        grandTotal: gst.grandTotal,
        paymentStatus: paid ? "Paid" : "Pending",
        invoiceStatus: "Generated",
        issueDate,
        dueDate,
        notes: settings.defaultNotes,
        termsConditions: settings.defaultTerms,
        pdfUrl: null,
      };

      const invoice = await invoiceRepository.createInvoice(
        invoiceData,
        gst.items,
        client,
      );

      // The link back to the sale, and the recipient frozen as of today.
      // See the migration for why these are stored rather than joined.
      const stamped = await client.query(
        `UPDATE invoices SET
           sale_id = $2, party_id = $3,
           recipient_name = $4, recipient_gstin = $5, recipient_city = $6,
           recipient_address = $7, recipient_phone = $8,
           pdf_url = $9
         WHERE id = $1
         RETURNING *`,
        [
          invoice.id,
          sale.id,
          sale.party_id,
          sale.party_business_name || sale.party_name,
          sale.party_gstin,
          sale.party_city,
          sale.party_address,
          sale.party_phone,
          `/api/invoices/${invoice.id}/pdf`,
        ],
      );

      await invoiceRepository.addLog(
        {
          invoiceId: invoice.id,
          action: "Created",
          performedBy: wholesalerId,
          details: `Invoice ${invoiceNumber} raised for sale ${sale.sale_number}`,
        },
        client,
      );

      // No payment row is written here. The money is already in
      // party_payments, recorded against the sale. Writing it again into the
      // invoice module's own payments table is what made a bill read Paid
      // while the customer still owed the full amount.

      await client.query("COMMIT");

      return {
        invoice: stamped.rows[0],
        created: true,
        sellerName: seller.company_name || fullName(seller.first_name, seller.last_name),
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Brings an invoice's payment status back in line with the money ledger.
   *
   * There is one ledger, party_payments. The invoice module has its own
   * payments table and used to be written to separately, which meant a bill
   * could read Paid while the customer's balance still showed the full amount
   * owing. Nothing writes that table for a sale invoice any more; this
   * recomputes the status from what actually came in.
   */
  async syncInvoiceFromLedger(saleId, externalClient = null) {
    const db = externalClient || pool;

    const row = await db.query(
      `SELECT i.id, i.grand_total, i.invoice_status,
              COALESCE((SELECT SUM(pp.amount) FROM party_payments pp
                         WHERE pp.sale_id = i.sale_id), 0) AS received
         FROM invoices i
        WHERE i.sale_id = $1`,
      [saleId],
    );
    if (row.rows.length === 0) return null;

    const invoice = row.rows[0];
    if (invoice.invoice_status === "Cancelled") return invoice;

    const paid =
      Number(invoice.received) >= Number(invoice.grand_total) &&
      Number(invoice.grand_total) > 0;

    const updated = await db.query(
      `UPDATE invoices
          SET payment_status = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND payment_status IS DISTINCT FROM $2
        RETURNING *`,
      [invoice.id, paid ? "Paid" : "Pending"],
    );
    return updated.rows[0] || invoice;
  }

  // Cancelling a sale used to void its invoice here. It no longer does. An
  // issued bill is reversed with a credit note, not by voiding it, so that
  // job moved to creditNoteService. Voiding by hand is still possible from
  // the invoice page, which is the right answer for a bill raised in error
  // that never left the office.

  async findBySaleId(saleId, wholesalerId) {
    const result = await pool.query(
      `SELECT i.* FROM invoices i
         JOIN sales s ON s.id = i.sale_id
        WHERE i.sale_id = $1 AND s.wholesaler_id = $2`,
      [saleId, wholesalerId],
    );
    return result.rows[0] || null;
  }
}

module.exports = new SaleInvoiceService();
