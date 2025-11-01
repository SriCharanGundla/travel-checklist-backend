const express = require('express');
const ChecklistController = require('../../controllers/ChecklistController');
const authenticate = require('../../middleware/authMiddleware');
const validateRequest = require('../../middleware/validateRequest');
const {
  tripIdParamValidator,
  categoryIdParamValidator,
  itemIdParamValidator,
  createCategoryValidator,
  updateCategoryValidator,
  createItemValidator,
  updateItemValidator,
  setItemCompletionValidator,
} = require('../../validators/checklistValidator');

const router = express.Router();

router.use(authenticate);

router.get(
  '/trips/:tripId/checklists',
  [...tripIdParamValidator],
  validateRequest,
  ChecklistController.board
);

router.post(
  '/trips/:tripId/checklists',
  [...tripIdParamValidator, ...createCategoryValidator],
  validateRequest,
  ChecklistController.createCategory
);

router.patch(
  '/trips/:tripId/checklists/:categoryId',
  [...tripIdParamValidator, ...categoryIdParamValidator, ...updateCategoryValidator],
  validateRequest,
  ChecklistController.updateCategory
);

router.delete(
  '/trips/:tripId/checklists/:categoryId',
  [...tripIdParamValidator, ...categoryIdParamValidator],
  validateRequest,
  ChecklistController.removeCategory
);

router.post(
  '/checklists/categories/:categoryId/items',
  [...categoryIdParamValidator, ...createItemValidator],
  validateRequest,
  ChecklistController.createItem
);

router.patch(
  '/checklists/items/:itemId',
  [...itemIdParamValidator, ...updateItemValidator],
  validateRequest,
  ChecklistController.updateItem
);

router.post(
  '/checklists/items/:itemId/complete',
  [...itemIdParamValidator, ...setItemCompletionValidator],
  validateRequest,
  ChecklistController.setItemCompletion
);

router.delete(
  '/checklists/items/:itemId',
  [...itemIdParamValidator],
  validateRequest,
  ChecklistController.removeItem
);

module.exports = router;

