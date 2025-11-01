const { body } = require('express-validator');

const registerValidator = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  body('firstName')
    .optional({ nullable: true })
    .isLength({ max: 100 })
    .withMessage('First name must be 100 characters or fewer'),
  body('lastName')
    .optional({ nullable: true })
    .isLength({ max: 100 })
    .withMessage('Last name must be 100 characters or fewer'),
  body('timezone')
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 100 })
    .withMessage('Timezone must be a string'),
];

const loginValidator = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password')
    .isString()
    .notEmpty()
    .withMessage('Password is required'),
];

const refreshValidator = [
  body('refreshToken')
    .isString()
    .notEmpty()
    .withMessage('Refresh token is required'),
];

const logoutValidator = [
  body('refreshToken')
    .isString()
    .notEmpty()
    .withMessage('Refresh token is required'),
];

module.exports = {
  registerValidator,
  loginValidator,
  refreshValidator,
  logoutValidator,
};
