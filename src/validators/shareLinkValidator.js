const { body, param, query } = require('express-validator');
const { SHARE_LINK_ACCESS_LEVELS } = require('../config/constants');

const SHARE_LINK_ALLOWED_ACTIONS = ['expense:add', 'itinerary:add'];

const shareLinkIdParamValidator = [
  param('shareLinkId').trim().isUUID().withMessage('Share link id must be a valid UUID'),
];

const shareTokenParamValidator = [
  param('token')
    .isString()
    .withMessage('Share token is required')
    .trim()
    .notEmpty()
    .withMessage('Share token is required'),
];

const createShareLinkValidator = [
  body('label')
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage('label must be text')
    .isLength({ max: 150 })
    .withMessage('label must be 150 characters or fewer'),
  body('accessLevel')
    .optional({ checkFalsy: true, nullable: true })
    .trim()
    .toLowerCase()
    .isIn(Object.values(SHARE_LINK_ACCESS_LEVELS))
    .withMessage('Invalid access level'),
  body('expiresAt')
    .optional({ checkFalsy: true, nullable: true })
    .isISO8601()
    .withMessage('expiresAt must be an ISO8601 date'),
  body('maxUsages')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('maxUsages must be a positive integer'),
];

const shareLinkActionValidator = [
  body('action')
    .exists({ checkFalsy: true })
    .withMessage('action is required')
    .bail()
    .isString()
    .withMessage('action must be text')
    .trim()
    .custom((value) => {
      if (!SHARE_LINK_ALLOWED_ACTIONS.includes(value)) {
        throw new Error('Unsupported share link action');
      }
      return true;
    }),
  body('payload')
    .optional({ nullable: true })
    .custom((value) => {
      if (value !== null && typeof value !== 'object') {
        throw new Error('payload must be an object');
      }
      return true;
    }),
];

const paginationQueryValidator = [
  query('page')
    .optional({ checkFalsy: true, nullable: true })
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer'),
  query('limit')
    .optional({ checkFalsy: true, nullable: true })
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100'),
];

module.exports = {
  shareLinkIdParamValidator,
  shareTokenParamValidator,
  createShareLinkValidator,
  shareLinkActionValidator,
  paginationQueryValidator,
};
