const { body, param, query } = require('express-validator');
const { ITINERARY_TYPES } = require('../config/constants');

const TYPE_VALUES = Object.values(ITINERARY_TYPES);

const tripIdParamValidator = [
  param('tripId').trim().isUUID().withMessage('Trip id must be a valid UUID'),
];

const itemIdParamValidator = [
  param('itemId').trim().isUUID().withMessage('Itinerary item id must be a valid UUID'),
];

const listItineraryValidator = [
  query('type')
    .optional({ checkFalsy: true, nullable: true })
    .trim()
    .toLowerCase()
    .isIn(TYPE_VALUES)
    .withMessage('Invalid itinerary type filter'),
  query('from')
    .optional({ checkFalsy: true, nullable: true })
    .isISO8601()
    .withMessage('from must be an ISO8601 datetime'),
  query('to')
    .optional({ checkFalsy: true, nullable: true })
    .isISO8601()
    .withMessage('to must be an ISO8601 datetime'),
];

const createItineraryValidator = [
  body('type')
    .exists()
    .withMessage('type is required')
    .bail()
    .trim()
    .toLowerCase()
    .isIn(TYPE_VALUES)
    .withMessage('Invalid itinerary type'),
  body('title')
    .exists()
    .withMessage('title is required')
    .bail()
    .isString()
    .withMessage('title must be text')
    .trim()
    .notEmpty()
    .withMessage('title is required')
    .isLength({ max: 200 })
    .withMessage('title must be 200 characters or fewer'),
  body('provider')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('provider must be text')
    .isLength({ max: 200 })
    .withMessage('provider must be 200 characters or fewer'),
  body('startTime')
    .optional({ checkFalsy: true, nullable: true })
    .isISO8601()
    .withMessage('startTime must be an ISO8601 datetime'),
  body('endTime')
    .optional({ checkFalsy: true, nullable: true })
    .isISO8601()
    .withMessage('endTime must be an ISO8601 datetime'),
  body('bookingReference')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('bookingReference must be text')
    .isLength({ max: 150 })
    .withMessage('bookingReference must be 150 characters or fewer'),
  body('location')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('location must be text')
    .isLength({ max: 255 })
    .withMessage('location must be 255 characters or fewer'),
  body('notes')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('notes must be text'),
  body('details')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || typeof value === 'object') {
        return true;
      }

      try {
        JSON.parse(value);
        return true;
      } catch (error) {
        throw new Error('details must be valid JSON');
      }
    }),
  body('sortOrder')
    .optional({ checkFalsy: true, nullable: true })
    .isInt()
    .withMessage('sortOrder must be an integer'),
];

const updateItineraryValidator = [
  body('type')
    .optional({ checkFalsy: true, nullable: true })
    .trim()
    .toLowerCase()
    .isIn(TYPE_VALUES)
    .withMessage('Invalid itinerary type'),
  body('title')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('title must be text')
    .isLength({ max: 200 })
    .withMessage('title must be 200 characters or fewer'),
  body('provider')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('provider must be text')
    .isLength({ max: 200 })
    .withMessage('provider must be 200 characters or fewer'),
  body('startTime')
    .optional({ checkFalsy: true, nullable: true })
    .isISO8601()
    .withMessage('startTime must be an ISO8601 datetime'),
  body('endTime')
    .optional({ checkFalsy: true, nullable: true })
    .isISO8601()
    .withMessage('endTime must be an ISO8601 datetime'),
  body('bookingReference')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('bookingReference must be text')
    .isLength({ max: 150 })
    .withMessage('bookingReference must be 150 characters or fewer'),
  body('location')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('location must be text')
    .isLength({ max: 255 })
    .withMessage('location must be 255 characters or fewer'),
  body('notes')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('notes must be text'),
  body('details')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || typeof value === 'object') {
        return true;
      }

      try {
        JSON.parse(value);
        return true;
      } catch (error) {
        throw new Error('details must be valid JSON');
      }
    }),
  body('sortOrder')
    .optional({ checkFalsy: true, nullable: true })
    .isInt()
    .withMessage('sortOrder must be an integer'),
];

module.exports = {
  tripIdParamValidator,
  itemIdParamValidator,
  listItineraryValidator,
  createItineraryValidator,
  updateItineraryValidator,
};
