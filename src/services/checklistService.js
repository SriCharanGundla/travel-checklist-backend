const { Op } = require('sequelize');
const { Trip, ChecklistCategory, ChecklistItem, Traveler } = require('../models');
const AppError = require('../utils/AppError');
const { PRIORITY_LEVELS } = require('../config/constants');
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

const ensureTripOwnership = async (ownerId, tripId) => {
  const trip = await Trip.findOne({
    where: { id: tripId, ownerId },
  });

  if (!trip) {
    throw new AppError('Trip not found', 404, 'TRIP.NOT_FOUND');
  }

  return trip;
};

const ensureCategoryOwnership = async (ownerId, tripId, categoryId, transaction) => {
  await ensureTripOwnership(ownerId, tripId);

  const category = await ChecklistCategory.findOne({
    where: { id: categoryId, tripId },
    transaction,
  });

  if (!category) {
    throw new AppError('Checklist category not found', 404, 'CHECKLIST.CATEGORY_NOT_FOUND');
  }

  return category;
};

const ensureItemOwnership = async (ownerId, itemId) => {
  const item = await ChecklistItem.findOne({
    where: { id: itemId },
    include: [
      {
        model: ChecklistCategory,
        as: 'category',
        attributes: ['id', 'tripId'],
        include: [
          {
            model: Trip,
            as: 'trip',
            attributes: ['id', 'ownerId'],
          },
        ],
      },
    ],
  });

  if (!item || !item.category || !item.category.trip || item.category.trip.ownerId !== ownerId) {
    throw new AppError('Checklist item not found', 404, 'CHECKLIST.ITEM_NOT_FOUND');
  }

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

const getChecklistBoard = async (ownerId, tripId) => {
  await ensureTripOwnership(ownerId, tripId);

  const categories = await ChecklistCategory.findAll({
    where: { tripId },
    include: [
      {
        model: ChecklistItem,
        as: 'items',
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
          ['sortOrder', 'ASC'],
          ['createdAt', 'ASC'],
        ],
      },
    ],
    order: [
      ['sortOrder', 'ASC'],
      ['createdAt', 'ASC'],
    ],
  });

  return categories.map((category) => category.get({ plain: true }));
};

const createCategory = async (ownerId, tripId, payload) => {
  await ensureTripOwnership(ownerId, tripId);

  const name =
    typeof payload.name === 'string' && payload.name.trim()
      ? payload.name.trim()
      : (() => {
          throw new AppError('Category name is required', 400, 'CHECKLIST.CATEGORY_NAME_REQUIRED');
        })();

  const baseSlug = payload.slug || name;

  const category = await ChecklistCategory.sequelize.transaction(async (transaction) => {
    const slug = await generateUniqueSlug(tripId, baseSlug, transaction);

    const maxSortOrder = await ChecklistCategory.max('sortOrder', {
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

const updateCategory = async (ownerId, tripId, categoryId, updates) => {
  const category = await ensureCategoryOwnership(ownerId, tripId, categoryId);

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

const deleteCategory = async (ownerId, tripId, categoryId) => {
  const category = await ensureCategoryOwnership(ownerId, tripId, categoryId);

  await ChecklistCategory.sequelize.transaction(async (transaction) => {
    await ChecklistItem.destroy({
      where: { categoryId },
      transaction,
    });

    await category.destroy({ transaction });
  });
};

const createItem = async (ownerId, categoryId, payload) => {
  const category = await ChecklistCategory.findOne({
    where: { id: categoryId },
    include: [
      {
        model: Trip,
        as: 'trip',
        attributes: ['id', 'ownerId'],
      },
    ],
  });

  if (!category || category.trip.ownerId !== ownerId) {
    throw new AppError('Checklist category not found', 404, 'CHECKLIST.CATEGORY_NOT_FOUND');
  }

  const title =
    typeof payload.title === 'string' && payload.title.trim()
      ? payload.title.trim()
      : (() => {
          throw new AppError('Checklist item title is required', 400, 'CHECKLIST.ITEM_TITLE_REQUIRED');
        })();

  let assignee = null;
  if (payload.assigneeTravelerId) {
    assignee = await ensureTravelerForTrip(category.trip.id, payload.assigneeTravelerId);
  }

  const maxSortOrder = await ChecklistItem.max('sortOrder', {
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

const updateItem = async (ownerId, itemId, updates) => {
  const item = await ensureItemOwnership(ownerId, itemId);

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

const setItemCompletion = async (ownerId, itemId, completed = true) => {
  const item = await ensureItemOwnership(ownerId, itemId);
  item.set('completedAt', completed ? new Date() : null);
  await item.save();
  return item.get({ plain: true });
};

const deleteItem = async (ownerId, itemId) => {
  const item = await ensureItemOwnership(ownerId, itemId);
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

