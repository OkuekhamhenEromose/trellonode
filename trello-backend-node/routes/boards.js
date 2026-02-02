const express = require('express');
const router = express.Router();

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Boards API is working',
    endpoints: {
      getAll: 'GET /api/boards',
      getOne: 'GET /api/boards/:id',
      create: 'POST /api/boards',
      update: 'PUT /api/boards/:id',
      delete: 'DELETE /api/boards/:id'
    }
  });
});

// Get all boards
router.get('/', (req, res) => {
  res.json({ 
    boards: [
      { id: '1', title: 'Project Board', description: 'Team project' },
      { id: '2', title: 'Personal Tasks', description: 'My todo list' }
    ]
  });
});

// Get single board
router.get('/:id', (req, res) => {
  res.json({ 
    id: req.params.id,
    title: 'Sample Board',
    description: 'Board details',
    lists: [
      { id: '1', title: 'To Do', cards: [] },
      { id: '2', title: 'In Progress', cards: [] }
    ]
  });
});

// Create board
router.post('/', (req, res) => {
  res.json({ 
    message: 'Board created successfully',
    board: { 
      id: 'new-id', 
      title: req.body.title || 'New Board',
      description: req.body.description || ''
    }
  });
});

// Update board
router.put('/:id', (req, res) => {
  res.json({ 
    message: 'Board updated successfully',
    board: { 
      id: req.params.id, 
      title: req.body.title || 'Updated Board'
    }
  });
});

// Delete board
router.delete('/:id', (req, res) => {
  res.json({ message: 'Board deleted successfully' });
});

module.exports = router;
