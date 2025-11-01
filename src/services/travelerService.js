const { Traveler, Document, ChecklistItem } = require('../models');
const AppError = require('../utils/AppError');
const { PERMISSION_LEVELS } = require('../config/constants');
const { ensureTripAccess } = require('./authorizationService');

const toNullableString = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = typeof value === 'string' ? value.trim() : value;
  if (trimmed === '') {
    return null;
  }

  return trimmed;
};

const normalizeDate = (value, fieldName) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(`Invalid date provided for ${fieldName}`, 400, 'TRAVELER.INVALID_DATE');
  }

  return value;
};

const ensureTripPermission = async (userId, tripId, requiredPermission) => {
  await ensureTripAccess(userId, tripId, { requiredPermission });
};

const findTraveler = async (tripId, travelerId) => {
  const traveler = await Traveler.findOne({
    where: {
      id: travelerId,
      tripId,
    },
  });

  if (!traveler) {
    throw new AppError('Traveler not found', 404, 'TRAVELER.NOT_FOUND');
  }

  return traveler;
};

const listTravelers = async (userId, tripId) => {
  await ensureTripPermission(userId, tripId, PERMISSION_LEVELS.VIEW);

  const travelers = await Traveler.findAll({
    where: {
      tripId,
    },
    include: [
      {
        model: Document,
        as: 'documents',
        attributes: { exclude: ['deletedAt'] },
      },
      {
        model: ChecklistItem,
        as: 'assignedItems',
        attributes: ['id', 'title', 'priority', 'dueDate', 'completedAt'],
        required: false,
      },
    ],
    order: [
      ['createdAt', 'ASC'],
      ['fullName', 'ASC'],
    ],
  });

  return travelers.map((traveler) => traveler.get({ plain: true }));
};

const createTraveler = async (userId, tripId, payload) => {
  await ensureTripPermission(userId, tripId, PERMISSION_LEVELS.EDIT);

  const traveler = await Traveler.create({
    tripId,
    fullName:
      typeof payload.fullName === 'string' && payload.fullName.trim()
        ? payload.fullName.trim()
        : (() => {
            throw new AppError('Traveler name is required', 400, 'TRAVELER.NAME_REQUIRED');
          })(),
    preferredName: toNullableString(payload.preferredName),
    email: toNullableString(payload.email),
    phone: toNullableString(payload.phone),
    birthdate: normalizeDate(payload.birthdate, 'birthdate'),
    passportNumber: toNullableString(payload.passportNumber),
    passportCountry: toNullableString(payload.passportCountry),
    passportExpiry: normalizeDate(payload.passportExpiry, 'passportExpiry'),
    emergencyContactName: toNullableString(payload.emergencyContactName),
    emergencyContactPhone: toNullableString(payload.emergencyContactPhone),
    notes: toNullableString(payload.notes),
  });

  return traveler.get({ plain: true });
};

const updateTraveler = async (userId, tripId, travelerId, updates) => {
  await ensureTripPermission(userId, tripId, PERMISSION_LEVELS.EDIT);
  const traveler = await findTraveler(tripId, travelerId);

  const setters = {
    fullName: (value) => {
      if (value === undefined) return;
      if (!value || !String(value).trim()) {
        throw new AppError('Traveler name is required', 400, 'TRAVELER.NAME_REQUIRED');
      }
      traveler.set('fullName', String(value).trim());
    },
    preferredName: (value) => traveler.set('preferredName', toNullableString(value)),
    email: (value) => traveler.set('email', toNullableString(value)),
    phone: (value) => traveler.set('phone', toNullableString(value)),
    birthdate: (value) => {
      const normalized = normalizeDate(value, 'birthdate');
      if (normalized !== undefined) {
        traveler.set('birthdate', normalized);
      }
    },
    passportNumber: (value) => traveler.set('passportNumber', toNullableString(value)),
    passportCountry: (value) => traveler.set('passportCountry', toNullableString(value)),
    passportExpiry: (value) => {
      const normalized = normalizeDate(value, 'passportExpiry');
      if (normalized !== undefined) {
        traveler.set('passportExpiry', normalized);
      }
    },
    emergencyContactName: (value) =>
      traveler.set('emergencyContactName', toNullableString(value)),
    emergencyContactPhone: (value) =>
      traveler.set('emergencyContactPhone', toNullableString(value)),
    notes: (value) => traveler.set('notes', toNullableString(value)),
  };

  Object.entries(setters).forEach(([key, apply]) => {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      apply(updates[key]);
    }
  });

  await traveler.save();
  return traveler.get({ plain: true });
};

const deleteTraveler = async (userId, tripId, travelerId) => {
  await ensureTripPermission(userId, tripId, PERMISSION_LEVELS.EDIT);
  const traveler = await findTraveler(tripId, travelerId);
  await traveler.destroy();
};

module.exports = {
  listTravelers,
  createTraveler,
  updateTraveler,
  deleteTraveler,
};
