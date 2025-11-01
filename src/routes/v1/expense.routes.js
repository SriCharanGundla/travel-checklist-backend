const express = require('express');
const ExpenseController = require('../../controllers/ExpenseController');
const authenticate = require('../../middleware/authMiddleware');
const validateRequest = require('../../middleware/validateRequest');
const {
  tripIdParamValidator,
  expenseIdParamValidator,
  listExpensesValidator,
  createExpenseValidator,
  updateExpenseValidator,
} = require('../../validators/expenseValidator');

const router = express.Router();

router.use(authenticate);

router.get(
  '/trips/:tripId/expenses',
  [...tripIdParamValidator, ...listExpensesValidator],
  validateRequest,
  ExpenseController.list
);

router.post(
  '/trips/:tripId/expenses',
  [...tripIdParamValidator, ...createExpenseValidator],
  validateRequest,
  ExpenseController.create
);

router.patch(
  '/trips/:tripId/expenses/:expenseId',
  [...tripIdParamValidator, ...expenseIdParamValidator, ...updateExpenseValidator],
  validateRequest,
  ExpenseController.update
);

router.delete(
  '/trips/:tripId/expenses/:expenseId',
  [...tripIdParamValidator, ...expenseIdParamValidator],
  validateRequest,
  ExpenseController.remove
);

module.exports = router;
