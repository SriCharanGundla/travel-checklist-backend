const express = require('express');
const authRoutes = require('./auth.routes');
const tripRoutes = require('./trip.routes');
const dashboardRoutes = require('./dashboard.routes');
const travelerRoutes = require('./traveler.routes');
const documentRoutes = require('./document.routes');
const checklistRoutes = require('./checklist.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/trips', tripRoutes);
router.use('/dashboard', dashboardRoutes);
router.use(travelerRoutes);
router.use(documentRoutes);
router.use(checklistRoutes);

module.exports = router;
