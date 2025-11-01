const express = require('express');
const DashboardController = require('../../controllers/DashboardController');
const authenticate = require('../../middleware/authMiddleware');

const router = express.Router();

router.get('/overview', authenticate, DashboardController.overview);

module.exports = router;

