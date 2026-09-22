const pool = require("../config/db");
const { businessId } = require("../middlewares/businessContext");
const {
  SUPPORTED_MARKETPLACES,
  MARKETPLACE_BY_ID,
  CHANNELS,
} = require("../services/salesChannels");
const { compose, financialYear } = require("../services/invoiceNumberService");

const RESERVED_CODES = new Set(["counter", "shop"]);
const GST_CHARS = /^[A-Za-z0-9/-]+$/;

const cleanPrefix = (p) => {
  const s = String(p ?? "").trim().toUpperCase();
  if (!s) return "";
  return s.endsWith("/") || s.endsWith("-") ? s : `${s}/`;
};

/**
 * Returns available marketplaces and their defaults.
 */
const getMarketplaces = (req, res) => {
  res.json({
    success: true,
    marketplaces: SUPPORTED_MARKETPLACES,
  });
};

/**
 * Returns all marketplace linkages for the authenticated wholesaler,
 * along with live sample preview for each.
 */
const getLinkages = async (req, res) => {
  try {
    const wholesalerId = businessId(req);
    const result = await pool.query(
      `SELECT id, marketplace, linkage_name, code, invoice_prefix, sale_prefix, order_prefix,
              number_suffix, number_pad_to, is_active, created_at, updated_at
         FROM marketplace_linkages
        WHERE wholesaler_id = $1
        ORDER BY created_at ASC`,
      [wholesalerId],
    );

    const fy = financialYear();

    const linkagesWithPreview = result.rows.map((row) => {
      const invPreview = compose({
        prefix: row.invoice_prefix,
        suffix: row.number_suffix,
        padTo: row.number_pad_to,
        sequence: 1,
      });

      const saleClean = cleanPrefix(row.sale_prefix);
      const orderClean = cleanPrefix(row.order_prefix);

      return {
        ...row,
        sampleInvoiceNumber: invPreview.number,
        sampleSaleNumber: `${saleClean}1/${fy}`,
        sampleOrderNumber: `${orderClean}1/${fy}`,
        isInvoiceRule46Ok: invPreview.ok,
        invoiceRule46Reason: invPreview.reason || null,
      };
    });

    res.json({
      success: true,
      linkages: linkagesWithPreview,
      marketplaces: SUPPORTED_MARKETPLACES,
    });
  } catch (err) {
    console.error("Error fetching marketplace linkages:", err);
    res.status(500).json({ success: false, message: "Could not load marketplace linkages" });
  }
};

/**
 * Creates a new marketplace linkage with independent series configuration.
 */
const createLinkage = async (req, res) => {
  try {
    const wholesalerId = businessId(req);
    const {
      marketplace,
      linkageName,
      code: rawCode,
      invoicePrefix: rawInvPrefix,
      salePrefix: rawSalePrefix,
      orderPrefix: rawOrderPrefix,
      numberSuffix = "/{FY}",
      numberPadTo = 0,
    } = req.body;

    const mpKey = String(marketplace ?? "").trim().toLowerCase();
    const mpInfo = MARKETPLACE_BY_ID.get(mpKey);
    if (!mpInfo) {
      const allowed = SUPPORTED_MARKETPLACES.map((m) => m.name).join(", ");
      return res.status(400).json({
        success: false,
        message: `Please select a valid marketplace (${allowed}).`,
      });
    }

    const name = String(linkageName ?? "").trim();
    if (!name || name.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Linkage name must be at least 2 characters.",
      });
    }

    // Derive or sanitize unique code
    let code = String(rawCode ?? "").trim().toLowerCase();
    if (!code) {
      code = `${mpKey}_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")}`;
    }
    code = code.slice(0, 64);

    if (!/^[a-z0-9_-]+$/.test(code)) {
      return res.status(400).json({
        success: false,
        message: "Linkage identifier may only contain lowercase letters, numbers, hyphens, and underscores.",
      });
    }

    if (RESERVED_CODES.has(code)) {
      return res.status(400).json({
        success: false,
        message: `"${code}" is a reserved system channel name. Please choose a different identifier.`,
      });
    }

    // Check code uniqueness for this wholesaler
    const existing = await pool.query(
      "SELECT id FROM marketplace_linkages WHERE wholesaler_id = $1 AND LOWER(code) = $2",
      [wholesalerId, code],
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `A linkage with identifier "${code}" already exists for your business.`,
      });
    }

    // Format & validate prefixes
    const invoicePrefix = cleanPrefix(rawInvPrefix || mpInfo.defaultPrefix);
    const salePrefix = cleanPrefix(rawSalePrefix || `S-${invoicePrefix}`);
    const orderPrefix = cleanPrefix(rawOrderPrefix || `SO-${invoicePrefix}`);

    if (!GST_CHARS.test(invoicePrefix) || invoicePrefix.length > 10) {
      return res.status(400).json({
        success: false,
        message: "Invoice prefix may only use letters, digits, hyphen, and slash (max 10 characters).",
      });
    }

    if (!GST_CHARS.test(salePrefix) || salePrefix.length > 10) {
      return res.status(400).json({
        success: false,
        message: "Sale prefix may only use letters, digits, hyphen, and slash (max 10 characters).",
      });
    }

    if (!GST_CHARS.test(orderPrefix) || orderPrefix.length > 10) {
      return res.status(400).json({
        success: false,
        message: "Order prefix may only use letters, digits, hyphen, and slash (max 10 characters).",
      });
    }

    const padTo = Math.min(Math.max(Number(numberPadTo) || 0, 0), 9);
    const suffix = String(numberSuffix ?? "").trim().slice(0, 16);

    // Rule 46(b) check for invoice series: verify worst-case number fits in 16 chars
    const worstInv = compose({
      prefix: invoicePrefix,
      suffix,
      padTo,
      sequence: 10 ** Math.max(padTo, 1) - 1,
    });
    if (!worstInv.ok) {
      return res.status(400).json({
        success: false,
        message: `Invoice series format exceeds Rule 46(b) limits: ${worstInv.reason}`,
        sample: worstInv.number,
      });
    }

    // Check if this invoice prefix is already used by another active linkage of this wholesaler
    const prefixCollision = await pool.query(
      `SELECT linkage_name FROM marketplace_linkages
        WHERE wholesaler_id = $1 AND invoice_prefix = $2 AND is_active = TRUE`,
      [wholesalerId, invoicePrefix],
    );
    if (prefixCollision.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invoice prefix "${invoicePrefix}" is already used by "${prefixCollision.rows[0].linkage_name}". Each linkage must have its own unique series prefix.`,
      });
    }

    const insertRes = await pool.query(
      `INSERT INTO marketplace_linkages (
         wholesaler_id, marketplace, linkage_name, code,
         invoice_prefix, sale_prefix, order_prefix,
         number_suffix, number_pad_to, is_active,
         created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        wholesalerId,
        mpKey,
        name,
        code,
        invoicePrefix,
        salePrefix,
        orderPrefix,
        suffix,
        padTo,
      ],
    );

    const created = insertRes.rows[0];
    const fy = financialYear();

    res.status(201).json({
      success: true,
      message: `Marketplace linkage "${name}" added successfully.`,
      linkage: {
        ...created,
        sampleInvoiceNumber: compose({
          prefix: created.invoice_prefix,
          suffix: created.number_suffix,
          padTo: created.number_pad_to,
          sequence: 1,
        }).number,
        sampleSaleNumber: `${cleanPrefix(created.sale_prefix)}1/${fy}`,
        sampleOrderNumber: `${cleanPrefix(created.order_prefix)}1/${fy}`,
      },
    });
  } catch (err) {
    console.error("Error creating marketplace linkage:", err);
    res.status(500).json({ success: false, message: "Could not create marketplace linkage" });
  }
};

/**
 * Updates an existing marketplace linkage.
 */
const updateLinkage = async (req, res) => {
  try {
    const wholesalerId = businessId(req);
    const { id } = req.params;
    const {
      linkageName,
      invoicePrefix: rawInvPrefix,
      salePrefix: rawSalePrefix,
      orderPrefix: rawOrderPrefix,
      numberSuffix,
      numberPadTo,
      isActive,
    } = req.body;

    const existingRes = await pool.query(
      "SELECT * FROM marketplace_linkages WHERE id = $1 AND wholesaler_id = $2",
      [id, wholesalerId],
    );
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Marketplace linkage not found." });
    }
    const current = existingRes.rows[0];

    const name = linkageName ? String(linkageName).trim() : current.linkage_name;
    const invoicePrefix = rawInvPrefix ? cleanPrefix(rawInvPrefix) : current.invoice_prefix;
    const salePrefix = rawSalePrefix ? cleanPrefix(rawSalePrefix) : current.sale_prefix;
    const orderPrefix = rawOrderPrefix ? cleanPrefix(rawOrderPrefix) : current.order_prefix;
    const suffix = numberSuffix !== undefined ? String(numberSuffix).trim().slice(0, 16) : current.number_suffix;
    const padTo = numberPadTo !== undefined ? Math.min(Math.max(Number(numberPadTo) || 0, 0), 9) : current.number_pad_to;
    const active = typeof isActive === "boolean" ? isActive : current.is_active;

    if (!GST_CHARS.test(invoicePrefix) || invoicePrefix.length > 10) {
      return res.status(400).json({
        success: false,
        message: "Invoice prefix may only use letters, digits, hyphen, and slash (max 10 characters).",
      });
    }

    const worstInv = compose({
      prefix: invoicePrefix,
      suffix,
      padTo,
      sequence: 10 ** Math.max(padTo, 1) - 1,
    });
    if (!worstInv.ok) {
      return res.status(400).json({
        success: false,
        message: `Invoice series format exceeds Rule 46(b) limits: ${worstInv.reason}`,
      });
    }

    const updateRes = await pool.query(
      `UPDATE marketplace_linkages
          SET linkage_name = $1, invoice_prefix = $2, sale_prefix = $3, order_prefix = $4,
              number_suffix = $5, number_pad_to = $6, is_active = $7, updated_at = CURRENT_TIMESTAMP
        WHERE id = $8 AND wholesaler_id = $9
        RETURNING *`,
      [name, invoicePrefix, salePrefix, orderPrefix, suffix, padTo, active, id, wholesalerId],
    );

    res.json({
      success: true,
      message: "Marketplace linkage updated.",
      linkage: updateRes.rows[0],
    });
  } catch (err) {
    console.error("Error updating marketplace linkage:", err);
    res.status(500).json({ success: false, message: "Could not update marketplace linkage" });
  }
};

/**
 * Deletes or deactivates a marketplace linkage.
 */
const deleteLinkage = async (req, res) => {
  try {
    const wholesalerId = businessId(req);
    const { id } = req.params;

    const findRes = await pool.query(
      "SELECT id, code, linkage_name FROM marketplace_linkages WHERE id = $1 AND wholesaler_id = $2",
      [id, wholesalerId],
    );
    if (findRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Marketplace linkage not found." });
    }
    const linkage = findRes.rows[0];

    // Check if this channel code has been used in sales, invoices, or orders
    const [salesUsed, invoicesUsed, ordersUsed] = await Promise.all([
      pool.query("SELECT 1 FROM sales WHERE wholesaler_id = $1 AND channel = $2 LIMIT 1", [wholesalerId, linkage.code]),
      pool.query("SELECT 1 FROM invoices WHERE supplier_id = $1 AND channel = $2 LIMIT 1", [wholesalerId, linkage.code]),
      pool.query("SELECT 1 FROM orders WHERE supplier_id = $1 AND channel = $2 LIMIT 1", [wholesalerId, linkage.code]),
    ]);

    const hasTransactions =
      salesUsed.rows.length > 0 ||
      invoicesUsed.rows.length > 0 ||
      ordersUsed.rows.length > 0;

    if (hasTransactions) {
      // Deactivate rather than delete to preserve historical records and series continuity
      await pool.query(
        "UPDATE marketplace_linkages SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [id],
      );
      return res.json({
        success: true,
        deactivated: true,
        message: `Linkage "${linkage.linkage_name}" has existing transactions and has been deactivated. Historical records and numbers remain preserved.`,
      });
    }

    await pool.query("DELETE FROM marketplace_linkages WHERE id = $1", [id]);
    res.json({
      success: true,
      deleted: true,
      message: `Linkage "${linkage.linkage_name}" removed.`,
    });
  } catch (err) {
    console.error("Error deleting marketplace linkage:", err);
    res.status(500).json({ success: false, message: "Could not remove marketplace linkage" });
  }
};

/**
 * Returns a live preview of next invoice, sale, and order numbers based on prefix parameters.
 */
const previewNumbers = (req, res) => {
  const {
    invoicePrefix = "AZ/",
    salePrefix = "S-AZ/",
    orderPrefix = "SO-AZ/",
    suffix = "/{FY}",
    padTo = 0,
  } = req.query;

  const fy = financialYear();
  const invClean = cleanPrefix(invoicePrefix);
  const saleClean = cleanPrefix(salePrefix);
  const orderClean = cleanPrefix(orderPrefix);

  const invPreview = compose({
    prefix: invClean,
    suffix,
    padTo: Number(padTo) || 0,
    sequence: 1,
  });

  const salePreview = compose({
    prefix: saleClean,
    suffix,
    padTo: Number(padTo) || 0,
    sequence: 1,
  });

  const orderPreview = compose({
    prefix: orderClean,
    suffix,
    padTo: Number(padTo) || 0,
    sequence: 1,
  });

  res.json({
    success: true,
    invoice: {
      sample: invPreview.number,
      ok: invPreview.ok,
      reason: invPreview.reason || null,
      length: invPreview.number.length,
    },
    sale: {
      sample: salePreview.number,
      ok: salePreview.ok,
      reason: salePreview.reason || null,
    },
    order: {
      sample: orderPreview.number,
      ok: orderPreview.ok,
      reason: orderPreview.reason || null,
    },
    financialYear: fy,
  });
};

module.exports = {
  getMarketplaces,
  getLinkages,
  createLinkage,
  updateLinkage,
  deleteLinkage,
  previewNumbers,
};
