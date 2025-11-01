const express = require('express');
const ItineraryController = require('../../controllers/ItineraryController');
const authenticate = require('../../middleware/authMiddleware');
const validateRequest = require('../../middleware/validateRequest');
const {
  tripIdParamValidator,
  itemIdParamValidator,
  listItineraryValidator,
  createItineraryValidator,
  updateItineraryValidator,
} = require('../../validators/itineraryValidator');

const router = express.Router();

router.use(authenticate);

router.get(
  '/trips/:tripId/itinerary',
  [...tripIdParamValidator, ...listItineraryValidator],
  validateRequest,
  ItineraryController.list
);

router.post(
  '/trips/:tripId/itinerary',
  [...tripIdParamValidator, ...createItineraryValidator],
  validateRequest,
  ItineraryController.create
);

router.patch(
  '/trips/:tripId/itinerary/:itemId',
  [...tripIdParamValidator, ...itemIdParamValidator, ...updateItineraryValidator],
  validateRequest,
  ItineraryController.update
);

router.delete(
  '/trips/:tripId/itinerary/:itemId',
  [...tripIdParamValidator, ...itemIdParamValidator],
  validateRequest,
  ItineraryController.remove
);

module.exports = router;
