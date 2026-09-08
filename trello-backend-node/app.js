// const express = require("express");
// const cors = require("cors");
// const helmet = require("helmet");
// const morgan = require("morgan");
// const http = require("http");
// const socketio = require("socket.io");
// const connectDB = require("./config/database");
// const auth = require("./middleware/auth");
// const { logActivity } = require("./controllers/activityController");
// require("dotenv").config();

// // Import routes
// const authRoutes = require("./routes/auth");
// const boardRoutes = require("./routes/boards");
// const listRoutes = require("./routes/lists");
// const cardRoutes = require("./routes/cards");
// const activityRoutes = require("./routes/activities");

// const app = express();
// const server = http.createServer(app);
// const io = socketio(server, {
//   cors: {
//     origin: process.env.FRONTEND_URL || "http://localhost:3000",
//     methods: ["GET", "POST"],
//   },
// });

// // Connect to MongoDB
// connectDB();

// // Middleware
// app.use(helmet()); // Security headers
// app.use(
//   cors({
//     origin: process.env.FRONTEND_URL || "http://localhost:3000",
//     credentials: true,
//   }),
// );
// app.use(morgan("dev")); // Logging
// app.use(express.json({ limit: "10mb" }));
// app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// // Socket.io setup
// app.set("io", io);

// // Socket.io connection handling
// io.on("connection", (socket) => {
//   console.log("New client connected:", socket.id);

//   // Join board room
//   socket.on("joinBoard", (boardId) => {
//     socket.join(`board-${boardId}`);
//     console.log(`Socket ${socket.id} joined board-${boardId}`);
//   });

//   // Leave board room
//   socket.on("leaveBoard", (boardId) => {
//     socket.leave(`board-${boardId}`);
//     console.log(`Socket ${socket.id} left board-${boardId}`);
//   });

//   socket.on("disconnect", () => {
//     console.log("Client disconnected:", socket.id);
//   });
// });

// // Health check endpoint
// app.get("/health", (req, res) => {
//   res.status(200).json({
//     status: "OK",
//     timestamp: new Date().toISOString(),
//     environment: process.env.NODE_ENV || "development",
//   });
// });

// // API Routes
// app.use("/api/auth", authRoutes);
// app.use("/api/boards", auth, boardRoutes);
// app.use("/api/lists", auth, listRoutes);
// app.use("/api/cards", auth, cardRoutes);
// app.use("/api/activities", auth, activityRoutes);

// // 404 handler
// app.use((req, res) => {
//   res.status(404).json({
//     error: "Not Found",
//     message: `Cannot ${req.method} ${req.url}`,
//   });
// });

// // Global error handler
// app.use((err, req, res, next) => {
//   console.error("Unhandled error:", err.stack);
//   res.status(err.status || 500).json({
//     error: "Internal Server Error",
//     message:
//       process.env.NODE_ENV === "development"
//         ? err.message
//         : "Something went wrong",
//   });
// });

// const PORT = process.env.PORT || 5000;

// server.listen(PORT, () => {
//   console.log(`🚀 Server running on port ${PORT}`);
//   console.log(`📡 WebSocket server ready`);
//   console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
// });

// module.exports = { app, server };


const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const fs = require("fs");
const path = require("path");
const config = require("./config/env");
const apiRoutes = require("./routes");

const app = express();

const corsOptions = {
  origin(origin, callback) {
    // Non-browser clients (curl/Postman/native clients) do not send Origin.
    if (!origin) return callback(null, true);

    if (config.frontendOrigins.includes(origin.replace(/\/$/, ""))) {
      return callback(null, true);
    }

    return callback(new Error("CORS origin not allowed"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "X-CSRF-Token",
  ],
  optionsSuccessStatus: 204,
};

app.disable("x-powered-by");
app.use(helmet());
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(morgan(config.isProduction ? "combined" : "dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsDir));

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
  });
});

app.get("/ready", (req, res) => {
  const mongoose = require("mongoose");
  const databaseReady = mongoose.connection.readyState === 1;
  const ready = databaseReady && app.get("realtimeReady") === true;

  res.status(ready ? 200 : 503).json({
    status: ready ? "ready" : "not_ready",
    timestamp: new Date().toISOString(),
    database: databaseReady ? "connected" : "disconnected",
    realtime: app.get("realtimeReady") === true ? "ready" : "not_ready",
  });
});

app.use("/api/v1", apiRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `Cannot ${req.method} ${req.originalUrl}`,
    },
  });
});

app.use((err, req, res, next) => {
  if (err?.message === "CORS origin not allowed") {
    return res.status(403).json({
      success: false,
      error: {
        code: "CORS_ORIGIN_NOT_ALLOWED",
        message: "Origin is not allowed.",
      },
    });
  }

  console.error("Unhandled application error:", err);
  const status = Number(err?.status) || 500;
  return res.status(status).json({
    success: false,
    error: {
      code: err?.code || "INTERNAL_ERROR",
      message: config.isProduction
        ? "Something went wrong."
        : err?.message || "Internal server error.",
    },
  });
});

module.exports = app;
