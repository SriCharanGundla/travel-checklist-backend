const sendResponse = (res, { data = null, meta = null, message = null, statusCode = 200 }) => {
  const payload = {
    success: true,
    data,
    meta,
    message,
    error: null,
  };

  return res.status(statusCode).json(payload);
};

module.exports = {
  sendResponse,
};
