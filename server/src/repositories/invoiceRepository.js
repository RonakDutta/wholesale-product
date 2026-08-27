const pool = require("../config/db");

let schemaEnsured = false;

// Everything a caller is allowed to change on an existing invoice. Money
// columns are absent on purpose: totals come from the GST calculation, not
// from whatever the client posts.
const UPDATABLE_INVOICE_COLUMNS = new Set([
  "payment_status",
  "invoice_status",
  "due_date",
  "notes",
  "terms_conditions",
  "pdf_path",
  "pdf_url",
  "email_sent",
  "email_sent_at",
]);

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
          -- No default. A wrong HSN on a tax document is worse than none.
          hsn_code VARCHAR(50),
          -- Not INTEGER. Cloth is sold by the metre and oil by the litre, and
          -- an integer column made billing 2.5 metres fail outright.
          quantity NUMERIC(12, 3) NOT NULL CHECK (quantity > 0),
          unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
          gst_percent NUMERIC(5, 2) DEFAULT 18.00,
          tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
          total NUMERIC(12, 2) NOT NULL DEFAULT 0.00
      );

      -- Widens the column on databases created before it was NUMERIC. Guarded
      -- rather than run flat, because an unconditional ALTER ... TYPE on every
      -- boot risks rewriting the whole table each time. Sits after the CREATE
      -- above: on a fresh database the table has to exist first, and a failure
      -- here would abort the rest of this batch.
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
           WHERE table_name = 'invoice_items'
             AND column_name = 'quantity'
             AND data_type = 'integer'
        ) THEN
          ALTER TABLE invoice_items ALTER COLUMN quantity TYPE NUMERIC(12, 3);
        END IF;
      END $$;

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

      CREATE TABLE IF NOT EXISTS invoice_settings (
          user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          prefix VARCHAR(10) NOT NULL DEFAULT 'INV',
          due_days INTEGER NOT NULL DEFAULT 15,
          default_tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
          default_notes TEXT,
          default_terms TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

/**
 * What of wholesale 3.0 this database actually has.
 *
 * Migrations in this repository are run by hand, so the code can be deployed
 * hours or days before the SQL is run, and it can be pointed at a database
 * that is still purely wholesale 2.0. The invoice module is shared: the
 * marketplace and the sales book both read these queries. Referring to
 * credit_notes or sales unconditionally meant that on a database without them
 * the whole module died. The list came back empty, because findInvoices
 * swallows its own errors, the detail page 404ed, the PDF failed, recording a
 * payment failed, and the dashboard reported zero revenue, which is worse
 * than an error because it looks like an answer.
 *
 * So the queries are assembled from what is present. Probed once and cached,
 * the same way the schema check is. Every branch here is temporary: once the
 * migrations are in, both sides are true and the query is the full one.
 */
let extras = null;

async function schemaExtras(db = pool) {
  if (extras) return extras;
  try {
    const result = await db.query(`
      SELECT
        to_regclass('public.credit_notes')   IS NOT NULL AS has_credit_notes,
        to_regclass('public.party_payments') IS NOT NULL AS has_party_payments,
        to_regclass('public.sales')          IS NOT NULL AS has_sales,
        EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'invoices' AND column_name = 'sale_id') AS has_sale_id,
        EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'invoices' AND column_name = 'recipient_name') AS has_recipient,
        EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'sales' AND column_name = 'tax_amount') AS has_sale_tax,
        EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'sale_lines' AND column_name = 'gst_percent') AS has_line_gst,
        EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'items' AND column_name = 'gst_percent') AS has_item_gst,
        EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'supplier_inventory'
                   AND column_name = 'gst_percent') AS has_listing_billing
    `);
    extras = result.rows[0];
  } catch (err) {
    // Assume the older shape. Being wrong this way loses the 3.0 columns on
    // a page; being wrong the other way loses the page.
    console.error("Could not probe for the 3.0 invoice columns:", err.message);
    extras = {
      has_credit_notes: false,
      has_party_payments: false,
      has_sales: false,
      has_sale_id: false,
      has_recipient: false,
      has_sale_tax: false,
      has_line_gst: false,
      has_item_gst: false,
      has_listing_billing: false,
    };
  }
  return extras;
}

// Only meaningful in tests, where one process talks to more than one database.
function resetSchemaExtras() {
  extras = null;
}

// The recipient snapshot columns, or the plain buyer joins when the migration
// that adds them has not been run.
const recipientColumns = (has) => ({
  name: has ? "i.recipient_name," : "",
  phone: has ? "COALESCE(i.recipient_phone, bu.phone)" : "bu.phone",
  company: has ? "COALESCE(i.recipient_name, bwp.company_name)" : "bwp.company_name",
  gstin: has ? "COALESCE(i.recipient_gstin, bwp.gstin)" : "bwp.gstin",
  city: has ? "COALESCE(i.recipient_city, bwp.city)" : "bwp.city",
});

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
          item.hsnCode || null,
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
    const has = await schemaExtras();
    const r = recipientColumns(has.has_recipient);

    const query = `
      SELECT
        i.*,
        o.order_number,
        -- An invoice raised from a sale stores who it was issued to on the
        -- row itself, because a party need not have a user account and
        -- because a tax document must not change when a contact is edited.
        -- The snapshot wins wherever it exists; the joins remain for the
        -- older marketplace invoices that have no snapshot.
        COALESCE(
          ${r.name}
          bwp.company_name,
          bu.first_name || ' ' || bu.last_name,
          'Buyer'
        ) AS buyer_name,
        bu.email AS buyer_email,
        ${r.phone} AS buyer_phone,
        ${r.company} AS buyer_company,
        ${r.gstin} AS buyer_gstin,
        ${r.city} AS buyer_city,
        bwp.country AS buyer_country,
        COALESCE(su.first_name || ' ' || su.last_name, 'Supplier') AS supplier_name,
        su.email AS supplier_email,
        su.phone AS supplier_phone,
        swp.company_name AS supplier_company,
        swp.gstin AS supplier_gstin,
        swp.upi_id AS supplier_upi_id,
        swp.city AS supplier_city,
        swp.country AS supplier_country
        ${
          has.has_credit_notes
            ? `,
        -- See findInvoices. One row at most, by unique index.
        cn.id AS credit_note_id,
        cn.note_number AS credit_note_number,
        cn.grand_total AS credited_amount,
        cn.issue_date AS credited_on,
        cn.reason AS credit_reason,
        cn.reason_note AS credit_reason_note`
            : ""
        }
        ${
          // What this bill was raised from, when it was a recorded sale rather
          // than a marketplace order. Without it the PDF printed
          // "Order Ref: #N/A" on every 3.0 invoice.
          has.has_sales && has.has_sale_id ? `,
        sl.sale_number` : ""
        }
      FROM invoices i
      ${has.has_credit_notes ? "LEFT JOIN credit_notes cn ON cn.invoice_id = i.id" : ""}
      ${has.has_sales && has.has_sale_id ? "LEFT JOIN sales sl ON sl.id = i.sale_id" : ""}
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

    // Fetch payments.
    //
    // A sale invoice's money lives in party_payments, the one ledger the
    // customer's balance also reads. The old payments table is only still
    // consulted for marketplace invoices, which have no sale behind them.
    // Every column is cast, because party_payments.paid_on is a DATE while
    // payments.paid_at is a TIMESTAMP, and an untyped NULL has no type for
    // the union to agree on.
    //
    // On a database that has not had the 3.0 migrations run there is no
    // party_payments and no sale_id, and every invoice is a marketplace one,
    // so the second half of the union is the whole answer.
    const oneLedger = has.has_party_payments && has.has_sale_id;
    const paymentsResult = await pool.query(
      oneLedger
        ? `SELECT pp.id::text AS id, pp.amount, pp.method AS payment_method,
                  pp.paid_on::timestamp AS paid_at,
                  pp.note AS remarks,
                  NULL::text AS transaction_id, NULL::text AS payment_reference
             FROM party_payments pp
             JOIN invoices i ON i.sale_id = pp.sale_id
            WHERE i.id = $1
            UNION ALL
           SELECT p.id::text AS id, p.amount, p.payment_method,
                  p.paid_at::timestamp AS paid_at,
                  p.remarks, p.transaction_id::text, p.payment_reference::text
             FROM payments p
             JOIN invoices i2 ON i2.id = p.invoice_id
            WHERE p.invoice_id = $1 AND i2.sale_id IS NULL
            ORDER BY paid_at DESC`
        : `SELECT p.id::text AS id, p.amount, p.payment_method,
                  p.paid_at::timestamp AS paid_at,
                  p.remarks, p.transaction_id::text, p.payment_reference::text
             FROM payments p
            WHERE p.invoice_id = $1
            ORDER BY paid_at DESC`,
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
    side,
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
    const has = await schemaExtras();
    const recipient = recipientColumns(has.has_recipient);
    try {
      const offset = (page - 1) * limit;
      const params = [];
      let paramIndex = 1;

      let whereClauses = [];

      // Scope by who the user is on the invoice, never by their account role:
      // the same person sells to some accounts and buys from others, and role
      // scoping used to hide one whole side of their books from them.
      const normRole = String(role || "").toLowerCase();
      const normSide = String(side || "").toLowerCase();
      if (normRole !== "admin") {
        if (normSide === "sales") {
          whereClauses.push(`i.supplier_id = $${paramIndex++}`);
          params.push(userId);
        } else if (normSide === "purchases") {
          whereClauses.push(`i.buyer_id = $${paramIndex++}`);
          params.push(userId);
        } else {
          whereClauses.push(`(i.buyer_id = $${paramIndex} OR i.supplier_id = $${paramIndex})`);
          params.push(userId);
          paramIndex++;
        }
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
          ${
            has.has_recipient
              ? `OR i.recipient_name ILIKE $${paramIndex}
              OR i.recipient_gstin ILIKE $${paramIndex}`
              : ""
          }
        )`);
        params.push(`%${search}%`);
        paramIndex++;
      }

      if (invoiceStatus) {
        whereClauses.push(`i.invoice_status = $${paramIndex++}`);
        params.push(invoiceStatus);
      }

      // Cancelled invoices stay in the ledger - the numbering sequence has to
      // stay honest and a voided document is part of the audit trail - but
      // they are out of the way unless you ask for them by status.
      if (String(invoiceStatus || "").toLowerCase() !== "cancelled") {
        whereClauses.push(`i.invoice_status <> 'Cancelled'`);
      }

      // Both parties being the same account is never a real tax invoice; those
      // rows only exist from before self-ordering was blocked.
      whereClauses.push(`i.buyer_id IS DISTINCT FROM i.supplier_id`);

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
          COALESCE(
            ${recipient.name}
            bwp.company_name,
            bu.first_name || ' ' || bu.last_name,
            'Buyer'
          ) AS buyer_name,
          COALESCE(swp.company_name, su.first_name || ' ' || su.last_name, 'Supplier') AS supplier_name,
          ${recipient.gstin} AS buyer_gstin,
          swp.gstin AS supplier_gstin
          ${
            // A credited invoice still reads Generated and, if the money had
            // come in, Paid. Without this the list shows a reversed bill as a
            // live one. At most one row joins: credit_notes has a unique index
            // on invoice_id, so this cannot multiply the result.
            has.has_credit_notes
              ? `,
          cn.note_number AS credit_note_number,
          cn.grand_total AS credited_amount`
              : ""
          }
        FROM invoices i
        LEFT JOIN users bu ON i.buyer_id = bu.id
        LEFT JOIN wholesaler_profiles bwp ON bu.id = bwp.user_id
        LEFT JOIN users su ON i.supplier_id = su.id
        LEFT JOIN wholesaler_profiles swp ON su.id = swp.user_id
        ${has.has_credit_notes ? "LEFT JOIN credit_notes cn ON cn.invoice_id = i.id" : ""}
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

    // Column names cannot be parameterised, so they are matched against a
    // fixed list rather than interpolated from request keys.
    for (const [key, val] of Object.entries(updateData)) {
      if (!UPDATABLE_INVOICE_COLUMNS.has(key)) continue;
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
  async getDashboardStats(userId, role, side) {
    await ensureSchema();
    const has = await schemaExtras();
    const recipient = recipientColumns(has.has_recipient);
    try {
      const normRole = String(role || "").toLowerCase();
      const normSide = String(side || "").toLowerCase();
      const scopeClause = normRole === "admin"
        ? "1=1"
        : normSide === "sales"
        ? "supplier_id = $1"
        : normSide === "purchases"
        ? "buyer_id = $1"
        : "(supplier_id = $1 OR buyer_id = $1)";

      // Cancelled and self-dealing invoices are excluded everywhere here.
      // Counting a voided document towards revenue is what made the totals
      // look wrong after cleaning old rows up.
      const LIVE = `invoice_status <> 'Cancelled' AND buyer_id IS DISTINCT FROM supplier_id`;
      const userClause = `${scopeClause} AND ${LIVE}`;

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

      // Top Buyers / Suppliers. "Purchases" lists who you bought from;
      // everything else lists who bought from you.
      const topPartiesQuery = normSide === "purchases"
        ? `
          SELECT 
            swp.company_name AS party_name,
            COUNT(i.id)::int AS invoice_count,
            COALESCE(SUM(i.grand_total), 0)::numeric(12,2) AS total_amount
          FROM invoices i
          LEFT JOIN users su ON i.supplier_id = su.id
          LEFT JOIN wholesaler_profiles swp ON su.id = swp.user_id
          WHERE i.buyer_id = $1
            AND i.invoice_status <> 'Cancelled'
            AND i.buyer_id IS DISTINCT FROM i.supplier_id
          GROUP BY swp.company_name
          ORDER BY total_amount DESC
          LIMIT 5
        `
        : `
          SELECT
            COALESCE(
              ${recipient.name}
              bwp.company_name,
              bu.first_name || ' ' || bu.last_name,
              'Customer'
            ) AS party_name,
            COUNT(i.id)::int AS invoice_count,
            COALESCE(SUM(i.grand_total), 0)::numeric(12,2) AS total_amount
          FROM invoices i
          LEFT JOIN users bu ON i.buyer_id = bu.id
          LEFT JOIN wholesaler_profiles bwp ON bu.id = bwp.user_id
          WHERE ${normRole === "admin" ? "1=1" : "i.supplier_id = $1"}
            AND i.invoice_status <> 'Cancelled'
            AND i.buyer_id IS DISTINCT FROM i.supplier_id
          -- recipient_name is part of the selected expression, so it has to
          -- be grouped as well or Postgres rejects the whole query. Dropping
          -- it from the SELECT above without dropping it here would do the
          -- same, which is why both come off the same flag.
          GROUP BY ${has.has_recipient ? "i.recipient_name, " : ""}bwp.company_name, bu.first_name, bu.last_name
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
  async getReportData(userId, role, startDate, endDate, side) {
    await ensureSchema();
    try {
      const normRole = String(role || "").toLowerCase();
      const normSide = String(side || "").toLowerCase();
      const scopeClause = normRole === "admin"
        ? "1=1"
        : normSide === "sales"
        ? "i.supplier_id = $1"
        : normSide === "purchases"
        ? "i.buyer_id = $1"
        : "(i.supplier_id = $1 OR i.buyer_id = $1)";

      // A cancelled invoice collects no GST and is owed by nobody, so it must
      // not appear in either the tax summary or the ageing buckets.
      const userClause = `${scopeClause} AND i.invoice_status <> 'Cancelled' AND i.buyer_id IS DISTINCT FROM i.supplier_id`;

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

  /**
   * Per-seller invoice defaults. Absent rows fall back to the platform
   * defaults rather than erroring, so the page works before it is ever saved.
   */
  async getSettings(userId) {
    await ensureSchema();
    const result = await pool.query(
      `SELECT prefix, due_days, default_tax_rate, default_notes, default_terms
       FROM invoice_settings WHERE user_id = $1`,
      [userId]
    );

    const row = result.rows[0] || {};
    return {
      prefix: row.prefix || "INV",
      dueDays: Number(row.due_days ?? 15),
      defaultTaxRate: Number(row.default_tax_rate ?? 18),
      defaultNotes: row.default_notes ?? "Thank you for your business!",
      defaultTerms:
        row.default_terms ??
        "1. Goods once sold will not be returned.\n2. Payment is due within the agreed credit period.",
    };
  }

  async saveSettings(userId, settings) {
    await ensureSchema();
    const result = await pool.query(
      `INSERT INTO invoice_settings (
         user_id, prefix, due_days, default_tax_rate, default_notes, default_terms, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO UPDATE SET
         prefix = EXCLUDED.prefix,
         due_days = EXCLUDED.due_days,
         default_tax_rate = EXCLUDED.default_tax_rate,
         default_notes = EXCLUDED.default_notes,
         default_terms = EXCLUDED.default_terms,
         updated_at = CURRENT_TIMESTAMP
       RETURNING prefix, due_days, default_tax_rate, default_notes, default_terms`,
      [
        userId,
        settings.prefix,
        settings.dueDays,
        settings.defaultTaxRate,
        settings.defaultNotes,
        settings.defaultTerms,
      ]
    );

    const row = result.rows[0];
    return {
      prefix: row.prefix,
      dueDays: Number(row.due_days),
      defaultTaxRate: Number(row.default_tax_rate),
      defaultNotes: row.default_notes,
      defaultTerms: row.default_terms,
    };
  }

  /**
   * The customers this supplier can raise an invoice against.
   *
   * Scoped to people who have actually ordered from or been invoiced by them.
   * Returning every account on the platform would hand any logged-in user the
   * full customer list, emails included.
   */
  async getBuyers(supplierId) {
    await ensureSchema();
    const result = await pool.query(
      `SELECT DISTINCT
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        COALESCE(wp.company_name, u.first_name || ' ' || u.last_name) AS company_name
       FROM users u
       LEFT JOIN wholesaler_profiles wp ON u.id = wp.user_id
       WHERE u.id <> $1
         AND (
           EXISTS (SELECT 1 FROM orders o WHERE o.buyer_id = u.id AND o.supplier_id = $1)
           OR EXISTS (SELECT 1 FROM invoices i WHERE i.buyer_id = u.id AND i.supplier_id = $1)
         )
       ORDER BY company_name ASC`,
      [supplierId]
    );
    return result.rows;
  }

  /**
   * Which parts of wholesale 3.0 this database has. Callers outside this file
   * need it to decide whether a guard can apply at all.
   */
  async schemaExtras() {
    return schemaExtras();
  }

  // Tests point one process at more than one database.
  resetSchemaExtras() {
    resetSchemaExtras();
  }
}

module.exports = new InvoiceRepository();
