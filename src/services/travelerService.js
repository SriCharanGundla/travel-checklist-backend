const { Traveler, Document, ChecklistItem, TravelerContact } = require('../models');
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

const ensureContactForUser = async (userId, contactId) => {
  if (!contactId) {
    return null;
  }

  const contact = await TravelerContact.findOne({
    where: {
      id: contactId,
      userId,
    },
  });

  if (!contact) {
    throw new AppError('Traveler contact not found', 404, 'TRAVELER_CONTACT.NOT_FOUND');
  }

  return contact;
};

const createTraveler = async (userId, tripId, payload) => {
  await ensureTripPermission(userId, tripId, PERMISSION_LEVELS.EDIT);

  const contactId =
    typeof payload.contactId === 'string' && payload.contactId.trim()
      ? payload.contactId.trim()
      : null;
  const contact = await ensureContactForUser(userId, contactId);
  if (contactId) {
    const duplicate = await Traveler.findOne({
      where: {
        tripId,
        contactId,
      },
    });

    if (duplicate) {
      throw new AppError(
        'This traveler is already part of the trip.',
        409,
        'TRAVELER.DUPLICATE_CONTACT'
      );
    }
  }

  const contactData = contact ? contact.get({ plain: true }) : null;
  const getField = (field) => {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      return payload[field];
    }
    return contactData ? contactData[field] : undefined;
  };
  const resolveString = (field) => toNullableString(getField(field));

  const fullNameInput = getField('fullName');
  const fullName =
    typeof fullNameInput === 'string' && fullNameInput.trim()
      ? fullNameInput.trim()
      : (() => {
          throw new AppError('Traveler name is required', 400, 'TRAVELER.NAME_REQUIRED');
        })();

  const birthdate = normalizeDate(getField('birthdate'), 'birthdate');
  const passportExpiry = normalizeDate(getField('passportExpiry'), 'passportExpiry');

  const traveler = await Traveler.create({
    tripId,
    contactId,
    fullName,
    preferredName: resolveString('preferredName'),
    email: resolveString('email'),
    phone: resolveString('phone'),
    birthdate,
    passportNumber: resolveString('passportNumber'),
    passportCountry: resolveString('passportCountry'),
    passportExpiry,
    emergencyContactName: resolveString('emergencyContactName'),
    emergencyContactPhone: resolveString('emergencyContactPhone'),
    notes: resolveString('notes'),
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
