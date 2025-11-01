const tripService = require('../services/tripService');
const { sendResponse } = require('../utils/response');
const catchAsync = require('../utils/catchAsync');

const list = catchAsync(async (req, res) => {
  const filters = {
    status: req.query.status,
    type: req.query.type,
    search: req.query.search,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
  };

  const trips = await tripService.listTrips(req.auth.userId, filters);

  return sendResponse(res, {
    data: trips,
    meta: {
      count: trips.length,
    },
  });
});

const create = catchAsync(async (req, res) => {
  const trip = await tripService.createTrip(req.auth.userId, req.body);

  return sendResponse(res, {
    data: trip,
    statusCode: 201,
    message: 'Trip created',
  });
});

const get = catchAsync(async (req, res) => {
  const trip = await tripService.getTripById(req.auth.userId, req.params.tripId);

  return sendResponse(res, {
    data: trip,
  });
});

const update = catchAsync(async (req, res) => {
  const trip = await tripService.updateTrip(req.auth.userId, req.params.tripId, req.body);

  return sendResponse(res, {
    data: trip,
    message: 'Trip updated',
  });
});

const remove = catchAsync(async (req, res) => {
  await tripService.deleteTrip(req.auth.userId, req.params.tripId);
  return res.status(204).send();
});

module.exports = {
  list,
  create,
  get,
  update,
  remove,
};
