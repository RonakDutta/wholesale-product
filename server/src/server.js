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
	socket.on("send_message", async ({ receiverId, text }) => {
		if (!text?.trim()) {
			return;
		}
		const { rows } = await pool.query(
			`INSERT INTO messages(sender_id,receiver_id,message_text)
        VALUES ($1,$2,$3) RETURNING *`,
			[socket.userId, receiverId, text.trim()],
		);
		const msg = rows[0];
		io.to(`user:${receiverId}`).emit("new_message", msg);
		socket.emit("message_sent", msg);
	});
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
