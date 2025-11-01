const { body, param, query } = require('express-validator');
const { EXPENSE_CATEGORIES } = require('../config/constants');

const CATEGORY_VALUES = Object.values(EXPENSE_CATEGORIES);

const tripIdParamValidator = [
  param('tripId').trim().isUUID().withMessage('Trip id must be a valid UUID'),
];

const expenseIdParamValidator = [
  param('expenseId').trim().isUUID().withMessage('Expense id must be a valid UUID'),
];

const listExpensesValidator = [
  query('category')
    .optional({ checkFalsy: true, nullable: true })
    .trim()
    .toLowerCase()
    .isIn(CATEGORY_VALUES)
    .withMessage('Invalid category filter'),
  query('startDate')
    .optional({ checkFalsy: true, nullable: true })
    .isISO8601()
    .withMessage('startDate must be an ISO8601 date'),
  query('endDate')
    .optional({ checkFalsy: true, nullable: true })
    .isISO8601()
    .withMessage('endDate must be an ISO8601 date'),
];

const createExpenseValidator = [
  body('category')
    .optional({ checkFalsy: true, nullable: true })
    .trim()
    .toLowerCase()
    .isIn(CATEGORY_VALUES)
    .withMessage('Invalid category'),
  body('amount')
    .exists()
    .withMessage('Amount is required')
    .bail()
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('Amount must be a decimal number with up to 2 decimal places')
    .bail()
    .custom((value) => Number.parseFloat(value) >= 0)
    .withMessage('Amount must be zero or greater'),
  body('currency')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('Currency must be text')
    .trim()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter ISO code')
    .matches(/^[A-Za-z]{3}$/)
    .withMessage('Currency must contain only letters'),
  body('spentAt')
    .optional({ checkFalsy: true, nullable: true })
    .isISO8601()
    .withMessage('spentAt must be an ISO8601 datetime'),
  body('merchant')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('merchant must be text')
    .isLength({ max: 255 })
    .withMessage('merchant must be 255 characters or fewer'),
  body('notes')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('notes must be text'),
];

const updateExpenseValidator = [
  body('category')
    .optional({ checkFalsy: true, nullable: true })
    .trim()
    .toLowerCase()
    .isIn(CATEGORY_VALUES)
    .withMessage('Invalid category'),
  body('amount')
    .optional({ checkFalsy: true, nullable: true })
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('Amount must be a decimal number with up to 2 decimal places')
    .bail()
    .custom((value) => Number.parseFloat(value) >= 0)
    .withMessage('Amount must be zero or greater'),
  body('currency')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('Currency must be text')
    .trim()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter ISO code')
    .matches(/^[A-Za-z]{3}$/)
    .withMessage('Currency must contain only letters'),
  body('spentAt')
    .optional({ checkFalsy: true, nullable: true })
    .isISO8601()
    .withMessage('spentAt must be an ISO8601 datetime'),
  body('merchant')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('merchant must be text')
    .isLength({ max: 255 })
    .withMessage('merchant must be 255 characters or fewer'),
  body('notes')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('notes must be text'),
];

module.exports = {
  tripIdParamValidator,
  expenseIdParamValidator,
  listExpensesValidator,
  createExpenseValidator,
  updateExpenseValidator,
};
