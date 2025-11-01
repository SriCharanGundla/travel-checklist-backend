const itineraryService = require('../services/itineraryService');
const { sendResponse } = require('../utils/response');
const catchAsync = require('../utils/catchAsync');

const list = catchAsync(async (req, res) => {
  const items = await itineraryService.listItineraryItems(
    req.auth.userId,
    req.params.tripId,
    req.query
  );

  return sendResponse(res, {
    data: items,
    meta: {
      count: items.length,
    },
  });
});

const create = catchAsync(async (req, res) => {
  const item = await itineraryService.createItineraryItem(
    req.auth.userId,
    req.params.tripId,
    req.body
  );

  return sendResponse(res, {
    data: item,
    statusCode: 201,
    message: 'Itinerary item created',
  });
});

const update = catchAsync(async (req, res) => {
  const item = await itineraryService.updateItineraryItem(
    req.auth.userId,
    req.params.tripId,
    req.params.itemId,
    req.body
  );

  return sendResponse(res, {
    data: item,
    message: 'Itinerary item updated',
  });
});

const remove = catchAsync(async (req, res) => {
  await itineraryService.deleteItineraryItem(
    req.auth.userId,
    req.params.tripId,
    req.params.itemId
  );

  return res.status(204).send();
});

module.exports = {
  list,
  create,
  update,
  remove,
};
