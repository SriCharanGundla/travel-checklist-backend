const express = require('express');
const TravelerController = require('../../controllers/TravelerController');
const authenticate = require('../../middleware/authMiddleware');
const validateRequest = require('../../middleware/validateRequest');
const {
  tripIdParamValidator,
  travelerIdParamValidator,
  createTravelerValidator,
  updateTravelerValidator,
} = require('../../validators/travelerValidator');

const router = express.Router();

router.use(authenticate);

router.get(
  '/trips/:tripId/travelers',
  [...tripIdParamValidator],
  validateRequest,
  TravelerController.list
);

router.post(
  '/trips/:tripId/travelers',
  [...tripIdParamValidator, ...createTravelerValidator],
  validateRequest,
  TravelerController.create
);

router.patch(
  '/trips/:tripId/travelers/:travelerId',
  [...tripIdParamValidator, ...travelerIdParamValidator, ...updateTravelerValidator],
  validateRequest,
  TravelerController.update
);

router.delete(
  '/trips/:tripId/travelers/:travelerId',
  [...tripIdParamValidator, ...travelerIdParamValidator],
  validateRequest,
  TravelerController.remove
);

module.exports = router;

