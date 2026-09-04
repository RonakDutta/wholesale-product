const app = require("./app");
const { createServer } = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const pool = require("./config/db");
const { setSocketServer } = require("./services/socketService");

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    // Restrict to CLIENT_URL when configured; otherwise reflect the request
    // origin so the browser socket handshake isn't blocked in local dev.
    origin: process.env.CLIENT_URL || true,
    credentials: true,
  },
});

setSocketServer(io);
// Controllers reach the socket server through the app to push live updates.
app.set("io", io);

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
      console.error(
        `Rejected message from ${socket.userId} to ${targetId}: invalid recipient`,
      );
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
      socket.emit("message_error", {
        tempId,
        message: "Failed to send message",
      });
    }
  });
});

const PORT = Number(process.env.PORT) || 5000;

/**
 * Say once, at boot, whether the database can be reached.
 *
 * Without this the first sign of a bad DATABASE_URL is a stack trace on every
 * request, all of them identical and all of them naming whichever controller
 * happened to be hit. A deploy where the password was wrong looked exactly
 * like a broken feature, and the traces pointed at the feature.
 *
 * Deliberately not fatal. The server still listens, so the host's health check
 * and the logs both stay useful, and a database that comes back on its own,
 * which is what a sleeping Neon compute does, needs no restart.
 *
 * Nothing about the connection string is printed. The point is which of the
 * three things is wrong, not what the credential is.
 */
const reportDatabase = async () => {
  if (!process.env.DATABASE_URL) {
    console.error(
      "DATABASE_URL is not set. Every request that touches the database will fail.",
    );
    return;
  }
  try {
    const { rows } = await pool.query("SELECT current_database() AS db");
    console.log(`Database reachable: ${rows[0].db}`);
  } catch (err) {
    const advice =
      err.code === "28P01"
        ? "the password in DATABASE_URL is wrong. If the database password was rotated, update it wherever this is deployed. Check too that any special characters in it are percent encoded."
        : err.code === "3D000"
          ? "that database does not exist on the server DATABASE_URL points at."
          : err.code === "ENOTFOUND" || err.code === "EAI_AGAIN"
            ? "the host in DATABASE_URL cannot be resolved."
            : "see the error below.";
    console.error(`Cannot reach the database: ${advice}`);
    console.error(`  ${err.code || "no code"}: ${err.message}`);
  }
};

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT} with Enterprise Invoice System initialized`);
  reportDatabase();
});
