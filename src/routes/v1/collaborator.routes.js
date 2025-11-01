const express = require('express');
const CollaboratorController = require('../../controllers/CollaboratorController');
const authenticate = require('../../middleware/authMiddleware');
const validateRequest = require('../../middleware/validateRequest');
const {
  tripIdParamValidator,
  collaboratorIdParamValidator,
  inviteCollaboratorValidator,
  updateCollaboratorValidator,
  collaboratorTokenValidator,
  paginationQueryValidator,
} = require('../../validators/collaboratorValidator');

const router = express.Router();
const authRouter = express.Router();

authRouter.use(authenticate);

authRouter.get(
  '/trips/:tripId/collaborators',
  [...tripIdParamValidator, ...paginationQueryValidator],
  validateRequest,
  CollaboratorController.list
);

authRouter.post(
  '/trips/:tripId/collaborators',
  [...tripIdParamValidator, ...inviteCollaboratorValidator],
  validateRequest,
  CollaboratorController.invite
);

authRouter.post(
  '/trips/:tripId/collaborators/:collaboratorId/resend',
  [...tripIdParamValidator, ...collaboratorIdParamValidator],
  validateRequest,
  CollaboratorController.resend
);

authRouter.patch(
  '/trips/:tripId/collaborators/:collaboratorId',
  [...tripIdParamValidator, ...collaboratorIdParamValidator, ...updateCollaboratorValidator],
  validateRequest,
  CollaboratorController.updatePermission
);

authRouter.delete(
  '/trips/:tripId/collaborators/:collaboratorId',
  [...tripIdParamValidator, ...collaboratorIdParamValidator],
  validateRequest,
  CollaboratorController.remove
);

router.use(authRouter);

router.post(
  '/collaborators/accept',
  authenticate,
  collaboratorTokenValidator,
  validateRequest,
  CollaboratorController.accept
);

router.post(
  '/collaborators/decline',
  collaboratorTokenValidator,
  validateRequest,
  CollaboratorController.decline
);

module.exports = router;
