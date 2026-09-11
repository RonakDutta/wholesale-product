const pool = require("../config/db");
const invoiceRepository = require("../repositories/invoiceRepository");

/**
 * Delivery challans, as specified on 10 Sept 2026.
 *
 * The rule asked for: when goods go out and the full amount has NOT been
 * received, the wholesaler raises a delivery challan rather than a tax
 * invoice, and the invoice waits until the money is in. The challan carries
 * no tax.
 *
 * READ THIS BEFORE BUILDING ON IT. That rule is not what the CGST Act says,
 * and the wholesaler who asked for it knows: it is going to a legal advisor
 * before production and is expected to change.
 *
 *   Section 31(1) ties the tax invoice to REMOVAL of the goods, not to
 *   payment. On a credit sale the invoice is due before or at the time the
 *   goods leave. A challan in its place understates outward supply in GSTR-1
 *   and leaves the customer unable to claim his input credit.
 *
 *   Rule 55 challans cover movement that is NOT a supply: job work, goods on
 *   approval, quantity unknown at removal. Nothing here is a Rule 55 challan,
 *   which is why every row is written with is_rule_55 false and the printed
 *   document says in plain words that it is not a tax invoice.
 *
 * The whole feature is behind a flag, `challanEnabled()`. Switching it off
 * restores the old behaviour exactly: invoices raise whenever they are asked
 * for, paid or not.
 *
 * What it does NOT do, by instruction on 10 Sept: Rule 55's three copies, the
 * provisional quantity, tax where the movement is a supply, and the six month
 * approval window. Those were explicitly deferred.
 */

const REASONS = new Set([
  "payment_pending",
  "job_work",
  "on_approval",
  "quantity_unknown",
  "other",
]);

/**
 * Is the challan rule switched on?
 *
 * Env, so it can be turned off in production without a deploy of the client.
 * Defaults ON, because it is the behaviour that was asked for; setting
 * CHALLAN_WHEN_UNPAID=false puts invoicing back the way it was.
 */
const challanEnabled = () =>
  String(process.env.CHALLAN_WHEN_UNPAID ?? "true").toLowerCase() !== "false";

/** Does this database have the tables yet? Cached, like every other probe. */
let ready = null;
const challanTablesExist = async (db = pool) => {
  if (ready !== null) return ready;
  try {
    const probe = await db.query(
      "SELECT to_regclass('public.delivery_challans') IS NOT NULL AS yes",
    );
    ready = Boolean(probe.rows[0]?.yes);
  } catch {
    ready = false;
  }
  return ready;
};
const resetChallanTables = () => { ready = null; };

/**
 * The next number in this wholesaler's own challan run.
 *
 * Its own series, not the invoice run. Gaps in the invoice series look like
 * missing bills, and the two documents are counted separately.
 *
 * Must be called inside a transaction: the upsert locks the row until commit.
 */
const nextChallanNumber = async (client, wholesalerId) => {
  const result = await client.query(
    `INSERT INTO delivery_challan_sequences (wholesaler_id, last_number)
     VALUES ($1, 1)
     ON CONFLICT (wholesaler_id)
     DO UPDATE SET last_number = delivery_challan_sequences.last_number + 1
     RETURNING last_number`,
    [wholesalerId],
  );
  return `DC-${String(result.rows[0].last_number).padStart(4, "0")}`;
};

/**
 * What has been received against a sale, and what it comes to.
 *
 * Payments live in party_payments against the sale. An order backed sale also
 * has orders.amount_paid, which is the same money seen from the shop side, so
 * the larger of the two is taken rather than the sum: adding them would count
 * a shop payment twice on a sale that has both.
 */
const settlementOf = async (db, sale) => {
  const paid = await db.query(
    "SELECT COALESCE(SUM(amount), 0) AS total FROM party_payments WHERE sale_id = $1",
    [sale.id],
  );
  let received = Number(paid.rows[0].total);

  if (sale.order_id) {
    const order = await db.query(
      "SELECT COALESCE(amount_paid, 0) AS paid FROM orders WHERE id = $1",
      [sale.order_id],
    );
    received = Math.max(received, Number(order.rows[0]?.paid || 0));
  }

  const total = Number(sale.total || 0);
  // A paisa of slack. Money is stored to two places and a 50/50 split of an
  // odd total can land a paisa out; refusing to bill over that would strand
  // a sale nobody can settle.
  return { total, received, settled: received >= total - 0.01 && total > 0 };
};

class ChallanService {
  /**
   * Raise a challan for a sale whose money has not fully arrived.
   *
   * Returns { challan, created } or { error } with one of:
   *   disabled   the rule is switched off
   *   notReady   the migration has not been run
   *   notFound   the sale is not this wholesaler's
   *   cancelled  a cancelled sale has nothing to send out
   *   draft      confirm it first, same rule as billing
   *   empty      no lines
   *   settled    it is fully paid, so it should be invoiced instead
   *   reason     the reason given is not one this module knows
   */
  async createChallanForSale(saleId, wholesalerId, reason = "payment_pending", reasonNote = null) {
    if (!challanEnabled()) return { error: "disabled" };
    if (!(await challanTablesExist())) return { error: "notReady" };
    if (!REASONS.has(reason)) return { error: "reason" };

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const found = await client.query(
        `SELECT s.*, p.id AS party_id, p.name AS party_name,
                p.business_name AS party_business_name, p.gstin AS party_gstin,
                p.city AS party_city, p.address AS party_address,
                p.phone AS party_phone
           FROM sales s
           JOIN parties p ON p.id = s.party_id
          WHERE s.id = $1 AND s.wholesaler_id = $2`,
        [saleId, wholesalerId],
      );
      const sale = found.rows[0];
      if (!sale) {
        await client.query("ROLLBACK");
        return { error: "notFound" };
      }
      if (sale.status === "cancelled") {
        await client.query("ROLLBACK");
        return { error: "cancelled" };
      }
      if (sale.status === "draft") {
        await client.query("ROLLBACK");
        return { error: "draft" };
      }

      const lines = await client.query(
        `SELECT item_name, quantity, unit, rate, amount, hsn_code
           FROM sale_lines WHERE sale_id = $1 ORDER BY created_at ASC`,
        [saleId],
      );
      if (lines.rows.length === 0) {
        await client.query("ROLLBACK");
        return { error: "empty" };
      }

      const money = await settlementOf(client, sale);
      if (money.settled) {
        await client.query("ROLLBACK");
        return { error: "settled" };
      }

      const challanNumber = await nextChallanNumber(client, wholesalerId);

      const created = await client.query(
        `INSERT INTO delivery_challans
           (wholesaler_id, sale_id, order_id, party_id, challan_number,
            reason, reason_note, is_rule_55, total_value, amount_paid,
            recipient_name, recipient_gstin, recipient_city,
            recipient_address, recipient_phone, issue_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,FALSE,$8,$9,$10,$11,$12,$13,$14,CURRENT_DATE)
         RETURNING *`,
        [
          wholesalerId,
          sale.id,
          sale.order_id || null,
          sale.party_id,
          challanNumber,
          reason,
          reasonNote,
          money.total,
          money.received,
          // The firm first, the person as the fallback. Same rule the invoice
          // follows, so the two documents name the customer identically.
          sale.party_business_name || sale.party_name,
          sale.party_gstin,
          sale.party_city,
          sale.party_address,
          sale.party_phone,
        ],
      );
      const challan = created.rows[0];

      for (const line of lines.rows) {
        await client.query(
          `INSERT INTO delivery_challan_items
             (challan_id, item_name, hsn_code, quantity, unit, unit_price, total)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            challan.id,
            line.item_name,
            line.hsn_code,
            line.quantity,
            line.unit,
            line.rate,
            line.amount,
          ],
        );
      }

      await client.query("COMMIT");
      return { challan, created: true };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * The same thing, reached from the order rather than the sale.
   *
   * A shop order writes a sale when it is accepted, and that sale is what
   * carries the lines and the money. So this finds it and delegates: the
   * challan belongs to the sale either way, and a wholesaler looking at an
   * order should not have to go and find the sale first.
   *
   * Extra error: `noSale`, for an order that has not been accepted yet and so
   * has nothing in the book to send out against.
   */
  async createChallanForOrder(orderId, wholesalerId, reason = "payment_pending", reasonNote = null) {
    if (!challanEnabled()) return { error: "disabled" };
    if (!(await challanTablesExist())) return { error: "notReady" };

    const saleId = await this.saleIdForOrder(orderId, wholesalerId);
    if (!saleId) return { error: "noSale" };

    return this.createChallanForSale(saleId, wholesalerId, reason, reasonNote);
  }

  /**
   * The sale an order wrote when it was accepted, if it has one.
   *
   * An order that is still waiting on the wholesaler has nothing in the book
   * behind it, so there is nothing to send goods out against. The order screen
   * asks this so it knows whether to offer the button at all.
   */
  async saleIdForOrder(orderId, wholesalerId) {
    const found = await pool.query(
      "SELECT id FROM sales WHERE order_id = $1 AND wholesaler_id = $2",
      [orderId, wholesalerId],
    );
    return found.rows.length > 0 ? found.rows[0].id : null;
  }

  /** Every challan against an order, through its sale. */
  async listForOrder(orderId, wholesalerId) {
    if (!(await challanTablesExist())) return [];
    const rows = await pool.query(
      `SELECT dc.id, dc.challan_number, dc.issue_date, dc.total_value,
              dc.amount_paid, dc.invoice_id
         FROM delivery_challans dc
        WHERE dc.wholesaler_id = $1
          AND (dc.order_id = $2
               OR dc.sale_id IN (SELECT id FROM sales WHERE order_id = $2))
        ORDER BY dc.created_at DESC`,
      [wholesalerId, orderId],
    );
    return rows.rows;
  }

  /**
   * Is this order settled, and what is outstanding?
   *
   * Read off the order rather than the sale, because that is where a shop
   * payment lands and it is the figure the order screen already shows.
   */
  async settlementForOrder(orderId, wholesalerId) {
    const found = await pool.query(
      `SELECT total_amount, COALESCE(amount_paid, 0) AS amount_paid
         FROM orders WHERE id = $1 AND supplier_id = $2`,
      [orderId, wholesalerId],
    );
    if (found.rows.length === 0) return null;
    const total = Number(found.rows[0].total_amount || 0);
    const received = Number(found.rows[0].amount_paid || 0);
    return { total, received, settled: received >= total - 0.01 && total > 0 };
  }

  /** One challan with its lines, scoped to its owner. */
  async findById(challanId, wholesalerId) {
    if (!(await challanTablesExist())) return null;
    const found = await pool.query(
      `SELECT dc.*, s.sale_number, o.order_number
         FROM delivery_challans dc
         LEFT JOIN sales s ON s.id = dc.sale_id
         LEFT JOIN orders o ON o.id = dc.order_id
        WHERE dc.id = $1 AND dc.wholesaler_id = $2`,
      [challanId, wholesalerId],
    );
    if (found.rows.length === 0) return null;

    const items = await pool.query(
      `SELECT item_name, hsn_code, quantity, unit, unit_price, total
         FROM delivery_challan_items WHERE challan_id = $1 ORDER BY id`,
      [challanId],
    );

    const supplier = await pool.query(
      `SELECT u.first_name, u.last_name, u.email, u.phone,
              wp.company_name, wp.gstin, wp.city, wp.warehouse_state,
              wp.warehouse_address, wp.contact_phone
         FROM users u
         LEFT JOIN wholesaler_profiles wp ON wp.user_id = u.id
        WHERE u.id = $1`,
      [wholesalerId],
    );

    return {
      ...found.rows[0],
      items: items.rows,
      supplier: supplier.rows[0] || {},
    };
  }

  /** Every challan raised against one sale, newest first. */
  async listForSale(saleId, wholesalerId) {
    if (!(await challanTablesExist())) return [];
    const rows = await pool.query(
      `SELECT id, challan_number, issue_date, total_value, amount_paid, invoice_id
         FROM delivery_challans
        WHERE sale_id = $1 AND wholesaler_id = $2
        ORDER BY created_at DESC`,
      [saleId, wholesalerId],
    );
    return rows.rows;
  }

  /** This wholesaler's challans, newest first. */
  async list(wholesalerId, limit = 100) {
    if (!(await challanTablesExist())) return [];
    const rows = await pool.query(
      `SELECT dc.id, dc.challan_number, dc.issue_date, dc.total_value,
              dc.amount_paid, dc.invoice_id, dc.recipient_name,
              s.sale_number, o.order_number
         FROM delivery_challans dc
         LEFT JOIN sales s ON s.id = dc.sale_id
         LEFT JOIN orders o ON o.id = dc.order_id
        WHERE dc.wholesaler_id = $1
        ORDER BY dc.created_at DESC
        LIMIT $2`,
      [wholesalerId, limit],
    );
    return rows.rows;
  }

  /**
   * Is this sale fully paid, and may it therefore be invoiced?
   *
   * The one question the invoice services ask before raising a bill, kept
   * here so the rule lives in one place and switching the flag off changes
   * one function rather than three.
   */
  async settlementForSale(saleId, wholesalerId, db = pool) {
    const found = await db.query(
      "SELECT id, total, order_id FROM sales WHERE id = $1 AND wholesaler_id = $2",
      [saleId, wholesalerId],
    );
    if (found.rows.length === 0) return null;
    return settlementOf(db, found.rows[0]);
  }

  /**
   * Point a challan at the bill that finally superseded it.
   *
   * Called when the money lands and the invoice is raised, so the challan
   * stops looking outstanding. Every challan against the sale is stamped:
   * goods that went out in three lorries are billed by one invoice.
   */
  async markInvoiced(client, saleId, invoiceId) {
    if (!(await challanTablesExist(client))) return 0;
    const done = await client.query(
      `UPDATE delivery_challans
          SET invoice_id = $2, updated_at = CURRENT_TIMESTAMP
        WHERE sale_id = $1 AND invoice_id IS NULL`,
      [saleId, invoiceId],
    );
    return done.rowCount;
  }

  /**
   * The same, reached from the order.
   *
   * A shop order raises its own bill, from invoiceService, which knows nothing
   * about sales and so never stamped anything. So goods that went out on a
   * challan against an order stayed "Not billed" on the Challans screen for
   * ever, long after the bill for the same goods existed. Caught by
   * flow_check, walking one order the whole way through.
   *
   * Matched both ways, because a challan can be written with an order_id or
   * with the sale_id of the sale behind that order depending on which screen
   * raised it, and both describe the same goods.
   */
  async markInvoicedForOrder(client, orderId, invoiceId) {
    if (!orderId || !invoiceId) return 0;
    if (!(await challanTablesExist(client))) return 0;
    const done = await client.query(
      `UPDATE delivery_challans
          SET invoice_id = $2, updated_at = CURRENT_TIMESTAMP
        WHERE invoice_id IS NULL
          AND (order_id = $1
               OR sale_id IN (SELECT id FROM sales WHERE order_id = $1))`,
      [orderId, invoiceId],
    );
    return done.rowCount;
  }
}

module.exports = new ChallanService();
module.exports.challanEnabled = challanEnabled;
module.exports.challanTablesExist = challanTablesExist;
module.exports.resetChallanTables = resetChallanTables;
module.exports.settlementOf = settlementOf;
module.exports.REASONS = REASONS;
