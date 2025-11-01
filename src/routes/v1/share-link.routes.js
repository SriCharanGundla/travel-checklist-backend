const express = require('express');
const ShareLinkController = require('../../controllers/ShareLinkController');
const authenticate = require('../../middleware/authMiddleware');
const validateRequest = require('../../middleware/validateRequest');
const { tripIdParamValidator } = require('../../validators/collaboratorValidator');
const {
  shareLinkIdParamValidator,
  shareTokenParamValidator,
  createShareLinkValidator,
  shareLinkActionValidator,
  paginationQueryValidator,
} = require('../../validators/shareLinkValidator');

const router = express.Router();
const authRouter = express.Router();

authRouter.use(authenticate);

authRouter.get(
  '/trips/:tripId/share-links',
  [...tripIdParamValidator, ...paginationQueryValidator],
  validateRequest,
  ShareLinkController.list
);

authRouter.post(
  '/trips/:tripId/share-links',
  [...tripIdParamValidator, ...createShareLinkValidator],
  validateRequest,
  ShareLinkController.create
);

authRouter.delete(
  '/trips/:tripId/share-links/:shareLinkId',
  [...tripIdParamValidator, ...shareLinkIdParamValidator],
  validateRequest,
  ShareLinkController.revoke
);

router.use(authRouter);

router.get(
  '/share-links/:token',
  shareTokenParamValidator,
  validateRequest,
  ShareLinkController.publicGet
);

router.post(
  '/share-links/:token/action',
  [...shareTokenParamValidator, ...shareLinkActionValidator],
  validateRequest,
  ShareLinkController.publicAction
);

module.exports = router;
