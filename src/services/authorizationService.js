const { Trip, TripCollaborator } = require('../models');
const AppError = require('../utils/AppError');
const { PERMISSION_LEVELS, COLLABORATOR_STATUS } = require('../config/constants');

const PERMISSION_ORDER = {
  [PERMISSION_LEVELS.VIEW]: 0,
  [PERMISSION_LEVELS.EDIT]: 1,
  [PERMISSION_LEVELS.ADMIN]: 2,
};

const hasSufficientPermission = (permission, required) => {
  const currentRank = PERMISSION_ORDER[permission] ?? -1;
  const requiredRank = PERMISSION_ORDER[required] ?? Number.POSITIVE_INFINITY;
  return currentRank >= requiredRank;
};

const ensureTripExists = async (tripId) => {
  const trip = await Trip.findByPk(tripId);

  if (!trip) {
    throw new AppError('Trip not found', 404, 'TRIP.NOT_FOUND');
  }

  return trip;
};

const ensureTripOwner = async (userId, tripId) => {
  const trip = await Trip.findOne({
    where: {
      id: tripId,
      ownerId: userId,
    },
  });

  if (!trip) {
    throw new AppError('Trip not found or inaccessible', 404, 'TRIP.NOT_FOUND');
  }

  return {
    trip,
    role: 'owner',
    permissionLevel: PERMISSION_LEVELS.ADMIN,
  };
};

const ensureTripAccess = async (
  userId,
  tripId,
  { requiredPermission = PERMISSION_LEVELS.VIEW, requireOwner = false } = {}
) => {
  const trip = await ensureTripExists(tripId);

  if (trip.ownerId === userId) {
    if (requireOwner) {
      return { trip, role: 'owner', permissionLevel: PERMISSION_LEVELS.ADMIN };
    }

    return { trip, role: 'owner', permissionLevel: PERMISSION_LEVELS.ADMIN };
  }

  if (requireOwner) {
    throw new AppError('Trip access denied', 403, 'TRIP.ACCESS_DENIED');
  }

  const collaborator = await TripCollaborator.findOne({
    where: {
      tripId,
      userId,
      status: COLLABORATOR_STATUS.ACCEPTED,
    },
  });

  if (!collaborator) {
    throw new AppError('Trip access denied', 403, 'TRIP.ACCESS_DENIED');
  }

  if (!hasSufficientPermission(collaborator.permissionLevel, requiredPermission)) {
    throw new AppError('Insufficient permissions for this action', 403, 'TRIP.INSUFFICIENT_PERMISSION');
  }

  return {
    trip,
    collaborator,
    role: 'collaborator',
    permissionLevel: collaborator.permissionLevel,
  };
};

module.exports = {
  ensureTripAccess,
  ensureTripOwner,
  hasSufficientPermission,
};
