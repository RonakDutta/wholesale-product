const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");
const invoiceRepository = require("../repositories/invoiceRepository");

/**
 * Money, as it can actually be printed.
 *
 * Every amount on every bill this product has produced came out as "¹142.00".
 * PDFKit's built-in Helvetica is a WinAnsi font and has no rupee glyph, so the
 * ₹ was silently falling back to the superscript one. Nobody caught it because
 * the code reads correctly.
 *
 * The fix is "Rs.", not a font. Embedding one would mean carrying a TTF in the
 * repository and trusting it to be present on whatever host this runs on, for
 * a character that "Rs." says perfectly well to the traders using this.
 */
const rupees = (value) => `Rs.${Number(value || 0).toFixed(2)}`;

// Printed on the credit note. The stored code is for the database; the
// customer reading the document gets a sentence.
const CREDIT_REASON_TEXT = {
  sale_cancelled: "The sale was cancelled",
  goods_returned: "The goods were returned",
  rate_revised: "The rate charged was corrected",
  other: "Other",
};

class PDFService {
  /**
   * Generates a professional A4 PDF Tax Invoice and streams it to an Express response or returns a Buffer.
   */
  async generateInvoicePDF(invoice, res = null) {
    // Generate UPI QR code data URL asynchronously
    let qrDataUrl = null;
    try {
      const upiId = invoice.supplier_upi_id || "merchant@upi";
      const qrPayload = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
        invoice.supplier_company || invoice.supplier_name || "Merchant"
      )}&am=${invoice.grand_total}&cu=INR&tn=${encodeURIComponent(
        `Invoice ${invoice.invoice_number}`
      )}`;
      qrDataUrl = await QRCode.toDataURL(qrPayload, { margin: 1, width: 100 });
    } catch (qrErr) {
      console.warn("QR code generation skipped:", qrErr.message);
    }

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: "A4", margin: 36, bufferPages: true });
        const buffers = [];

        if (res) {
          res.setHeader("Content-Type", "application/pdf");
          res.setHeader(
            "Content-Disposition",
            `inline; filename=${invoice.invoice_number || "invoice"}.pdf`
          );
          doc.pipe(res);
          doc.on("end", () => resolve());
        } else {
          doc.on("data", (chunk) => buffers.push(chunk));
          doc.on("end", () => resolve(Buffer.concat(buffers)));
        }
        doc.on("error", (err) => reject(err));

        const isPaid = (invoice.payment_status || "").toLowerCase() === "paid";
        const isCancelled = (invoice.invoice_status || "").toLowerCase() === "cancelled";

        // ----------------------------------------------------
        // WATERMARK (PAID / UNPAID / CANCELLED)
        // ----------------------------------------------------
        doc.save();
        doc.rotate(-45, { origin: [297, 421] });
        doc.fontSize(70);
        doc.fillColor(isPaid ? "#22c55e" : isCancelled ? "#ef4444" : "#f59e0b");
        doc.fillOpacity(0.12);
        const watermarkText = isPaid ? "PAID" : isCancelled ? "CANCELLED" : "UNPAID";
        doc.text(watermarkText, 100, 380, { align: "center", width: 400 });
        doc.restore();

        // Reset Opacity
        doc.fillOpacity(1);

        // ----------------------------------------------------
        // HEADER BAR
        // ----------------------------------------------------
        doc.rect(36, 36, 523, 65).fill("#0f172a");

        doc.fillColor("#ffffff").fontSize(20).font("Helvetica-Bold");
        doc.text("TAX INVOICE", 50, 48);

        doc.fontSize(9).font("Helvetica").fillColor("#94a3b8");
        doc.text(invoice.supplier_company || invoice.supplier_name || "B2B WHOLESALE MARKETPLACE", 50, 72);

        doc.fillColor("#ffffff").fontSize(12).font("Helvetica-Bold");
        doc.text(invoice.invoice_number || "INV-2026-000000", 350, 48, { align: "right", width: 195 });

        doc.fontSize(8).font("Helvetica").fillColor("#cbd5e1");
        const issueDateStr = invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN");
        doc.text(`Issue Date: ${issueDateStr}`, 350, 68, { align: "right", width: 195 });
        if (invoice.due_date) {
          const dueDateStr = new Date(invoice.due_date).toLocaleDateString("en-IN");
          doc.text(`Due Date: ${dueDateStr}`, 350, 80, { align: "right", width: 195 });
        }

        // ----------------------------------------------------
        // SUPPLIER & BUYER INFORMATION
        // ----------------------------------------------------
        let y = 115;

        // Supplier Box
        doc.rect(36, y, 255, 100).lineWidth(1).strokeColor("#e2e8f0").stroke();
        doc.rect(36, y, 255, 20).fill("#f8fafc");
        doc.fillColor("#334155").fontSize(9).font("Helvetica-Bold").text("SUPPLIER DETAILS (ISSUER)", 44, y + 5);

        doc.fillColor("#1e293b").fontSize(9).font("Helvetica-Bold").text(invoice.supplier_company || invoice.supplier_name || "Wholesaler", 44, y + 26);
        doc.fontSize(8).font("Helvetica").fillColor("#475569");
        doc.text(`GSTIN: ${invoice.supplier_gstin || "N/A"}`, 44, y + 40);
        doc.text(`Phone: ${invoice.supplier_phone || "N/A"}`, 44, y + 52);
        doc.text(`Email: ${invoice.supplier_email || "N/A"}`, 44, y + 64);
        if (invoice.supplier_upi_id) {
          doc.text(`UPI ID: ${invoice.supplier_upi_id}`, 44, y + 76);
        }

        // Buyer Box
        doc.rect(304, y, 255, 100).lineWidth(1).strokeColor("#e2e8f0").stroke();
        doc.rect(304, y, 255, 20).fill("#f8fafc");
        doc.fillColor("#334155").fontSize(9).font("Helvetica-Bold").text("BILLED TO (BUYER)", 312, y + 5);

        doc.fillColor("#1e293b").fontSize(9).font("Helvetica-Bold").text(invoice.buyer_company || invoice.buyer_name || "Retail Buyer", 312, y + 26);
        doc.fontSize(8).font("Helvetica").fillColor("#475569");
        doc.text(`GSTIN: ${invoice.buyer_gstin || "N/A"}`, 312, y + 40);
        doc.text(`Phone: ${invoice.buyer_phone || "N/A"}`, 312, y + 52);
        doc.text(`Email: ${invoice.buyer_email || "N/A"}`, 312, y + 64);
        // Named after what it actually is. Printing "Order Ref: #N/A" on a
        // bill raised from a recorded sale told the customer nothing.
        const sourceRef = invoice.sale_number
          ? `Sale Ref: ${invoice.sale_number}`
          : invoice.order_number
            ? `Order Ref: ${invoice.order_number}`
            : null;
        if (sourceRef) doc.text(sourceRef, 312, y + 76);

        // ----------------------------------------------------
        // PRODUCTS TABLE
        // ----------------------------------------------------
        y += 115;

        // Table Header
        doc.rect(36, y, 523, 22).fill("#0f172a");
        doc.fillColor("#ffffff").fontSize(8).font("Helvetica-Bold");

        doc.text("ITEM DESCRIPTION", 44, y + 6, { width: 170 });
        doc.text("HSN", 220, y + 6, { width: 45, align: "center" });
        doc.text("QTY", 270, y + 6, { width: 40, align: "center" });
        doc.text("UNIT PRICE", 315, y + 6, { width: 65, align: "right" });
        doc.text("GST %", 385, y + 6, { width: 45, align: "center" });
        doc.text("TAX", 435, y + 6, { width: 55, align: "right" });
        doc.text("TOTAL (INR)", 495, y + 6, { width: 55, align: "right" });

        y += 22;

        const items = invoice.items || [];
        items.forEach((item, index) => {
          const isEven = index % 2 === 0;
          if (isEven) {
            doc.rect(36, y, 523, 20).fill("#f8fafc");
          }

          doc.fillColor("#1e293b").fontSize(8).font("Helvetica");
          doc.text(item.product_name || "Product", 44, y + 5, { width: 170, height: 12, ellipsis: true });
          doc.text(item.hsn_code || "-", 220, y + 5, { width: 45, align: "center" });
          // Through Number first: the column is NUMERIC now, so pg hands back
          // "2.500" and the bill would read 2.500 metres.
          doc.text(String(Number(item.quantity)), 270, y + 5, { width: 40, align: "center" });
          doc.text(rupees(item.unit_price), 315, y + 5, { width: 65, align: "right" });
          doc.text(`${item.gst_percent || 18}%`, 385, y + 5, { width: 45, align: "center" });
          doc.text(rupees(item.tax_amount), 435, y + 5, { width: 55, align: "right" });
          doc.text(rupees(item.total), 495, y + 5, { width: 55, align: "right" });

          y += 20;
        });

        // Line separator
        doc.rect(36, y, 523, 1).fill("#cbd5e1");
        y += 10;

        // ----------------------------------------------------
        // FINANCIAL SUMMARY & BREAKDOWN
        // ----------------------------------------------------
        const summaryY = y;

        // Left Box: Terms, Signature & QR Code
        doc.fontSize(8).font("Helvetica-Bold").fillColor("#334155").text("TERMS & CONDITIONS", 36, summaryY);
        doc.fontSize(7).font("Helvetica").fillColor("#64748b");
        doc.text(invoice.terms_conditions || "1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged on overdue payments.", 36, summaryY + 12, { width: 200 });

        if (invoice.notes) {
          doc.fontSize(8).font("Helvetica-Bold").fillColor("#334155").text("NOTES", 36, summaryY + 55);
          doc.fontSize(7).font("Helvetica").fillColor("#64748b").text(invoice.notes, 36, summaryY + 67, { width: 200 });
        }

        // Embed QR Code if available
        if (qrDataUrl) {
          try {
            doc.image(qrDataUrl, 250, summaryY, { width: 65, height: 65 });
            doc.fontSize(6).font("Helvetica").fillColor("#64748b").text("Scan to Pay via UPI", 245, summaryY + 68, { width: 75, align: "center" });
          } catch (qrEmbedErr) {
            console.warn("Could not embed QR code image into PDF", qrEmbedErr.message);
          }
        }

        // Right Box: Totals Table
        const boxX = 330;
        let boxY = summaryY;

        const addTotalRow = (label, amount, isBold = false, isHighlight = false) => {
          if (isHighlight) {
            doc.rect(boxX, boxY, 229, 20).fill("#0f172a");
            doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(10);
          } else {
            doc.fillColor(isBold ? "#0f172a" : "#475569").font(isBold ? "Helvetica-Bold" : "Helvetica").fontSize(8);
          }
          doc.text(label, boxX + 10, boxY + (isHighlight ? 5 : 2));
          doc.text(rupees(amount), boxX + 110, boxY + (isHighlight ? 5 : 2), { align: "right", width: 110 });
          boxY += isHighlight ? 22 : 14;
        };

        addTotalRow("Subtotal:", invoice.subtotal || 0);
        if (Number(invoice.discount) > 0) addTotalRow("Discount:", -Number(invoice.discount));
        if (Number(invoice.shipping_charge) > 0) addTotalRow("Shipping Charge:", invoice.shipping_charge);
        addTotalRow("Taxable Amount:", invoice.taxable_amount || 0, true);

        if (Number(invoice.cgst) > 0) addTotalRow("CGST:", invoice.cgst);
        if (Number(invoice.sgst) > 0) addTotalRow("SGST:", invoice.sgst);
        if (Number(invoice.igst) > 0) addTotalRow("IGST:", invoice.igst);

        addTotalRow("Total Tax:", invoice.total_tax || 0);
        addTotalRow("GRAND TOTAL:", invoice.grand_total || 0, true, true);

        // ----------------------------------------------------
        // SIGNATURE & FOOTER & PAGE NUMBERS
        // ----------------------------------------------------
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
          doc.switchToPage(i);
          const footerY = 740;
          doc.rect(36, footerY, 523, 1).fill("#e2e8f0");

          doc.fontSize(8).font("Helvetica").fillColor("#64748b");
          doc.text("Thank you for your business!", 36, footerY + 10);
          doc.text("This is a computer-generated tax invoice. No signature required.", 36, footerY + 22);

          doc.fontSize(8).font("Helvetica-Bold").fillColor("#1e293b");
          doc.text("For " + (invoice.supplier_company || invoice.supplier_name || "Supplier"), 360, footerY + 10, { align: "right", width: 199 });
          doc.fontSize(7).font("Helvetica").fillColor("#94a3b8");
          doc.text("Authorized Signatory", 360, footerY + 32, { align: "right", width: 199 });

          // Page X of Y
          doc.fontSize(7).font("Helvetica").fillColor("#94a3b8").text(`Page ${i + 1} of ${range.count}`, 36, footerY + 32);
        }

        doc.end();
      } catch (err) {
        console.error("PDF Generation error:", err);
        if (res) res.status(500).send("Error generating PDF invoice");
        else reject(err);
      }
    });
  }

  /**
   * Generates an A4 credit note and streams it to an Express response, or
   * returns a Buffer.
   *
   * A document of its own rather than the invoice layout with a different
   * heading. Rule 53 wants a credit note to carry the serial number and date
   * of the invoice it credits, which a tax invoice has nowhere to put, and it
   * has no due date and nothing to pay, so the UPI QR and the payment
   * terms both come off.
   */
  async generateCreditNotePDF(note, res = null) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: "A4", margin: 36, bufferPages: true });
        const buffers = [];

        if (res) {
          res.setHeader("Content-Type", "application/pdf");
          res.setHeader(
            "Content-Disposition",
            `inline; filename=${note.note_number || "credit-note"}.pdf`,
          );
          doc.pipe(res);
          doc.on("end", () => resolve());
        } else {
          doc.on("data", (chunk) => buffers.push(chunk));
          doc.on("end", () => resolve(Buffer.concat(buffers)));
        }
        doc.on("error", (err) => reject(err));

        doc.save();
        doc.rotate(-45, { origin: [297, 421] });
        doc.fontSize(60).fillColor("#0284c7").fillOpacity(0.1);
        doc.text("CREDIT NOTE", 60, 380, { align: "center", width: 480 });
        doc.restore();
        doc.fillOpacity(1);

        doc.rect(36, 36, 523, 65).fill("#0f172a");
        doc.fillColor("#ffffff").fontSize(20).font("Helvetica-Bold");
        doc.text("CREDIT NOTE", 50, 48);
        doc.fontSize(9).font("Helvetica").fillColor("#94a3b8");
        doc.text(note.supplier_company || note.supplier_name || "Supplier", 50, 72);

        doc.fillColor("#ffffff").fontSize(12).font("Helvetica-Bold");
        doc.text(note.note_number || "CN-0000", 350, 48, { align: "right", width: 195 });
        doc.fontSize(8).font("Helvetica").fillColor("#cbd5e1");
        const issued = note.issue_date
          ? new Date(note.issue_date).toLocaleDateString("en-IN")
          : new Date().toLocaleDateString("en-IN");
        doc.text(`Date: ${issued}`, 350, 68, { align: "right", width: 195 });

        let y = 115;

        doc.rect(36, y, 255, 88).lineWidth(1).strokeColor("#e2e8f0").stroke();
        doc.rect(36, y, 255, 20).fill("#f8fafc");
        doc.fillColor("#334155").fontSize(9).font("Helvetica-Bold").text("ISSUED BY", 44, y + 5);
        doc.fillColor("#1e293b").fontSize(9).font("Helvetica-Bold")
          .text(note.supplier_company || note.supplier_name || "Supplier", 44, y + 26);
        doc.fontSize(8).font("Helvetica").fillColor("#475569");
        doc.text(`GSTIN: ${note.supplier_gstin || "N/A"}`, 44, y + 40);
        doc.text(`Phone: ${note.supplier_phone || "N/A"}`, 44, y + 52);
        doc.text(`Email: ${note.supplier_email || "N/A"}`, 44, y + 64);

        doc.rect(304, y, 255, 88).lineWidth(1).strokeColor("#e2e8f0").stroke();
        doc.rect(304, y, 255, 20).fill("#f8fafc");
        doc.fillColor("#334155").fontSize(9).font("Helvetica-Bold").text("ISSUED TO", 312, y + 5);
        doc.fillColor("#1e293b").fontSize(9).font("Helvetica-Bold")
          .text(note.recipient_name || "Customer", 312, y + 26);
        doc.fontSize(8).font("Helvetica").fillColor("#475569");
        doc.text(`GSTIN: ${note.recipient_gstin || "N/A"}`, 312, y + 40);
        doc.text(`Phone: ${note.recipient_phone || "N/A"}`, 312, y + 52);
        doc.text(`City: ${note.recipient_city || "N/A"}`, 312, y + 64);

        // The particular a credit note exists to carry: which invoice it
        // reverses, and why. Rule 53 asks for the first; the second is what
        // makes it any use to either side at audit.
        y += 100;
        doc.rect(36, y, 523, 40).fill("#f0f9ff");
        doc.fillColor("#0c4a6e").fontSize(9).font("Helvetica-Bold");
        doc.text(
          `Against tax invoice ${note.invoice_number || "N/A"} dated ${
            note.invoice_date
              ? new Date(note.invoice_date).toLocaleDateString("en-IN")
              : "N/A"
          }`,
          44,
          y + 8,
        );
        doc.fontSize(8).font("Helvetica").fillColor("#075985");
        doc.text(
          `Reason: ${CREDIT_REASON_TEXT[note.reason] || "Not stated"}${
            note.reason_note ? `  (${note.reason_note})` : ""
          }`,
          44,
          y + 23,
          { width: 500, height: 12, ellipsis: true },
        );

        y += 55;

        doc.rect(36, y, 523, 22).fill("#0f172a");
        doc.fillColor("#ffffff").fontSize(8).font("Helvetica-Bold");
        doc.text("ITEM DESCRIPTION", 44, y + 6, { width: 170 });
        doc.text("HSN", 220, y + 6, { width: 45, align: "center" });
        doc.text("QTY", 270, y + 6, { width: 40, align: "center" });
        doc.text("RATE", 315, y + 6, { width: 65, align: "right" });
        doc.text("GST %", 385, y + 6, { width: 45, align: "center" });
        doc.text("TAX", 435, y + 6, { width: 55, align: "right" });
        doc.text("TOTAL (INR)", 495, y + 6, { width: 55, align: "right" });
        y += 22;

        (note.items || []).forEach((item, index) => {
          if (index % 2 === 0) doc.rect(36, y, 523, 20).fill("#f8fafc");
          doc.fillColor("#1e293b").fontSize(8).font("Helvetica");
          doc.text(item.item_name || "Item", 44, y + 5, { width: 170, height: 12, ellipsis: true });
          doc.text(item.hsn_code || "-", 220, y + 5, { width: 45, align: "center" });
          doc.text(
            `${Number(item.quantity)}${item.unit ? ` ${item.unit}` : ""}`,
            270, y + 5, { width: 40, align: "center" },
          );
          doc.text(rupees(item.unit_price), 315, y + 5, { width: 65, align: "right" });
          doc.text(`${Number(item.gst_percent)}%`, 385, y + 5, { width: 45, align: "center" });
          doc.text(rupees(item.tax_amount), 435, y + 5, { width: 55, align: "right" });
          doc.text(rupees(item.total), 495, y + 5, { width: 55, align: "right" });
          y += 20;
        });

        doc.rect(36, y, 523, 1).fill("#cbd5e1");
        y += 10;

        const boxX = 330;
        let boxY = y;
        const addRow = (label, amount, isBold = false, isHighlight = false) => {
          if (isHighlight) {
            doc.rect(boxX, boxY, 229, 20).fill("#0f172a");
            doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(10);
          } else {
            doc.fillColor(isBold ? "#0f172a" : "#475569")
              .font(isBold ? "Helvetica-Bold" : "Helvetica").fontSize(8);
          }
          doc.text(label, boxX + 10, boxY + (isHighlight ? 5 : 2));
          doc.text(rupees(amount), boxX + 110, boxY + (isHighlight ? 5 : 2), {
            align: "right", width: 110,
          });
          boxY += isHighlight ? 22 : 14;
        };

        addRow("Taxable value credited:", note.taxable_amount || 0, true);
        if (Number(note.cgst) > 0) addRow("CGST:", note.cgst);
        if (Number(note.sgst) > 0) addRow("SGST:", note.sgst);
        if (Number(note.igst) > 0) addRow("IGST:", note.igst);
        addRow("Total tax credited:", note.total_tax || 0);
        addRow("TOTAL CREDITED:", note.grand_total || 0, true, true);

        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
          doc.switchToPage(i);
          const footerY = 740;
          doc.rect(36, footerY, 523, 1).fill("#e2e8f0");
          doc.fontSize(8).font("Helvetica").fillColor("#64748b");
          doc.text(
            "This credit note reverses the tax invoice named above. Keep it with that invoice.",
            36, footerY + 10,
          );
          doc.text("This is a computer-generated document. No signature required.", 36, footerY + 22);
          doc.fontSize(8).font("Helvetica-Bold").fillColor("#1e293b");
          doc.text(
            "For " + (note.supplier_company || note.supplier_name || "Supplier"),
            360, footerY + 10, { align: "right", width: 199 },
          );
          doc.fontSize(7).font("Helvetica").fillColor("#94a3b8");
          doc.text("Authorized Signatory", 360, footerY + 32, { align: "right", width: 199 });
          doc.text(`Page ${i + 1} of ${range.count}`, 36, footerY + 32);
        }

        doc.end();
      } catch (err) {
        console.error("Credit note PDF generation error:", err);
        if (res) res.status(500).send("Error generating credit note");
        else reject(err);
      }
    });
  }

  /**
   * Generates the PDF and caches it on disk.
   *
   * Deliberately NOT under uploads/, which app.js serves statically: invoice
   * numbers are sequential, so a public uploads/invoices/INV-2026-000007.pdf
   * lets anyone walk the whole ledger and read buyer names, GSTINs and
   * amounts. The cache lives in a private directory and is only ever handed
   * out through the authorized /api/invoices routes.
   */
  async generateAndSaveInvoicePDF(invoice) {
    const pdfBuffer = await this.generateInvoicePDF(invoice);

    const cacheDir = path.join(__dirname, "..", "..", "storage", "invoices");
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // The invoice number reaches the filesystem, so keep it to characters that
    // cannot escape the directory.
    const safeName = String(invoice.invoice_number || invoice.id).replace(
      /[^A-Za-z0-9._-]/g,
      "_",
    );
    const absolutePath = path.join(cacheDir, `${safeName}.pdf`);

    fs.writeFileSync(absolutePath, pdfBuffer);

    // The download URL stays an API route, which checks who is asking.
    const downloadUrl = `/api/invoices/${invoice.id}/pdf`;
    await invoiceRepository.updateInvoice(invoice.id, {
      pdf_path: absolutePath,
      pdf_url: downloadUrl,
    });

    return { pdfBuffer, relativePath: downloadUrl, absolutePath };
  }
}

module.exports = new PDFService();
