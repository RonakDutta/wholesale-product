const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const pool = require("../config/db");
const { clean } = require("../utils/money");
const { businessId } = require("../middlewares/businessContext");
const {
  PERMISSIONS,
  DEFAULT_PERMISSIONS,
  validPermissions,
} = require("../services/staffAccess");

/**
 * A wholesaler's employees.
 *
 * Every route here is owner only, enforced at the router. An employee who
 * could edit permissions could give himself the rest of them, so this is the
 * one part of the dashboard that cannot be delegated.
 *
 * Rows are disabled rather than deleted. An employee's name sits on dispatches,
 * payments and status history, and deleting the row would either break those
 * or, worse, leave them reading as somebody else's work.
 */

const INVITE_DAYS = 14;

// The invite code is the credential, so it is random rather than derived from
// anything about the person, and long enough that guessing is not a strategy.
const newInviteCode = () => crypto.randomBytes(24).toString("base64url");

const shape = (row) => ({
  id: row.id,
  name: row.name,
  phone: row.phone,
  email: row.email,
  permissions: Array.isArray(row.permissions) ? row.permissions : [],
  status: row.status,
  invitedAt: row.invited_at,
  joinedAt: row.joined_at,
  lastSeenAt: row.last_seen_at,
  // Only ever sent to the owner, and only while the invite is unused. It is
  // what he reads out to his nephew over the phone.
  inviteCode: row.status === "invited" ? row.invite_code : null,
  inviteExpiresAt: row.status === "invited" ? row.invite_expires_at : null,
  hasAccount: Boolean(row.user_id),
});

// @desc    Everyone working on this wholesaler's book
// @route   GET /api/staff
exports.listStaff = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.*, u.email AS account_email
         FROM staff_members s
         LEFT JOIN users u ON u.id = s.user_id
        WHERE s.wholesaler_id = $1
        ORDER BY
          -- Whoever needs attention first: invites not yet accepted, then the
          -- people actually working, then the ones switched off.
          CASE s.status WHEN 'invited' THEN 0 WHEN 'active' THEN 1 ELSE 2 END,
          s.name ASC`,
      [businessId(req)],
    );

    res.status(200).json({
      staff: rows.map(shape),
      // The catalogue travels with the list so the screen never carries its
      // own copy of what a permission is called.
      permissions: PERMISSIONS,
    });
  } catch (err) {
    console.error("Error listing staff:", err);
    res.status(500).json({ message: "Could not load your staff" });
  }
};

// @desc    Invite somebody to work on this book
// @route   POST /api/staff
exports.inviteStaff = async (req, res) => {
  const name = clean(req.body?.name);
  const phone = clean(req.body?.phone);
  const email = clean(req.body?.email);

  if (!name) {
    return res.status(400).json({ message: "Give this person a name." });
  }
  if (!phone && !email) {
    return res.status(400).json({
      message: "Add a phone number or an email so you can send him the code.",
    });
  }

  // Absent means the agreed default, which is everything on the list. An
  // explicitly empty array is a real choice and is kept: an owner may want a
  // man who can sign in and see nothing until he decides.
  const permissions =
    req.body?.permissions === undefined
      ? DEFAULT_PERMISSIONS
      : validPermissions(req.body.permissions);

  try {
    const expires = new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000);
    const { rows } = await pool.query(
      `INSERT INTO staff_members
         (wholesaler_id, name, phone, email, permissions, status,
          invite_code, invite_expires_at)
       VALUES ($1, $2, $3, $4, $5, 'invited', $6, $7)
       RETURNING *`,
      [businessId(req), name, phone || null, email || null, permissions,
       newInviteCode(), expires],
    );

    res.status(201).json({ staff: shape(rows[0]) });
  } catch (err) {
    console.error("Error inviting staff:", err);
    res.status(500).json({ message: "Could not add this person" });
  }
};

// @desc    Change what somebody may do, or his name and number
// @route   PATCH /api/staff/:id
exports.updateStaff = async (req, res) => {
  const { id } = req.params;

  try {
    const found = await pool.query(
      `SELECT * FROM staff_members WHERE id = $1 AND wholesaler_id = $2`,
      [id, businessId(req)],
    );
    if (found.rows.length === 0) {
      return res.status(404).json({ message: "No such person on your staff" });
    }

    const name = req.body?.name === undefined ? undefined : clean(req.body.name);
    if (name !== undefined && !name) {
      return res.status(400).json({ message: "A name cannot be blank." });
    }

    const permissions =
      req.body?.permissions === undefined
        ? undefined
        : validPermissions(req.body.permissions);

    const { rows } = await pool.query(
      `UPDATE staff_members
          SET name        = COALESCE($2, name),
              phone       = COALESCE($3, phone),
              email       = COALESCE($4, email),
              permissions = COALESCE($5, permissions),
              updated_at  = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *`,
      [
        id,
        name ?? null,
        req.body?.phone === undefined ? null : clean(req.body.phone) || null,
        req.body?.email === undefined ? null : clean(req.body.email) || null,
        permissions ?? null,
      ],
    );

    res.status(200).json({ staff: shape(rows[0]) });
  } catch (err) {
    console.error("Error updating staff:", err);
    res.status(500).json({ message: "Could not save this change" });
  }
};

// @desc    Turn somebody off, or back on
// @route   POST /api/staff/:id/status
exports.setStaffStatus = async (req, res) => {
  const { id } = req.params;
  const wanted = String(req.body?.status || "").toLowerCase();

  if (!["active", "disabled"].includes(wanted)) {
    return res.status(400).json({ message: "Say whether to turn him on or off." });
  }

  try {
    const found = await pool.query(
      `SELECT * FROM staff_members WHERE id = $1 AND wholesaler_id = $2`,
      [id, businessId(req)],
    );
    if (found.rows.length === 0) {
      return res.status(404).json({ message: "No such person on your staff" });
    }
    const staff = found.rows[0];

    // Turning somebody on who never accepted his invite would leave a row
    // claiming to be active with nobody behind it.
    if (wanted === "active" && !staff.user_id) {
      return res.status(400).json({
        message: "He has not signed in with his code yet, so there is nothing to turn on.",
      });
    }

    const { rows } = await pool.query(
      `UPDATE staff_members
          SET status = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *`,
      [id, wanted],
    );

    res.status(200).json({
      staff: shape(rows[0]),
      message:
        wanted === "disabled"
          ? "He can no longer open your book. Everything he did is still on the record."
          : "He can open your book again.",
    });
  } catch (err) {
    console.error("Error changing staff status:", err);
    res.status(500).json({ message: "Could not change this" });
  }
};

// @desc    Issue a fresh code for somebody who never used the first one
// @route   POST /api/staff/:id/invite
exports.resendInvite = async (req, res) => {
  const { id } = req.params;

  try {
    const expires = new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000);
    // Only for a row still waiting. Reissuing a code for somebody who has
    // already joined would hand out a second way in to an account.
    const { rows } = await pool.query(
      `UPDATE staff_members
          SET invite_code = $3, invite_expires_at = $4,
              invited_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND wholesaler_id = $2 AND status = 'invited'
        RETURNING *`,
      [id, businessId(req), newInviteCode(), expires],
    );

    if (rows.length === 0) {
      return res.status(400).json({
        message: "That person has already joined, so he does not need a new code.",
      });
    }

    res.status(200).json({ staff: shape(rows[0]) });
  } catch (err) {
    console.error("Error reissuing invite:", err);
    res.status(500).json({ message: "Could not make a new code" });
  }
};

/**
 * The employee's side: turn a code into an account.
 *
 * Public, because the person accepting has no login yet. The code is the
 * credential and it is single use: it is cleared on acceptance, so a code read
 * out over the phone and overheard is worth nothing once it has been used.
 *
 * @route POST /api/staff/accept
 */
exports.acceptInvite = async (req, res) => {
  const code = clean(req.body?.code);
  const password = String(req.body?.password || "");
  const email = clean(req.body?.email);

  if (!code) return res.status(400).json({ message: "Enter the code your owner gave you." });
  if (password.length < 8) {
    return res.status(400).json({ message: "Choose a password of at least 8 characters." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const found = await client.query(
      `SELECT * FROM staff_members
        WHERE invite_code = $1 AND status = 'invited'
        FOR UPDATE`,
      [code],
    );
    if (found.rows.length === 0) {
      await client.query("ROLLBACK");
      // One message for "wrong" and "already used", so the endpoint cannot be
      // used to find out which codes exist.
      return res.status(400).json({ message: "That code is not valid." });
    }

    const staff = found.rows[0];
    if (staff.invite_expires_at && new Date(staff.invite_expires_at) < new Date()) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "That code has expired. Ask the owner to make you a new one.",
      });
    }

    const loginEmail = email || staff.email;
    if (!loginEmail) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Enter the email you want to sign in with." });
    }

    const taken = await client.query("SELECT id FROM users WHERE email = $1", [loginEmail]);
    if (taken.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "There is already an account with that email. Sign in with it instead.",
      });
    }

    const [first, ...rest] = String(staff.name).split(" ");
    // role 'seller' so the existing dashboard guards let him in. What he can
    // actually see is decided by his permissions, not by this word.
    const created = await client.query(
      `INSERT INTO users (first_name, last_name, email, role, phone, password_hash)
       VALUES ($1, $2, $3, 'seller', $4, $5)
       RETURNING id, first_name, last_name, email, role`,
      [
        first,
        rest.join(" ") || "",
        loginEmail,
        staff.phone || null,
        await bcrypt.hash(password, 10),
      ],
    );
    const user = created.rows[0];

    await client.query(
      `UPDATE staff_members
          SET user_id = $2, status = 'active',
              invite_code = NULL, invite_expires_at = NULL,
              joined_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1`,
      [staff.id, user.id],
    );

    await client.query("COMMIT");

    // No token. He signs in on the ordinary login screen with the password he
    // has just chosen, so there is one way in rather than two.
    res.status(201).json({
      message: "Your account is ready. Sign in with your email and password.",
      email: loginEmail,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error accepting an invite:", err);
    res.status(500).json({ message: "Could not set up your account" });
  } finally {
    client.release();
  }
};
