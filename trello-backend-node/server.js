// Add this at the very top of server.js
console.log('🟢 1. Server.js started');

const express = require('express');
console.log('🟢 2. Express loaded');

const mongoose = require('mongoose');
console.log('🟢 3. Mongoose loaded');

const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');
console.log('🟢 4. All modules loaded');

// Load environment variables
dotenv.config();
console.log('🟢 5. Environment variables loaded');

// Initialize Express app
const app = express();
console.log('🟢 6. Express app created');

const server = http.createServer(app);
console.log('🟢 7. HTTP server created');

// Enhanced CORS configuration - MUST come before routes
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://trello-next-blush.vercel.app',
      'https://trello-next-blush.vercel.app/',
      'http://localhost:3000',
      'http://localhost:3001',
      'https://trellonode.onrender.com'
    ];
    
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) {
      return callback(null, true);
    }
    
    // Remove trailing slash for comparison
    const originWithoutSlash = origin.replace(/\/$/, '');
    
    if (allowedOrigins.includes(origin) || allowedOrigins.includes(originWithoutSlash)) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS blocked origin: ${origin}`);
      callback(null, true); // Temporarily allow all origins for debugging
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-CSRF-Token'
  ],
  exposedHeaders: ['Set-Cookie', 'Date', 'ETag'],
  optionsSuccessStatus: 204
};

// Apply CORS middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
console.log('🟢 CORS configured');

const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST']
  }
});
console.log('🟢 8. Socket.io initialized');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
console.log('🟢 9. Uploads directory checked');

// ============================================
// MIDDLEWARE
// ============================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
console.log('🟢 10. Middleware configured');

// Serve static files
app.use('/uploads', express.static(uploadsDir));
console.log('🟢 11. Static files configured');

// ============================================
// DATABASE CONNECTION - FIXED
// ============================================
console.log('🟢 12. Connecting to MongoDB...');

const mongoURI = process.env.MONGODB_URI;

if (!mongoURI) {
  console.error('❌ MONGODB_URI is not defined in environment variables');
  console.log('⚠️ Server will start but database features will not work');
} else {
  console.log('📝 Connection string found (credentials hidden)');
  
  // Simplified connection options for better compatibility
  const mongooseOptions = {
    serverSelectionTimeoutMS: 30000, // Increased timeout
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000,
    family: 4 // Use IPv4
  };

  mongoose.connect(mongoURI, mongooseOptions)
    .then(() => {
      console.log('✅ MongoDB connected successfully');
      console.log(`📊 Database: ${mongoose.connection.name}`);
      console.log(`🔗 Host: ${mongoose.connection.host}`);
    })
    .catch(err => {
      console.error('❌ MongoDB connection error:', err.message);
      console.error('Error details:', {
        name: err.name,
        code: err.code
      });
      console.log('\n🔧 Troubleshooting:');
      console.log('1. Check if MongoDB Atlas cluster is running (not paused)');
      console.log('2. Verify Network Access in MongoDB Atlas (add 0.0.0.0/0)');
      console.log('3. Check if connection string is correct');
      console.log('4. Verify username and password in connection string');
      console.log('\n⚠️ Server will continue running without database connection');
    });
}

// Handle MongoDB connection events
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

// ============================================
// SOCKET.IO HANDLERS
// ============================================

io.on('connection', (socket) => {
  console.log('🟢 New client connected:', socket.id);
  
  socket.on('joinBoard', (boardId) => {
    socket.join(`board-${boardId}`);
    console.log(`📌 Socket ${socket.id} joined board-${boardId}`);
  });
  
  socket.on('leaveBoard', (boardId) => {
    socket.leave(`board-${boardId}`);
    console.log(`📌 Socket ${socket.id} left board-${boardId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('🔴 Client disconnected:', socket.id);
  });
});

console.log('🟢 13. Socket.io handlers set up');

// Make io accessible to routes
app.set('io', io);
console.log('🟢 14. IO attached to app');

// ============================================
// HEALTH CHECK ROUTES
// ============================================

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date(),
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV || 'development'
  });
});
console.log('🟢 15. Health route defined');

app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Trello Backend API is working!',
    endpoints: {
      health: 'GET /api/health',
      test: 'GET /api/test',
      auth: 'POST /api/auth/register, POST /api/auth/login',
      boards: 'GET /api/boards, POST /api/boards'
    }
  });
});
console.log('🟢 16. Test route defined');

// CORS test endpoint
app.get('/api/cors-test', (req, res) => {
  res.json({
    message: 'CORS is working!',
    origin: req.headers.origin || 'No origin header',
    timestamp: new Date().toISOString()
  });
});
console.log('🟢 CORS test route defined');

// ============================================
// LOAD ROUTES
// ============================================

// Load auth routes
console.log('🟢 17. Loading auth routes...');
let authRoutes;
try {
  authRoutes = require('./routes/auth');
  console.log('✅ Auth routes loaded from file');
} catch (err) {
  console.error('❌ Error loading auth routes:', err.message);
  // Create fallback auth routes
  const router = express.Router();
  router.post('/register/start', (req, res) => {
    res.json({ message: 'Auth route placeholder - database not connected' });
  });
  router.post('/login', (req, res) => {
    res.json({ message: 'Auth route placeholder - database not connected' });
  });
  authRoutes = router;
}

if (authRoutes) {
  app.use('/api/auth', authRoutes);
  console.log('✅ Auth routes mounted at /api/auth');
}

// Load board routes
console.log('🟢 18. Loading board routes...');
try {
  const boardRoutes = require('./routes/boards');
  app.use('/api/boards', boardRoutes);
  console.log('✅ Board routes loaded');
} catch (err) {
  console.log('⚠️ Board routes not found, using basic routes');
  app.get('/api/boards', (req, res) => {
    res.json({ message: 'Get boards endpoint' });
  });
  
  app.post('/api/boards', (req, res) => {
    res.json({ message: 'Create board endpoint' });
  });
}

// ============================================
// ERROR HANDLING MIDDLEWARE
// ============================================

// 404 handler - for undefined routes
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});
console.log('🟢 19. 404 handler set');

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(err.status || 500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});
console.log('🟢 20. Error handler set');

// ============================================
// START LISTENING
// ============================================

const PORT = process.env.PORT || 5000;
console.log(`🟢 21. About to start server on port ${PORT}...`);

server.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log('🚀 TRELLO BACKEND STARTED SUCCESSFULLY');
  console.log('='.repeat(50));
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`✅️  MongoDB: ${mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected'}`);
  console.log(`🏭 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('');
  console.log('🔗 API Endpoints:');
  console.log(`   🔍 Health: https://trellonode.onrender.com/api/health`);
  console.log(`   🔍 Test: https://trellonode.onrender.com/api/test`);
  console.log(`   🔍 CORS Test: https://trellonode.onrender.com/api/cors-test`);
  console.log(`   🔐 Auth: https://trellonode.onrender.com/api/auth/login`);
  console.log(`   📋 Boards: https://trellonode.onrender.com/api/boards`);
  console.log('');
  console.log('🛑 Use Ctrl+C to stop the server');
  console.log('='.repeat(50) + '\n');
});

console.log('🟢 22. Server listen called - waiting for connections...');

// ============================================
// EXPORTS
// ============================================

module.exports = { app, server };