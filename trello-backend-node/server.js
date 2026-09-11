const dns = require("dns");
dns.setServers(["1.1.1.1", "8.8.8.8"]);

require("./config/env");

const http = require("http");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const app = require("./app");
const connectDB = require("./config/database");
const { disconnectDB } = require("./config/database");
const User = require("./models/User");
const Board = require("./models/Board");
const config = require("./config/env");
const { secret: jwtSecret } = require("./config/jwt");

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin(origin, callback) {
      if (
        !origin ||
        config.socketCorsOrigins.includes(origin.replace(/\/$/, ""))
      ) {
        return callback(null, true);
      }
      return callback(new Error("Socket origin not allowed"));
    },
    credentials: true,
    methods: ["GET", "POST"],
  },
});

app.set("io", io);
app.set("realtimeReady", true);

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));

    const decoded = jwt.verify(token, jwtSecret);
    if (!decoded?.userId)
      return next(new Error("Invalid authentication token"));

    const user = await User.findById(decoded.userId);
    if (!user) return next(new Error("Authenticated user not found"));

    socket.user = user;
    next();
  } catch (error) {
    next(
      new Error(
        error.name === "TokenExpiredError"
          ? "Token expired"
          : "Authentication failed",
      ),
    );
  }
});

io.on("connection", (socket) => {
  socket.on("joinBoard", async (boardId, acknowledge) => {
    try {
      if (!mongoose.isValidObjectId(boardId)) {
        throw new Error("Invalid board ID");
      }

      const board = await Board.findOne({
        _id: boardId,
        $or: [{ owner: socket.user._id }, { members: socket.user._id }],
      }).select("_id");

      if (!board) throw new Error("Board access denied");

      await socket.join(`board:${board._id}`);
      if (typeof acknowledge === "function") acknowledge({ ok: true });
    } catch (error) {
      if (typeof acknowledge === "function")
        acknowledge({ ok: false, error: error.message });
    }
  });

  socket.on("leaveBoard", async (boardId, acknowledge) => {
    if (!mongoose.isValidObjectId(boardId)) {
      if (typeof acknowledge === "function")
        acknowledge({ ok: false, error: "Invalid board ID" });
      return;
    }

    await socket.leave(`board:${boardId}`);
    if (typeof acknowledge === "function") acknowledge({ ok: true });
  });
});

const start = async () => {
  await connectDB();

  await new Promise((resolve) => {
    server.listen(config.port, resolve);
  });

  console.info(`HTTP server listening on port ${config.port}`);
  console.info(`Environment: ${config.nodeEnv}`);
  console.info("REST API: /api/v1");
  console.info("Health: /health");
  console.info("Readiness: /ready");
};

const shutdown = async (signal) => {
  console.info(`${signal} received. Shutting down gracefully...`);

  await new Promise((resolve) => {
    io.close(() => server.close(resolve));
  });

  await disconnectDB();
  process.exit(0);
};

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

if (require.main === module) {
  start().catch((error) => {
    console.error("Application startup failed:", error.message);
    process.exit(1);
  });
}

module.exports = { app, server, io, start };
