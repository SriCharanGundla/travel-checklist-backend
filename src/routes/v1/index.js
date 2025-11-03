const express = require('express');
const authRoutes = require('./auth.routes');
const tripRoutes = require('./trip.routes');
const dashboardRoutes = require('./dashboard.routes');
const travelerRoutes = require('./traveler.routes');
const documentRoutes = require('./document.routes');
const checklistRoutes = require('./checklist.routes');
const collaboratorRoutes = require('./collaborator.routes');
const shareLinkRoutes = require('./share-link.routes');
const expenseRoutes = require('./expense.routes');
const itineraryRoutes = require('./itinerary.routes');
const travelerDirectoryRoutes = require('./traveler-directory.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/trips', tripRoutes);
router.use('/dashboard', dashboardRoutes);
router.use(travelerRoutes);
router.use(documentRoutes);
router.use(checklistRoutes);
router.use(collaboratorRoutes);
router.use(shareLinkRoutes);
router.use(expenseRoutes);
router.use(itineraryRoutes);
router.use(travelerDirectoryRoutes);

module.exports = router;
