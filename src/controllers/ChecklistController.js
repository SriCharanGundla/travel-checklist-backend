const checklistService = require('../services/checklistService');
const { sendResponse } = require('../utils/response');
const catchAsync = require('../utils/catchAsync');

const board = catchAsync(async (req, res) => {
  const categories = await checklistService.getChecklistBoard(req.auth.userId, req.params.tripId);

  return sendResponse(res, {
    data: categories,
    meta: {
      count: categories.length,
    },
  });
});

const createCategory = catchAsync(async (req, res) => {
  const category = await checklistService.createCategory(
    req.auth.userId,
    req.params.tripId,
    req.body
  );

  return sendResponse(res, {
    data: category,
    statusCode: 201,
    message: 'Checklist category created',
  });
});

const updateCategory = catchAsync(async (req, res) => {
  const category = await checklistService.updateCategory(
    req.auth.userId,
    req.params.tripId,
    req.params.categoryId,
    req.body
  );

  return sendResponse(res, {
    data: category,
    message: 'Checklist category updated',
  });
});

const removeCategory = catchAsync(async (req, res) => {
  await checklistService.deleteCategory(req.auth.userId, req.params.tripId, req.params.categoryId);
  return res.status(204).send();
});

const createItem = catchAsync(async (req, res) => {
  const item = await checklistService.createItem(req.auth.userId, req.params.categoryId, req.body);

  return sendResponse(res, {
    data: item,
    statusCode: 201,
    message: 'Checklist item created',
  });
});

const updateItem = catchAsync(async (req, res) => {
  const item = await checklistService.updateItem(req.auth.userId, req.params.itemId, req.body);

  return sendResponse(res, {
    data: item,
    message: 'Checklist item updated',
  });
});

const setItemCompletion = catchAsync(async (req, res) => {
  const { completed = true } = req.body || {};
  const item = await checklistService.setItemCompletion(
    req.auth.userId,
    req.params.itemId,
    Boolean(completed)
  );

  return sendResponse(res, {
    data: item,
    message: completed ? 'Checklist item marked complete' : 'Checklist item marked incomplete',
  });
});

const removeItem = catchAsync(async (req, res) => {
  await checklistService.deleteItem(req.auth.userId, req.params.itemId);
  return res.status(204).send();
});

module.exports = {
  board,
  createCategory,
  updateCategory,
  removeCategory,
  createItem,
  updateItem,
  setItemCompletion,
  removeItem,
};

