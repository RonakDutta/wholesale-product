const pool = require("../config/db");

// @desc    Add a product
// @route   POST /api/products
exports.addProduct = async (req, res) => {
  const {
    productId,
    name,
    category,
    description,
    price,
    bulkPrice,
    moq,
    stock,
    shippingDays,
    imageUrl,
  } = req.body;
  const supplierId = req.user.id;

  try {
    let finalProductId = productId;

    if (!finalProductId) {
      const newProduct = await pool.query(
        "INSERT INTO products (name, category, description, global_image_url) VALUES ($1, $2, $3, $4) RETURNING id",
        [name, category, description, imageUrl],
      );
      finalProductId = newProduct.rows[0].id;
    }

    await pool.query(
      `INSERT INTO supplier_inventory 
      (supplier_id, product_id, price, discount_price, moq, stock, shipping_days, image_url, status) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Active')`,
      [
        supplierId,
        finalProductId,
        price,
        bulkPrice || null,
        moq,
        stock,
        shippingDays,
        imageUrl,
      ],
    );

    res.status(201).json({ message: "Product listed successfully" });
  } catch (err) {
    console.error(err);
    if (err.constraint === "uq_supplier_product") {
      return res.status(400).json({
        message:
          "You are already selling this product. Please edit your existing listing.",
      });
    }
    res.status(500).json({ message: "Server error while adding product" });
  }
};

// @desc    Get all products for the Home Page (with bundled suppliers)
// @route   GET /api/products
exports.getPublicCatalog = async (req, res) => {
  try {
    const query = `
      SELECT 
        p.id, 
        p.name, 
        p.category, 
        p.description,
        p.global_image_url as image,
        MIN(si.price) as starting_price,
        COUNT(si.id) as total_suppliers,
        json_agg(
          json_build_object(
            'id', si.id,
            'supplierId', si.supplier_id,
            'companyName', wp.company_name,
            'price', si.price,
            'discountPrice', si.discount_price,
            'verified', wp.is_verified,
            'moq', si.moq,
            'stock', si.stock
          )
        ) as suppliers
      FROM products p
      JOIN supplier_inventory si ON p.id = si.product_id
      JOIN wholesaler_profiles wp ON si.supplier_id = wp.user_id
      WHERE si.status = 'Active' AND si.stock > 0
      GROUP BY p.id, p.name, p.category, p.description, p.global_image_url
      ORDER BY p.id DESC
    `;
    const result = await pool.query(query);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error fetching catalog" });
  }
};

// @desc    Get a single product and ALL its suppliers
// @route   GET /api/products/:id
exports.getProductById = async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT 
        p.id, 
        p.name, 
        p.category, 
        p.description,
        p.global_image_url as image,
        json_agg(
          json_build_object(
            'id', si.id,
            'supplierId', si.supplier_id,
            'companyName', wp.company_name,
            'image', COALESCE(si.image_url, p.global_image_url),
            'price', si.price,
            'discountPrice', si.discount_price,
            'verified', wp.is_verified,
            'moq', si.moq,
            'stock', si.stock,
            'shippingDays', si.shipping_days,
            'city', wp.city,
            'country', wp.country,
            'responseRate', wp.response_rate,
            'responseTime', wp.response_time,
            'contactPhone', wp.contact_phone
          )
        ) as suppliers
      FROM products p
      JOIN supplier_inventory si ON p.id = si.product_id
      JOIN wholesaler_profiles wp ON si.supplier_id = wp.user_id
      WHERE p.id = $1 AND si.status = 'Active' AND si.stock > 0
      GROUP BY p.id, p.name, p.category, p.description, p.global_image_url
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error fetching product" });
  }
};

/// @desc    Update a supplier's inventory listing (price, stock, MOQ, etc.)
// @route   PUT /api/products/inventory/:id
exports.updateInventoryItem = async (req, res) => {
  const { id } = req.params;
  const supplierId = req.user.id;
  const { price, bulkPrice, moq, stock, shippingDays, imageUrl, status } =
    req.body;

  try {
    const result = await pool.query(
      `UPDATE supplier_inventory
       SET price = COALESCE($1, price),
           discount_price = COALESCE($2, discount_price),
           moq = COALESCE($3, moq),
           stock = COALESCE($4, stock),
           shipping_days = COALESCE($5, shipping_days),
           image_url = COALESCE($6, image_url),
           status = COALESCE($7, status)
       WHERE id = $8 AND supplier_id = $9
       RETURNING *`,
      [
        price,
        bulkPrice,
        moq,
        stock,
        shippingDays,
        imageUrl,
        status,
        id,
        supplierId,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Listing not found or you don't have permission to edit it",
      });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    // Postgres CHECK constraint violation (e.g. discount_price > price, stock < 0, etc.)
    if (err.code === "23514") {
      return res.status(400).json({
        message:
          "Invalid values — check that bulk price isn't higher than base price, and stock/MOQ aren't negative.",
      });
    }
    res.status(500).json({ message: "Server error while updating product" });
  }
};

// @desc    Get a single inventory listing (to prefill the edit form)
// @route   GET /api/products/inventory/:id
exports.getInventoryItemById = async (req, res) => {
  const { id } = req.params;
  const supplierId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT si.*, p.name, p.category, p.description, p.global_image_url
       FROM supplier_inventory si
       JOIN products p ON p.id = si.product_id
       WHERE si.id = $1 AND si.supplier_id = $2`,
      [id, supplierId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Listing not found" });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error fetching listing" });
  }
};

// @desc    Delete (or soft-delete to Draft if active orders exist)
// @route   DELETE /api/products/inventory/:id
exports.deleteInventoryItem = async (req, res) => {
  const { id } = req.params;
  const supplierId = req.user.id;

  try {
    const listing = await pool.query(
      `SELECT id FROM supplier_inventory WHERE id = $1 AND supplier_id = $2`,
      [id, supplierId],
    );

    if (listing.rows.length === 0) {
      return res.status(404).json({
        message: "Listing not found or you don't have permission to delete it",
      });
    }

    const activeOrders = await pool.query(
      `SELECT id FROM orders
       WHERE inventory_item_id = $1 AND status NOT IN ('Delivered', 'Cancelled')`,
      [id],
    );

    if (activeOrders.rows.length > 0) {
      await pool.query(
        `UPDATE supplier_inventory SET status = 'Draft' WHERE id = $1`,
        [id],
      );
      return res.status(200).json({
        message:
          "Listing has active orders — marked as Draft instead of deleted",
        softDeleted: true,
      });
    }

    await pool.query(`DELETE FROM supplier_inventory WHERE id = $1`, [id]);
    res
      .status(200)
      .json({ message: "Listing deleted successfully", softDeleted: false });
  } catch (err) {
    console.error(err);
    // Fallback: FK constraint (ON DELETE RESTRICT) blocked it —
    // covers any order placed between our check and the DELETE
    if (err.code === "23503") {
      await pool.query(
        `UPDATE supplier_inventory SET status = 'Draft' WHERE id = $1`,
        [id],
      );
      return res.status(200).json({
        message:
          "Listing has order history — marked as Draft instead of deleted",
        softDeleted: true,
      });
    }
    res.status(500).json({ message: "Server error while deleting product" });
  }
};
