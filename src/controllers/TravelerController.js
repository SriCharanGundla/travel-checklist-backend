const travelerService = require('../services/travelerService');
const { sendResponse } = require('../utils/response');
const catchAsync = require('../utils/catchAsync');

const list = catchAsync(async (req, res) => {
  const travelers = await travelerService.listTravelers(req.auth.userId, req.params.tripId);

  return sendResponse(res, {
    data: travelers,
    meta: {
      count: travelers.length,
    },
  });
});

const create = catchAsync(async (req, res) => {
  const traveler = await travelerService.createTraveler(
    req.auth.userId,
    req.params.tripId,
    req.body
  );

  return sendResponse(res, {
    data: traveler,
    statusCode: 201,
    message: 'Traveler added',
  });
});

const update = catchAsync(async (req, res) => {
  const traveler = await travelerService.updateTraveler(
    req.auth.userId,
    req.params.tripId,
    req.params.travelerId,
    req.body
  );

  return sendResponse(res, {
    data: traveler,
    message: 'Traveler updated',
  });
});

const remove = catchAsync(async (req, res) => {
  await travelerService.deleteTraveler(req.auth.userId, req.params.tripId, req.params.travelerId);
  return res.status(204).send();
});

module.exports = {
  list,
  create,
  update,
  remove,
};

