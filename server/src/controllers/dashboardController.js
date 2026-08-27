const pool = require("../config/db");
const { FEATURES } = require("../config/features");
const invoiceRepository = require("../repositories/invoiceRepository");

// See productController: a zero count means "unknown" while stock is hidden.
const IN_STOCK = FEATURES.STOCK_TRACKING ? " AND stock > 0" : "";

exports.getInventory = async (req, res) => {
  const supplierId = req.user.id;
  try {
    // The billing columns arrive with wholesale3_listing_billing_fields.sql.
    // Naming them unconditionally takes the whole product screen down with a
    // 500 on any database that has not had it run, which has happened twice.
    const has = await invoiceRepository.schemaExtras();
    const billing = has.has_listing_billing
      ? "si.unit, si.pack_size, si.hsn_code, si.gst_percent, si.notes,"
      : `'pcs' AS unit, NULL AS pack_size, NULL AS hsn_code,
         NULL AS gst_percent, NULL AS notes,`;

    const query = `
      SELECT
        si.id,
        p.name,
        p.category,
        si.price,
        si.discount_price,
        si.moq,
        si.stock,
        si.status,
        si.visibility,
        ${billing}
        COALESCE(si.image_url, p.global_image_url) as image
      FROM supplier_inventory si
      JOIN products p ON p.id = si.product_id
      WHERE si.supplier_id = $1
      ORDER BY p.name ASC
    `;
    const result = await pool.query(query, [supplierId]);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching inventory:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getDashboardStats = async (req, res) => {
  const supplierId = req.user.id;

  // Orders reach a supplier through the inventory item; newer ones also carry
  // supplier_id directly. Match either so nothing is missed.
  const OWNED = `(o.supplier_id = $1 OR si.supplier_id = $1)`;

  try {
    const profile = await pool.query(
      `SELECT is_verified, company_name, city, warehouse_city, lat
       FROM wholesaler_profiles WHERE user_id = $1`,
      [supplierId],
    );

    // Inventory health: what is listed, and what is about to run out.
    const inventory = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'Active')                      AS active_listings,
         COUNT(*) FILTER (WHERE status = 'Active' AND stock <= 0)       AS out_of_stock,
         COUNT(*) FILTER (WHERE status = 'Active'${IN_STOCK}
                          AND stock < GREATEST(moq, 1))                 AS low_stock,
         COALESCE(SUM(stock * price) FILTER (WHERE status = 'Active'), 0) AS stock_value
       FROM supplier_inventory WHERE supplier_id = $1`,
      [supplierId],
    );

    // Money and volume. Revenue counts confirmed payments only, so the figure
    // means "received", not "ordered".
    const money = await pool.query(
      `SELECT
         COALESCE(SUM(o.total_amount) FILTER (
           WHERE o.payment_status = 'paid'
             AND o.created_at >= NOW() - INTERVAL '30 days'), 0)        AS revenue_30,
         COALESCE(SUM(o.total_amount) FILTER (
           WHERE o.payment_status = 'paid'
             AND o.created_at >= NOW() - INTERVAL '60 days'
             AND o.created_at <  NOW() - INTERVAL '30 days'), 0)        AS revenue_prev_30,
         COALESCE(SUM(o.total_amount) FILTER (
           WHERE o.payment_status NOT IN ('paid', 'failed')
             AND o.status <> 'cancelled'), 0)                           AS awaiting_payment_value,
         COUNT(*) FILTER (WHERE o.payment_status = 'paid')              AS paid_orders,
         COALESCE(AVG(o.total_amount) FILTER (WHERE o.payment_status = 'paid'), 0) AS avg_order_value,
         COUNT(DISTINCT o.buyer_id)                                     AS customers
       FROM orders o
       LEFT JOIN supplier_inventory si ON si.id = o.inventory_item_id
       WHERE ${OWNED}`,
      [supplierId],
    );

    // What the seller has to do something about right now.
    const pipeline = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE o.status IN ('payment_completed', 'supplier_accepted')) AS needs_action,
         COUNT(*) FILTER (WHERE o.status IN ('processing', 'packed', 'ready_for_pickup')) AS preparing,
         COUNT(*) FILTER (WHERE o.status IN ('shipped', 'in_transit', 'out_for_delivery')) AS in_transit,
         COUNT(*) FILTER (WHERE o.status IN ('delivered', 'completed'))  AS delivered
       FROM orders o
       LEFT JOIN supplier_inventory si ON si.id = o.inventory_item_id
       WHERE ${OWNED}`,
      [supplierId],
    );

    // Rating is real review data, unlike the trust score it replaces.
    let rating = { average: 0, total: 0 };
    try {
      const r = await pool.query(
        `SELECT COALESCE(AVG(overall_experience), 0)::numeric(10,2) AS average,
                COUNT(*) FILTER (WHERE status = 'active') AS total
         FROM seller_reviews WHERE seller_id = $1`,
        [supplierId],
      );
      rating = { average: Number(r.rows[0].average) || 0, total: Number(r.rows[0].total) || 0 };
    } catch {
      // reviews are optional; a missing table must not break the dashboard
    }

    const recentOrders = await pool.query(
      `SELECT
         o.id, o.order_number, o.total_amount AS amount, o.quantity AS qty,
         o.status, o.payment_status, o.created_at AS date,
         COALESCE(items.first_product, p.name) AS product,
         COALESCE(items.item_count, 1) AS item_count,
         COALESCE(wp.company_name, u.first_name || ' ' || u.last_name) AS buyer
       FROM orders o
       LEFT JOIN supplier_inventory si ON si.id = o.inventory_item_id
       LEFT JOIN products p ON p.id = si.product_id
       JOIN users u ON u.id = o.buyer_id
       LEFT JOIN wholesaler_profiles wp ON wp.user_id = u.id
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS item_count, MIN(oi.product_name) AS first_product
         FROM order_items oi WHERE oi.order_id = o.id
       ) items ON TRUE
       WHERE ${OWNED}
       ORDER BY o.created_at DESC
       LIMIT 5`,
      [supplierId],
    );

    const inv = inventory.rows[0];
    const m = money.rows[0];
    const pl = pipeline.rows[0];
    const revenue30 = Number(m.revenue_30);
    const revenuePrev = Number(m.revenue_prev_30);

    res.status(200).json({
      stats: {
        verified: profile.rows[0]?.is_verified || false,
        // Prompts the seller to finish setup rather than showing a fake score.
        warehouseSet: Boolean(
          profile.rows[0]?.warehouse_city || profile.rows[0]?.lat,
        ),
        revenue30,
        // null rather than a misleading 0% when there is no prior period
        revenueTrendPct:
          revenuePrev > 0
            ? Math.round(((revenue30 - revenuePrev) / revenuePrev) * 100)
            : null,
        awaitingPaymentValue: Number(m.awaiting_payment_value),
        avgOrderValue: Number(m.avg_order_value),
        paidOrders: Number(m.paid_orders),
        customers: Number(m.customers),
        activeListings: Number(inv.active_listings),
        lowStock: Number(inv.low_stock),
        outOfStock: Number(inv.out_of_stock),
        stockValue: Number(inv.stock_value),
        needsAction: Number(pl.needs_action),
        preparing: Number(pl.preparing),
        inTransit: Number(pl.in_transit),
        delivered: Number(pl.delivered),
        rating: rating.average,
        reviewCount: rating.total,
      },
      recentOrders: recentOrders.rows,
    });
  } catch (err) {
    console.error("Error fetching dashboard stats:", err);
    res.status(500).json({ message: "Server error" });
  }
};
