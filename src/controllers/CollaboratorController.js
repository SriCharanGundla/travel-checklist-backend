const collaboratorService = require('../services/collaboratorService');
const { sendResponse } = require('../utils/response');
const catchAsync = require('../utils/catchAsync');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

const list = catchAsync(async (req, res) => {
  const pagination = parsePagination(req.query);

  const { rows, count } = await collaboratorService.listCollaborators(
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

const invite = catchAsync(async (req, res) => {
  const { collaborator, inviteToken } = await collaboratorService.inviteCollaborator(
    req.auth.userId,
    req.params.tripId,
    req.body
  );

  return sendResponse(res, {
    data: {
      collaborator,
      inviteToken,
    },
    statusCode: 201,
    message: 'Invitation created',
  });
});

const resend = catchAsync(async (req, res) => {
  const { collaborator, inviteToken } = await collaboratorService.regenerateInviteToken(
    req.auth.userId,
    req.params.tripId,
    req.params.collaboratorId
  );

  return sendResponse(res, {
    data: {
      collaborator,
      inviteToken,
    },
    message: 'Invitation regenerated',
  });
});

const updatePermission = catchAsync(async (req, res) => {
  const collaborator = await collaboratorService.updateCollaboratorPermission(
    req.auth.userId,
    req.params.tripId,
    req.params.collaboratorId,
    req.body.permissionLevel
  );

  return sendResponse(res, {
    data: collaborator,
    message: 'Collaborator updated',
  });
});

const remove = catchAsync(async (req, res) => {
  await collaboratorService.removeCollaborator(
    req.auth.userId,
    req.params.tripId,
    req.params.collaboratorId
  );

  return res.status(204).send();
});

const accept = catchAsync(async (req, res) => {
  const collaborator = await collaboratorService.acceptInvitation({
    token: req.body.token,
    userId: req.auth.userId,
  });

  return sendResponse(res, {
    data: collaborator,
    message: 'Invitation accepted',
  });
});

const decline = catchAsync(async (req, res) => {
  const collaborator = await collaboratorService.declineInvitation({
    token: req.body.token,
    reason: req.body.reason,
  });

  return sendResponse(res, {
    data: collaborator,
    message: 'Invitation declined',
  });
});

module.exports = {
  list,
  invite,
  resend,
  updatePermission,
  remove,
  accept,
  decline,
};
