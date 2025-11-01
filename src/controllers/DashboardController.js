const dashboardService = require('../services/dashboardService');
const { sendResponse } = require('../utils/response');
const catchAsync = require('../utils/catchAsync');

const overview = catchAsync(async (req, res) => {
  const data = await dashboardService.getOverview(req.auth.userId);

  return sendResponse(res, {
    data,
  });
});

module.exports = {
  overview,
};

