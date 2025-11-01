const { Op } = require('sequelize');
const { Trip } = require('../models');
const AppError = require('../utils/AppError');
const { TRIP_STATUS, TRIP_TYPES } = require('../config/constants');

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

const listTrips = async (ownerId, filters = {}) => {
  const where = {
    ownerId,
  };

  const normalizedStatus =
    typeof filters.status === 'string' ? filters.status.trim().toLowerCase() : undefined;
  if (normalizedStatus && Object.values(TRIP_STATUS).includes(normalizedStatus)) {
    where.status = normalizedStatus;
  }

  const normalizedType =
    typeof filters.type === 'string' ? filters.type.trim().toLowerCase() : undefined;
  if (normalizedType && Object.values(TRIP_TYPES).includes(normalizedType)) {
    where.type = normalizedType;
  }

  const searchTerm = typeof filters.search === 'string' ? filters.search.trim() : null;
  if (searchTerm) {
    const likeOperator =
      Trip.sequelize && typeof Trip.sequelize.getDialect === 'function'
        ? Trip.sequelize.getDialect() === 'postgres'
          ? Op.iLike
          : Op.like
        : Op.like;

    where[Op.or] = [
      { name: { [likeOperator]: `%${searchTerm}%` } },
      { destination: { [likeOperator]: `%${searchTerm}%` } },
    ];
  }

  if (filters.startDate) {
    where.startDate = { [Op.gte]: filters.startDate };
  }

  if (filters.endDate) {
    where.endDate = { [Op.lte]: filters.endDate };
  }

  const trips = await Trip.findAll({
    where,
    order: [
      ['startDate', 'ASC'],
      ['createdAt', 'DESC'],
    ],
  });

  return trips.map((trip) => trip.get({ plain: true }));
};

const createTrip = async (ownerId, payload) => {
  const startDate = toNullableString(payload.startDate);
  const endDate = toNullableString(payload.endDate);

  validateDateRange(startDate, endDate);

  const trip = await Trip.create({
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
  });

  return trip.get({ plain: true });
};

const getTripById = async (ownerId, tripId) => {
  const trip = await Trip.findOne({
    where: {
      id: tripId,
      ownerId,
    },
  });

  if (!trip) {
    throw new AppError('Trip not found', 404, 'TRIP.NOT_FOUND');
  }

  return trip.get({ plain: true });
};

const updateTrip = async (ownerId, tripId, updates) => {
  const hasStartDate = Object.prototype.hasOwnProperty.call(updates, 'startDate');
  const hasEndDate = Object.prototype.hasOwnProperty.call(updates, 'endDate');

  const normalizedStartDate = hasStartDate ? toNullableString(updates.startDate) : undefined;
  const normalizedEndDate = hasEndDate ? toNullableString(updates.endDate) : undefined;

  const trip = await Trip.findOne({
    where: {
      id: tripId,
      ownerId,
    },
  });

  if (!trip) {
    throw new AppError('Trip not found', 404, 'TRIP.NOT_FOUND');
  }

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

  await trip.save();

  return trip.get({ plain: true });
};

const deleteTrip = async (ownerId, tripId) => {
  const trip = await Trip.findOne({
    where: {
      id: tripId,
      ownerId,
    },
  });

  if (!trip) {
    throw new AppError('Trip not found', 404, 'TRIP.NOT_FOUND');
  }

  await trip.destroy();
};

module.exports = {
  listTrips,
  createTrip,
  getTripById,
  updateTrip,
  deleteTrip,
};
