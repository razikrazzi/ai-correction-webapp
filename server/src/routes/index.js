// server/routes/index.js
const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth');
const paperRoutes = require('./papers');
const userRoutes = require('./users');

// Use routes
router.use('/auth', authRoutes);
router.use('/papers', paperRoutes);
router.use('/users', userRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Paper Correction API is running' });
});

module.exports = router;