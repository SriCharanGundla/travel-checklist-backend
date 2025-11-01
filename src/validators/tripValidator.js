const { body, param, query } = require('express-validator');
const { TRIP_STATUS, TRIP_TYPES } = require('../config/constants');

const listTripsValidator = [
  query('status')
    .optional({ nullable: true })
    .isIn(Object.values(TRIP_STATUS))
    .withMessage('Invalid trip status filter'),
  query('type')
    .optional({ nullable: true })
    .isIn(Object.values(TRIP_TYPES))
    .withMessage('Invalid trip type filter'),
  query('startDate')
    .optional({ nullable: true })
    .isISO8601({ strict: true })
    .withMessage('startDate must be a valid ISO 8601 date'),
  query('endDate')
    .optional({ nullable: true })
    .isISO8601({ strict: true })
    .withMessage('endDate must be a valid ISO 8601 date'),
  query('search')
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 255 })
    .withMessage('search must be text up to 255 characters'),
];

const tripIdParamValidator = [
  param('tripId').isUUID().withMessage('Trip id must be a valid UUID'),
];

const createTripValidator = [
  body('name')
    .isString()
    .notEmpty()
    .withMessage('Trip name is required')
    .isLength({ max: 150 })
    .withMessage('Trip name must be 150 characters or fewer'),
  body('destination')
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 255 })
    .withMessage('Destination must be 255 characters or fewer'),
  body('startDate')
    .optional({ nullable: true })
    .isISO8601({ strict: true })
    .withMessage('startDate must be a valid ISO 8601 date'),
  body('endDate')
    .optional({ nullable: true })
    .isISO8601({ strict: true })
    .withMessage('endDate must be a valid ISO 8601 date'),
  body('status')
    .optional({ nullable: true })
    .isIn(Object.values(TRIP_STATUS))
    .withMessage('Invalid trip status'),
  body('type')
    .optional({ nullable: true })
    .isIn(Object.values(TRIP_TYPES))
    .withMessage('Invalid trip type'),
  body('budgetCurrency')
    .optional({ nullable: true })
    .isString()
    .isLength({ min: 3, max: 3 })
    .withMessage('Budget currency must be a 3-letter ISO code'),
  body('budgetAmount')
    .optional({ nullable: true })
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('Budget amount must be a decimal with up to 2 decimal places'),
  body('description')
    .optional({ nullable: true })
    .isString()
    .withMessage('Description must be text'),
  body('notes')
    .optional({ nullable: true })
    .isString()
    .withMessage('Notes must be text'),
];

const updateTripValidator = [
  body('name')
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 150 })
    .withMessage('Trip name must be 150 characters or fewer'),
  body('destination')
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 255 })
    .withMessage('Destination must be 255 characters or fewer'),
  body('startDate')
    .optional({ nullable: true })
    .isISO8601({ strict: true })
    .withMessage('startDate must be a valid ISO 8601 date'),
  body('endDate')
    .optional({ nullable: true })
    .isISO8601({ strict: true })
    .withMessage('endDate must be a valid ISO 8601 date'),
  body('status')
    .optional({ nullable: true })
    .isIn(Object.values(TRIP_STATUS))
    .withMessage('Invalid trip status'),
  body('type')
    .optional({ nullable: true })
    .isIn(Object.values(TRIP_TYPES))
    .withMessage('Invalid trip type'),
  body('budgetCurrency')
    .optional({ nullable: true })
    .isString()
    .isLength({ min: 3, max: 3 })
    .withMessage('Budget currency must be a 3-letter ISO code'),
  body('budgetAmount')
    .optional({ nullable: true })
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('Budget amount must be a decimal with up to 2 decimal places'),
  body('description')
    .optional({ nullable: true })
    .isString()
    .withMessage('Description must be text'),
  body('notes')
    .optional({ nullable: true })
    .isString()
    .withMessage('Notes must be text'),
];

module.exports = {
  listTripsValidator,
  tripIdParamValidator,
  createTripValidator,
  updateTripValidator,
};
