const pool = require("../config/db");

// @desc    Get wholesaler profile
// @route   GET /api/profile
exports.getProfile = async (req, res) => {
  try {
    const profile = await pool.query(
      `SELECT wp.*, u.email, u.first_name, u.last_name 
       FROM wholesaler_profiles wp 
       JOIN users u ON wp.user_id = u.id 
       WHERE wp.user_id = $1`,
      [req.user.id],
    );

    if (profile.rows.length === 0) {
      return res.status(404).json({ message: "Profile not found" });
    }

    res.status(200).json(profile.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Update wholesaler profile
// @route   PUT /api/profile
exports.updateProfile = async (req, res) => {
  const {
    companyName, contactPhone, gstin, upiId, city, country,
    warehouseAddress, warehouseCity, warehouseState, warehousePincode,
    warehouseLat, warehouseLng,
  } = req.body;

  // A pin placed on the map is authoritative; text typed without one is
  // geocoded afterwards, which is less precise.
  const lat = Number(warehouseLat);
  const lng = Number(warehouseLng);
  const hasPin = Number.isFinite(lat) && Number.isFinite(lng);

  try {
    const updatedProfile = await pool.query(
      `UPDATE wholesaler_profiles 
       SET company_name = COALESCE($1, company_name),
           contact_phone = COALESCE($2, contact_phone),
           gstin = COALESCE($3, gstin),
           upi_id = COALESCE($4, upi_id),
           city = COALESCE($5, city),
           country = COALESCE($6, country),
           warehouse_address = COALESCE($7, warehouse_address),
           warehouse_city = COALESCE($8, warehouse_city),
           warehouse_state = COALESCE($9, warehouse_state),
           warehouse_pincode = COALESCE($10, warehouse_pincode),
           lat = COALESCE($11, lat),
           lng = COALESCE($12, lng),
           warehouse_pinned = CASE WHEN $11::numeric IS NULL
                                   THEN warehouse_pinned ELSE TRUE END,
           geocoded_at = CASE WHEN $11::numeric IS NULL
                              THEN geocoded_at ELSE CURRENT_TIMESTAMP END,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $13
       RETURNING *`,
      [
        companyName, contactPhone, gstin, upiId, city, country,
        warehouseAddress, warehouseCity, warehouseState, warehousePincode,
        hasPin ? lat : null, hasPin ? lng : null,
        req.user.id,
      ],
    );

    // No pin, but the address changed: resolve it in the background so the
    // tracking map has an origin. Never awaited - saving must not wait on a
    // rate-limited geocoder.
    if (!hasPin && (warehouseAddress || warehouseCity)) {
      const { geocodeAddress } = require("../services/geocodingService");
      geocodeAddress({
        street: warehouseAddress,
        city: warehouseCity || city,
        state: warehouseState,
        pincode: warehousePincode,
        country: country || "India",
      })
        .then((point) => {
          if (!point) return;
          return pool.query(
            `UPDATE wholesaler_profiles
             SET lat = $1, lng = $2, geocoded_at = CURRENT_TIMESTAMP,
                 warehouse_pinned = FALSE
             WHERE user_id = $3 AND warehouse_pinned IS NOT TRUE`,
            [point.lat, point.lng, req.user.id],
          );
        })
        .catch(() => {});
    }

    res.status(200).json({
      message: "Profile updated successfully",
      profile: updatedProfile.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error updating profile" });
  }
};
