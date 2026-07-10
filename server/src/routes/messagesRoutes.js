const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// lists all chats for the logged-in user
router.get("/chats", async (req, res) => {
	const userId = req.user.id;
	try {
		const query = `
      SELECT 
        u.id AS user_id,
        u.name AS sender_name,
        u.company,
        (SELECT message_text FROM messages 
        WHERE (sender_id=u.id AND receiver_id=$1) 
            OR (sender_id=$1 AND receiver_id=u.id)
        ORDER BY created_at DESC LIMIT 1) AS "lastMessage",
        (SELECT created_at FROM messages 
        WHERE (sender_id = u.id AND receiver_id = $1) 
            OR (sender_id = $1 AND receiver_id = u.id)
        ORDER BY created_at DESC LIMIT 1) AS timestamp,
        COUNT(m.id) FILTER (WHERE m.receiver_id = $1 AND m.is_read = false) AS unread
      FROM users u
      LEFT JOIN messages m 
        ON (m.sender_id = u.id AND m.receiver_id = $1)
        OR (m.sender_id = $1 AND m.receiver_id = u.id)
      WHERE u.id IN (
        SELECT sender_id FROM messages WHERE receiver_id = $1
        UNION
        SELECT receiver_id FROM messages WHERE sender_id = $1
      )
      GROUP BY u.id, u.name, u.company
      ORDER BY timestamp DESC NULLS LAST
    `;
		const { rows } = await pool.query(query, [userId]);
		res.json(rows);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Server error" });
	}
});

// conversation with a specific user
router.get("/:otherUserId", async (req, res) => {
	const userId = req.user.id;
	const { otherUserId } = req.params;
	try {
		const query = `
      SELECT * FROM messages
      WHERE (sender_id = $1 AND receiver_id = $2)
         OR (sender_id = $2 AND receiver_id = $1)
      ORDER BY created_at ASC
    `;
		const { rows } = await pool.query(query, [userId, otherUserId]);
		res.json(rows);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Server error" });
	}
});

module.exports = router;
