/**
 * Writing an accepted order into the wholesaler's sales book.
 *
 * An order is a fulfilment record and a sale is a commercial record, so they
 * stay separate tables. This is the join: when a wholesaler accepts an order,
 * the same goods appear in his book as a sale, and every flow that already
 * reads sales starts working on it, the invoice, the statement and the credit
 * note included.
 *
 * The one rule that matters more than any other here: the sale must owe
 * exactly what the order charged. A customer agreed a figure at checkout and
 * that figure is the debt. Recomputing it, adding tax to it, or rounding it
 * would change what he owes after he has already paid part of it.
 */
const { clean, fromPaise, toPaise } = require("../utils/money");

/**
 * Is this database ready to link a sale to an order?
 *
 * Cached, and separate from the other probes because the migrations are
 * separate. Accepting an order must never fail because the sales book could
 * not be written to.
 */
let bridgeReady = null;

const hasSaleLink = async (client) => {
  if (bridgeReady !== null) return bridgeReady;
  try {
    const probe = await client.query(
      `SELECT
         to_regclass('public.sales') IS NOT NULL AS has_sales,
         EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema = 'public' AND table_name = 'sales'
                    AND column_name = 'order_id') AS has_order_id,
         EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema = 'public' AND table_name = 'sales'
                    AND column_name = 'tax_amount') AS has_tax,
         EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema = 'public' AND table_name = 'sale_lines'
                    AND column_name = 'gst_percent') AS has_line_gst`,
    );
    const row = probe.rows[0] || {};
    bridgeReady = row.has_sales && row.has_order_id ? row : false;
  } catch {
    bridgeReady = false;
  }
  return bridgeReady;
};

const resetSaleLink = () => { bridgeReady = null; };

/** This wholesaler's own next sale number. Locks the row until commit. */
const nextSaleNumber = async (client, wholesalerId) => {
  const result = await client.query(
    `INSERT INTO sale_sequences (wholesaler_id, last_number)
     VALUES ($1, 1)
     ON CONFLICT (wholesaler_id)
     DO UPDATE SET last_number = sale_sequences.last_number + 1
     RETURNING last_number`,
    [wholesalerId],
  );
  return `S-${String(result.rows[0].last_number).padStart(4, "0")}`;
};

/**
 * Write one accepted order into the sales book.
 *
 * Does nothing, rather than failing, when the order has no customer or the
 * migration has not been run. Accepting an order is the wholesaler's action
 * and must succeed; the book catching up is secondary and the backfill can
 * finish the job later.
 *
 * @returns {Promise<object|null>} the sale row, or null if none was written
 */
const createSaleFromOrder = async (client, orderId) => {
  const schema = await hasSaleLink(client);
  if (!schema) return null;

  const found = await client.query(
    `SELECT o.id, o.order_number, o.supplier_id, o.party_id, o.subtotal,
            o.total_amount, o.created_at
       FROM orders o
      WHERE o.id = $1`,
    [orderId],
  );
  const order = found.rows[0];
  if (!order || !order.party_id || !order.supplier_id) return null;

  // One order, one sale. The unique index backs this up, but asking first
  // keeps a re-accept from burning a sale number on a row that is refused.
  const already = await client.query(
    "SELECT * FROM sales WHERE order_id = $1",
    [orderId],
  );
  if (already.rows.length > 0) return already.rows[0];

  const lines = await client.query(
    `SELECT oi.product_name, oi.quantity, oi.total_price,
            COALESCE(oi.unit_price, 0) AS unit_price,
            si.unit, si.hsn_code, si.gst_percent
       FROM order_items oi
       LEFT JOIN supplier_inventory si ON si.id = oi.inventory_item_id
      WHERE oi.order_id = $1
      ORDER BY oi.id`,
    [orderId],
  );

  // The order's own figures, carried across untouched. order_items holds the
  // real content of an order; orders.inventory_item_id is a single item
  // leftover and reading that would drop everything after the first product.
  const totalPaise = toPaise(order.total_amount);
  const subtotalPaise = toPaise(order.subtotal ?? order.total_amount);

  const saleNumber = await nextSaleNumber(client, order.supplier_id);

  const sale = await client.query(
    `INSERT INTO sales
       (wholesaler_id, party_id, order_id, sale_number, sale_date, source,
        status, subtotal, discount, ${schema.has_tax ? "tax_amount," : ""} total, notes)
     VALUES ($1, $2, $3, $4, $5::date, 'retailer', 'confirmed',
             $6, 0, ${schema.has_tax ? "0, $7, $8" : "$7, $8"})
     RETURNING *`,
    [
      order.supplier_id,
      order.party_id,
      orderId,
      saleNumber,
      // Dated when the order was placed, not when it was accepted. The
      // statement should show the goods on the day the customer bought them.
      new Date(order.created_at).toISOString().slice(0, 10),
      fromPaise(subtotalPaise),
      fromPaise(totalPaise),
      `Shop order ${order.order_number || orderId}`,
    ],
  );
  const saleId = sale.rows[0].id;

  for (const line of lines.rows) {
    // The line rate is derived from what was actually charged for the line,
    // not from the listing's price today. A wholesaler who changed his rate
    // after the order must still bill what the customer agreed.
    const amountPaise = toPaise(line.total_price);
    const quantity = Number(line.quantity) || 1;
    const rate = fromPaise(Math.round(amountPaise / quantity));

    await client.query(
      `INSERT INTO sale_lines
         (sale_id, item_name, quantity, unit, rate, amount, hsn_code
          ${schema.has_line_gst ? ", gst_percent" : ""})
       VALUES ($1, $2, $3, $4, $5, $6, $7${schema.has_line_gst ? ", $8" : ""})`,
      [
        saleId,
        clean(line.product_name) || "Item",
        quantity,
        clean(line.unit) || "pcs",
        rate,
        fromPaise(amountPaise),
        clean(line.hsn_code),
        ...(schema.has_line_gst ? [line.gst_percent ?? null] : []),
      ],
    );
  }

  return sale.rows[0];
};

module.exports = { createSaleFromOrder, hasSaleLink, resetSaleLink };
