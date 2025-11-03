const travelerDirectoryService = require('../services/travelerDirectoryService');
const { sendResponse } = require('../utils/response');
const catchAsync = require('../utils/catchAsync');

const list = catchAsync(async (req, res) => {
  const contacts = await travelerDirectoryService.listContacts(req.auth.userId);

  return sendResponse(res, {
    data: contacts,
    meta: {
      count: contacts.length,
    },
  });
});

const create = catchAsync(async (req, res) => {
  const contact = await travelerDirectoryService.createContact(req.auth.userId, req.body);

  return sendResponse(res, {
    data: contact,
    statusCode: 201,
    message: 'Traveler saved to directory',
  });
});

const update = catchAsync(async (req, res) => {
  const contact = await travelerDirectoryService.updateContact(
    req.auth.userId,
    req.params.contactId,
    req.body
  );

  return sendResponse(res, {
    data: contact,
    message: 'Traveler updated',
  });
});

const remove = catchAsync(async (req, res) => {
  await travelerDirectoryService.deleteContact(req.auth.userId, req.params.contactId);
  return res.status(204).send();
});

module.exports = {
  list,
  create,
  update,
  remove,
};
