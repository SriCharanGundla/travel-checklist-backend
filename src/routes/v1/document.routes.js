const express = require('express');
const DocumentController = require('../../controllers/DocumentController');
const authenticate = require('../../middleware/authMiddleware');
const validateRequest = require('../../middleware/validateRequest');
const {
  tripIdParamValidator,
  travelerIdParamValidator,
  documentIdParamValidator,
  createDocumentValidator,
  updateDocumentValidator,
  vaultDownloadQueryValidator,
} = require('../../validators/documentValidator');

const router = express.Router();

router.get(
  '/documents/:documentId/vault-download',
  [...documentIdParamValidator, ...vaultDownloadQueryValidator],
  validateRequest,
  DocumentController.vaultDownload
);

router.use(authenticate);

router.get(
  '/trips/:tripId/documents',
  [...tripIdParamValidator],
  validateRequest,
  DocumentController.listByTrip
);

router.post(
  '/travelers/:travelerId/documents',
  [...travelerIdParamValidator, ...createDocumentValidator],
  validateRequest,
  DocumentController.create
);

router.patch(
  '/documents/:documentId',
  [...documentIdParamValidator, ...updateDocumentValidator],
  validateRequest,
  DocumentController.update
);

router.post(
  '/documents/:documentId/vault-link',
  [...documentIdParamValidator],
  validateRequest,
  DocumentController.issueVaultLink
);

router.delete(
  '/documents/:documentId',
  [...documentIdParamValidator],
  validateRequest,
  DocumentController.remove
);

module.exports = router;
