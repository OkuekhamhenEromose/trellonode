require('./config/env');
const dns = require("dns");

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const http = require('http');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const app = require('./app');
const connectDB = require('./config/database');
const { disconnectDB } = require('./config/database');
const User = require('./models/User');
const config = require('./config/env');
const { authenticateSocket, authorizeBoardJoin } = require('./services/socketAuthorizationService');

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin(origin, callback) {
      if (!origin || config.socketCorsOrigins.includes(origin.replace(/\/$/, ''))) {
        return callback(null, true);
      }
      return callback(new Error('Socket origin not allowed'));
    },
    credentials: true,
    methods: ['GET', 'POST'],
  },
});

app.set('io', io);
app.set('realtimeReady', true);

io.use(authenticateSocket);

io.on('connection', (socket) => {
  socket.on('joinBoard', async (boardId, acknowledge) => {
    try {
      await authorizeBoardJoin(socket, boardId);

      if (typeof acknowledge === 'function') acknowledge({ ok: true });
    } catch (error) {
      if (typeof acknowledge === 'function') {
        acknowledge({
          ok: false,
          error: error.message,
          code: error.code || 'BOARD_ACCESS_DENIED',
        });
      }
    }
  });

  socket.on('leaveBoard', async (boardId, acknowledge) => {
    if (!mongoose.isValidObjectId(boardId)) {
      if (typeof acknowledge === 'function') acknowledge({ ok: false, error: 'Invalid board ID' });
      return;
    }

    await socket.leave(`board:${boardId}`);
    if (typeof acknowledge === 'function') acknowledge({ ok: true });
  });
});

const start = async () => {
  await connectDB();

  await new Promise((resolve) => {
    server.listen(config.port, resolve);
  });

  console.info(`HTTP server listening on port ${config.port}`);
  console.info(`Environment: ${config.nodeEnv}`);
  console.info('REST API: /api/v1');
  console.info('Health: /health');
  console.info('Readiness: /ready');
};

const shutdown = async (signal) => {
  console.info(`${signal} received. Shutting down gracefully...`);

  await new Promise((resolve) => {
    io.close(() => server.close(resolve));
  });

  await disconnectDB();
  process.exit(0);
};

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

if (require.main === module) {
  start().catch((error) => {
    console.error('Application startup failed:', error.message);
    process.exit(1);
  });
}

module.exports = { app, server, io, start };
