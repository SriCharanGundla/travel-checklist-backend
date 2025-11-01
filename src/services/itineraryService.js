const { Op } = require('sequelize');
const { ItineraryItem } = require('../models');
const AppError = require('../utils/AppError');
const { ITINERARY_TYPES, PERMISSION_LEVELS } = require('../config/constants');
const { ensureTripAccess } = require('./authorizationService');

const ITINERARY_TYPE_VALUES = Object.values(ITINERARY_TYPES);

const normalizeType = (value) => {
  if (!value) {
    throw new AppError('Itinerary item type is required', 400, 'ITINERARY.TYPE_REQUIRED');
  }

  const type = String(value).trim().toLowerCase();
  if (!ITINERARY_TYPE_VALUES.includes(type)) {
    throw new AppError('Invalid itinerary item type', 400, 'ITINERARY.INVALID_TYPE');
  }

  return type;
};

const normalizeTitle = (value) => {
  if (!value || !String(value).trim()) {
    throw new AppError('Itinerary item title is required', 400, 'ITINERARY.TITLE_REQUIRED');
  }

  return String(value).trim();
};

const normalizeDateTime = (value, fieldName) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(`Invalid date for ${fieldName}`, 400, 'ITINERARY.INVALID_DATE');
  }

  return date;
};

const normalizeOptionalString = (value, maxLength = 255) => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, maxLength);
};

const normalizeSortOrder = (value) => {
  if (value === undefined || value === null || value === '') {
    return 0;
  }

  const numeric = Number.parseInt(value, 10);
  if (Number.isNaN(numeric)) {
    throw new AppError('Invalid sort order', 400, 'ITINERARY.INVALID_SORT');
  }

  return numeric;
};

const normalizeDetails = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    throw new AppError('Details must be valid JSON', 400, 'ITINERARY.INVALID_DETAILS');
  }
};

const listItineraryItems = async (userId, tripId, filters = {}) => {
  await ensureTripAccess(userId, tripId, { requiredPermission: PERMISSION_LEVELS.VIEW });

  const where = { tripId };

  if (filters.type) {
    where.type = normalizeType(filters.type);
  }

  if (filters.from || filters.to) {
    where.startTime = {};

    if (filters.from) {
      where.startTime[Op.gte] = new Date(filters.from);
    }

    if (filters.to) {
      where.startTime[Op.lte] = new Date(filters.to);
    }
  }

  const items = await ItineraryItem.findAll({
    where,
    order: [
      ['startTime', 'ASC'],
      ['sortOrder', 'ASC'],
      ['createdAt', 'ASC'],
    ],
  });

  return items.map((item) => item.get({ plain: true }));
};

const createItineraryItem = async (userId, tripId, payload) => {
  await ensureTripAccess(userId, tripId, { requiredPermission: PERMISSION_LEVELS.EDIT });

  const startTime = normalizeDateTime(payload.startTime, 'startTime');
  const endTime = normalizeDateTime(payload.endTime, 'endTime');

  if (startTime && endTime && startTime > endTime) {
    throw new AppError('End time must be after start time', 400, 'ITINERARY.INVALID_RANGE');
  }

  const item = await ItineraryItem.create({
    tripId,
    type: normalizeType(payload.type),
    title: normalizeTitle(payload.title),
    provider: normalizeOptionalString(payload.provider, 200),
    startTime,
    endTime,
    bookingReference: normalizeOptionalString(payload.bookingReference, 150),
    location: normalizeOptionalString(payload.location, 255),
    details: normalizeDetails(payload.details),
    notes: normalizeOptionalString(payload.notes, 2000),
    sortOrder: normalizeSortOrder(payload.sortOrder),
  });

  return item.get({ plain: true });
};

const updateItineraryItem = async (userId, tripId, itemId, updates) => {
  await ensureTripAccess(userId, tripId, { requiredPermission: PERMISSION_LEVELS.EDIT });

  const item = await ItineraryItem.findOne({
    where: {
      id: itemId,
      tripId,
    },
  });

  if (!item) {
    throw new AppError('Itinerary item not found', 404, 'ITINERARY.NOT_FOUND');
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'type')) {
    item.set('type', normalizeType(updates.type));
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'title')) {
    item.set('title', normalizeTitle(updates.title));
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'provider')) {
    item.set('provider', normalizeOptionalString(updates.provider, 200));
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'startTime')) {
    item.set('startTime', normalizeDateTime(updates.startTime, 'startTime'));
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'endTime')) {
    item.set('endTime', normalizeDateTime(updates.endTime, 'endTime'));
  }

  if (item.startTime && item.endTime && item.startTime > item.endTime) {
    throw new AppError('End time must be after start time', 400, 'ITINERARY.INVALID_RANGE');
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'bookingReference')) {
    item.set('bookingReference', normalizeOptionalString(updates.bookingReference, 150));
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'location')) {
    item.set('location', normalizeOptionalString(updates.location, 255));
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'details')) {
    item.set('details', normalizeDetails(updates.details));
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'notes')) {
    item.set('notes', normalizeOptionalString(updates.notes, 2000));
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'sortOrder')) {
    item.set('sortOrder', normalizeSortOrder(updates.sortOrder));
  }

  await item.save();

  return item.get({ plain: true });
};

const deleteItineraryItem = async (userId, tripId, itemId) => {
  await ensureTripAccess(userId, tripId, { requiredPermission: PERMISSION_LEVELS.EDIT });

  const item = await ItineraryItem.findOne({
    where: {
      id: itemId,
      tripId,
    },
  });

  if (!item) {
    throw new AppError('Itinerary item not found', 404, 'ITINERARY.NOT_FOUND');
  }

  await item.destroy();
};

module.exports = {
  listItineraryItems,
  createItineraryItem,
  updateItineraryItem,
  deleteItineraryItem,
};
