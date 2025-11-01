const express = require('express');
const authRoutes = require('./auth.routes');
const tripRoutes = require('./trip.routes');
const dashboardRoutes = require('./dashboard.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/trips', tripRoutes);
router.use('/dashboard', dashboardRoutes);

module.exports = router;
