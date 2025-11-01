const { body, param, query } = require('express-validator');
const { PERMISSION_LEVELS } = require('../config/constants');

const tripIdParamValidator = [
  param('tripId').trim().isUUID().withMessage('Trip id must be a valid UUID'),
];

const collaboratorIdParamValidator = [
  param('collaboratorId').trim().isUUID().withMessage('Collaborator id must be a valid UUID'),
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

const inviteCollaboratorValidator = [
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('permissionLevel')
    .optional({ checkFalsy: true, nullable: true })
    .trim()
    .toLowerCase()
    .isIn(Object.values(PERMISSION_LEVELS))
    .withMessage('Invalid permission level'),
];

const updateCollaboratorValidator = [
  body('permissionLevel')
    .exists()
    .withMessage('permissionLevel is required')
    .bail()
    .trim()
    .toLowerCase()
    .isIn(Object.values(PERMISSION_LEVELS))
    .withMessage('Invalid permission level'),
];

const collaboratorTokenValidator = [
  body('token')
    .isString()
    .withMessage('token is required')
    .trim()
    .notEmpty()
    .withMessage('token is required'),
  body('reason').optional({ checkFalsy: true, nullable: true }).isString().withMessage('Reason must be text'),
];

module.exports = {
  tripIdParamValidator,
  collaboratorIdParamValidator,
  inviteCollaboratorValidator,
  updateCollaboratorValidator,
  collaboratorTokenValidator,
  paginationQueryValidator,
};
