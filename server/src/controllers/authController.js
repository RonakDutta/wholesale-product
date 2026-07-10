const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

exports.register = async (req, res) => {
  const { firstName, lastName, email, phone, password, role } = req.body;
  try {
    const userExists = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email],
    );
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await pool.query(
      "INSERT INTO users (first_name, last_name, email, phone, password_hash, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, role",
      [firstName, lastName, email, phone, passwordHash, role],
    );

    if (role === "seller" || role === "both") {
      await pool.query(
        "INSERT INTO wholesaler_profiles (user_id) VALUES ($1)",
        [newUser.rows[0].id],
      );
    }

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await pool.query(
      "SELECT id, password_hash, role FROM users WHERE email = $1",
      [email],
    );
    if (user.rows.length === 0) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.rows[0].password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.rows[0].id, role: user.rows[0].role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.status(200).json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await pool.query(
      'SELECT id, first_name as "firstName", last_name as "lastName", email, role, phone FROM users WHERE id = $1',
      [req.user.id],
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ user: user.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Upgrade a buyer to a seller
// @route   POST /api/auth/upgrade
exports.upgradeToSeller = async (req, res) => {
  const userId = req.user.id;
  const { companyName, gstin, phone, city } = req.body;

  try {
    const userResult = await pool.query(
      "SELECT role FROM users WHERE id = $1",
      [userId],
    );
    const currentRole = userResult.rows[0].role;

    if (currentRole === "seller" || currentRole === "both") {
      return res
        .status(400)
        .json({ message: "You are already registered as a seller." });
    }

    await pool.query("UPDATE users SET role = 'both' WHERE id = $1", [userId]);

    await pool.query(
      `INSERT INTO wholesaler_profiles (user_id, company_name, gstin, contact_phone, city, is_verified) 
       VALUES ($1, $2, $3, $4, $5, false)`,
      [userId, companyName, gstin, phone, city],
    );

    res
      .status(200)
      .json({ message: "Successfully upgraded to a seller account!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error upgrading account" });
  }
};
