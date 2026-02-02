const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  }
});

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/uploads', express.static(uploadsDir));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trello-clone')
.then(() => console.log('‚úÖ MongoDB connected'))
.catch(err => {
  console.error('‚ùå MongoDB connection error:', err.message);
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

// Make io accessible to routes
app.set('io', io);

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

app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Trello Backend API is working! Ì∫Ä',
    endpoints: {
      health: 'GET /api/health',
      test: 'GET /api/test',
      auth: 'POST /api/auth/register, POST /api/auth/login',
      boards: 'GET /api/boards, POST /api/boards'
    }
  });
});

// Try to load auth routes if they exist
try {
  const authRoutes = require('./routes/auth');
  app.use('/api/auth', authRoutes);
  console.log('‚úÖ Auth routes loaded');
} catch (err) {
  console.log('‚ö†Ô∏è Auth routes not found, using basic routes');
  app.post('/api/auth/register', (req, res) => {
    res.json({ message: 'Registration endpoint - add proper implementation' });
  });
  
  app.post('/api/auth/login', (req, res) => {
    res.json({ message: 'Login endpoint - add proper implementation' });
  });
}

// Try to load board routes if they exist
try {
  const boardRoutes = require('./routes/boards');
  app.use('/api/boards', boardRoutes);
  console.log('‚úÖ Board routes loaded');
} catch (err) {
  console.log('‚ö†Ô∏è Board routes not found, using basic routes');
  app.get('/api/boards', (req, res) => {
    res.json({ message: 'Get boards endpoint' });
  });
  
  app.post('/api/boards', (req, res) => {
    res.json({ message: 'Create board endpoint' });
  });
}

// Simple 404 handler (FIXED - no asterisk issue)
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message
  });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log('Ì∫Ä TRELLO BACKEND STARTED SUCCESSFULLY');
  console.log('='.repeat(50));
  console.log(`Ì≥° Server running on port ${PORT}`);
  console.log(`Ìºê Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`Ì∑ÑÔ∏è  MongoDB: ${mongoose.connection.readyState === 1 ? '‚úÖ Connected' : '‚ùå Disconnected'}`);
  console.log(`Ì≥ä Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('');
  console.log('Ì¥ó API Endpoints:');
  console.log(`   Ìø• Health: http://localhost:${PORT}/api/health`);
  console.log(`   Ì∑™ Test: http://localhost:${PORT}/api/test`);
  console.log(`   Ì¥ê Auth: http://localhost:${PORT}/api/auth/login`);
  console.log(`   Ì≥ã Boards: http://localhost:${PORT}/api/boards`);
  console.log('');
  console.log('Ì≤° Use Ctrl+C to stop the server');
  console.log('='.repeat(50) + '\n');
});
