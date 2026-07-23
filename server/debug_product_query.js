const pool = require('./src/config/db');

(async () => {
  try {
    const id = 'b0201bed-29ca-49c6-8c29-679339c4efa1';
    const q = `SELECT p.id, p.name, p.category, p.description, p.global_image_url AS image,
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
      ) AS suppliers
    FROM products p
    JOIN supplier_inventory si ON p.id = si.product_id
    JOIN wholesaler_profiles wp ON si.supplier_id = wp.user_id
    WHERE p.id = $1 AND si.status = 'Active' AND si.stock > 0
    GROUP BY p.id, p.name, p.category, p.description, p.global_image_url`;

    console.log('query:', q);
    const prod = await pool.query(q, [id]);
    console.log('rows:', JSON.stringify(prod.rows, null, 2));
  } catch (e) {
    console.error('ERROR:', e);
  } finally {
    await pool.end();
  }
})();
