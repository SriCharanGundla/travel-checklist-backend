const documentService = require('../services/documentService');
const { sendResponse } = require('../utils/response');
const catchAsync = require('../utils/catchAsync');

const listByTrip = catchAsync(async (req, res) => {
  const documents = await documentService.listDocumentsByTrip(req.auth.userId, req.params.tripId);

  return sendResponse(res, {
    data: documents,
    meta: {
      count: documents.length,
    },
  });
});

const create = catchAsync(async (req, res) => {
  const document = await documentService.createDocument(
    req.auth.userId,
    req.params.travelerId,
    req.body
  );

  return sendResponse(res, {
    data: document,
    statusCode: 201,
    message: 'Document created',
  });
});

const update = catchAsync(async (req, res) => {
  const document = await documentService.updateDocument(
    req.auth.userId,
    req.params.documentId,
    req.body
  );

  return sendResponse(res, {
    data: document,
    message: 'Document updated',
  });
});

const remove = catchAsync(async (req, res) => {
  await documentService.deleteDocument(req.auth.userId, req.params.documentId);
  return res.status(204).send();
});

const issueVaultLink = catchAsync(async (req, res) => {
  const { downloadUrl, expiresAt, fileName } = await documentService.generateVaultLink(
    req.auth.userId,
    req.params.documentId,
    req
  );

  return sendResponse(res, {
    data: {
      downloadUrl,
      expiresAt,
      fileName,
    },
    message: 'Secure download link generated',
  });
});

const vaultDownload = catchAsync(async (req, res) => {
  const result = await documentService.resolveVaultDownload({
    documentId: req.params.documentId,
    token: req.query.token,
    signature: req.query.signature,
  });

  res.set('Cache-Control', 'no-store');
  return res.redirect(302, result.vaultReference);
});

module.exports = {
  listByTrip,
  create,
  update,
  remove,
  issueVaultLink,
  vaultDownload,
};
