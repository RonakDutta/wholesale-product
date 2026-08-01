const pool = require("../config/db");

class InvoiceRepository {
  /**
   * Atomically fetches and increments the sequence number for a given calendar year.
   */
  async getNextSequenceNumber(client, year) {
    const dbClient = client || pool;
    const result = await dbClient.query(
      `INSERT INTO invoice_sequences (year, last_number)
       VALUES ($1, 1)
       ON CONFLICT (year)
       DO UPDATE SET last_number = invoice_sequences.last_number + 1
       RETURNING last_number`,
      [year]
    );
    return result.rows[0].last_number;
  }

  /**
   * Creates an invoice record with its line items inside a transaction.
   */
  async createInvoice(invoiceData, itemsData, client) {
    const dbClient = client || pool;

    const {
      invoiceNumber,
      orderId,
      buyerId,
      supplierId,
      subtotal,
      discount = 0.00,
      shippingCharge = 0.00,
      taxableAmount,
      cgst = 0.00,
      sgst = 0.00,
      igst = 0.00,
      totalTax = 0.00,
      grandTotal,
      paymentStatus = "Pending",
      invoiceStatus = "Generated",
      issueDate = new Date(),
      dueDate,
      notes = "Thank you for your business!",
      termsConditions = "Standard B2B wholesale payment terms apply.",
      pdfUrl = null,
    } = invoiceData;

    const invoiceResult = await dbClient.query(
      `INSERT INTO invoices (
        invoice_number, order_id, buyer_id, supplier_id,
        subtotal, discount, shipping_charge, taxable_amount,
        cgst, sgst, igst, total_tax, grand_total,
        payment_status, invoice_status, issue_date, due_date,
        notes, terms_conditions, pdf_url
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8,
        $9, $10, $11, $12, $13,
        $14, $15, $16, $17,
        $18, $19, $20
      ) RETURNING *`,
      [
        invoiceNumber,
        orderId,
        buyerId,
        supplierId,
        subtotal,
        discount,
        shippingCharge,
        taxableAmount,
        cgst,
        sgst,
        igst,
        totalTax,
        grandTotal,
        paymentStatus,
        invoiceStatus,
        issueDate,
        dueDate,
        notes,
        termsConditions,
        pdfUrl,
      ]
    );

    const invoice = invoiceResult.rows[0];

    const insertedItems = [];
    for (const item of itemsData) {
      const itemResult = await dbClient.query(
        `INSERT INTO invoice_items (
          invoice_id, product_id, product_name, hsn_code,
          quantity, unit_price, gst_percent, tax_amount, total
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          invoice.id,
          item.productId || null,
          item.productName,
          item.hsnCode || "8504",
          item.quantity,
          item.unitPrice,
          item.gstPercent || 18.00,
          item.taxAmount || 0.00,
          item.total,
        ]
      );
      insertedItems.push(itemResult.rows[0]);
    }

    return { ...invoice, items: insertedItems };
  }

  /**
   * Finds an invoice by its UUID ID along with item lines, payment records, logs, and party details.
   */
  async findInvoiceById(id) {
    const query = `
      SELECT 
        i.*,
        o.order_number,
        bu.first_name || ' ' || bu.last_name AS buyer_name,
        bu.email AS buyer_email,
        bu.phone AS buyer_phone,
        bwp.company_name AS buyer_company,
        bwp.gstin AS buyer_gstin,
        bwp.city AS buyer_city,
        bwp.country AS buyer_country,
        su.first_name || ' ' || su.last_name AS supplier_name,
        su.email AS supplier_email,
        su.phone AS supplier_phone,
        swp.company_name AS supplier_company,
        swp.gstin AS supplier_gstin,
        swp.upi_id AS supplier_upi_id,
        swp.city AS supplier_city,
        swp.country AS supplier_country
      FROM invoices i
      LEFT JOIN orders o ON i.order_id = o.id
      JOIN users bu ON i.buyer_id = bu.id
      LEFT JOIN wholesaler_profiles bwp ON bu.id = bwp.user_id
      JOIN users su ON i.supplier_id = su.id
      LEFT JOIN wholesaler_profiles swp ON su.id = swp.user_id
      WHERE i.id = $1
    `;
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) return null;

    const invoice = result.rows[0];

    // Fetch line items
    const itemsResult = await pool.query(
      `SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY id ASC`,
      [id]
    );
    invoice.items = itemsResult.rows;

    // Fetch payments
    const paymentsResult = await pool.query(
      `SELECT * FROM payments WHERE invoice_id = $1 ORDER BY paid_at DESC`,
      [id]
    );
    invoice.payments = paymentsResult.rows;

    // Fetch activity logs
    const logsResult = await pool.query(
      `SELECT il.*, u.first_name || ' ' || u.last_name AS performer_name
       FROM invoice_logs il
       LEFT JOIN users u ON il.performed_by = u.id
       WHERE il.invoice_id = $1 ORDER BY il.created_at DESC`,
      [id]
    );
    invoice.logs = logsResult.rows;

    return invoice;
  }

  /**
   * Finds an invoice associated with an order ID.
   */
  async findInvoiceByOrderId(orderId) {
    const result = await pool.query(
      `SELECT id FROM invoices WHERE order_id = $1 LIMIT 1`,
      [orderId]
    );
    if (result.rows.length === 0) return null;
    return this.findInvoiceById(result.rows[0].id);
  }

  /**
   * Search & filter invoices with role scoping and pagination.
   */
  async findInvoices({
    userId,
    role,
    search,
    invoiceStatus,
    paymentStatus,
    startDate,
    endDate,
    page = 1,
    limit = 10,
    sortBy = "created_at",
    sortOrder = "DESC",
  }) {
    const offset = (page - 1) * limit;
    const params = [];
    let paramIndex = 1;

    let whereClauses = [];

    if (role === "buyer") {
      whereClauses.push(`i.buyer_id = $${paramIndex++}`);
      params.push(userId);
    } else if (role === "seller" || role === "both") {
      whereClauses.push(`i.supplier_id = $${paramIndex++}`);
      params.push(userId);
    }

    if (search) {
      whereClauses.push(`(
        i.invoice_number ILIKE $${paramIndex} OR
        bu.first_name ILIKE $${paramIndex} OR
        bu.last_name ILIKE $${paramIndex} OR
        bwp.company_name ILIKE $${paramIndex} OR
        su.first_name ILIKE $${paramIndex} OR
        swp.company_name ILIKE $${paramIndex} OR
        bwp.gstin ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (invoiceStatus) {
      whereClauses.push(`i.invoice_status = $${paramIndex++}`);
      params.push(invoiceStatus);
    }

    if (paymentStatus) {
      whereClauses.push(`i.payment_status = $${paramIndex++}`);
      params.push(paymentStatus);
    }

    if (startDate) {
      whereClauses.push(`i.issue_date >= $${paramIndex++}`);
      params.push(startDate);
    }

    if (endDate) {
      whereClauses.push(`i.issue_date <= $${paramIndex++}`);
      params.push(endDate);
    }

    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM invoices i
      JOIN users bu ON i.buyer_id = bu.id
      LEFT JOIN wholesaler_profiles bwp ON bu.id = bwp.user_id
      JOIN users su ON i.supplier_id = su.id
      LEFT JOIN wholesaler_profiles swp ON su.id = swp.user_id
      ${whereString}
    `;

    const countResult = await pool.query(countQuery, params);
    const total = countResult.rows[0]?.total || 0;

    const allowedSortFields = ["created_at", "issue_date", "due_date", "grand_total", "invoice_number"];
    const validSortBy = allowedSortFields.includes(sortBy) ? `i.${sortBy}` : "i.created_at";
    const validSortOrder = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

    const dataQuery = `
      SELECT 
        i.id,
        i.invoice_number,
        i.order_id,
        i.buyer_id,
        i.supplier_id,
        i.subtotal,
        i.discount,
        i.shipping_charge,
        i.taxable_amount,
        i.total_tax,
        i.grand_total,
        i.payment_status,
        i.invoice_status,
        i.issue_date,
        i.due_date,
        i.pdf_url,
        i.created_at,
        COALESCE(bwp.company_name, bu.first_name || ' ' || bu.last_name) AS buyer_name,
        COALESCE(swp.company_name, su.first_name || ' ' || su.last_name) AS supplier_name,
        bwp.gstin AS buyer_gstin,
        swp.gstin AS supplier_gstin
      FROM invoices i
      JOIN users bu ON i.buyer_id = bu.id
      LEFT JOIN wholesaler_profiles bwp ON bu.id = bwp.user_id
      JOIN users su ON i.supplier_id = su.id
      LEFT JOIN wholesaler_profiles swp ON su.id = swp.user_id
      ${whereString}
      ORDER BY ${validSortBy} ${validSortOrder}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    params.push(limit, offset);
    const dataResult = await pool.query(dataQuery, params);

    return {
      invoices: dataResult.rows,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Updates an invoice record.
   */
  async updateInvoice(id, updateData, client) {
    const dbClient = client || pool;
    const fields = [];
    const values = [];
    let idx = 1;

    for (const [key, val] of Object.entries(updateData)) {
      fields.push(`${key} = $${idx++}`);
      values.push(val);
    }

    if (fields.length === 0) return this.findInvoiceById(id);

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `UPDATE invoices SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`;
    const result = await dbClient.query(query, values);
    return result.rows[0];
  }

  /**
   * Adds a payment record to an invoice.
   */
  async addPayment(paymentData, client) {
    const dbClient = client || pool;
    const { invoiceId, amount, paymentMethod, transactionId, paymentReference, remarks } = paymentData;

    const result = await dbClient.query(
      `INSERT INTO payments (
        invoice_id, amount, payment_method, transaction_id, payment_reference, remarks
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [invoiceId, amount, paymentMethod, transactionId || null, paymentReference || null, remarks || null]
    );

    return result.rows[0];
  }

  /**
   * Records an activity log for an invoice.
   */
  async addLog(logData, client) {
    const dbClient = client || pool;
    const { invoiceId, action, performedBy, details } = logData;

    const result = await dbClient.query(
      `INSERT INTO invoice_logs (invoice_id, action, performed_by, details)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [invoiceId, action, performedBy || null, details || null]
    );

    return result.rows[0];
  }

  /**
   * Aggregates ERP dashboard metrics (Total Revenue, Paid, Pending, Overdue, GST, Charts).
   */
  async getDashboardStats(userId, role) {
    const userClause = role === "buyer" ? "buyer_id = $1" : "supplier_id = $1";

    const statsQuery = `
      SELECT 
        COUNT(*)::int AS total_invoices,
        COALESCE(SUM(grand_total), 0)::numeric(12,2) AS total_revenue,
        COALESCE(SUM(CASE WHEN payment_status = 'Paid' THEN grand_total ELSE 0 END), 0)::numeric(12,2) AS paid_amount,
        COALESCE(SUM(CASE WHEN payment_status IN ('Pending', 'Partial') THEN grand_total ELSE 0 END), 0)::numeric(12,2) AS pending_amount,
        COALESCE(SUM(CASE WHEN payment_status = 'Pending' AND due_date < CURRENT_DATE THEN grand_total ELSE 0 END), 0)::numeric(12,2) AS overdue_amount,
        COALESCE(SUM(CASE WHEN payment_status = 'Refunded' THEN grand_total ELSE 0 END), 0)::numeric(12,2) AS refunded_amount,
        COALESCE(SUM(total_tax), 0)::numeric(12,2) AS total_gst_collected,
        COUNT(CASE WHEN payment_status = 'Paid' THEN 1 END)::int AS paid_count,
        COUNT(CASE WHEN payment_status = 'Pending' THEN 1 END)::int AS pending_count,
        COUNT(CASE WHEN payment_status = 'Pending' AND due_date < CURRENT_DATE THEN 1 END)::int AS overdue_count
      FROM invoices
      WHERE ${userClause}
    `;

    const statsResult = await pool.query(statsQuery, [userId]);
    const metrics = statsResult.rows[0];

    // Monthly revenue trend (last 6 months)
    const trendQuery = `
      SELECT 
        TO_CHAR(issue_date, 'Mon YYYY') AS month,
        DATE_TRUNC('month', issue_date) AS month_date,
        COALESCE(SUM(grand_total), 0)::numeric(12,2) AS revenue,
        COALESCE(SUM(total_tax), 0)::numeric(12,2) AS gst
      FROM invoices
      WHERE ${userClause} AND issue_date >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY TO_CHAR(issue_date, 'Mon YYYY'), DATE_TRUNC('month', issue_date)
      ORDER BY month_date ASC
    `;
    const trendResult = await pool.query(trendQuery, [userId]);

    // Status distribution
    const statusQuery = `
      SELECT 
        invoice_status AS status,
        COUNT(*)::int AS count,
        COALESCE(SUM(grand_total), 0)::numeric(12,2) AS amount
      FROM invoices
      WHERE ${userClause}
      GROUP BY invoice_status
    `;
    const statusResult = await pool.query(statusQuery, [userId]);

    // Top Buyers / Suppliers
    const topPartiesQuery = role === "buyer"
      ? `
        SELECT 
          swp.company_name AS party_name,
          COUNT(i.id)::int AS invoice_count,
          COALESCE(SUM(i.grand_total), 0)::numeric(12,2) AS total_amount
        FROM invoices i
        JOIN users su ON i.supplier_id = su.id
        LEFT JOIN wholesaler_profiles swp ON su.id = swp.user_id
        WHERE i.buyer_id = $1
        GROUP BY swp.company_name
        ORDER BY total_amount DESC
        LIMIT 5
      `
      : `
        SELECT 
          COALESCE(bwp.company_name, bu.first_name || ' ' || bu.last_name) AS party_name,
          COUNT(i.id)::int AS invoice_count,
          COALESCE(SUM(i.grand_total), 0)::numeric(12,2) AS total_amount
        FROM invoices i
        JOIN users bu ON i.buyer_id = bu.id
        LEFT JOIN wholesaler_profiles bwp ON bu.id = bwp.user_id
        WHERE i.supplier_id = $1
        GROUP BY bwp.company_name, bu.first_name, bu.last_name
        ORDER BY total_amount DESC
        LIMIT 5
      `;

    const topPartiesResult = await pool.query(topPartiesQuery, [userId]);

    return {
      summary: metrics,
      revenueTrend: trendResult.rows,
      statusDistribution: statusResult.rows,
      topParties: topPartiesResult.rows,
    };
  }

  /**
   * Aggregates financial reports (GST breakdown, Outstanding, Invoice aging).
   */
  async getReportData(userId, role, startDate, endDate) {
    const userClause = role === "buyer" ? "i.buyer_id = $1" : "i.supplier_id = $1";
    const params = [userId];

    let dateClause = "";
    if (startDate && endDate) {
      dateClause = " AND i.issue_date BETWEEN $2 AND $3";
      params.push(startDate, endDate);
    }

    const gstSummaryQuery = `
      SELECT 
        COALESCE(SUM(taxable_amount), 0)::numeric(12,2) AS total_taxable,
        COALESCE(SUM(cgst), 0)::numeric(12,2) AS total_cgst,
        COALESCE(SUM(sgst), 0)::numeric(12,2) AS total_sgst,
        COALESCE(SUM(igst), 0)::numeric(12,2) AS total_igst,
        COALESCE(SUM(total_tax), 0)::numeric(12,2) AS total_gst,
        COALESCE(SUM(grand_total), 0)::numeric(12,2) AS total_grand
      FROM invoices i
      WHERE ${userClause}${dateClause}
    `;
    const gstSummary = (await pool.query(gstSummaryQuery, params)).rows[0];

    const agingQuery = `
      SELECT 
        CASE 
          WHEN CURRENT_DATE - due_date <= 0 THEN 'Current (Not Due)'
          WHEN CURRENT_DATE - due_date BETWEEN 1 AND 30 THEN '1-30 Days Overdue'
          WHEN CURRENT_DATE - due_date BETWEEN 31 AND 60 THEN '31-60 Days Overdue'
          WHEN CURRENT_DATE - due_date BETWEEN 61 AND 90 THEN '61-90 Days Overdue'
          ELSE '90+ Days Overdue'
        END AS aging_bucket,
        COUNT(*)::int AS count,
        COALESCE(SUM(grand_total), 0)::numeric(12,2) AS amount
      FROM invoices i
      WHERE ${userClause} AND payment_status != 'Paid'
      GROUP BY aging_bucket
    `;
    const agingReport = (await pool.query(agingQuery, [userId])).rows;

    return {
      gstSummary,
      agingReport,
    };
  }

  async getBuyers() {
    const result = await pool.query(
      `SELECT 
        u.id, 
        u.email, 
        u.first_name, 
        u.last_name, 
        COALESCE(wp.company_name, u.first_name || ' ' || u.last_name) AS company_name
       FROM users u
       LEFT JOIN wholesaler_profiles wp ON u.id = wp.user_id
       WHERE u.role IN ('buyer', 'both')
       ORDER BY u.created_at DESC`
    );
    return result.rows;
  }
}

module.exports = new InvoiceRepository();
