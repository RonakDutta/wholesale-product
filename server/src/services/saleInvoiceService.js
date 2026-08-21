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
 * IMPORTANT, and worth confirming with a real wholesaler: the rates on a sale
 * are treated as TAX INCLUSIVE. A wholesaler quotes "142 a metre" and that is
 * what the shop pays him. If GST were added on top, the invoice total would
 * come out higher than the sale he recorded, and higher than the balance
 * sitting on that customer's account, so his khata would disagree with his
 * own bill. Backing the tax out of the quoted rate keeps the two the same
 * number. If the pilot says rates are quoted before tax, this flag and the
 * khata both have to move together.
 */

const TAX_INCLUSIVE = true;

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
        `SELECT item_name, quantity, unit, rate, amount, hsn_code
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

      const gst = gstService.calculateGST({
        items: lines.map((line) => ({
          productName: line.item_name,
          quantity: Number(line.quantity),
          unitPrice: Number(line.rate),
          gstPercent: settings.defaultTaxRate,
          // Falls back to the module's own default when the rate list had no
          // HSN. That default is wrong for most trades and is why hsn_code
          // exists on items and on the line.
          hsnCode: line.hsn_code || undefined,
        })),
        discount: Number(sale.discount || 0),
        shippingCharge: 0,
        supplierLocation:
          seller.warehouse_state || seller.warehouse_city || seller.city || "Delhi",
        buyerLocation: sale.party_city || seller.city || "Delhi",
        isTaxInclusive: TAX_INCLUSIVE,
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

      if (paid) {
        await invoiceRepository.addPayment(
          {
            invoiceId: invoice.id,
            amount: gst.grandTotal,
            paymentMethod: "Recorded",
            remarks: `Already received against sale ${sale.sale_number}`,
          },
          client,
        );
      }

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
