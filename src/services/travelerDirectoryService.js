const { TravelerContact } = require('../models');
const AppError = require('../utils/AppError');

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

const ensureContact = async (userId, contactId) => {
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

const listContacts = async (userId) => {
  const contacts = await TravelerContact.findAll({
    where: { userId },
  });

  return contacts.map((contact) => contact.get({ plain: true }));
};

const createContact = async (userId, payload) => {
  const fullName = typeof payload.fullName === 'string' ? payload.fullName.trim() : '';
  if (!fullName) {
    throw new AppError('Traveler name is required', 400, 'TRAVELER_CONTACT.NAME_REQUIRED');
  }

  const contact = await TravelerContact.create({
    userId,
    fullName,
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

  return contact.get({ plain: true });
};

const updateContact = async (userId, contactId, updates) => {
  const contact = await ensureContact(userId, contactId);

  const setters = {
    fullName: (value) => {
      if (value === undefined) return;
      if (!value || !String(value).trim()) {
        throw new AppError('Traveler name is required', 400, 'TRAVELER_CONTACT.NAME_REQUIRED');
      }
      contact.set('fullName', String(value).trim());
    },
    preferredName: (value) => contact.set('preferredName', toNullableString(value)),
    email: (value) => contact.set('email', toNullableString(value)),
    phone: (value) => contact.set('phone', toNullableString(value)),
    birthdate: (value) => {
      const normalized = normalizeDate(value, 'birthdate');
      if (normalized !== undefined) {
        contact.set('birthdate', normalized);
      }
    },
    passportNumber: (value) => contact.set('passportNumber', toNullableString(value)),
    passportCountry: (value) => contact.set('passportCountry', toNullableString(value)),
    passportExpiry: (value) => {
      const normalized = normalizeDate(value, 'passportExpiry');
      if (normalized !== undefined) {
        contact.set('passportExpiry', normalized);
      }
    },
    emergencyContactName: (value) =>
      contact.set('emergencyContactName', toNullableString(value)),
    emergencyContactPhone: (value) =>
      contact.set('emergencyContactPhone', toNullableString(value)),
    notes: (value) => contact.set('notes', toNullableString(value)),
  };

  Object.entries(setters).forEach(([key, apply]) => {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      apply(updates[key]);
    }
  });

  await contact.save();
  return contact.get({ plain: true });
};

const deleteContact = async (userId, contactId) => {
  const contact = await ensureContact(userId, contactId);
  await contact.destroy();
};

module.exports = {
  listContacts,
  createContact,
  updateContact,
  deleteContact,
};
