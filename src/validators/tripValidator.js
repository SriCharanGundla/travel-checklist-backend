const { body, param, query } = require('express-validator');
const { TRIP_STATUS, TRIP_TYPES } = require('../config/constants');

const sanitizeNullableString = (value) => {
  if (value === undefined || value === null) {
    return value;
  }

  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();

  return trimmed === '' ? null : trimmed;
};

const sanitizeNullableNumber = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const numeric = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isNaN(numeric) ? value : numeric;
};

const listTripsValidator = [
  query('status')
    .optional({ checkFalsy: true, nullable: true })
    .trim()
    .toLowerCase()
    .isIn(Object.values(TRIP_STATUS))
    .withMessage('Invalid trip status filter'),
  query('type')
    .optional({ checkFalsy: true, nullable: true })
    .trim()
    .toLowerCase()
    .isIn(Object.values(TRIP_TYPES))
    .withMessage('Invalid trip type filter'),
  query('startDate')
    .optional({ checkFalsy: true, nullable: true })
    .isISO8601({ strict: true })
    .withMessage('startDate must be a valid ISO 8601 date'),
  query('endDate')
    .optional({ checkFalsy: true, nullable: true })
    .isISO8601({ strict: true })
    .withMessage('endDate must be a valid ISO 8601 date'),
  query('search')
    .optional({ checkFalsy: true, nullable: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage('search must be text up to 255 characters'),
];

const tripIdParamValidator = [param('tripId').trim().isUUID().withMessage('Trip id must be a valid UUID')];

const createTripValidator = [
  body('name')
    .isString()
    .withMessage('Trip name is required')
    .trim()
    .notEmpty()
    .withMessage('Trip name is required')
    .isLength({ max: 150 })
    .withMessage('Trip name must be 150 characters or fewer')
    .customSanitizer(sanitizeNullableString),
  body('destination')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('Destination must be text')
    .trim()
    .isLength({ max: 255 })
    .withMessage('Destination must be 255 characters or fewer')
    .customSanitizer(sanitizeNullableString),
  body('startDate')
    .customSanitizer(sanitizeNullableString)
    .optional({ checkFalsy: true, nullable: true })
    .isISO8601({ strict: true })
    .withMessage('startDate must be a valid ISO 8601 date')
    .bail()
    .custom((value, { req }) => {
      if (!value || !req.body.endDate) {
        return true;
      }
      const start = new Date(value);
      const end = new Date(req.body.endDate);

      if (start > end) {
        throw new Error('Start date must be on or before end date');
      }

      return true;
    }),
  body('endDate')
    .customSanitizer(sanitizeNullableString)
    .optional({ checkFalsy: true, nullable: true })
    .isISO8601({ strict: true })
    .withMessage('endDate must be a valid ISO 8601 date')
    .bail()
    .custom((value, { req }) => {
      if (!value || !req.body.startDate) {
        return true;
      }

      const start = new Date(req.body.startDate);
      const end = new Date(value);

      if (start > end) {
        throw new Error('End date must be on or after start date');
      }

      return true;
    }),
  body('status')
    .optional({ checkFalsy: true, nullable: true })
    .trim()
    .toLowerCase()
    .isIn(Object.values(TRIP_STATUS))
    .withMessage('Invalid trip status'),
  body('type')
    .optional({ checkFalsy: true, nullable: true })
    .trim()
    .toLowerCase()
    .isIn(Object.values(TRIP_TYPES))
    .withMessage('Invalid trip type'),
  body('budgetCurrency')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('Budget currency must be a string')
    .trim()
    .isLength({ min: 3, max: 3 })
    .withMessage('Budget currency must be a 3-letter ISO code')
    .matches(/^[A-Za-z]{3}$/)
    .withMessage('Budget currency must contain only letters')
    .customSanitizer((value) => (typeof value === 'string' ? value.toUpperCase() : value)),
  body('budgetAmount')
    .optional({ checkFalsy: true, nullable: true })
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('Budget amount must be a decimal with up to 2 decimal places')
    .custom((value) => Number.parseFloat(value) >= 0)
    .withMessage('Budget amount must be zero or greater')
    .customSanitizer(sanitizeNullableNumber),
  body('description')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('Description must be text')
    .customSanitizer(sanitizeNullableString),
  body('notes')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('Notes must be text')
    .customSanitizer(sanitizeNullableString),
];

const updateTripValidator = [
  body('name')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('Trip name must be text')
    .trim()
    .isLength({ max: 150 })
    .withMessage('Trip name must be 150 characters or fewer')
    .customSanitizer(sanitizeNullableString),
  body('destination')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('Destination must be text')
    .trim()
    .isLength({ max: 255 })
    .withMessage('Destination must be 255 characters or fewer')
    .customSanitizer(sanitizeNullableString),
  body('startDate')
    .customSanitizer(sanitizeNullableString)
    .optional({ checkFalsy: true, nullable: true })
    .isISO8601({ strict: true })
    .withMessage('startDate must be a valid ISO 8601 date')
    .bail()
    .custom((value, { req }) => {
      if (!value || !req.body.endDate) {
        return true;
      }
      const start = new Date(value);
      const end = new Date(req.body.endDate);
      if (start > end) {
        throw new Error('Start date must be on or before end date');
      }
      return true;
    }),
  body('endDate')
    .customSanitizer(sanitizeNullableString)
    .optional({ checkFalsy: true, nullable: true })
    .isISO8601({ strict: true })
    .withMessage('endDate must be a valid ISO 8601 date')
    .bail()
    .custom((value, { req }) => {
      if (!value || !req.body.startDate) {
        return true;
      }
      const start = new Date(req.body.startDate);
      const end = new Date(value);
      if (start > end) {
        throw new Error('End date must be on or after start date');
      }
      return true;
    }),
  body('status')
    .optional({ checkFalsy: true, nullable: true })
    .trim()
    .toLowerCase()
    .isIn(Object.values(TRIP_STATUS))
    .withMessage('Invalid trip status'),
  body('type')
    .optional({ checkFalsy: true, nullable: true })
    .trim()
    .toLowerCase()
    .isIn(Object.values(TRIP_TYPES))
    .withMessage('Invalid trip type'),
  body('budgetCurrency')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('Budget currency must be a string')
    .trim()
    .isLength({ min: 3, max: 3 })
    .withMessage('Budget currency must be a 3-letter ISO code')
    .matches(/^[A-Za-z]{3}$/)
    .withMessage('Budget currency must contain only letters')
    .customSanitizer((value) => (typeof value === 'string' ? value.toUpperCase() : value)),
  body('budgetAmount')
    .optional({ checkFalsy: true, nullable: true })
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('Budget amount must be a decimal with up to 2 decimal places')
    .custom((value) => Number.parseFloat(value) >= 0)
    .withMessage('Budget amount must be zero or greater')
    .customSanitizer(sanitizeNullableNumber),
  body('description')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('Description must be text')
    .customSanitizer(sanitizeNullableString),
  body('notes')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('Notes must be text')
    .customSanitizer(sanitizeNullableString),
];

module.exports = {
  listTripsValidator,
  tripIdParamValidator,
  createTripValidator,
  updateTripValidator,
};
