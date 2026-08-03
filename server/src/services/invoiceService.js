const pool = require("../config/db");
const invoiceRepository = require("../repositories/invoiceRepository");
const invoiceNumberService = require("./invoiceNumberService");
const gstService = require("./gstService");
const pdfService = require("./pdfService");
const emailService = require("./emailService");

class InvoiceService {
  /**
   * Automatically creates an invoice record from an existing order upon order confirmation or payment completion.
   */
  async createInvoiceFromOrder(orderId, externalClient = null) {
    // Check if invoice already exists for this order
    const existing = await invoiceRepository.findInvoiceByOrderId(orderId);
    if (existing) {
      return existing;
    }

    const client = externalClient || (await pool.connect());
    const shouldManageTransaction = !externalClient;

    try {
      if (shouldManageTransaction) await client.query("BEGIN");

      // Fetch order metadata along with buyer and supplier profiles
      const orderQuery = `
        SELECT 
          o.id, o.order_number, o.buyer_id, o.supplier_id, o.total_amount,
          o.subtotal, o.status, o.payment_status, o.created_at, o.delivery_address,
          bu.first_name AS buyer_first_name, bu.last_name AS buyer_last_name, bu.email AS buyer_email,
          bwp.company_name AS buyer_company, bwp.gstin AS buyer_gstin, bwp.city AS buyer_city,
          su.first_name AS supplier_first_name, su.last_name AS supplier_last_name, su.email AS supplier_email,
          swp.company_name AS supplier_company, swp.gstin AS supplier_gstin, swp.upi_id AS supplier_upi_id,
          COALESCE(NULLIF(swp.warehouse_state, ''), swp.warehouse_city, swp.city) AS supplier_city
        FROM orders o
        JOIN users bu ON o.buyer_id = bu.id
        LEFT JOIN wholesaler_profiles bwp ON bu.id = bwp.user_id
        JOIN users su ON o.supplier_id = su.id
        LEFT JOIN wholesaler_profiles swp ON su.id = swp.user_id
        WHERE o.id = $1
      `;
      const orderResult = await client.query(orderQuery, [orderId]);
      if (orderResult.rows.length === 0) {
        throw new Error("Order not found for automatic invoice creation");
      }
      const order = orderResult.rows[0];

      // Fetch order line items
      const itemsQuery = `
        SELECT 
          oi.product_id, oi.product_name, oi.quantity, oi.unit_price, oi.total_price
        FROM order_items oi
        WHERE oi.order_id = $1
      `;
      const itemsResult = await client.query(itemsQuery, [orderId]);
      const orderItems = itemsResult.rows;

      // Calculate GST breakdown using GSTService
      const supplierLocation = order.supplier_city || "Delhi";
      const buyerLocation = order.buyer_city || "Delhi";

      // The seller's own defaults, falling back to platform values.
      const settings = await invoiceRepository.getSettings(order.supplier_id);

      const gstCalculation = gstService.calculateGST({
        items: orderItems.map((item) => ({
          productId: item.product_id,
          productName: item.product_name,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          gstPercent: settings.defaultTaxRate,
          hsnCode: "8504",
        })),
        discount: 0.00,
        shippingCharge: 0.00,
        supplierLocation,
        buyerLocation,
        isTaxInclusive: false,
      });

      // Generate sequential invoice number (PREFIX-YYYY-XXXXXX)
      const invoiceNumber = await invoiceNumberService.generateInvoiceNumber(
        client,
        settings.prefix,
      );

      const issueDate = new Date();
      const dueDate = new Date();
      dueDate.setDate(issueDate.getDate() + settings.dueDays);

      // Determine initial invoice and payment status
      const initialPaymentStatus = order.payment_status === "paid" || order.payment_status === "completed" ? "Paid" : "Pending";
      const initialInvoiceStatus = initialPaymentStatus === "Paid" ? "Paid" : "Generated";

      const invoiceData = {
        invoiceNumber,
        orderId: order.id,
        buyerId: order.buyer_id,
        supplierId: order.supplier_id,
        subtotal: gstCalculation.subtotal,
        discount: gstCalculation.discount,
        shippingCharge: gstCalculation.shippingCharge,
        taxableAmount: gstCalculation.taxableAmount,
        cgst: gstCalculation.cgst,
        sgst: gstCalculation.sgst,
        igst: gstCalculation.igst,
        totalTax: gstCalculation.totalTax,
        grandTotal: gstCalculation.grandTotal,
        paymentStatus: initialPaymentStatus,
        invoiceStatus: initialInvoiceStatus,
        issueDate,
        dueDate,
        notes: `Invoice generated for Order ${order.order_number || order.id}`,
        termsConditions: settings.defaultTerms,
        pdfUrl: `/api/invoices/by-order/${order.id}/pdf`,
      };

      const createdInvoice = await invoiceRepository.createInvoice(
        invoiceData,
        gstCalculation.items,
        client
      );

      // Log invoice creation
      await invoiceRepository.addLog(
        {
          invoiceId: createdInvoice.id,
          action: "Created",
          performedBy: order.buyer_id,
          details: `Invoice ${invoiceNumber} created automatically from Order ${order.order_number || order.id}`,
        },
        client
      );

      // If already paid, record initial payment entry
      if (initialPaymentStatus === "Paid") {
        await invoiceRepository.addPayment(
          {
            invoiceId: createdInvoice.id,
            amount: gstCalculation.grandTotal,
            paymentMethod: "UPI",
            remarks: "Initial payment completed at checkout",
          },
          client
        );

        await invoiceRepository.addLog(
          {
            invoiceId: createdInvoice.id,
            action: "Paid",
            performedBy: order.buyer_id,
            details: `Invoice marked as Paid via initial checkout transaction`,
          },
          client
        );
      }

      if (shouldManageTransaction) await client.query("COMMIT");

      // Generate & Cache PDF on disk, then send invoice email asynchronously
      this.generateAndSendInvoiceEmailAsync(createdInvoice.id, order.buyer_email);

      return createdInvoice;
    } catch (error) {
      if (shouldManageTransaction) await client.query("ROLLBACK");
      console.error("Error creating invoice from order:", error);
      throw error;
    } finally {
      if (shouldManageTransaction) client.release();
    }
  }

  /**
   * Helper to generate PDF and dispatch email in background without blocking API response.
   */
  async generateAndSendInvoiceEmailAsync(invoiceId, targetEmail = null) {
    try {
      const fullInvoice = await invoiceRepository.findInvoiceById(invoiceId);
      if (!fullInvoice) return;

      const { pdfBuffer } = await pdfService.generateAndSaveInvoicePDF(fullInvoice);
      await invoiceRepository.addLog({
        invoiceId,
        action: "PDF Generated",
        performedBy: fullInvoice.buyer_id,
        details: `PDF generated and cached at ${fullInvoice.pdf_path || `/uploads/invoices/${fullInvoice.invoice_number}.pdf`}`,
      });

      const recipient = targetEmail || fullInvoice.buyer_email;
      if (recipient) {
        await emailService.sendInvoiceEmailWithRetry({
          invoice: fullInvoice,
          pdfBuffer,
          recipientEmail: recipient,
          performedBy: fullInvoice.buyer_id,
        });
      }
    } catch (err) {
      console.error("Background PDF/Email generation failed for invoice:", invoiceId, err.message);
    }
  }

  /**
   * Allows suppliers to create manual custom invoices.
   */
  async createManualInvoice(payload, supplierId) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const { buyerId, items = [], discount = 0, shippingCharge = 0, notes, termsConditions, dueDate } = payload;
      if (!buyerId || items.length === 0) {
        throw new Error("Buyer ID and at least one item are required.");
      }

      const buyerQuery = await client.query(
        `SELECT u.id, u.email, wp.city FROM users u LEFT JOIN wholesaler_profiles wp ON u.id = wp.user_id WHERE u.id = $1`,
        [buyerId]
      );
      if (buyerQuery.rows.length === 0) throw new Error("Buyer user not found.");
      const buyerUser = buyerQuery.rows[0];

      const supplierQuery = await client.query(
        `SELECT COALESCE(NULLIF(wp.warehouse_state, ''), wp.warehouse_city, wp.city) AS city
         FROM wholesaler_profiles wp WHERE wp.user_id = $1`,
        [supplierId]
      );

      const supplierCity = supplierQuery.rows[0]?.city || "Delhi";
      const buyerCity = buyerUser.city || "Delhi";

      const settings = await invoiceRepository.getSettings(supplierId);

      const gstCalculation = gstService.calculateGST({
        items: items.map((item) => ({
          ...item,
          gstPercent: item.gstPercent ?? settings.defaultTaxRate,
        })),
        discount,
        shippingCharge,
        supplierLocation: supplierCity,
        buyerLocation: buyerCity,
      });

      const invoiceNumber = await invoiceNumberService.generateInvoiceNumber(
        client,
        settings.prefix,
      );

      const invoiceData = {
        invoiceNumber,
        orderId: null,
        buyerId,
        supplierId,
        subtotal: gstCalculation.subtotal,
        discount: gstCalculation.discount,
        shippingCharge: gstCalculation.shippingCharge,
        taxableAmount: gstCalculation.taxableAmount,
        cgst: gstCalculation.cgst,
        sgst: gstCalculation.sgst,
        igst: gstCalculation.igst,
        totalTax: gstCalculation.totalTax,
        grandTotal: gstCalculation.grandTotal,
        paymentStatus: "Pending",
        invoiceStatus: "Generated",
        issueDate: new Date(),
        dueDate: dueDate
          ? new Date(dueDate)
          : new Date(Date.now() + settings.dueDays * 86400000),
        notes: notes || settings.defaultNotes,
        termsConditions: termsConditions || settings.defaultTerms,
      };

      const invoice = await invoiceRepository.createInvoice(invoiceData, gstCalculation.items, client);

      await invoiceRepository.addLog(
        {
          invoiceId: invoice.id,
          action: "Created",
          performedBy: supplierId,
          details: `Manual invoice ${invoiceNumber} created by supplier`,
        },
        client
      );

      await client.query("COMMIT");

      // Generate PDF & Dispatch email in background
      this.generateAndSendInvoiceEmailAsync(invoice.id, buyerUser.email);

      return invoice;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Retrieves an invoice by ID with authorization verification.
   */
  async getInvoiceById(id, userId, role) {
    const invoice = await invoiceRepository.findInvoiceById(id);
    if (!invoice) throw new Error("Invoice not found.");

    // Authorization: Admin or owning Buyer/Supplier
    if (role !== "admin" && invoice.buyer_id !== userId && invoice.supplier_id !== userId) {
      throw new Error("Access Denied: You do not have permission to view this invoice.");
    }

    return invoice;
  }

  /**
   * Resolves the invoice for an order, creating it on first access.
   *
   * The order is authorized before anything is created or returned: the order
   * id alone is not a capability, so only its buyer, its supplier or an admin
   * gets past this point.
   */
  async getInvoiceForOrder(orderId, userId, role) {
    const orderResult = await pool.query(
      `SELECT buyer_id, supplier_id FROM orders WHERE id = $1`,
      [orderId],
    );
    if (orderResult.rows.length === 0) throw new Error("Order not found.");

    const order = orderResult.rows[0];
    if (role !== "admin" && order.buyer_id !== userId && order.supplier_id !== userId) {
      throw new Error("Access Denied: You do not have permission to view this order's invoice.");
    }

    const existing = await invoiceRepository.findInvoiceByOrderId(orderId);
    if (existing) return existing;

    return this.createInvoiceFromOrder(orderId);
  }

  /**
   * Search, filter, and paginate invoices.
   */
  async getInvoices(queryParams, userId, role) {
    return invoiceRepository.findInvoices({ ...queryParams, userId, role });
  }

  /**
   * Records a full or partial payment against an invoice.
   */
  async recordPayment(invoiceId, paymentPayload, userId, role) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const invoice = await invoiceRepository.findInvoiceById(invoiceId);
      if (!invoice) throw new Error("Invoice not found.");

      if (role !== "admin" && invoice.supplier_id !== userId && invoice.buyer_id !== userId) {
        throw new Error("Access Denied: Unauthorized to record payment for this invoice.");
      }

      const amountPaid = Number(paymentPayload.amount);
      if (isNaN(amountPaid) || amountPaid <= 0) {
        throw new Error("Payment amount must be a positive number.");
      }

      // Calculate total payments made so far
      const currentPaid = (invoice.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
      const newTotalPaid = currentPaid + amountPaid;
      const grandTotal = Number(invoice.grand_total);

      let newPaymentStatus = "Pending";
      let newInvoiceStatus = invoice.invoice_status;

      if (newTotalPaid >= grandTotal) {
        newPaymentStatus = "Paid";
        newInvoiceStatus = "Paid";
      } else if (newTotalPaid > 0) {
        newPaymentStatus = "Partial";
        newInvoiceStatus = "Partial Paid";
      }

      // Add payment entry
      const payment = await invoiceRepository.addPayment(
        {
          invoiceId,
          amount: amountPaid,
          paymentMethod: paymentPayload.paymentMethod || "UPI",
          transactionId: paymentPayload.transactionId || null,
          paymentReference: paymentPayload.paymentReference || null,
          remarks: paymentPayload.remarks || null,
        },
        client
      );

      // Update invoice payment and invoice status
      const updatedInvoice = await invoiceRepository.updateInvoice(
        invoiceId,
        {
          payment_status: newPaymentStatus,
          invoice_status: newInvoiceStatus,
        },
        client
      );

      // Also update linked Order payment_status if invoice is fully paid
      if (invoice.order_id && newPaymentStatus === "Paid") {
        await client.query(
          `UPDATE orders SET payment_status = 'paid', status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [invoice.order_id]
        );
      }

      // Log activity
      await invoiceRepository.addLog(
        {
          invoiceId,
          action: "Paid",
          performedBy: userId,
          details: `Recorded payment of ₹${amountPaid.toFixed(2)} via ${paymentPayload.paymentMethod || "UPI"}. Total paid: ₹${newTotalPaid.toFixed(2)} / ₹${grandTotal.toFixed(2)}`,
        },
        client
      );

      await client.query("COMMIT");

      // Re-generate PDF on disk to reflect PAID watermark & status
      this.generateAndSendInvoiceEmailAsync(invoiceId, null);

      return { invoice: updatedInvoice, payment, newPaymentStatus, newInvoiceStatus, totalPaid: newTotalPaid };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Dispatches invoice PDF via email manually upon request.
   */
  async sendInvoiceEmail(invoiceId, userId, role, recipientEmail = null) {
    const invoice = await this.getInvoiceById(invoiceId, userId, role);
    const { pdfBuffer } = await pdfService.generateAndSaveInvoicePDF(invoice);

    const targetEmail = recipientEmail || invoice.buyer_email;
    const result = await emailService.sendInvoiceEmailWithRetry({
      invoice,
      pdfBuffer,
      recipientEmail: targetEmail,
      performedBy: userId,
    });

    return { success: true, message: `Invoice email sent to ${targetEmail}`, result };
  }

  /**
   * Logs payment reminder sending.
   */
  async sendPaymentReminder(invoiceId, userId, role) {
    const invoice = await this.getInvoiceById(invoiceId, userId, role);
    const { pdfBuffer } = await pdfService.generateAndSaveInvoicePDF(invoice);

    await emailService.sendInvoiceEmailWithRetry({
      invoice,
      pdfBuffer,
      recipientEmail: invoice.buyer_email,
      performedBy: userId,
    });

    await invoiceRepository.addLog({
      invoiceId,
      action: "Reminder Sent",
      performedBy: userId,
      details: `Payment reminder sent to buyer (${invoice.buyer_email}) for due date ${invoice.due_date}`,
    });

    return { success: true, message: `Payment reminder sent to ${invoice.buyer_email}` };
  }

  /**
   * Aggregates supplier/buyer dashboard metrics.
   */
  async getDashboardStats(userId, role, side) {
    return invoiceRepository.getDashboardStats(userId, role, side);
  }

  /**
   * Aggregates financial reports.
   */
  async getReportData(userId, role, startDate, endDate, side) {
    return invoiceRepository.getReportData(userId, role, startDate, endDate, side);
  }

  /**
   * Generates CSV format string for invoice exports.
   */
  async exportInvoicesCSV(userId, role, queryParams) {
    const data = await invoiceRepository.findInvoices({ ...queryParams, userId, role, page: 1, limit: 10000 });
    const headers = [
      "Invoice Number",
      "Issue Date",
      "Due Date",
      "Buyer Name",
      "Buyer GSTIN",
      "Supplier Name",
      "Supplier GSTIN",
      "Subtotal",
      "Total Tax",
      "Grand Total",
      "Payment Status",
      "Invoice Status",
    ];

    const rows = data.invoices.map((inv) => [
      inv.invoice_number,
      inv.issue_date ? new Date(inv.issue_date).toLocaleDateString() : "",
      inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "",
      `"${inv.buyer_name || ""}"`,
      `"${inv.buyer_gstin || ""}"`,
      `"${inv.supplier_name || ""}"`,
      `"${inv.supplier_gstin || ""}"`,
      inv.subtotal,
      inv.total_tax,
      inv.grand_total,
      inv.payment_status,
      inv.invoice_status,
    ]);

    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  }
}

module.exports = new InvoiceService();
