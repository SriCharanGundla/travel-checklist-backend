const { body, param } = require('express-validator');
const { tripIdParamValidator } = require('./tripValidator');

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

const travelerIdParamValidator = [
  param('travelerId').trim().isUUID().withMessage('Traveler id must be a valid UUID'),
];

const createTravelerValidator = [
  body('fullName')
    .isString()
    .withMessage('fullName is required')
    .trim()
    .notEmpty()
    .withMessage('fullName cannot be empty')
    .isLength({ max: 150 })
    .withMessage('fullName must be 150 characters or fewer')
    .customSanitizer(sanitizeNullableString),
  body('preferredName')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('preferredName must be text')
    .isLength({ max: 100 })
    .withMessage('preferredName must be 100 characters or fewer')
    .customSanitizer(sanitizeNullableString),
  body('email')
    .optional({ checkFalsy: true, nullable: true })
    .isEmail()
    .withMessage('email must be a valid email address')
    .customSanitizer((value) => (typeof value === 'string' ? value.toLowerCase() : value)),
  body('phone')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('phone must be text')
    .isLength({ max: 30 })
    .withMessage('phone must be 30 characters or fewer')
    .customSanitizer(sanitizeNullableString),
  body('birthdate')
    .optional({ checkFalsy: true, nullable: true })
    .isISO8601({ strict: true })
    .withMessage('birthdate must be a valid ISO 8601 date'),
  body('passportNumber')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('passportNumber must be text')
    .isLength({ max: 50 })
    .withMessage('passportNumber must be 50 characters or fewer')
    .customSanitizer(sanitizeNullableString),
  body('passportCountry')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('passportCountry must be a string')
    .isLength({ min: 2, max: 2 })
    .withMessage('passportCountry must use ISO alpha-2 code')
    .customSanitizer((value) => (typeof value === 'string' ? value.toUpperCase() : value)),
  body('passportExpiry')
    .optional({ checkFalsy: true, nullable: true })
    .isISO8601({ strict: true })
    .withMessage('passportExpiry must be a valid ISO 8601 date'),
  body('emergencyContactName')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('emergencyContactName must be text')
    .isLength({ max: 150 })
    .withMessage('emergencyContactName must be 150 characters or fewer')
    .customSanitizer(sanitizeNullableString),
  body('emergencyContactPhone')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('emergencyContactPhone must be text')
    .isLength({ max: 30 })
    .withMessage('emergencyContactPhone must be 30 characters or fewer')
    .customSanitizer(sanitizeNullableString),
  body('notes')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('notes must be text')
    .customSanitizer(sanitizeNullableString),
];

const updateTravelerValidator = [
  body('fullName')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('fullName must be text')
    .trim()
    .notEmpty()
    .withMessage('fullName cannot be empty when provided')
    .isLength({ max: 150 })
    .withMessage('fullName must be 150 characters or fewer')
    .customSanitizer(sanitizeNullableString),
  body('preferredName')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('preferredName must be text')
    .isLength({ max: 100 })
    .withMessage('preferredName must be 100 characters or fewer')
    .customSanitizer(sanitizeNullableString),
  body('email')
    .optional({ checkFalsy: true, nullable: true })
    .isEmail()
    .withMessage('email must be a valid email address')
    .customSanitizer((value) => (typeof value === 'string' ? value.toLowerCase() : value)),
  body('phone')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('phone must be text')
    .isLength({ max: 30 })
    .withMessage('phone must be 30 characters or fewer')
    .customSanitizer(sanitizeNullableString),
  body('birthdate')
    .optional({ checkFalsy: true, nullable: true })
    .isISO8601({ strict: true })
    .withMessage('birthdate must be a valid ISO 8601 date'),
  body('passportNumber')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('passportNumber must be text')
    .isLength({ max: 50 })
    .withMessage('passportNumber must be 50 characters or fewer')
    .customSanitizer(sanitizeNullableString),
  body('passportCountry')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('passportCountry must be a string')
    .isLength({ min: 2, max: 2 })
    .withMessage('passportCountry must use ISO alpha-2 code')
    .customSanitizer((value) => (typeof value === 'string' ? value.toUpperCase() : value)),
  body('passportExpiry')
    .optional({ checkFalsy: true, nullable: true })
    .isISO8601({ strict: true })
    .withMessage('passportExpiry must be a valid ISO 8601 date'),
  body('emergencyContactName')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('emergencyContactName must be text')
    .isLength({ max: 150 })
    .withMessage('emergencyContactName must be 150 characters or fewer')
    .customSanitizer(sanitizeNullableString),
  body('emergencyContactPhone')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('emergencyContactPhone must be text')
    .isLength({ max: 30 })
    .withMessage('emergencyContactPhone must be 30 characters or fewer')
    .customSanitizer(sanitizeNullableString),
  body('notes')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('notes must be text')
    .customSanitizer(sanitizeNullableString),
];

module.exports = {
  tripIdParamValidator,
  travelerIdParamValidator,
  createTravelerValidator,
  updateTravelerValidator,
};
