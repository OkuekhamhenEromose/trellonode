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

const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  }
});
console.log('🟢 8. Socket.io initialized');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
console.log('🟢 9. Uploads directory checked');

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
console.log('🟢 10. Middleware configured');

// Serve static files
app.use('/uploads', express.static(uploadsDir));
console.log('🟢 11. Static files configured');

// Database connection
console.log('🟢 12. Connecting to MongoDB...');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trello-clone')
.then(() => console.log('✅ MongoDB connected'))
.catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  socket.on('joinBoard', (boardId) => {
    socket.join(`board-${boardId}`);
  });
  
  socket.on('leaveBoard', (boardId) => {
    socket.leave(`board-${boardId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});
console.log('🟢 13. Socket.io handlers set up');

// Make io accessible to routes
app.set('io', io);
console.log('🟢 14. IO attached to app');

// Basic routes for testing
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date(),
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
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

// // Load auth routes
// console.log('🟢 17. Loading auth routes...');
// try {
//   const authRoutes = require('./routes/auth');
//   console.log('✅ Auth routes required successfully');
//   app.use('/api/auth', authRoutes);
//   console.log('✅ Auth routes mounted at /api/auth');
// } catch (err) {
//   console.log('⚠️ Failed to load auth routes:', err.message);
//   console.error(err.stack);
// }

// Load auth routes
console.log('🟢 17. Loading auth routes...');
let authRoutes;
try {
  authRoutes = require('./routes/auth');
  console.log('✅ Auth routes loaded from file');
} catch (err) {
  console.log('❌ Error loading auth routes:', err.message);
  process.exit(1);
}

if (authRoutes) {
  app.use('/api/auth', authRoutes);
  console.log('✅ Auth routes mounted at /api/auth');
} else {
  console.log('❌ Auth routes is undefined');
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

// Simple 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});
console.log('🟢 19. 404 handler set');

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message
  });
});
console.log('🟢 20. Error handler set');

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