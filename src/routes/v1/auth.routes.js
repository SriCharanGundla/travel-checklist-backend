const express = require('express');
const AuthController = require('../../controllers/AuthController');
const {
  registerValidator,
  loginValidator,
  refreshValidator,
  logoutValidator,
} = require('../../validators/authValidator');
const validateRequest = require('../../middleware/validateRequest');
const authenticate = require('../../middleware/authMiddleware');
const { authLimiter } = require('../../middleware/rateLimiter');

const router = express.Router();

router.post('/register', authLimiter, registerValidator, validateRequest, AuthController.register);
router.post('/login', authLimiter, loginValidator, validateRequest, AuthController.login);
router.post('/refresh', authLimiter, refreshValidator, validateRequest, AuthController.refresh);
router.post('/logout', authenticate, logoutValidator, validateRequest, AuthController.logout);
router.get('/me', authenticate, AuthController.me);

module.exports = router;
