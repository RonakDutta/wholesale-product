const pool = require("../config/db");

exports.getInventory = async (req, res) => {
  const supplierId = req.user.id;
  try {
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
        COALESCE(si.image_url, p.global_image_url) as image
      FROM supplier_inventory si
      JOIN products p ON p.id = si.product_id
      WHERE si.supplier_id = $1
      ORDER BY si.id DESC
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
  try {
    // 1. Get Profile Stats
    const profile = await pool.query(
      "SELECT is_verified, response_rate, trust_score FROM wholesaler_profiles WHERE user_id = $1",
      [supplierId],
    );

    // 2. Count Total Active Products
    const products = await pool.query(
      "SELECT COUNT(*) FROM supplier_inventory WHERE supplier_id = $1 AND status = 'Active'",
      [supplierId],
    );

    // 3. Get Recent Orders
    //    Mirrors getSupplierOrders (/api/orders/supplier) so the overview and
    //    the Orders page never disagree. wholesaler_profiles must be LEFT
    //    JOINed: an inner join silently hid every order from a buyer who has
    //    no seller profile, which is most buyers.
    const recentOrders = await pool.query(
      `
      SELECT
        o.id,
        o.order_number,
        o.total_amount as amount,
        o.quantity as qty,
        o.status,
        o.payment_status,
        p.name as product,
        COALESCE(wp.company_name, u.first_name || ' ' || u.last_name) as buyer,
        o.created_at as date
      FROM orders o
      JOIN supplier_inventory si ON o.inventory_item_id = si.id
      JOIN products p ON si.product_id = p.id
      JOIN users u ON o.buyer_id = u.id
      LEFT JOIN wholesaler_profiles wp ON u.id = wp.user_id
      WHERE si.supplier_id = $1
      ORDER BY o.created_at DESC
      LIMIT 5
    `,
      [supplierId],
    );

    // 4. Count Completed Orders
    //    Statuses are lowercase in the order lifecycle; 'Delivered' never
    //    matched, so this always returned 0.
    const completed = await pool.query(
      `
      SELECT COUNT(o.id)
      FROM orders o
      JOIN supplier_inventory si ON o.inventory_item_id = si.id
      WHERE si.supplier_id = $1 AND o.status IN ('delivered', 'completed')
    `,
      [supplierId],
    );

    res.status(200).json({
      stats: {
        verified: profile.rows[0]?.is_verified || false,
        responseRate: profile.rows[0]?.response_rate || "0%",
        trustScore: profile.rows[0]?.trust_score || "0%",
        totalProducts: parseInt(products.rows[0].count),
        completedOrders: parseInt(completed.rows[0].count),
      },
      recentOrders: recentOrders.rows,
    });
  } catch (err) {
    console.error("Error fetching dashboard stats:", err);
    res.status(500).json({ message: "Server error" });
  }
};
