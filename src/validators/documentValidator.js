const { body, param, query } = require('express-validator');
const { DOCUMENT_TYPES, DOCUMENT_STATUS } = require('../config/constants');
const { tripIdParamValidator } = require('./tripValidator');
const { travelerIdParamValidator } = require('./travelerValidator');
const documentVaultService = require('../services/documentVaultService');

const sanitizeNullableString = (value) => {
  if (value === undefined || value === null) {
    return value;
  }

  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

const documentIdParamValidator = [
  param('documentId').trim().isUUID().withMessage('Document id must be a valid UUID'),
];

const createDocumentValidator = [
  body('type')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('type must be a string')
    .trim()
    .toLowerCase()
    .isIn(Object.values(DOCUMENT_TYPES))
    .withMessage('Invalid document type'),
  body('identifier')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('identifier must be text')
    .isLength({ max: 100 })
    .withMessage('identifier must be 100 characters or fewer')
    .customSanitizer(sanitizeNullableString),
  body('issuingCountry')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('issuingCountry must be text')
    .isLength({ min: 2, max: 2 })
    .withMessage('issuingCountry must be an ISO alpha-2 code')
    .customSanitizer((value) => (typeof value === 'string' ? value.toUpperCase() : value)),
  body('issuedDate')
    .optional({ checkFalsy: true, nullable: true })
    .isISO8601({ strict: true })
    .withMessage('issuedDate must be a valid ISO 8601 date'),
  body('expiryDate')
    .optional({ checkFalsy: true, nullable: true })
    .isISO8601({ strict: true })
    .withMessage('expiryDate must be a valid ISO 8601 date'),
  body('status')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('status must be a string')
    .trim()
    .toLowerCase()
    .isIn(Object.values(DOCUMENT_STATUS))
    .withMessage('Invalid document status'),
  body('fileUrl')
    .optional({ checkFalsy: true, nullable: true })
    .custom((value) => {
      documentVaultService.normalizeVaultReference(value);
      return true;
    })
    .customSanitizer((value) => documentVaultService.normalizeVaultReference(value)),
  body('notes')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('notes must be text')
    .customSanitizer(sanitizeNullableString),
];

const updateDocumentValidator = createDocumentValidator;

const vaultDownloadQueryValidator = [
  query('token').trim().notEmpty().withMessage('token is required'),
  query('signature')
    .trim()
    .matches(/^[A-Za-z0-9_-]+$/)
    .withMessage('signature is required'),
];

module.exports = {
  tripIdParamValidator,
  travelerIdParamValidator,
  documentIdParamValidator,
  createDocumentValidator,
  updateDocumentValidator,
  vaultDownloadQueryValidator,
};
