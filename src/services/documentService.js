const { Traveler, Document, Trip } = require('../models');
const AppError = require('../utils/AppError');
const { DOCUMENT_TYPES, DOCUMENT_STATUS, PERMISSION_LEVELS } = require('../config/constants');
const { ensureTripAccess } = require('./authorizationService');

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

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(`Invalid date provided for ${fieldName}`, 400, 'DOCUMENT.INVALID_DATE');
  }

  return value;
};

const resolveDocumentType = (type, fallback = DOCUMENT_TYPES.PASSPORT) => {
  if (!type) {
    return fallback;
  }

  const normalized = String(type).trim().toLowerCase();
  const match = Object.values(DOCUMENT_TYPES).find((value) => value === normalized);
  return match || fallback;
};

const resolveDocumentStatus = (status, fallback = DOCUMENT_STATUS.PENDING) => {
  if (!status) {
    return fallback;
  }

  const normalized = String(status).trim().toLowerCase();
  const match = Object.values(DOCUMENT_STATUS).find((value) => value === normalized);
  return match || fallback;
};

const ensureTripPermission = async (userId, tripId, requiredPermission) => {
  await ensureTripAccess(userId, tripId, { requiredPermission });
};

const ensureTravelerForUser = async (userId, travelerId, requiredPermission) => {
  const traveler = await Traveler.findOne({
    where: { id: travelerId },
    include: [
      {
        model: Trip,
        as: 'trip',
        attributes: ['id'],
      },
    ],
  });

  if (!traveler) {
    throw new AppError('Traveler not found', 404, 'TRAVELER.NOT_FOUND');
  }

  await ensureTripPermission(userId, traveler.tripId, requiredPermission);
  return traveler;
};

const ensureDocumentForUser = async (userId, documentId, requiredPermission) => {
  const document = await Document.findOne({
    where: { id: documentId },
    include: [
      {
        model: Traveler,
        as: 'traveler',
        include: [
          {
            model: Trip,
            as: 'trip',
            attributes: ['id'],
          },
        ],
      },
    ],
  });

  if (!document || !document.traveler || !document.traveler.trip) {
    throw new AppError('Document not found', 404, 'DOCUMENT.NOT_FOUND');
  }

  await ensureTripPermission(userId, document.traveler.trip.id, requiredPermission);
  return document;
};

const listDocumentsByTrip = async (userId, tripId) => {
  await ensureTripPermission(userId, tripId, PERMISSION_LEVELS.VIEW);

  const documents = await Document.findAll({
    include: [
      {
        model: Traveler,
        as: 'traveler',
        where: { tripId },
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
      ['expiryDate', 'ASC'],
      ['createdAt', 'DESC'],
    ],
  });

  return documents.map((document) => document.get({ plain: true }));
};

const createDocument = async (userId, travelerId, payload) => {
  const traveler = await ensureTravelerForUser(userId, travelerId, PERMISSION_LEVELS.EDIT);

  const document = await Document.create({
    travelerId: traveler.id,
    type: resolveDocumentType(payload.type),
    identifier: toNullableString(payload.identifier),
    issuingCountry: toNullableString(payload.issuingCountry),
    issuedDate: normalizeDate(payload.issuedDate, 'issuedDate'),
    expiryDate: normalizeDate(payload.expiryDate, 'expiryDate'),
    status: resolveDocumentStatus(payload.status),
    fileUrl: toNullableString(payload.fileUrl),
    notes: toNullableString(payload.notes),
  });

  return document.get({ plain: true });
};

const updateDocument = async (userId, documentId, updates) => {
  const document = await ensureDocumentForUser(userId, documentId, PERMISSION_LEVELS.EDIT);

  const setters = {
    type: (value) => {
      if (value !== undefined) {
        document.set('type', resolveDocumentType(value, document.type));
      }
    },
    identifier: (value) => document.set('identifier', toNullableString(value)),
    issuingCountry: (value) => document.set('issuingCountry', toNullableString(value)),
    issuedDate: (value) => {
      const normalized = normalizeDate(value, 'issuedDate');
      if (normalized !== undefined) {
        document.set('issuedDate', normalized);
      }
    },
    expiryDate: (value) => {
      const normalized = normalizeDate(value, 'expiryDate');
      if (normalized !== undefined) {
        document.set('expiryDate', normalized);
      }
    },
    status: (value) => {
      if (value !== undefined) {
        document.set('status', resolveDocumentStatus(value, document.status));
      }
    },
    fileUrl: (value) => document.set('fileUrl', toNullableString(value)),
    notes: (value) => document.set('notes', toNullableString(value)),
  };

  Object.entries(setters).forEach(([key, apply]) => {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      apply(updates[key]);
    }
  });

  await document.save();
  return document.get({ plain: true });
};

const deleteDocument = async (userId, documentId) => {
  const document = await ensureDocumentForUser(userId, documentId, PERMISSION_LEVELS.EDIT);
  await document.destroy();
};

module.exports = {
  listDocumentsByTrip,
  createDocument,
  updateDocument,
  deleteDocument,
};
