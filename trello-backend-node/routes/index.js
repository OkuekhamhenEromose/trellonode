const express = require('express');
const auth = require('../middleware/auth');

const authRoutes = require('./auth');
const boardRoutes = require('./boards');
const listRoutes = require('./lists');
const cardRoutes = require('./cards');
const activityRoutes = require('./activities');

const router = express.Router();

// Public authentication endpoints.
router.use('/auth', authRoutes);

// All application resources below require an authenticated user.
router.use('/boards', auth, boardRoutes);
router.use('/lists', auth, listRoutes);
router.use('/cards', auth, cardRoutes);
router.use('/activities', auth, activityRoutes);

module.exports = router;
