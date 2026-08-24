const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");
const invoiceRepository = require("../repositories/invoiceRepository");

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
        } else {
          doc.on("data", (chunk) => buffers.push(chunk));
          doc.on("end", () => resolve(Buffer.concat(buffers)));
        }

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
        doc.text(`Order Ref: ${invoice.order_number || `#${invoice.order_id || 'N/A'}`}`, 312, y + 76);

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
          doc.text(item.hsn_code || "8504", 220, y + 5, { width: 45, align: "center" });
          // Through Number first: the column is NUMERIC now, so pg hands back
          // "2.500" and the bill would read 2.500 metres.
          doc.text(String(Number(item.quantity)), 270, y + 5, { width: 40, align: "center" });
          doc.text(`₹${Number(item.unit_price).toFixed(2)}`, 315, y + 5, { width: 65, align: "right" });
          doc.text(`${item.gst_percent || 18}%`, 385, y + 5, { width: 45, align: "center" });
          doc.text(`₹${Number(item.tax_amount).toFixed(2)}`, 435, y + 5, { width: 55, align: "right" });
          doc.text(`₹${Number(item.total).toFixed(2)}`, 495, y + 5, { width: 55, align: "right" });

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
          doc.text(`₹${Number(amount).toFixed(2)}`, boxX + 110, boxY + (isHighlight ? 5 : 2), { align: "right", width: 110 });
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
