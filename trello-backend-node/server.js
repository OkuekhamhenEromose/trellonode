// Add this at the very top of server.js
console.log('🟢 1. Server.js started');

const express = require('express');
console.log('🟢 2. Express loaded');

const mongoose = require('mongoose');
console.log('🟢 3. Mongoose loaded');

// my name is vishnu and i am a software developer and i am working on a trello clone project 
// and this is the backend code for the server.js file and i am using node.js and express.js 
// and mongoose for the database connection and socket.io for real-time communication and cors 
// for handling cross-origin requests and dotenv for managing environment variables and fs and 
// path for handling file uploads and static files and i am also adding some console logs to 
// help with debugging and understanding the flow of the application as it starts up and runs.

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
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
console.log('🟢 5.1 DNS forced to Google DNS');

// ============================================
// GLOBAL ERROR HANDLING - MUST BE BEFORE ANY APP CREATION
// ============================================

// Handle uncaught exceptions (synchronous errors)
process.on('uncaughtException', (err) => {
  console.error('💥 UNCAUGHT EXCEPTION! Shutting down...');
  console.error('Error Name:', err.name);
  console.error('Error Message:', err.message);
  console.error('Error Stack:', err.stack);
  
  // In production, you might want to gracefully shutdown
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Initialize Express app
const app = express();
console.log('🟢 6. Express app created');

const server = http.createServer(app);
console.log('🟢 7. HTTP server created');

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

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
console.log('🟢 10. Middleware configured');

// Serve static files
app.use('/uploads', express.static(uploadsDir));
console.log('🟢 11. Static files configured');

// ============================================
// DATABASE CONNECTION
// ============================================
console.log('🟢 12. Connecting to MongoDB...');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trello-clone', {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4 // Use IPv4, skip trying IPv6
})
.then(() => {
  console.log('✅ MongoDB connected');
  console.log(`📊 Database: ${mongoose.connection.name}`);
  console.log(`🔗 Host: ${mongoose.connection.host}`);
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  console.log('\n🔧 Troubleshooting:');
  console.log('1. Check if MongoDB is running');
  console.log('2. Verify connection string');
  console.log('3. Check network access in MongoDB Atlas');
  
  // Don't exit immediately in development
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Handle MongoDB connection events
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
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
    environment: process.env.NODE_ENV || 'development',
    mongoVersion: '7.0.2',
    mongooseVersion: '9.1.5'
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
  process.exit(1);
}

if (authRoutes) {
  app.use('/api/auth', authRoutes);
  console.log('✅ Auth routes mounted at /api/auth');
} else {
  console.error('❌ Auth routes is undefined');
  process.exit(1);
}

// Load board routes
console.log('🟢 18. Loading board routes...');
try {
  const boardRoutes = require('./routes/boards');
  app.use('/api/boards', boardRoutes);
  console.log('✅ Board routes loaded');
} catch (err) {
  console.log('⚠️ Board routes not found, using basic routes');
  console.error('Error details:', err.message);
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
    method: req.method,
    message: `Cannot ${req.method} ${req.path}`
  });
});
console.log('🟢 19. 404 handler set');

// Global error handler - for all other errors
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  console.error('Stack:', err.stack);
  
  // Send appropriate response based on environment
  res.status(err.status || 500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});
console.log('🟢 20. Error handler set');

// ============================================
// START SERVER WITH GRACEFUL SHUTDOWN
// ============================================

// Handle unhandled promise rejections (asynchronous errors)
process.on('unhandledRejection', (err) => {
  console.error('💥 UNHANDLED REJECTION! Shutting down...');
  console.error('Error Name:', err.name);
  console.error('Error Message:', err.message);
  console.error('Error Stack:', err.stack);
  
  // Gracefully shutdown the server
  server.close(() => {
    console.log('💤 Server closed. Shutting down process...');
    mongoose.connection.close(false, () => {
      console.log('💤 MongoDB connection closed');
      process.exit(1);
    });
  });
  
  // Force shutdown after 10 seconds if server doesn't close
  setTimeout(() => {
    console.error('⚠️ Force shutdown after timeout');
    process.exit(1);
  }, 10000);
});

// Graceful shutdown for SIGTERM (Render sends this on restart)
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received. Shutting down gracefully...');
  
  server.close(() => {
    console.log('💤 Server closed');
    mongoose.connection.close(false, () => {
      console.log('💤 MongoDB connection closed');
      console.log('✅ Graceful shutdown complete');
      process.exit(0);
    });
  });
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('⚠️ Force shutdown after timeout');
    process.exit(1);
  }, 10000);
});

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  console.log('\n👋 SIGINT received. Shutting down gracefully...');
  
  server.close(() => {
    console.log('💤 Server closed');
    mongoose.connection.close(false, () => {
      console.log('💤 MongoDB connection closed');
      console.log('✅ Graceful shutdown complete');
      process.exit(0);
    });
  });
});

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
  console.log(`   🔍 Health: http://localhost:${PORT}/api/health`);
  console.log(`   🔍 Test: http://localhost:${PORT}/api/test`);
  console.log(`   🔐 Auth: http://localhost:${PORT}/api/auth/login`);
  console.log(`   📋 Boards: http://localhost:${PORT}/api/boards`);
  console.log('');
  console.log('🛑 Use Ctrl+C to stop the server');
  console.log('='.repeat(50) + '\n');
});

console.log('🟢 22. Server listen called - waiting for connections...');

// ============================================
// EXPORTS
// ============================================

module.exports = { app, server };