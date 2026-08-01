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
      let invoice = await invoiceRepository.findInvoiceByOrderId(req.params.orderId);
      if (!invoice) {
        // Automatically create invoice if missing for valid order
        invoice = await invoiceService.createInvoiceFromOrder(req.params.orderId);
      }
      res.json({ success: true, invoice });
    } catch (err) {
      console.error("Error fetching invoice by order:", err);
      res.status(500).json({ success: false, message: err.message || "Failed to fetch order invoice" });
    }
  }

  async getInvoicePDFByOrderId(req, res) {
    try {
      let invoice = await invoiceRepository.findInvoiceByOrderId(req.params.orderId);
      if (!invoice) {
        invoice = await invoiceService.createInvoiceFromOrder(req.params.orderId);
      }

      await invoiceRepository.addLog({
        invoiceId: invoice.id,
        action: "Downloaded",
        performedBy: req.user.id,
        details: `PDF downloaded for Order #${req.params.orderId}`,
      });

      await pdfService.generateInvoicePDF(invoice, res);
    } catch (err) {
      console.error("Error generating PDF by order ID:", err);
      res.status(500).json({ success: false, message: err.message || "Failed to generate invoice PDF" });
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

  async recordPayment(req, res) {
    try {
      const result = await invoiceService.recordPayment(req.params.id, req.body, req.user.id, req.user.role);
      res.json({ success: true, ...result });
    } catch (err) {
      console.error("Error recording payment:", err);
      res.status(400).json({ success: false, message: err.message || "Failed to record payment" });
    }
  }

  async getDashboardStats(req, res) {
    try {
      const stats = await invoiceService.getDashboardStats(req.user.id, req.user.role);
      res.json({ success: true, stats });
    } catch (err) {
      console.error("Error fetching invoice dashboard stats:", err);
      res.status(500).json({ success: false, message: err.message || "Failed to load dashboard metrics" });
    }
  }

  async getReportData(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const report = await invoiceService.getReportData(req.user.id, req.user.role, startDate, endDate);
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

  async getBuyers(req, res) {
    try {
      const buyers = await invoiceRepository.getBuyers();
      res.json({ success: true, buyers });
    } catch (err) {
      console.error("Error fetching buyers:", err);
      res.status(500).json({ success: false, message: "Failed to fetch buyers" });
    }
  }
}

module.exports = new InvoiceController();
