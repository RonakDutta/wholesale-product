const pool = require("../config/db");

// @desc    Get all orders placed with the logged-in supplier
// @route   GET /api/orders/supplier
exports.getSupplierOrders = async (req, res) => {
  const supplierId = req.user.id;

  try {
    const query = `
      SELECT 
        o.id,
        COALESCE(wp.company_name, u.first_name || ' ' || u.last_name) as buyer,
        u.first_name || ' ' || u.last_name as contact,
        p.name as product,
        o.quantity as qty,
        o.total_amount as amount,
        o.status,
        o.created_at as date
      FROM orders o
      JOIN supplier_inventory si ON o.inventory_item_id = si.id
      JOIN products p ON si.product_id = p.id
      JOIN users u ON o.buyer_id = u.id
      LEFT JOIN wholesaler_profiles wp ON u.id = wp.user_id
      WHERE si.supplier_id = $1
      ORDER BY o.created_at DESC
    `;
    const result = await pool.query(query, [supplierId]);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching supplier orders:", err);
    res.status(500).json({ message: "Server error fetching orders" });
  }
};
