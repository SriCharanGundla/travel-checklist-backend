const express = require('express');
const authRoutes = require('./auth.routes');
const tripRoutes = require('./trip.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/trips', tripRoutes);

module.exports = router;
