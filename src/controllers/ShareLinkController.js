const collaboratorService = require('../services/collaboratorService');
const { sendResponse } = require('../utils/response');
const catchAsync = require('../utils/catchAsync');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

const list = catchAsync(async (req, res) => {
  const pagination = parsePagination(req.query);

  const { rows, count } = await collaboratorService.listShareLinks(
    req.auth.userId,
    req.params.tripId,
    pagination
  );

  return sendResponse(res, {
    data: rows,
    meta: buildPaginationMeta({
      page: pagination.page,
      limit: pagination.limit,
      total: count,
    }),
  });
});

const create = catchAsync(async (req, res) => {
  const { shareLink, rawToken } = await collaboratorService.createShareLink(
    req.auth.userId,
    req.params.tripId,
    req.body
  );

  return sendResponse(res, {
    data: {
      shareLink,
      token: rawToken,
    },
    statusCode: 201,
    message: 'Share link created',
  });
});

const revoke = catchAsync(async (req, res) => {
  await collaboratorService.revokeShareLink(
    req.auth.userId,
    req.params.tripId,
    req.params.shareLinkId
  );

  return res.status(204).send();
});

const publicGet = catchAsync(async (req, res) => {
  const shareLink = await collaboratorService.publicLookupShareLink({
    token: req.params.token,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  return sendResponse(res, {
    data: shareLink,
  });
});

const publicAction = catchAsync(async (req, res) => {
  const result = await collaboratorService.performShareLinkAction({
    token: req.params.token,
    action: req.body.action,
    payload: req.body.payload,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  return sendResponse(res, {
    data: result,
    message: 'Share link action processed',
  });
});

module.exports = {
  list,
  create,
  revoke,
  publicGet,
  publicAction,
};
