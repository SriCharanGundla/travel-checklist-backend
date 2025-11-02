const { body } = require('express-validator');

const passwordComplexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,64}$/;

const validateTimezone = (value) => {
  try {
    if (value === undefined || value === null || value === '') {
      return true;
    }
    Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch (error) {
    throw new Error('Timezone must be a valid IANA identifier');
  }
};

const registerValidator = [
  body('email')
    .trim()
    .normalizeEmail({ gmail_remove_dots: false })
    .isEmail()
    .withMessage('Valid email is required')
    .isLength({ max: 255 })
    .withMessage('Email must be 255 characters or fewer'),
  body('password')
    .isString()
    .withMessage('Password is required')
    .isLength({ min: 8, max: 64 })
    .withMessage('Password must be between 8 and 64 characters long')
    .matches(passwordComplexityRegex)
    .withMessage('Password must include upper & lower case letters and a number'),
  body('firstName')
    .optional({ checkFalsy: true, nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('First name must be 100 characters or fewer')
    .matches(/^[\p{L}\p{M}\s'.-]+$/u)
    .withMessage('First name contains invalid characters'),
  body('lastName')
    .optional({ checkFalsy: true, nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Last name must be 100 characters or fewer')
    .matches(/^[\p{L}\p{M}\s'.-]+$/u)
    .withMessage('Last name contains invalid characters'),
  body('timezone')
    .optional({ checkFalsy: true, nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Timezone must be 100 characters or fewer')
    .bail()
    .custom(validateTimezone),
];

const loginValidator = [
  body('email')
    .trim()
    .normalizeEmail({ gmail_remove_dots: false })
    .isEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isString()
    .withMessage('Password is required')
    .isLength({ min: 8, max: 64 })
    .withMessage('Password must be between 8 and 64 characters long'),
  body('timezone')
    .optional({ checkFalsy: true, nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Timezone must be 100 characters or fewer')
    .bail()
    .custom(validateTimezone),
];

const refreshValidator = [
  body('refreshToken')
    .isString()
    .withMessage('Refresh token must be a string')
    .trim()
    .notEmpty()
    .withMessage('Refresh token is required'),
];

const logoutValidator = [
  body('refreshToken')
    .isString()
    .withMessage('Refresh token must be a string')
    .trim()
    .notEmpty()
    .withMessage('Refresh token is required'),
];

const requestPasswordResetValidator = [
  body('email')
    .trim()
    .normalizeEmail({ gmail_remove_dots: false })
    .isEmail()
    .withMessage('Valid email is required'),
];

const resetPasswordValidator = [
  body('token')
    .isString()
    .withMessage('Reset token must be a string')
    .trim()
    .notEmpty()
    .withMessage('Reset token is required'),
  body('password')
    .isString()
    .withMessage('Password is required')
    .isLength({ min: 8, max: 64 })
    .withMessage('Password must be between 8 and 64 characters long')
    .matches(passwordComplexityRegex)
    .withMessage('Password must include upper & lower case letters and a number'),
];

module.exports = {
  registerValidator,
  loginValidator,
  refreshValidator,
  logoutValidator,
  requestPasswordResetValidator,
  resetPasswordValidator,
};
