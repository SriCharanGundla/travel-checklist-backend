const { Op } = require('sequelize');
const { Trip, ChecklistCategory, TripCollaborator } = require('../models');
const AppError = require('../utils/AppError');
const {
  TRIP_STATUS,
  TRIP_TYPES,
  DEFAULT_CHECKLIST_CATEGORY_DEFINITIONS,
  PERMISSION_LEVELS,
  COLLABORATOR_STATUS,
} = require('../config/constants');
const { ensureTripAccess, ensureTripOwner } = require('./authorizationService');

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

const resolveStatus = (status, fallback = TRIP_STATUS.PLANNING) =>
  Object.values(TRIP_STATUS).includes(status) ? status : fallback;

const resolveType = (type, fallback = TRIP_TYPES.LEISURE) =>
  Object.values(TRIP_TYPES).includes(type) ? type : fallback;

const toCurrency = (currency, fallback = 'USD') => {
  const value = typeof currency === 'string' ? currency.trim().toUpperCase() : currency;
  if (!value) {
    return fallback;
  }
  return value;
};

const toBooleanFlag = (value, fallback = false) => {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }

  return Boolean(value);
};

const toBudgetAmount = (amount, fallback = 0) => {
  if (amount === undefined || amount === null || amount === '') {
    return fallback;
  }

  const numeric = typeof amount === 'number' ? amount : Number.parseFloat(amount);

  if (Number.isNaN(numeric)) {
    throw new AppError('Budget amount must be numeric', 400, 'TRIP.INVALID_BUDGET');
  }

  if (numeric < 0) {
    throw new AppError('Budget amount must be zero or greater', 400, 'TRIP.INVALID_BUDGET');
  }

  return Math.round(numeric * 100) / 100;
};

const validateDateRange = (startDate, endDate) => {
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new AppError('Invalid date provided', 400, 'TRIP.INVALID_DATE');
    }

    if (start > end) {
      throw new AppError('Start date must be on or before end date', 400, 'TRIP.INVALID_RANGE');
    }
  }
};

const buildTripResponse = (tripInstance, context = {}) => {
  const plain = tripInstance.get({ plain: true });

  if (plain.documentsModuleEnabled === undefined) {
    plain.documentsModuleEnabled = false;
  }

  if (plain.collaborators) {
    delete plain.collaborators;
  }

  let permissionLevel = context.permissionLevel || PERMISSION_LEVELS.ADMIN;
  let role = context.role || 'owner';

  if (context.collaborator) {
    permissionLevel = context.collaborator.permissionLevel;
    role = 'collaborator';
  } else if (context.userId && plain.ownerId !== context.userId) {
    const collaboratorEntry = tripInstance.collaborators
      ? tripInstance.collaborators.find((col) => col.userId === context.userId)
      : null;

    if (collaboratorEntry) {
      permissionLevel = collaboratorEntry.permissionLevel;
      role = 'collaborator';
    }
  }

  return {
    ...plain,
    permission: {
      role,
      level: permissionLevel,
    },
  };
};

const listTrips = async (userId, filters = {}) => {
  const conditions = [];

  const accessCondition = {
    [Op.or]: [{ ownerId: userId }, { '$collaborators.user_id$': userId }],
  };
  conditions.push(accessCondition);

  const normalizedStatus =
    typeof filters.status === 'string' ? filters.status.trim().toLowerCase() : undefined;
  if (normalizedStatus && Object.values(TRIP_STATUS).includes(normalizedStatus)) {
    conditions.push({ status: normalizedStatus });
  }

  const normalizedType =
    typeof filters.type === 'string' ? filters.type.trim().toLowerCase() : undefined;
  if (normalizedType && Object.values(TRIP_TYPES).includes(normalizedType)) {
    conditions.push({ type: normalizedType });
  }

  const searchTerm = typeof filters.search === 'string' ? filters.search.trim() : null;
  if (searchTerm) {
    const likeOperator =
      Trip.sequelize && typeof Trip.sequelize.getDialect === 'function'
        ? Trip.sequelize.getDialect() === 'postgres'
          ? Op.iLike
          : Op.like
        : Op.like;

    conditions.push({
      [Op.or]: [
        { name: { [likeOperator]: `%${searchTerm}%` } },
        { destination: { [likeOperator]: `%${searchTerm}%` } },
      ],
    });
  }

  if (filters.startDate) {
    conditions.push({ startDate: { [Op.gte]: filters.startDate } });
  }

  if (filters.endDate) {
    conditions.push({ endDate: { [Op.lte]: filters.endDate } });
  }

  const trips = await Trip.findAll({
    where: {
      [Op.and]: conditions,
    },
    include: [
      {
        model: TripCollaborator,
        as: 'collaborators',
        attributes: ['id', 'userId', 'permissionLevel', 'status'],
        required: false,
        where: {
          userId,
          status: COLLABORATOR_STATUS.ACCEPTED,
        },
      },
    ],
    distinct: true,
    order: [
      ['startDate', 'ASC'],
      ['createdAt', 'DESC'],
    ],
  });

  return trips.map((trip) => buildTripResponse(trip, { userId }));
};

const buildDefaultCategories = (tripId) =>
  DEFAULT_CHECKLIST_CATEGORY_DEFINITIONS.map((category) => ({
    tripId,
    slug: category.slug,
    name: category.name,
    description: category.description,
    sortOrder: category.sortOrder,
  }));

const createTrip = async (ownerId, payload) => {
  const startDate = toNullableString(payload.startDate);
  const endDate = toNullableString(payload.endDate);

  validateDateRange(startDate, endDate);

  const trip = await Trip.sequelize.transaction(async (transaction) => {
    const createdTrip = await Trip.create(
      {
        ownerId,
        name: typeof payload.name === 'string' ? payload.name.trim() : payload.name,
        destination: toNullableString(payload.destination),
        startDate,
        endDate,
        status: resolveStatus(payload.status),
        type: resolveType(payload.type),
        budgetCurrency: toCurrency(payload.budgetCurrency),
        budgetAmount: toBudgetAmount(payload.budgetAmount),
        description: toNullableString(payload.description),
        notes: toNullableString(payload.notes),
        documentsModuleEnabled: toBooleanFlag(payload.documentsModuleEnabled, false),
      },
      { transaction }
    );

    const categories = buildDefaultCategories(createdTrip.id);
    if (categories.length > 0) {
      await ChecklistCategory.bulkCreate(categories, { transaction });
    }

    return createdTrip;
  });

  return buildTripResponse(trip, {
    role: 'owner',
    permissionLevel: PERMISSION_LEVELS.ADMIN,
  });
};

const getTripById = async (userId, tripId) => {
  const { trip, role, collaborator, permissionLevel } = await ensureTripAccess(userId, tripId);

  return buildTripResponse(trip, {
    role,
    collaborator,
    permissionLevel,
    userId,
  });
};

const updateTrip = async (userId, tripId, updates) => {
  const hasStartDate = Object.prototype.hasOwnProperty.call(updates, 'startDate');
  const hasEndDate = Object.prototype.hasOwnProperty.call(updates, 'endDate');

  const normalizedStartDate = hasStartDate ? toNullableString(updates.startDate) : undefined;
  const normalizedEndDate = hasEndDate ? toNullableString(updates.endDate) : undefined;

  const { trip, permissionLevel, role } = await ensureTripAccess(userId, tripId, {
    requiredPermission: PERMISSION_LEVELS.EDIT,
  });

  validateDateRange(
    normalizedStartDate !== undefined ? normalizedStartDate : trip.startDate,
    normalizedEndDate !== undefined ? normalizedEndDate : trip.endDate
  );

  if (Object.prototype.hasOwnProperty.call(updates, 'name')) {
    trip.set(
      'name',
      updates.name === undefined || updates.name === null
        ? trip.name
        : typeof updates.name === 'string'
        ? updates.name.trim()
        : updates.name
    );
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'destination')) {
    trip.set('destination', toNullableString(updates.destination));
  }

  if (hasStartDate) {
    trip.set('startDate', normalizedStartDate);
  }

  if (hasEndDate) {
    trip.set('endDate', normalizedEndDate);
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'status')) {
    trip.set('status', resolveStatus(updates.status, trip.status));
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'type')) {
    trip.set('type', resolveType(updates.type, trip.type));
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'budgetCurrency')) {
    trip.set('budgetCurrency', toCurrency(updates.budgetCurrency, trip.budgetCurrency));
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'budgetAmount')) {
    trip.set('budgetAmount', toBudgetAmount(updates.budgetAmount, trip.budgetAmount));
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'description')) {
    trip.set('description', toNullableString(updates.description));
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'notes')) {
    trip.set('notes', toNullableString(updates.notes));
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'documentsModuleEnabled')) {
    trip.set('documentsModuleEnabled', toBooleanFlag(updates.documentsModuleEnabled, trip.documentsModuleEnabled));
  }

  await trip.save();

  return buildTripResponse(trip, {
    role,
    permissionLevel,
  });
};

const deleteTrip = async (userId, tripId) => {
  const { trip } = await ensureTripAccess(userId, tripId, {
    requiredPermission: PERMISSION_LEVELS.ADMIN,
  });

  await trip.destroy();
};

module.exports = {
  listTrips,
  createTrip,
  getTripById,
  updateTrip,
  deleteTrip,
};
