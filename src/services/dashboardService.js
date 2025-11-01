const { Op, fn, col } = require('sequelize');
const { Trip } = require('../models');
const { TRIP_STATUS } = require('../config/constants');

const statuses = Object.values(TRIP_STATUS);
const MS_PER_DAY = 1000 * 60 * 60 * 24;

const normalizeDateOnly = (date) => {
  if (!date) {
    return null;
  }

  return date instanceof Date ? date.toISOString().slice(0, 10) : String(date);
};

const computeDaysUntil = (startDate) => {
  if (!startDate) {
    return null;
  }

  const now = new Date();
  const start = new Date(startDate);

  const diff = start.getTime() - now.getTime();
  return diff <= 0 ? 0 : Math.ceil(diff / MS_PER_DAY);
};

const hydrateStatusBreakdown = (rows) => {
  const breakdown = statuses.reduce((acc, status) => {
    acc[status] = 0;
    return acc;
  }, {});

  rows.forEach((row) => {
    const plain = typeof row.get === 'function' ? row.get({ plain: true }) : row;
    breakdown[plain.status] = Number(plain.count) || 0;
  });

  return breakdown;
};

const getOverview = async (ownerId) => {
  const today = new Date();
  const todayDateOnly = normalizeDateOnly(today);

  const [totalTrips, upcomingTripCount, activeTripCount, statusRows, activeTrip, upcomingTrip] =
    await Promise.all([
      Trip.count({ where: { ownerId } }),
      Trip.count({
        where: {
          ownerId,
          startDate: {
            [Op.gte]: todayDateOnly,
          },
        },
      }),
      Trip.count({
        where: {
          ownerId,
          startDate: {
            [Op.lte]: todayDateOnly,
          },
          [Op.or]: [
            {
              endDate: {
                [Op.gte]: todayDateOnly,
              },
            },
            {
              endDate: {
                [Op.is]: null,
              },
            },
          ],
        },
      }),
      Trip.unscoped().findAll({
        where: { ownerId },
        attributes: ['status', [fn('COUNT', col('id')), 'count']],
        group: ['status'],
        order: [],
      }),
      Trip.unscoped().findOne({
        where: {
          ownerId,
          startDate: {
            [Op.lte]: todayDateOnly,
          },
          [Op.or]: [
            {
              endDate: {
                [Op.gte]: todayDateOnly,
              },
            },
            {
              endDate: {
                [Op.is]: null,
              },
            },
          ],
        },
        order: [
          ['startDate', 'ASC'],
          ['createdAt', 'ASC'],
        ],
      }),
      Trip.unscoped().findOne({
        where: {
          ownerId,
          startDate: {
            [Op.gt]: todayDateOnly,
          },
        },
        order: [
          ['startDate', 'ASC'],
          ['createdAt', 'ASC'],
        ],
      }),
    ]);

  const nextTripRecord = activeTrip || upcomingTrip;
  const statusBreakdown = hydrateStatusBreakdown(statusRows);

  const nextTrip = nextTripRecord
    ? {
        id: nextTripRecord.id,
        name: nextTripRecord.name,
        destination: nextTripRecord.destination,
        startDate: normalizeDateOnly(nextTripRecord.startDate),
        endDate: normalizeDateOnly(nextTripRecord.endDate),
        status: nextTripRecord.status,
        daysUntil: computeDaysUntil(nextTripRecord.startDate),
      }
    : null;

  return {
    totals: {
      totalTrips,
      upcomingTripCount,
      activeTripCount,
    },
    nextTrip,
    statusBreakdown,
    tasks: {
      dueSoonCount: 0,
      placeholder: true,
      message: 'Task due soon metrics will ship with the dedicated tasks module in Phase 2.',
    },
    generatedAt: new Date().toISOString(),
  };
};

module.exports = {
  getOverview,
};
