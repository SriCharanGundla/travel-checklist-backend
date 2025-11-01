const expenseService = require('../services/expenseService');
const { sendResponse } = require('../utils/response');
const catchAsync = require('../utils/catchAsync');

const list = catchAsync(async (req, res) => {
  const expenses = await expenseService.listExpenses(req.auth.userId, req.params.tripId, req.query);

  return sendResponse(res, {
    data: expenses,
    meta: {
      count: expenses.length,
    },
  });
});

const create = catchAsync(async (req, res) => {
  const expense = await expenseService.createExpense(
    req.auth.userId,
    req.params.tripId,
    req.body
  );

  return sendResponse(res, {
    data: expense,
    statusCode: 201,
    message: 'Expense recorded',
  });
});

const update = catchAsync(async (req, res) => {
  const expense = await expenseService.updateExpense(
    req.auth.userId,
    req.params.tripId,
    req.params.expenseId,
    req.body
  );

  return sendResponse(res, {
    data: expense,
    message: 'Expense updated',
  });
});

const remove = catchAsync(async (req, res) => {
  await expenseService.deleteExpense(req.auth.userId, req.params.tripId, req.params.expenseId);
  return res.status(204).send();
});

module.exports = {
  list,
  create,
  update,
  remove,
};
