const { Op } = require('sequelize');
const { Trip } = require('../models');
const AppError = require('../utils/AppError');
const { TRIP_STATUS, TRIP_TYPES } = require('../config/constants');

const validateDateRange = (startDate, endDate) => {
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new AppError('Invalid date provided', 400, 'TRIP.INVALID_DATE');
    }

    if (start > end) {
      throw new AppError('Start date must be before end date', 400, 'TRIP.INVALID_RANGE');
    }
  }
};

const listTrips = async (ownerId, filters = {}) => {
  const where = {
    ownerId,
  };

  if (filters.status && Object.values(TRIP_STATUS).includes(filters.status)) {
    where.status = filters.status;
  }

  if (filters.type && Object.values(TRIP_TYPES).includes(filters.type)) {
    where.type = filters.type;
  }

  if (filters.search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${filters.search}%` } },
      { destination: { [Op.iLike]: `%${filters.search}%` } },
    ];
  }

  if (filters.startDate) {
    where.startDate = { [Op.gte]: filters.startDate };
  }

  if (filters.endDate) {
    where.endDate = { [Op.lte]: filters.endDate };
  }

  const trips = await Trip.findAll({
    where,
    order: [
      ['startDate', 'ASC'],
      ['createdAt', 'DESC'],
    ],
  });

  return trips.map((trip) => trip.get({ plain: true }));
};

const createTrip = async (ownerId, payload) => {
  validateDateRange(payload.startDate, payload.endDate);

  const trip = await Trip.create({
    ownerId,
    name: payload.name,
    destination: payload.destination,
    startDate: payload.startDate,
    endDate: payload.endDate,
    status: payload.status || TRIP_STATUS.PLANNING,
    type: payload.type || TRIP_TYPES.LEISURE,
    budgetCurrency: payload.budgetCurrency || 'USD',
    budgetAmount: payload.budgetAmount || 0,
    description: payload.description,
    notes: payload.notes,
  });

  return trip.get({ plain: true });
};

const getTripById = async (ownerId, tripId) => {
  const trip = await Trip.findOne({
    where: {
      id: tripId,
      ownerId,
    },
  });

  if (!trip) {
    throw new AppError('Trip not found', 404, 'TRIP.NOT_FOUND');
  }

  return trip.get({ plain: true });
};

const updateTrip = async (ownerId, tripId, updates) => {
  validateDateRange(updates.startDate, updates.endDate);

  const trip = await Trip.findOne({
    where: {
      id: tripId,
      ownerId,
    },
  });

  if (!trip) {
    throw new AppError('Trip not found', 404, 'TRIP.NOT_FOUND');
  }

  const updatableFields = [
    'name',
    'destination',
    'startDate',
    'endDate',
    'status',
    'type',
    'budgetCurrency',
    'budgetAmount',
    'description',
    'notes',
  ];

  updatableFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(updates, field)) {
      trip.set(field, updates[field]);
    }
  });

  await trip.save();

  return trip.get({ plain: true });
};

const deleteTrip = async (ownerId, tripId) => {
  const trip = await Trip.findOne({
    where: {
      id: tripId,
      ownerId,
    },
  });

  if (!trip) {
    throw new AppError('Trip not found', 404, 'TRIP.NOT_FOUND');
  }

  await trip.destroy();
};

module.exports = {
  listTrips,
  createTrip,
  getTripById,
  updateTrip,
  deleteTrip,
};
