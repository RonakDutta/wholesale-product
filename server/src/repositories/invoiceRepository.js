const pool = require("../config/db");

let schemaEnsured = false;

async function ensureSchema(client = null) {
  if (schemaEnsured) return;
  const dbClient = client || pool;
  try {
    await dbClient.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      CREATE TABLE IF NOT EXISTS invoice_sequences (
          year INTEGER PRIMARY KEY,
          last_number INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS invoices (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          invoice_number VARCHAR(50) UNIQUE NOT NULL,
          order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
          buyer_id UUID REFERENCES users(id) ON DELETE CASCADE,
          supplier_id UUID REFERENCES users(id) ON DELETE CASCADE,
          subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
          discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
          shipping_charge NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
          taxable_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
          cgst NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
          sgst NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
          igst NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
          total_tax NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
          grand_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
          payment_status VARCHAR(50) DEFAULT 'Pending',
          invoice_status VARCHAR(50) DEFAULT 'Generated',
          issue_date DATE DEFAULT CURRENT_DATE,
          due_date DATE,
          notes TEXT,
          terms_conditions TEXT,
          pdf_path TEXT,
          pdf_url TEXT,
          email_sent BOOLEAN DEFAULT FALSE,
          email_sent_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS pdf_path TEXT;
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE;
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP;

      CREATE TABLE IF NOT EXISTS invoice_items (
          id SERIAL PRIMARY KEY,
          invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
          product_id UUID REFERENCES products(id) ON DELETE SET NULL,
          product_name VARCHAR(255) NOT NULL,
          hsn_code VARCHAR(50) DEFAULT '8504',
          quantity INTEGER NOT NULL CHECK (quantity > 0),
          unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
          gst_percent NUMERIC(5, 2) DEFAULT 18.00,
          tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
          total NUMERIC(12, 2) NOT NULL DEFAULT 0.00
      );

      CREATE TABLE IF NOT EXISTS payments (
          id SERIAL PRIMARY KEY,
          invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
          amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
          payment_method VARCHAR(50) NOT NULL,
          transaction_id VARCHAR(100),
          payment_reference VARCHAR(100),
          paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          remarks TEXT
      );

      CREATE TABLE IF NOT EXISTS invoice_logs (
          id SERIAL PRIMARY KEY,
          invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
          action VARCHAR(50) NOT NULL,
          performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
          recipient_email VARCHAR(255),
          smtp_response TEXT,
          error_logs TEXT,
          details TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_buyer_id ON invoices(buyer_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_supplier_id ON invoices(supplier_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
      CREATE INDEX IF NOT EXISTS idx_invoices_payment_status ON invoices(payment_status);
      CREATE INDEX IF NOT EXISTS idx_invoices_invoice_status ON invoices(invoice_status);
      CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
      CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
      CREATE INDEX IF NOT EXISTS idx_invoice_logs_invoice_id ON invoice_logs(invoice_id);
    `);
    schemaEnsured = true;
    console.log("Invoice tables and schema verified in PostgreSQL.");
  } catch (err) {
    console.error("Auto schema verification error:", err.message);
  }
}

class InvoiceRepository {
  /**
   * Atomically fetches and increments the sequence number for a given calendar year.
   */
  async getNextSequenceNumber(client, year) {
    await ensureSchema(client);
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
    await ensureSchema(client);
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
    await ensureSchema();
    const query = `
      SELECT 
        i.*,
        o.order_number,
        COALESCE(bu.first_name || ' ' || bu.last_name, 'Buyer') AS buyer_name,
        bu.email AS buyer_email,
        bu.phone AS buyer_phone,
        bwp.company_name AS buyer_company,
        bwp.gstin AS buyer_gstin,
        bwp.city AS buyer_city,
        bwp.country AS buyer_country,
        COALESCE(su.first_name || ' ' || su.last_name, 'Supplier') AS supplier_name,
        su.email AS supplier_email,
        su.phone AS supplier_phone,
        swp.company_name AS supplier_company,
        swp.gstin AS supplier_gstin,
        swp.upi_id AS supplier_upi_id,
        swp.city AS supplier_city,
        swp.country AS supplier_country
      FROM invoices i
      LEFT JOIN orders o ON i.order_id = o.id
      LEFT JOIN users bu ON i.buyer_id = bu.id
      LEFT JOIN wholesaler_profiles bwp ON bu.id = bwp.user_id
      LEFT JOIN users su ON i.supplier_id = su.id
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
    await ensureSchema();
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
    await ensureSchema();
    try {
      const offset = (page - 1) * limit;
      const params = [];
      let paramIndex = 1;

      let whereClauses = [];

      const normRole = String(role || "").toLowerCase();
      if (normRole === "buyer") {
        whereClauses.push(`i.buyer_id = $${paramIndex++}`);
        params.push(userId);
      } else if (normRole === "seller" || normRole === "supplier" || normRole === "wholesaler" || normRole === "both") {
        whereClauses.push(`i.supplier_id = $${paramIndex++}`);
        params.push(userId);
      } else if (normRole !== "admin") {
        whereClauses.push(`(i.buyer_id = $${paramIndex} OR i.supplier_id = $${paramIndex})`);
        params.push(userId);
        paramIndex++;
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
        LEFT JOIN users bu ON i.buyer_id = bu.id
        LEFT JOIN wholesaler_profiles bwp ON bu.id = bwp.user_id
        LEFT JOIN users su ON i.supplier_id = su.id
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
          COALESCE(bwp.company_name, bu.first_name || ' ' || bu.last_name, 'Buyer') AS buyer_name,
          COALESCE(swp.company_name, su.first_name || ' ' || su.last_name, 'Supplier') AS supplier_name,
          bwp.gstin AS buyer_gstin,
          swp.gstin AS supplier_gstin
        FROM invoices i
        LEFT JOIN users bu ON i.buyer_id = bu.id
        LEFT JOIN wholesaler_profiles bwp ON bu.id = bwp.user_id
        LEFT JOIN users su ON i.supplier_id = su.id
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
    } catch (err) {
      console.error("Error executing findInvoices query:", err.message);
      return {
        invoices: [],
        pagination: { total: 0, page: Number(page || 1), limit: Number(limit || 10), totalPages: 1 },
      };
    }
  }

  /**
   * Updates an invoice record.
   */
  async updateInvoice(id, updateData, client) {
    await ensureSchema(client);
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
    await ensureSchema(client);
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
    await ensureSchema(client);
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
    await ensureSchema();
    try {
      const normRole = String(role || "").toLowerCase();
      const userClause = normRole === "buyer"
        ? "buyer_id = $1"
        : normRole === "admin"
        ? "1=1"
        : "(supplier_id = $1 OR buyer_id = $1)";

      const params = normRole === "admin" ? [] : [userId];

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

      const statsResult = await pool.query(statsQuery, params);
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
      const trendResult = await pool.query(trendQuery, params);

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
      const statusResult = await pool.query(statusQuery, params);

      // Top Buyers / Suppliers
      const topPartiesQuery = normRole === "buyer"
        ? `
          SELECT 
            swp.company_name AS party_name,
            COUNT(i.id)::int AS invoice_count,
            COALESCE(SUM(i.grand_total), 0)::numeric(12,2) AS total_amount
          FROM invoices i
          LEFT JOIN users su ON i.supplier_id = su.id
          LEFT JOIN wholesaler_profiles swp ON su.id = swp.user_id
          WHERE i.buyer_id = $1
          GROUP BY swp.company_name
          ORDER BY total_amount DESC
          LIMIT 5
        `
        : `
          SELECT 
            COALESCE(bwp.company_name, bu.first_name || ' ' || bu.last_name, 'Customer') AS party_name,
            COUNT(i.id)::int AS invoice_count,
            COALESCE(SUM(i.grand_total), 0)::numeric(12,2) AS total_amount
          FROM invoices i
          LEFT JOIN users bu ON i.buyer_id = bu.id
          LEFT JOIN wholesaler_profiles bwp ON bu.id = bwp.user_id
          WHERE ${normRole === "admin" ? "1=1" : "i.supplier_id = $1"}
          GROUP BY bwp.company_name, bu.first_name, bu.last_name
          ORDER BY total_amount DESC
          LIMIT 5
        `;

      const topPartiesResult = await pool.query(topPartiesQuery, params);

      return {
        summary: metrics,
        revenueTrend: trendResult.rows,
        statusDistribution: statusResult.rows,
        topParties: topPartiesResult.rows,
      };
    } catch (err) {
      console.error("Error executing getDashboardStats query:", err.message);
      return {
        summary: {
          total_invoices: 0,
          total_revenue: "0.00",
          paid_amount: "0.00",
          pending_amount: "0.00",
          overdue_amount: "0.00",
          refunded_amount: "0.00",
          total_gst_collected: "0.00",
          paid_count: 0,
          pending_count: 0,
          overdue_count: 0,
        },
        revenueTrend: [],
        statusDistribution: [],
        topParties: [],
      };
    }
  }

  /**
   * Aggregates financial reports (GST breakdown, Outstanding, Invoice aging).
   */
  async getReportData(userId, role, startDate, endDate) {
    await ensureSchema();
    try {
      const normRole = String(role || "").toLowerCase();
      const userClause = normRole === "buyer"
        ? "i.buyer_id = $1"
        : normRole === "admin"
        ? "1=1"
        : "(i.supplier_id = $1 OR i.buyer_id = $1)";

      const params = normRole === "admin" ? [] : [userId];

      let dateClause = "";
      if (startDate && endDate) {
        const idx = params.length + 1;
        dateClause = ` AND i.issue_date BETWEEN $${idx} AND $${idx + 1}`;
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
      const agingReport = (await pool.query(agingQuery, normRole === "admin" ? [] : [userId])).rows;

      return {
        gstSummary,
        agingReport,
      };
    } catch (err) {
      console.error("Error executing getReportData query:", err.message);
      return {
        gstSummary: {
          total_taxable: "0.00",
          total_cgst: "0.00",
          total_sgst: "0.00",
          total_igst: "0.00",
          total_gst: "0.00",
          total_grand: "0.00",
        },
        agingReport: [],
      };
    }
  }

  async getBuyers() {
    await ensureSchema();
    const result = await pool.query(
      `SELECT 
        u.id, 
        u.email, 
        u.first_name, 
        u.last_name, 
        COALESCE(wp.company_name, u.first_name || ' ' || u.last_name) AS company_name
       FROM users u
       LEFT JOIN wholesaler_profiles wp ON u.id = wp.user_id
       WHERE u.role IS NULL OR u.role != 'admin'
       ORDER BY u.created_at DESC`
    );
    return result.rows;
  }
}

module.exports = new InvoiceRepository();
