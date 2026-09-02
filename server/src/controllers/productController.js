const pool = require("../config/db");
const { FEATURES } = require("../config/features");
const { clean, optionalNumber } = require("../utils/money");
const invoiceRepository = require("../repositories/invoiceRepository");

/**
 * Hides a sold out listing from the catalogue, but only while stock counts
 * are believed. With stock hidden, a listing created since carries a count of
 * zero, and this clause would have hidden every one of them from search and
 * from the shop page. See config/features.
 */
const IN_STOCK = FEATURES.STOCK_TRACKING ? "AND si.stock > 0" : "";

/**
 * How a listing reaches the seller behind it.
 *
 * LEFT, and this matters more than it looks. These joins used to be inner, so
 * a wholesaler who had signed up but not filled in his business details had
 * every one of his listings vanish from search, from the product page and
 * from the shop page. No error, no empty state, no way for him to tell: the
 * products simply were not there. A new seller's first hour is exactly when
 * his profile is least likely to be complete.
 *
 * users is joined too so there is always a name to show. A person who has not
 * named his firm yet still has his own name, and "Ramesh Kumar" is a better
 * answer than hiding his stock.
 */
const SELLER_JOIN = `
      JOIN users su ON su.id = si.supplier_id
      LEFT JOIN wholesaler_profiles wp ON wp.user_id = si.supplier_id`;

// The firm's name if he has given one, otherwise his own.
const SELLER_NAME = `
      COALESCE(NULLIF(btrim(wp.company_name), ''),
               NULLIF(btrim(su.first_name || ' ' || COALESCE(su.last_name, '')), ''),
               'Wholesaler')`;

// Where a listing is allowed to appear. See migrations/listing_visibility.sql.
//   public      catalogue, search, comparison, and the storefront
//   storefront  the wholesaler's own page only, never the shared catalogue
//   private     nowhere public, the wholesaler's dashboard only
const VISIBILITY_LEVELS = ["public", "storefront", "private"];

// An unrecognised value would otherwise fail the CHECK constraint with a 500.
// Falling back to the caller's current setting (or 'public' on create) keeps
// the old clients working, since they send no visibility at all.
const normalizeVisibility = (value, fallback = "public") => {
  const level = String(value || "").toLowerCase();
  return VISIBILITY_LEVELS.includes(level) ? level : fallback;
};

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
    visibility,
    unit,
    packSize,
    hsnCode,
    gstPercent,
    notes,
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

    // The billing columns arrive with wholesale3_listing_billing_fields.sql.
    // Until it has been run a product can still be listed, it just carries no
    // unit or tax rate, which is what the older shape always did.
    const has = await invoiceRepository.schemaExtras();
    const billingColumns = has.has_listing_billing
      ? ", unit, pack_size, hsn_code, gst_percent, notes"
      : "";
    const billingValues = has.has_listing_billing ? ", $10, $11, $12, $13, $14" : "";
    const billingParams = has.has_listing_billing
      ? [
          clean(unit) || "pcs",
          optionalNumber(packSize),
          clean(hsnCode),
          optionalNumber(gstPercent),
          clean(notes),
        ]
      : [];

    await pool.query(
      `INSERT INTO supplier_inventory
      (supplier_id, product_id, price, discount_price, moq, stock, shipping_days, image_url, status, visibility${billingColumns})
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Active', $9${billingValues})`,
      [
        supplierId,
        finalProductId,
        price,
        bulkPrice || null,
        moq,
        stock,
        shippingDays,
        imageUrl,
        normalizeVisibility(visibility),
        ...billingParams,
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
            'companyName', ${SELLER_NAME},
            'price', si.price,
            'discountPrice', si.discount_price,
            'verified', COALESCE(wp.is_verified, false),
            'moq', si.moq,
            'stock', si.stock
          )
        ) as suppliers
      FROM products p
      JOIN supplier_inventory si ON p.id = si.product_id
      ${SELLER_JOIN}
      WHERE si.status = 'Active' AND si.visibility = 'public'
        ${IN_STOCK}
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
            'companyName', ${SELLER_NAME},
            'image', COALESCE(si.image_url, p.global_image_url),
            'price', si.price,
            'discountPrice', si.discount_price,
            'verified', COALESCE(wp.is_verified, false),
            'moq', si.moq,
            'stock', si.stock,
            'shippingDays', si.shipping_days,
            'city', wp.city,
            'country', wp.country,
            'gstVerified', (wp.gstin IS NOT NULL AND wp.gstin <> ''),
            'contactPhone', COALESCE(wp.contact_phone, su.phone)
          )
        ) as suppliers
      FROM products p
      JOIN supplier_inventory si ON p.id = si.product_id
      ${SELLER_JOIN}
      WHERE p.id = $1 AND si.status = 'Active'
        ${IN_STOCK}
        AND si.visibility = 'public'
      GROUP BY p.id, p.name, p.category, p.description, p.global_image_url
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    let reviewSummary = { rows: [{ average_rating: 0, total_reviews: 0 }] };
    try {
      reviewSummary = await pool.query(
        `SELECT COALESCE(AVG(rating), 0)::numeric(10,2) AS average_rating,
                COUNT(*) FILTER (WHERE status = 'active') AS total_reviews
         FROM product_reviews WHERE product_id = $1`,
        [id],
      );
    } catch (reviewErr) {
      console.warn('Review summary query failed:', reviewErr.message);
    }

    const product = result.rows[0];
    product.reviewSummary = reviewSummary.rows[0];

    // Per-supplier track record. These are counted from real orders and
    // reviews, so a new seller honestly shows zero instead of a stock figure.
    const supplierIds = [
      ...new Set((product.suppliers || []).map((s) => s.supplierId)),
    ].filter(Boolean);

    if (supplierIds.length > 0) {
      const statsById = new Map();

      try {
        const fulfilment = await pool.query(
          `SELECT COALESCE(o.supplier_id, si.supplier_id) AS supplier_id,
                  COUNT(*) FILTER (WHERE o.status IN ('delivered', 'completed')) AS fulfilled_orders
           FROM orders o
           LEFT JOIN supplier_inventory si ON si.id = o.inventory_item_id
           WHERE COALESCE(o.supplier_id, si.supplier_id) = ANY($1::uuid[])
           GROUP BY 1`,
          [supplierIds],
        );
        fulfilment.rows.forEach((row) => {
          statsById.set(row.supplier_id, {
            fulfilledOrders: Number(row.fulfilled_orders) || 0,
          });
        });
      } catch (fulfilmentErr) {
        console.warn("Supplier fulfilment stats query failed:", fulfilmentErr.message);
      }

      // Counts what a visitor would actually find on the storefront, so the
      // "view all N products" link never promises more than it shows.
      // Private listings are excluded for the same reason.
      try {
        const catalog = await pool.query(
          `SELECT supplier_id,
                  COUNT(*) AS catalog_size,
                  COUNT(*) FILTER (WHERE visibility = 'storefront') AS exclusive_count
           FROM supplier_inventory
           WHERE supplier_id = ANY($1::uuid[])
             AND status = 'Active'
             AND visibility IN ('public', 'storefront')
           GROUP BY supplier_id`,
          [supplierIds],
        );
        catalog.rows.forEach((row) => {
          const entry = statsById.get(row.supplier_id) || {};
          entry.catalogSize = Number(row.catalog_size) || 0;
          entry.exclusiveCount = Number(row.exclusive_count) || 0;
          statsById.set(row.supplier_id, entry);
        });
      } catch (catalogErr) {
        console.warn("Supplier catalog counts query failed:", catalogErr.message);
      }

      try {
        const sellerRatings = await pool.query(
          `SELECT seller_id,
                  COALESCE(AVG(overall_experience), 0)::numeric(10,2) AS rating,
                  COUNT(*) FILTER (WHERE status = 'active') AS reviews
           FROM seller_reviews
           WHERE seller_id = ANY($1::uuid[])
           GROUP BY seller_id`,
          [supplierIds],
        );
        sellerRatings.rows.forEach((row) => {
          const entry = statsById.get(row.seller_id) || {};
          entry.rating = Number(row.rating) || 0;
          entry.reviews = Number(row.reviews) || 0;
          statsById.set(row.seller_id, entry);
        });
      } catch (ratingErr) {
        console.warn("Supplier rating query failed:", ratingErr.message);
      }

      product.suppliers = product.suppliers.map((supplier) => ({
        fulfilledOrders: 0,
        catalogSize: 0,
        exclusiveCount: 0,
        rating: 0,
        reviews: 0,
        ...supplier,
        ...(statsById.get(supplier.supplierId) || {}),
      }));
    }

    res.status(200).json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error fetching product" });
  }
};

// @desc    One listing by its own id, whatever its visibility. This is the
//          link a wholesaler shares on WhatsApp for a private item: the id is
//          a random UUID, so the page is unlisted rather than secret, the same
//          way an unlisted video works. Nothing enumerates it, and it appears
//          in no catalogue, search result or storefront.
// @route   GET /api/products/listing/:inventoryId
exports.getListingById = async (req, res) => {
  const { inventoryId } = req.params;

  // A malformed id would otherwise reach Postgres and come back as a 500.
  if (!/^[0-9a-f-]{36}$/i.test(String(inventoryId))) {
    return res.status(404).json({ message: "Listing not found" });
  }

  try {
    const result = await pool.query(
      `SELECT
         si.id            AS inventory_id,
         si.price,
         si.discount_price,
         si.moq,
         si.stock,
         si.shipping_days,
         si.visibility,
         si.status,
         p.id             AS product_id,
         p.name,
         p.category,
         p.description,
         COALESCE(si.image_url, p.global_image_url) AS image,
         u.id             AS supplier_id,
         COALESCE(wp.company_name, u.first_name || ' ' || u.last_name) AS company_name,
         wp.city,
         wp.country,
         wp.is_verified,
         wp.contact_phone
       FROM supplier_inventory si
       JOIN products p ON p.id = si.product_id
       JOIN users u ON u.id = si.supplier_id
       LEFT JOIN wholesaler_profiles wp ON wp.user_id = si.supplier_id
       WHERE si.id = $1 AND si.status = 'Active'`,
      [inventoryId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Listing not found" });
    }

    const row = result.rows[0];
    return res.status(200).json({
      inventoryId: row.inventory_id,
      productId: row.product_id,
      name: row.name,
      category: row.category,
      description: row.description,
      image: row.image,
      price: Number(row.price) || 0,
      discountPrice: row.discount_price ? Number(row.discount_price) : null,
      moq: row.moq,
      stock: row.stock,
      shippingDays: row.shipping_days,
      visibility: row.visibility,
      // A private listing has no storefront to fall back to, so the page says
      // so rather than linking the buyer somewhere that will not show it.
      onStorefront: row.visibility !== "private",
      supplier: {
        id: row.supplier_id,
        companyName: row.company_name,
        city: row.city,
        country: row.country,
        verified: row.is_verified ?? false,
        contactPhone: row.contact_phone,
      },
    });
  } catch (err) {
    console.error("Error fetching listing:", err);
    res.status(500).json({ message: "Server error fetching listing" });
  }
};

// @desc    Public wholesaler profile with their active listings
// @route   GET /api/products/wholesaler/:id
exports.getWholesalerById = async (req, res) => {
  const { id } = req.params;
  try {
    const profileResult = await pool.query(
      `SELECT
         u.id,
         u.first_name || ' ' || u.last_name AS contact_name,
         u.email,
         wp.company_name,
         wp.city,
         wp.country,
         wp.is_verified,
         wp.gst_verified,
         wp.years_in_business,
         wp.contact_phone,
         u.created_at AS member_since
       FROM users u
       LEFT JOIN wholesaler_profiles wp ON wp.user_id = u.id
       WHERE u.id = $1`,
      [id],
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ message: "Wholesaler not found" });
    }

    // The storefront is the one place a wholesaler's off-catalogue range is
    // shown. 'private' listings stay out of it: those are dashboard only.
    // Storefront items are listed first, because they are the reason to visit.
    const listingsResult = await pool.query(
      `SELECT
         si.id            AS inventory_id,
         si.price,
         si.discount_price,
         si.moq,
         si.stock,
         si.shipping_days,
         si.visibility,
         p.id             AS product_id,
         p.name,
         p.category,
         p.description,
         COALESCE(si.image_url, p.global_image_url) AS image
       FROM supplier_inventory si
       JOIN products p ON p.id = si.product_id
       WHERE si.supplier_id = $1
         AND si.status = 'Active'
         AND si.visibility IN ('public', 'storefront')
       ORDER BY (si.visibility = 'storefront') DESC, si.created_at DESC`,
      [id],
    );

    // Orders actually fulfilled: a fact, unlike the trust score it replaces.
    let fulfilledOrders = 0;
    try {
      const fulfilled = await pool.query(
        `SELECT COUNT(*)::int AS count
         FROM orders o
         LEFT JOIN supplier_inventory si ON si.id = o.inventory_item_id
         WHERE (o.supplier_id = $1 OR si.supplier_id = $1)
           AND o.status IN ('delivered', 'completed')`,
        [id],
      );
      fulfilledOrders = fulfilled.rows[0]?.count || 0;
    } catch (err) {
      console.warn("Fulfilled order count failed:", err.message);
    }

    // Seller rating is best-effort: the table may be empty on a new profile.
    let ratingRow = { average_rating: 0, total_reviews: 0 };
    try {
      const ratingResult = await pool.query(
        `SELECT COALESCE(AVG(overall_experience), 0)::numeric(10,2) AS average_rating,
                COUNT(*) FILTER (WHERE status = 'active')          AS total_reviews
         FROM seller_reviews WHERE seller_id = $1`,
        [id],
      );
      ratingRow = ratingResult.rows[0] || ratingRow;
    } catch (ratingErr) {
      console.warn("Seller rating query failed:", ratingErr.message);
    }

    const profile = profileResult.rows[0];
    return res.status(200).json({
      id: profile.id,
      companyName: profile.company_name || profile.contact_name,
      contactName: profile.contact_name,
      city: profile.city,
      country: profile.country,
      verified: profile.is_verified ?? false,
      gstVerified: profile.gst_verified ?? false,
      yearsInBusiness: profile.years_in_business,
      contactPhone: profile.contact_phone,
      memberSince: profile.member_since,
      rating: Number(ratingRow.average_rating) || 0,
      totalReviews: Number(ratingRow.total_reviews) || 0,
      productCount: listingsResult.rows.length,
      // How much of the range is only available here. The storefront uses it
      // to decide whether to show the "only here" section at all.
      exclusiveCount: listingsResult.rows.filter(
        (row) => row.visibility === "storefront",
      ).length,
      fulfilledOrders,
      products: listingsResult.rows.map((row) => ({
        id: row.product_id,
        inventoryId: row.inventory_id,
        name: row.name,
        category: row.category,
        description: row.description,
        image: row.image,
        price: Number(row.price) || 0,
        discountPrice: row.discount_price ? Number(row.discount_price) : null,
        moq: row.moq,
        stock: row.stock,
        shippingDays: row.shipping_days,
        visibility: row.visibility,
        // A storefront item has no comparison page to link to, because it is
        // deliberately absent from the shared catalogue.
        exclusive: row.visibility === "storefront",
      })),
    });
  } catch (err) {
    console.error("Error fetching wholesaler:", err);
    res.status(500).json({ message: "Server error fetching wholesaler" });
  }
};

/// @desc    Update a supplier's inventory listing (price, stock, MOQ, etc.)
// @route   PUT /api/products/inventory/:id
exports.updateInventoryItem = async (req, res) => {
  const { id } = req.params;
  const supplierId = req.user.id;
  const {
    price,
    bulkPrice,
    moq,
    stock,
    shippingDays,
    imageUrl,
    status,
    visibility,
    unit,
    packSize,
    hsnCode,
    gstPercent,
    notes,
  } = req.body;

  try {
    let nextVisibility;
    if (visibility !== undefined && visibility !== null && visibility !== "") {
      nextVisibility = normalizeVisibility(visibility, null);
      if (!nextVisibility) {
        return res.status(400).json({
          message: `Visibility must be one of: ${VISIBILITY_LEVELS.join(", ")}`,
        });
      }
    }

    /**
     * Only the columns the caller actually sent are written.
     *
     * This used to COALESCE every column against itself, which kept a screen
     * that sends one field from blanking the rest, but it also meant null
     * read as "leave alone" and an emptied box could never clear anything: a
     * wholesaler could put an HSN code on a product and had no way to take a
     * wrong one off again.
     *
     * Absent from the body means leave alone. Present and null means clear.
     * The product screen sends one key when a rate is edited in place, and
     * the edit form sends the lot, and both come out right.
     */
    const sent = (key) => Object.prototype.hasOwnProperty.call(req.body, key);
    const sets = [];
    const params = [];
    const put = (column, value) => {
      params.push(value);
      sets.push(`${column} = $${params.length}`);
    };

    if (sent("price")) put("price", price);
    if (sent("bulkPrice")) put("discount_price", bulkPrice);
    if (sent("moq")) put("moq", moq);
    if (sent("stock")) put("stock", stock);
    if (sent("shippingDays")) put("shipping_days", shippingDays);
    if (sent("imageUrl")) put("image_url", imageUrl);
    if (sent("status")) put("status", status);
    if (nextVisibility) put("visibility", nextVisibility);

    // See addProduct: these columns only exist once the migration has run.
    const has = await invoiceRepository.schemaExtras();
    if (has.has_listing_billing) {
      // Unit has no "none": a product is sold by something, so a blank here
      // is a caller not mentioning it rather than a wholesaler clearing it.
      if (sent("unit") && clean(unit)) put("unit", clean(unit));
      if (sent("packSize")) put("pack_size", optionalNumber(packSize));
      if (sent("hsnCode")) put("hsn_code", clean(hsnCode));
      if (sent("gstPercent")) put("gst_percent", optionalNumber(gstPercent));
      if (sent("notes")) put("notes", clean(notes));
    }

    if (sets.length === 0) {
      return res.status(400).json({ message: "Nothing to update." });
    }

    params.push(id, supplierId);
    const result = await pool.query(
      `UPDATE supplier_inventory
          SET ${sets.join(", ")}
        WHERE id = $${params.length - 1} AND supplier_id = $${params.length}
        RETURNING *`,
      params,
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
          "Invalid values - check that bulk price isn't higher than base price, and stock/MOQ aren't negative.",
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
          "Listing has active orders - marked as Draft instead of deleted",
        softDeleted: true,
      });
    }

    await pool.query(`DELETE FROM supplier_inventory WHERE id = $1`, [id]);
    res
      .status(200)
      .json({ message: "Listing deleted successfully", softDeleted: false });
  } catch (err) {
    console.error(err);
    if (err.code === "23503") {
      await pool.query(
        `UPDATE supplier_inventory SET status = 'Draft' WHERE id = $1`,
        [id],
      );
      return res.status(200).json({
        message:
          "Listing has order history - marked as Draft instead of deleted",
        softDeleted: true,
      });
    }
    res.status(500).json({ message: "Server error while deleting product" });
  }
};

// @desc    Get WhatsApp contact link for supplier
// @route   GET /api/products/:id/contact
exports.contactSupplier = async (req, res) => {
  const { id } = req.params;
  const { supplierId } = req.query;
  const buyer = req.user;

  console.log("Contact supplier request:", { productId: id, supplierId, buyerRole: buyer.role, buyerId: buyer.id });

  // Check if user is a buyer
  if (!["buyer", "both"].includes(buyer.role)) {
    console.log("Unauthorized contact attempt - user role:", buyer.role);
    return res.status(403).json({
      success: false,
      message: "Only buyers can contact suppliers"
    });
  }

  try {
    // Get product details with supplier information
    let query = `
      SELECT 
        p.id as product_id,
        p.name as product_name,
        si.supplier_id,
        wp.contact_phone,
        ${SELLER_NAME} AS company_name,
        su.phone as user_phone
      FROM products p
      JOIN supplier_inventory si ON p.id = si.product_id
      ${SELLER_JOIN}
      WHERE p.id = $1 AND si.status = 'Active' AND si.visibility <> 'private'
    `;

    let queryParams = [id];

    // If specific supplierId is provided, filter by it
    if (supplierId) {
      query += ` AND si.supplier_id = $2`;
      queryParams.push(supplierId);
    }

    console.log("Executing query with params:", queryParams);
    const result = await pool.query(query, queryParams);
    console.log("Query result rows:", result.rows.length);

    if (result.rows.length === 0) {
      console.log("No active suppliers found for product:", id);
      return res.status(404).json({
        success: false,
        message: "Product not found or no active suppliers"
      });
    }

    const productData = result.rows[0];
    console.log("Product data:", {
      productId: productData.product_id,
      productName: productData.product_name,
      supplierId: productData.supplier_id,
      contactPhone: productData.contact_phone,
      userPhone: productData.user_phone
    });

    // Check if supplier has contact phone
    const supplierPhone = productData.contact_phone || productData.user_phone;

    if (!supplierPhone) {
      console.log("No contact phone found for supplier:", productData.supplier_id);
      return res.status(404).json({
        success: false,
        message: "Supplier contact information not available"
      });
    }

    // Default message, used only when the client does not supply its own.
    const message =
      typeof req.query.message === "string" && req.query.message.trim()
        ? req.query.message.trim()
        : `Hello, I am interested in your ${productData.product_name} product. Please share more details.`;

    const normalizedPhone = String(supplierPhone).replace(/\D/g, "");
    const whatsappUrl = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;

    console.log("WhatsApp URL generated successfully");
    return res.json({
      success: true,
      whatsappUrl,
      // Returned so the client can compose the buyer's chosen message itself
      phone: normalizedPhone,
      productName: productData.product_name,
      companyName: productData.company_name,
    });

  } catch (err) {
    console.error("Contact supplier error:", err);
    res.status(500).json({
      success: false,
      message: "Server error while generating contact link"
    });
  }
};
