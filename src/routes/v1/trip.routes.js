const express = require('express');
const TripController = require('../../controllers/TripController');
const authenticate = require('../../middleware/authMiddleware');
const validateRequest = require('../../middleware/validateRequest');
const {
  listTripsValidator,
  tripIdParamValidator,
  createTripValidator,
  updateTripValidator,
  exportTripValidator,
} = require('../../validators/tripValidator');

const router = express.Router();

router.use(authenticate);

router.get('/', listTripsValidator, validateRequest, TripController.list);
router.post('/', createTripValidator, validateRequest, TripController.create);
router.get('/:tripId', tripIdParamValidator, validateRequest, TripController.get);
router.put(
  '/:tripId',
  [...tripIdParamValidator, ...updateTripValidator],
  validateRequest,
  TripController.update
);
router.get(
  '/:tripId/export',
  [...tripIdParamValidator, ...exportTripValidator],
  validateRequest,
  TripController.exportData
);
router.delete('/:tripId', tripIdParamValidator, validateRequest, TripController.remove);

module.exports = router;
