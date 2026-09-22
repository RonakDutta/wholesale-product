/**
 * Writing an accepted order into the wholesaler's sales book.
 *
 * An order is a fulfilment record and a sale is a commercial record, so they
 * stay separate tables. This is the join: when a wholesaler accepts an order,
 * the same goods appear in their book as a sale, and every flow that already
 * reads sales starts working on it, the invoice, the statement and the credit
 * note included.
 *
 * The one rule that matters more than any other here: the sale must owe
 * exactly what the order charged. A customer agreed a figure at checkout and
 * that figure is the debt. Recomputing it, adding tax to it, or rounding it
 * would change what they owe after they have already paid part of it.
 */
const { clean, fromPaise, toPaise } = require("../utils/money");
const { nextSaleNumber } = require("./seriesNumbers");
const stockLedger = require("./stockLedger");

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
                  WHERE table_schema = 'public' AND table_name = 'sales'
                    AND column_name = 'channel') AS has_channel,
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


/**
 * Converts an accepted order into a confirmed sale.
 *
 * Must be called inside the caller's transaction, so the order status move
 * and the sale creation either commit together or roll back together.
 */
const createSaleFromOrder = async (client, orderId) => {
  const schema = await hasSaleLink(client);
  if (!schema) return null;

  // The order must be confirmed or later: an order still waiting on payment
  // is not goods moving.
  const orderRes = await client.query(
    "SELECT * FROM orders WHERE id = $1 FOR UPDATE",
    [orderId],
  );
  const order = orderRes.rows[0];
  if (!order || !order.supplier_id || !order.party_id) return null;

  // Idempotent: once a sale exists for this order, never write another one.
  const existing = await client.query(
    "SELECT * FROM sales WHERE order_id = $1",
    [orderId],
  );
  if (existing.rows.length > 0) return existing.rows[0];

  const lines = await client.query(
    `SELECT oi.id, oi.product_name, oi.quantity, oi.unit_price, oi.total_price,
            oi.inventory_item_id,
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
  const channel = order.channel || "shop";

  const saleNumber = await nextSaleNumber(client, order.supplier_id, channel);

  const saleCols = [
    "wholesaler_id",
    "party_id",
    "order_id",
    "sale_number",
    "sale_date",
    "source",
    "status",
    "subtotal",
    "discount",
  ];
  if (schema.has_tax) saleCols.push("tax_amount");
  if (schema.has_channel) saleCols.push("channel");
  saleCols.push("total", "notes");

  const saleVals = [
    order.supplier_id,
    order.party_id,
    orderId,
    saleNumber,
    new Date(order.created_at).toISOString().slice(0, 10),
    "retailer",
    "confirmed",
    fromPaise(subtotalPaise),
    0,
  ];
  if (schema.has_tax) saleVals.push(0);
  if (schema.has_channel) saleVals.push(channel);
  saleVals.push(fromPaise(totalPaise), `Order ${order.order_number || orderId}`);

  const placeholders = saleVals.map((_, i) => (i === 4 ? `$${i + 1}::date` : `$${i + 1}`));

  const sale = await client.query(
    `INSERT INTO sales (${saleCols.join(", ")})
     VALUES (${placeholders.join(", ")})
     RETURNING *`,
    saleVals,
  );
  const saleId = sale.rows[0].id;

  for (const line of lines.rows) {
    // The line rate is derived from what was actually charged for the line,
    // not from the listing's price today. A wholesaler who changed their rate
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

  /**
   * THE GOODS LEAVE, and until 18 Sept this path did not say so.
   *
   * stockLedger's own header claimed accepting a shop order moved stock
   * "through the ordinary sale path". It does not: this function writes raw
   * SQL into `sales` and `sale_lines` rather than going through
   * saleController, so every marketplace order left the book stock untouched
   * while supplier_inventory.stock went down. The two numbers drifted apart
   * permanently and the register had no row to explain the gap.
   *
   * No double counting. supplier_inventory.stock is the marketplace
   * RESERVATION, decremented when the order was placed. The ledger is book
   * stock, and this is the first and only time these goods are taken out of
   * it, because the sale that would otherwise have done it is this one.
   */
  await stockLedger.record(client, order.supplier_id, {
    kind: "sale",
    documentId: saleId,
    documentNumber: saleNumber,
    movedOn: new Date(order.created_at).toISOString().slice(0, 10),
    direction: "out",
    note: `Shop order ${order.order_number || orderId}`,
    lines: lines.rows.map((line) => ({
      itemName: clean(line.product_name) || "Item",
      productId: line.inventory_item_id || null,
      quantity: Number(line.quantity) || 1,
      unit: clean(line.unit) || null,
    })),
  });

  return sale.rows[0];
};

/**
 * The order was delivered, so its sale was delivered.
 *
 * One copy, called from both places that move an order to `delivered`:
 * orderStatusService.updateOrderStatus and the PATCH /status route in
 * orderController, which writes the status itself rather than going through
 * the service. It lived only in the service, and the screens call the route,
 * so in the running product marking an order delivered left its sale sitting
 * at "confirmed" for ever: the wholesaler's own book said they still owed the
 * man their goods. follows_order_check.js did not catch it because it drives
 * the service, which was the half that was right.
 *
 * Only from confirmed. A cancelled sale stays cancelled: an order that
 * somehow reaches delivered after its sale was written off is a problem for
 * a person to look at, not one to paper over here.
 */
const markSaleDelivered = async (client, orderId) => {
  if (!(await hasSaleLink(client))) return 0;
  const done = await client.query(
    `UPDATE sales SET status = 'delivered', updated_at = CURRENT_TIMESTAMP
      WHERE order_id = $1 AND status = 'confirmed'`,
    [orderId],
  );
  return done.rowCount;
};

module.exports = { createSaleFromOrder, hasSaleLink, resetSaleLink, markSaleDelivered };
