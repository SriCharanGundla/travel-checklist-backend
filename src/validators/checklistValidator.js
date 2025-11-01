const { body, param } = require('express-validator');
const { PRIORITY_LEVELS } = require('../config/constants');
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

const categoryIdParamValidator = [
  param('categoryId').trim().isUUID().withMessage('Category id must be a valid UUID'),
];

const itemIdParamValidator = [
  param('itemId').trim().isUUID().withMessage('Item id must be a valid UUID'),
];

const createCategoryValidator = [
  body('name')
    .isString()
    .withMessage('name is required')
    .trim()
    .notEmpty()
    .withMessage('name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('name must be 100 characters or fewer')
    .customSanitizer(sanitizeNullableString),
  body('description')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('description must be text')
    .customSanitizer(sanitizeNullableString),
  body('slug')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('slug must be text')
    .isLength({ max: 100 })
    .withMessage('slug must be 100 characters or fewer')
    .customSanitizer(sanitizeNullableString),
  body('sortOrder')
    .optional({ nullable: true })
    .isNumeric()
    .withMessage('sortOrder must be numeric'),
];

const updateCategoryValidator = [
  body('name')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('name must be text')
    .isLength({ max: 100 })
    .withMessage('name must be 100 characters or fewer')
    .customSanitizer(sanitizeNullableString),
  body('description')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('description must be text')
    .customSanitizer(sanitizeNullableString),
  body('slug')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('slug must be text')
    .isLength({ max: 100 })
    .withMessage('slug must be 100 characters or fewer')
    .customSanitizer(sanitizeNullableString),
  body('sortOrder')
    .optional({ nullable: true })
    .isNumeric()
    .withMessage('sortOrder must be numeric'),
];

const createItemValidator = [
  body('title')
    .isString()
    .withMessage('title is required')
    .trim()
    .notEmpty()
    .withMessage('title cannot be empty')
    .isLength({ max: 200 })
    .withMessage('title must be 200 characters or fewer')
    .customSanitizer(sanitizeNullableString),
  body('priority')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('priority must be a string')
    .trim()
    .toLowerCase()
    .isIn(Object.values(PRIORITY_LEVELS))
    .withMessage('Invalid priority value'),
  body('dueDate')
    .optional({ checkFalsy: true, nullable: true })
    .isISO8601({ strict: true })
    .withMessage('dueDate must be a valid ISO 8601 date'),
  body('assigneeTravelerId')
    .optional({ checkFalsy: true, nullable: true })
    .isUUID()
    .withMessage('assigneeTravelerId must be a valid UUID'),
  body('notes')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('notes must be text')
    .customSanitizer(sanitizeNullableString),
];

const updateItemValidator = [
  body('title')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('title must be text')
    .isLength({ max: 200 })
    .withMessage('title must be 200 characters or fewer')
    .customSanitizer(sanitizeNullableString),
  body('priority')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('priority must be a string')
    .trim()
    .toLowerCase()
    .isIn(Object.values(PRIORITY_LEVELS))
    .withMessage('Invalid priority value'),
  body('dueDate')
    .optional({ checkFalsy: true, nullable: true })
    .isISO8601({ strict: true })
    .withMessage('dueDate must be a valid ISO 8601 date'),
  body('assigneeTravelerId')
    .optional({ checkFalsy: true, nullable: true })
    .isUUID()
    .withMessage('assigneeTravelerId must be a valid UUID'),
  body('notes')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('notes must be text')
    .customSanitizer(sanitizeNullableString),
  body('completed')
    .optional({ nullable: true })
    .isBoolean()
    .withMessage('completed must be a boolean value'),
  body('completedAt')
    .optional({ nullable: true })
    .isISO8601({ strict: true })
    .withMessage('completedAt must be a valid ISO date'),
  body('sortOrder')
    .optional({ nullable: true })
    .isNumeric()
    .withMessage('sortOrder must be numeric'),
];

const setItemCompletionValidator = [
  body('completed')
    .optional({ nullable: true })
    .isBoolean()
    .withMessage('completed must be boolean'),
];

module.exports = {
  tripIdParamValidator,
  categoryIdParamValidator,
  itemIdParamValidator,
  createCategoryValidator,
  updateCategoryValidator,
  createItemValidator,
  updateItemValidator,
  setItemCompletionValidator,
};

