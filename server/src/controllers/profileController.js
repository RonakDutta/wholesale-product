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
  const { companyName, contactPhone, gstin, upiId, city, country } = req.body;

  try {
    const updatedProfile = await pool.query(
      `UPDATE wholesaler_profiles 
       SET company_name = COALESCE($1, company_name),
           contact_phone = COALESCE($2, contact_phone),
           gstin = COALESCE($3, gstin),
           upi_id = COALESCE($4, upi_id),
           city = COALESCE($5, city),
           country = COALESCE($6, country),
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $7
       RETURNING *`,
      [companyName, contactPhone, gstin, upiId, city, country, req.user.id],
    );

    res.status(200).json({
      message: "Profile updated successfully",
      profile: updatedProfile.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error updating profile" });
  }
};
