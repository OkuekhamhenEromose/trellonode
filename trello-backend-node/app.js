const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const config = require('./config/env');
const apiRoutes = require('./routes');

const app = express();

const corsOptions = {
  origin(origin, callback) {
    // Non-browser clients (curl/Postman/native clients) do not send Origin.
    if (!origin) return callback(null, true);

    if (config.frontendOrigins.includes(origin.replace(/\/$/, ''))) {
      return callback(null, true);
    }

    return callback(new Error('CORS origin not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-CSRF-Token'],
  optionsSuccessStatus: 204,
};

app.disable('x-powered-by');
app.use(helmet());
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(morgan(config.isProduction ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
  });
});

app.get('/ready', (req, res) => {
  const mongoose = require('mongoose');
  const databaseReady = mongoose.connection.readyState === 1;
  const ready = databaseReady && app.get('realtimeReady') === true;

  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not_ready',
    timestamp: new Date().toISOString(),
    database: databaseReady ? 'connected' : 'disconnected',
    realtime: app.get('realtimeReady') === true ? 'ready' : 'not_ready',
  });
});

app.use('/api/v1', apiRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`,
    },
  });
});

app.use((err, req, res, next) => {
  if (err?.message === 'CORS origin not allowed') {
    return res.status(403).json({
      success: false,
      error: { code: 'CORS_ORIGIN_NOT_ALLOWED', message: 'Origin is not allowed.' },
    });
  }

  console.error('Unhandled application error:', err);
  const status = Number(err?.status) || 500;
  return res.status(status).json({
    success: false,
    error: {
      code: err?.code || 'INTERNAL_ERROR',
      message: config.isProduction ? 'Something went wrong.' : (err?.message || 'Internal server error.'),
    },
  });
});

module.exports = app;
