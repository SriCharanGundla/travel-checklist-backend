const { Op } = require('sequelize');
const { ChecklistCategory, ChecklistItem, Traveler } = require('../models');
const AppError = require('../utils/AppError');
const { PRIORITY_LEVELS, PERMISSION_LEVELS } = require('../config/constants');
const { ensureTripAccess } = require('./authorizationService');
const slugify = require('../utils/slugify');

const toNullableString = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

const normalizeDate = (value, fieldName) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(`Invalid date provided for ${fieldName}`, 400, 'CHECKLIST.INVALID_DATE');
  }

  return value;
};

const resolvePriority = (priority, fallback = PRIORITY_LEVELS.MEDIUM) => {
  if (!priority) {
    return fallback;
  }

  const normalized = String(priority).trim().toLowerCase();
  const match = Object.values(PRIORITY_LEVELS).find((value) => value === normalized);
  return match || fallback;
};

const ensureTripPermission = async (userId, tripId, requiredPermission) => {
  await ensureTripAccess(userId, tripId, { requiredPermission });
};

const getCategoryForTrip = async (tripId, categoryId, transaction) => {
  const category = await ChecklistCategory.findOne({
    where: { id: categoryId, tripId },
    transaction,
  });

  if (!category) {
    throw new AppError('Checklist category not found', 404, 'CHECKLIST.CATEGORY_NOT_FOUND');
  }

  return category;
};

const ensureCategoryAccess = async (userId, tripId, categoryId, requiredPermission, transaction) => {
  await ensureTripPermission(userId, tripId, requiredPermission);
  return getCategoryForTrip(tripId, categoryId, transaction);
};

const ensureItemAccess = async (userId, itemId, requiredPermission) => {
  const item = await ChecklistItem.findOne({
    where: { id: itemId },
    include: [
      {
        model: ChecklistCategory,
        as: 'category',
        attributes: ['id', 'tripId'],
      },
    ],
  });

  if (!item || !item.category) {
    throw new AppError('Checklist item not found', 404, 'CHECKLIST.ITEM_NOT_FOUND');
  }

  await ensureTripPermission(userId, item.category.tripId, requiredPermission);
  return item;
};

const ensureTravelerForTrip = async (tripId, travelerId) => {
  if (!travelerId) {
    return null;
  }

  const traveler = await Traveler.findOne({
    where: { id: travelerId, tripId },
  });

  if (!traveler) {
    throw new AppError('Assignee traveler not found for this trip', 404, 'TRAVELER.NOT_FOUND');
  }

  return traveler;
};

const findExistingSlug = async (tripId, slugCandidate, transaction) => {
  return ChecklistCategory.findOne({
    where: {
      tripId,
      slug: slugCandidate,
    },
    transaction,
    paranoid: false,
  });
};

const generateUniqueSlug = async (tripId, base, transaction) => {
  const sanitizedBase = slugify(base) || 'category';
  let slugCandidate = sanitizedBase;
  let attempt = 1;

  // eslint-disable-next-line no-await-in-loop
  while (await findExistingSlug(tripId, slugCandidate, transaction)) {
    attempt += 1;
    slugCandidate = `${sanitizedBase}-${attempt}`;
  }

  return slugCandidate;
};

const getChecklistBoard = async (userId, tripId) => {
  await ensureTripPermission(userId, tripId, PERMISSION_LEVELS.VIEW);

  const categories = await ChecklistCategory.findAll({
    where: { tripId },
    order: [
      ['sortOrder', 'ASC'],
      ['createdAt', 'ASC'],
    ],
  });

  const plainCategories = categories.map((category) => ({
    ...category.get({ plain: true }),
    items: [],
  }));

  const categoryIds = plainCategories.map((category) => category.id);
  if (!categoryIds.length) {
    return plainCategories;
  }

  const items = await ChecklistItem.findAll({
    where: {
      categoryId: {
        [Op.in]: categoryIds,
      },
    },
    include: [
      {
        model: Traveler,
        as: 'assignee',
        attributes: [
          'id',
          'tripId',
          'fullName',
          'preferredName',
          'passportNumber',
          'passportExpiry',
        ],
      },
    ],
    order: [
      ['categoryId', 'ASC'],
      ['sortOrder', 'ASC'],
      ['createdAt', 'ASC'],
    ],
  });

  const itemsByCategory = new Map();
  items.forEach((item) => {
    const plainItem = item.get({ plain: true });
    if (!itemsByCategory.has(plainItem.categoryId)) {
      itemsByCategory.set(plainItem.categoryId, []);
    }
    itemsByCategory.get(plainItem.categoryId).push(plainItem);
  });

  return plainCategories.map((category) => ({
    ...category,
    items: itemsByCategory.get(category.id) || [],
  }));
};

const createCategory = async (userId, tripId, payload) => {
  await ensureTripPermission(userId, tripId, PERMISSION_LEVELS.EDIT);

  const name =
    typeof payload.name === 'string' && payload.name.trim()
      ? payload.name.trim()
      : (() => {
          throw new AppError('Category name is required', 400, 'CHECKLIST.CATEGORY_NAME_REQUIRED');
        })();

  const baseSlug = payload.slug || name;

  const category = await ChecklistCategory.sequelize.transaction(async (transaction) => {
    const slug = await generateUniqueSlug(tripId, baseSlug, transaction);

    const maxSortOrder = await ChecklistCategory.unscoped().max('sortOrder', {
      where: { tripId },
      transaction,
    });

    const sortOrder =
      typeof payload.sortOrder === 'number' && Number.isFinite(payload.sortOrder)
        ? payload.sortOrder
        : Number.isFinite(maxSortOrder)
        ? maxSortOrder + 1
        : 0;

    const created = await ChecklistCategory.create(
      {
        tripId,
        name,
        slug,
        description: toNullableString(payload.description),
        sortOrder,
      },
      { transaction }
    );

    return created;
  });

  return category.get({ plain: true });
};

const updateCategory = async (userId, tripId, categoryId, updates) => {
  const category = await ensureCategoryAccess(userId, tripId, categoryId, PERMISSION_LEVELS.EDIT);

  if (Object.prototype.hasOwnProperty.call(updates, 'name')) {
    const name = toNullableString(updates.name);
    if (!name) {
      throw new AppError('Category name is required', 400, 'CHECKLIST.CATEGORY_NAME_REQUIRED');
    }
    category.set('name', name);
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'description')) {
    category.set('description', toNullableString(updates.description));
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'sortOrder')) {
    const sortOrder = updates.sortOrder;
    if (sortOrder !== null && sortOrder !== undefined && !Number.isFinite(sortOrder)) {
      throw new AppError('Sort order must be a numeric value', 400, 'CHECKLIST.INVALID_SORT_ORDER');
    }
    if (Number.isFinite(sortOrder)) {
      category.set('sortOrder', Math.trunc(sortOrder));
    }
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'slug')) {
    const slugValue = toNullableString(updates.slug);
    if (!slugValue) {
      throw new AppError('Slug cannot be empty', 400, 'CHECKLIST.INVALID_SLUG');
    }

    const newSlug = slugify(slugValue);
    if (!newSlug) {
      throw new AppError('Slug cannot be empty', 400, 'CHECKLIST.INVALID_SLUG');
    }

    const existing = await ChecklistCategory.findOne({
      where: { tripId, slug: newSlug, id: { [Op.ne]: category.id } },
    });

    if (existing) {
      throw new AppError('Slug already in use for this trip', 409, 'CHECKLIST.DUPLICATE_SLUG');
    }

    category.set('slug', newSlug);
  }

  await category.save();
  return category.get({ plain: true });
};

const deleteCategory = async (userId, tripId, categoryId) => {
  const category = await ensureCategoryAccess(userId, tripId, categoryId, PERMISSION_LEVELS.EDIT);

  await ChecklistCategory.sequelize.transaction(async (transaction) => {
    await ChecklistItem.destroy({
      where: { categoryId },
      transaction,
    });

    await category.destroy({ transaction });
  });
};

const createItem = async (userId, categoryId, payload) => {
  const category = await ChecklistCategory.findOne({
    where: { id: categoryId },
  });

  if (!category) {
    throw new AppError('Checklist category not found', 404, 'CHECKLIST.CATEGORY_NOT_FOUND');
  }

  await ensureTripPermission(userId, category.tripId, PERMISSION_LEVELS.EDIT);

  const title =
    typeof payload.title === 'string' && payload.title.trim()
      ? payload.title.trim()
      : (() => {
          throw new AppError('Checklist item title is required', 400, 'CHECKLIST.ITEM_TITLE_REQUIRED');
        })();

  let assignee = null;
  if (payload.assigneeTravelerId) {
    assignee = await ensureTravelerForTrip(category.tripId, payload.assigneeTravelerId);
  }

  const maxSortOrder = await ChecklistItem.unscoped().max('sortOrder', {
    where: { categoryId },
  });

  const item = await ChecklistItem.create({
    categoryId,
    title,
    priority: resolvePriority(payload.priority),
    dueDate: normalizeDate(payload.dueDate, 'dueDate'),
    completedAt: null,
    assigneeTravelerId: assignee ? assignee.id : null,
    notes: toNullableString(payload.notes),
    sortOrder: Number.isFinite(maxSortOrder) ? maxSortOrder + 1 : 0,
  });

  return item.get({ plain: true });
};

const updateItem = async (userId, itemId, updates) => {
  const item = await ensureItemAccess(userId, itemId, PERMISSION_LEVELS.EDIT);

  if (Object.prototype.hasOwnProperty.call(updates, 'title')) {
    const title = toNullableString(updates.title);
    if (!title) {
      throw new AppError('Checklist item title is required', 400, 'CHECKLIST.ITEM_TITLE_REQUIRED');
    }
    item.set('title', title);
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'priority')) {
    item.set('priority', resolvePriority(updates.priority, item.priority));
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'dueDate')) {
    const normalized = normalizeDate(updates.dueDate, 'dueDate');
    if (normalized !== undefined) {
      item.set('dueDate', normalized);
    }
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'notes')) {
    item.set('notes', toNullableString(updates.notes));
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'assigneeTravelerId')) {
    const assigneeId = updates.assigneeTravelerId;
    if (!assigneeId) {
      item.set('assigneeTravelerId', null);
    } else {
      const category = item.category || (await item.getCategory());
      const tripId = category.tripId;
      const assignee = await ensureTravelerForTrip(tripId, assigneeId);
      item.set('assigneeTravelerId', assignee.id);
    }
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'completed')) {
    const completed = Boolean(updates.completed);
    item.set('completedAt', completed ? new Date() : null);
  } else if (Object.prototype.hasOwnProperty.call(updates, 'completedAt')) {
    const completedAt = updates.completedAt;
    const normalized = normalizeDate(completedAt, 'completedAt');
    if (normalized === null) {
      item.set('completedAt', null);
    } else if (normalized !== undefined) {
      item.set('completedAt', new Date(normalized));
    }
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'sortOrder')) {
    const sortOrder = updates.sortOrder;
    if (sortOrder !== null && sortOrder !== undefined && !Number.isFinite(sortOrder)) {
      throw new AppError('Sort order must be numeric', 400, 'CHECKLIST.INVALID_SORT_ORDER');
    }

    if (Number.isFinite(sortOrder)) {
      item.set('sortOrder', Math.trunc(sortOrder));
    }
  }

  await item.save();
  return item.get({ plain: true });
};

const setItemCompletion = async (userId, itemId, completed = true) => {
  const item = await ensureItemAccess(userId, itemId, PERMISSION_LEVELS.EDIT);
  item.set('completedAt', completed ? new Date() : null);
  await item.save();
  return item.get({ plain: true });
};

const deleteItem = async (userId, itemId) => {
  const item = await ensureItemAccess(userId, itemId, PERMISSION_LEVELS.EDIT);
  await item.destroy();
};

module.exports = {
  getChecklistBoard,
  createCategory,
  updateCategory,
  deleteCategory,
  createItem,
  updateItem,
  setItemCompletion,
  deleteItem,
};
