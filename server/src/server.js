const app = require("./app");
const { createServer } = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const pool = require("./config/db");

const httpServer = createServer(app);

const io = new Server(httpServer, {
	cors: {
		origin: process.env.CLIENT_URL,
		credentials: true,
	},
});

io.use((socket, next) => {
	const token = socket.handshake.auth?.token;
	if (!token) {
		return next(new Error("Unauthorized"));
	}
	try {
		const payload = jwt.verify(token, process.env.JWT_SECRET);
		socket.userId = payload.id;
		next();
	} catch {
		next(new Error("Unauthorized"));
	}
});

io.on("connection", (socket) => {
	socket.join(`user:${socket.userId}`);
	socket.on("send_message", async ({ receiverId, text, tempId }) => {
		if (!text?.trim()) {
			return;
		}
		const targetId = receiverId;
		// ids are UUIDs, so validate as a non-empty value rather than a number
		if (!targetId || String(targetId) === String(socket.userId)) {
			socket.emit("message_error", { tempId, message: "Invalid recipient" });
			return;
		}
		try {
			const { rows } = await pool.query(
				`INSERT INTO messages(sender_id,receiver_id,message_text)
        VALUES ($1,$2,$3) RETURNING *`,
				[socket.userId, targetId, text.trim()],
			);
			const msg = rows[0];
			io.to(`user:${targetId}`).emit("new_message", msg);
			// Echo tempId back so the sender can reconcile its optimistic message
			socket.emit("message_sent", { ...msg, tempId });
		} catch (err) {
			console.error("Error saving message:", err);
			socket.emit("message_error", { tempId, message: "Failed to send message" });
		}
	});
});

const PORT = process.env.PORT || 5000;

// NOTE: must listen on the HTTP server that Socket.IO is attached to,
// otherwise real-time messaging never comes online.
httpServer.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
