const pool = require("../config/db");
const invoiceService = require("../services/invoiceService");
const pdfService = require("../services/pdfService");
const invoiceRepository = require("../repositories/invoiceRepository");

class InvoiceController {
  async getInvoices(req, res) {
    try {
      const result = await invoiceService.getInvoices(req.query, req.user.id, req.user.role);
      res.json({ success: true, ...result });
    } catch (err) {
      console.error("Error fetching invoices:", err);
      res.status(500).json({ success: false, message: err.message || "Failed to fetch invoices" });
    }
  }

  async getInvoiceById(req, res) {
    try {
      const invoice = await invoiceService.getInvoiceById(req.params.id, req.user.id, req.user.role);
      res.json({ success: true, invoice });
    } catch (err) {
      console.error("Error fetching invoice details:", err);
      res.status(404).json({ success: false, message: err.message || "Invoice not found" });
    }
  }

  async getInvoicePDF(req, res) {
    try {
      const invoice = await invoiceService.getInvoiceById(req.params.id, req.user.id, req.user.role);
      
      // Log PDF download event
      await invoiceRepository.addLog({
        invoiceId: invoice.id,
        action: "Downloaded",
        performedBy: req.user.id,
        details: `PDF downloaded by ${req.user.role} (${req.user.email || req.user.id})`,
      });

      await pdfService.generateInvoicePDF(invoice, res);
    } catch (err) {
      console.error("Error generating invoice PDF:", err);
      res.status(500).json({ success: false, message: err.message || "Could not generate invoice PDF" });
    }
  }

  async getInvoiceByOrderId(req, res) {
    try {
      const invoice = await invoiceService.getInvoiceForOrder(
        req.params.orderId,
        req.user.id,
        req.user.role,
      );
      res.json({ success: true, invoice });
    } catch (err) {
      console.error("Error fetching invoice by order:", err);
      const denied = /access denied/i.test(err.message || "");
      res.status(denied ? 403 : 500).json({ success: false, message: err.message || "Failed to fetch order invoice" });
    }
  }

  async getInvoicePDFByOrderId(req, res) {
    try {
      const invoice = await invoiceService.getInvoiceForOrder(
        req.params.orderId,
        req.user.id,
        req.user.role,
      );

      await invoiceRepository.addLog({
        invoiceId: invoice.id,
        action: "Downloaded",
        performedBy: req.user.id,
        details: `PDF downloaded for Order #${req.params.orderId}`,
      });

      await pdfService.generateInvoicePDF(invoice, res);
    } catch (err) {
      console.error("Error generating PDF by order ID:", err);
      const denied = /access denied/i.test(err.message || "");
      res.status(denied ? 403 : 500).json({ success: false, message: err.message || "Failed to generate invoice PDF" });
    }
  }

  async createInvoice(req, res) {
    try {
      const invoice = await invoiceService.createManualInvoice(req.body, req.user.id);
      res.status(201).json({ success: true, invoice });
    } catch (err) {
      console.error("Error creating manual invoice:", err);
      res.status(400).json({ success: false, message: err.message || "Failed to create invoice" });
    }
  }

  async updateInvoice(req, res) {
    try {
      const invoice = await invoiceService.getInvoiceById(req.params.id, req.user.id, req.user.role);
      if (invoice.payment_status === "Paid" && req.user.role !== "admin") {
        return res.status(400).json({ success: false, message: "Paid invoices cannot be modified." });
      }

      const updated = await invoiceRepository.updateInvoice(req.params.id, req.body);
      
      await invoiceRepository.addLog({
        invoiceId: req.params.id,
        action: "Updated",
        performedBy: req.user.id,
        details: "Invoice header details updated",
      });

      res.json({ success: true, invoice: updated });
    } catch (err) {
      console.error("Error updating invoice:", err);
      res.status(400).json({ success: false, message: err.message || "Failed to update invoice" });
    }
  }

  async deleteInvoice(req, res) {
    try {
      const invoice = await invoiceService.getInvoiceById(req.params.id, req.user.id, req.user.role);
      
      await invoiceRepository.updateInvoice(req.params.id, {
        invoice_status: "Cancelled",
        payment_status: "Refunded",
      });

      await invoiceRepository.addLog({
        invoiceId: req.params.id,
        action: "Cancelled",
        performedBy: req.user.id,
        details: "Invoice cancelled",
      });

      res.json({ success: true, message: "Invoice marked as Cancelled" });
    } catch (err) {
      console.error("Error cancelling invoice:", err);
      res.status(400).json({ success: false, message: err.message || "Failed to cancel invoice" });
    }
  }

  async sendInvoice(req, res) {
    try {
      const result = await invoiceService.sendInvoiceEmail(req.params.id, req.user.id, req.user.role);
      res.json({ success: true, ...result });
    } catch (err) {
      console.error("Error sending invoice email:", err);
      res.status(500).json({ success: false, message: err.message || "Failed to send invoice email" });
    }
  }

  async sendReminder(req, res) {
    try {
      const result = await invoiceService.sendPaymentReminder(req.params.id, req.user.id, req.user.role);
      res.json({ success: true, ...result });
    } catch (err) {
      console.error("Error sending payment reminder:", err);
      res.status(500).json({ success: false, message: err.message || "Failed to send payment reminder" });
    }
  }

  /**
   * Money against a bill raised from a sale is recorded on the customer, not
   * here. Both used to be possible and they wrote to different tables, so a
   * bill could read Paid while the customer's balance still showed the whole
   * amount owing. This refuses rather than creating that split again.
   *
   * Marketplace invoices, which have no sale behind them, still use the old
   * path because the customer book knows nothing about them.
   */
  async recordPayment(req, res) {
    try {
      const owned = await pool.query(
        `SELECT i.sale_id, i.party_id, cn.note_number
           FROM invoices i
           LEFT JOIN credit_notes cn ON cn.invoice_id = i.id
          WHERE i.id = $1 AND i.supplier_id = $2`,
        [req.params.id, req.user.id],
      );
      // A reversed bill is not owed, so nothing can be received against it.
      if (owned.rows.length > 0 && owned.rows[0].note_number) {
        return res.status(400).json({
          success: false,
          message: `This bill was reversed by credit note ${owned.rows[0].note_number}, so nothing is owed on it.`,
        });
      }
      if (owned.rows.length > 0 && owned.rows[0].sale_id) {
        return res.status(400).json({
          success: false,
          message:
            "Record this payment on the customer's page. It updates their balance and this bill together.",
          partyId: owned.rows[0].party_id,
        });
      }

      const result = await invoiceService.recordPayment(req.params.id, req.body, req.user.id, req.user.role);
      res.json({ success: true, ...result });
    } catch (err) {
      console.error("Error recording payment:", err);
      res.status(400).json({ success: false, message: err.message || "Failed to record payment" });
    }
  }

  async getDashboardStats(req, res) {
    try {
      const stats = await invoiceService.getDashboardStats(req.user.id, req.user.role, req.query.side);
      res.json({ success: true, stats });
    } catch (err) {
      console.error("Error fetching invoice dashboard stats:", err);
      res.status(500).json({ success: false, message: err.message || "Failed to load dashboard metrics" });
    }
  }

  async getReportData(req, res) {
    try {
      const { startDate, endDate, side } = req.query;
      const report = await invoiceService.getReportData(req.user.id, req.user.role, startDate, endDate, side);
      res.json({ success: true, report });
    } catch (err) {
      console.error("Error fetching report data:", err);
      res.status(500).json({ success: false, message: err.message || "Failed to load report data" });
    }
  }

  async exportCSV(req, res) {
    try {
      const csv = await invoiceService.exportInvoicesCSV(req.user.id, req.user.role, req.query);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=invoices_export.csv");
      res.status(200).send(csv);
    } catch (err) {
      console.error("Error exporting CSV:", err);
      res.status(500).json({ success: false, message: "CSV export failed" });
    }
  }

  async exportExcel(req, res) {
    try {
      const csv = await invoiceService.exportInvoicesCSV(req.user.id, req.user.role, req.query);
      res.setHeader("Content-Type", "application/vnd.ms-excel");
      res.setHeader("Content-Disposition", "attachment; filename=invoices_export.xls");
      res.status(200).send(csv);
    } catch (err) {
      console.error("Error exporting Excel:", err);
      res.status(500).json({ success: false, message: "Excel export failed" });
    }
  }

  async exportPDF(req, res) {
    try {
      const data = await invoiceRepository.findInvoices({
        ...req.query,
        userId: req.user.id,
        role: req.user.role,
        page: 1,
        limit: 100,
      });

      const PDFDocument = require("pdfkit");
      const doc = new PDFDocument({ size: "A4", margin: 36 });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=invoices_summary_report.pdf");
      doc.pipe(res);

      doc.fontSize(16).font("Helvetica-Bold").text("INVOICES SUMMARY REPORT", { align: "center" });
      doc.fontSize(9).font("Helvetica").text(`Generated on: ${new Date().toLocaleString()}`, { align: "center" });
      doc.moveDown(1.5);

      data.invoices.forEach((inv, i) => {
        doc.fontSize(9).font("Helvetica-Bold").text(`${i + 1}. ${inv.invoice_number} | Buyer: ${inv.buyer_name}`);
        doc.fontSize(8).font("Helvetica").text(`   Date: ${inv.issue_date ? new Date(inv.issue_date).toLocaleDateString() : 'N/A'} | Status: ${inv.invoice_status} | Payment: ${inv.payment_status} | Total: ₹${Number(inv.grand_total).toFixed(2)}`);
        doc.moveDown(0.5);
      });

      doc.end();
    } catch (err) {
      console.error("Error exporting PDF report:", err);
      res.status(500).json({ success: false, message: "PDF report export failed" });
    }
  }

  async getSettings(req, res) {
    try {
      const settings = await invoiceRepository.getSettings(req.user.id);
      res.json({ success: true, settings });
    } catch (err) {
      console.error("Error fetching invoice settings:", err);
      res.status(500).json({ success: false, message: "Failed to load invoice settings" });
    }
  }

  async saveSettings(req, res) {
    try {
      const prefix = String(req.body.prefix || "INV").trim().slice(0, 10) || "INV";
      const dueDays = Number(req.body.dueDays);
      const defaultTaxRate = Number(req.body.defaultTaxRate);

      if (!Number.isFinite(dueDays) || dueDays < 0 || dueDays > 365) {
        return res.status(400).json({ success: false, message: "Payment due days must be between 0 and 365." });
      }
      if (!Number.isFinite(defaultTaxRate) || defaultTaxRate < 0 || defaultTaxRate > 100) {
        return res.status(400).json({ success: false, message: "GST rate must be between 0 and 100." });
      }

      const settings = await invoiceRepository.saveSettings(req.user.id, {
        prefix,
        dueDays: Math.round(dueDays),
        defaultTaxRate,
        defaultNotes: req.body.defaultNotes || null,
        defaultTerms: req.body.defaultTerms || null,
      });

      res.json({ success: true, settings });
    } catch (err) {
      console.error("Error saving invoice settings:", err);
      res.status(500).json({ success: false, message: "Failed to save invoice settings" });
    }
  }

  async getBuyers(req, res) {
    try {
      const buyers = await invoiceRepository.getBuyers(req.user.id);
      res.json({ success: true, buyers });
    } catch (err) {
      console.error("Error fetching buyers:", err);
      res.status(500).json({ success: false, message: "Failed to fetch buyers" });
    }
  }
}

module.exports = new InvoiceController();
