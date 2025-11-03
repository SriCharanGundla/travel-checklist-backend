const express = require('express');
const TravelerDirectoryController = require('../../controllers/TravelerDirectoryController');
const authenticate = require('../../middleware/authMiddleware');
const validateRequest = require('../../middleware/validateRequest');
const {
  contactIdParamValidator,
  createTravelerValidator,
  updateTravelerValidator,
} = require('../../validators/travelerValidator');

const router = express.Router();

router.use(authenticate);

router.get('/traveler-directory', TravelerDirectoryController.list);

router.post(
  '/traveler-directory',
  [...createTravelerValidator],
  validateRequest,
  TravelerDirectoryController.create
);

router.patch(
  '/traveler-directory/:contactId',
  [...contactIdParamValidator, ...updateTravelerValidator],
  validateRequest,
  TravelerDirectoryController.update
);

router.delete(
  '/traveler-directory/:contactId',
  [...contactIdParamValidator],
  validateRequest,
  TravelerDirectoryController.remove
);

module.exports = router;
