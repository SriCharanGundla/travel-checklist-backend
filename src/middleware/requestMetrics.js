const { httpRequestCounter, httpRequestDuration, httpRequestsInFlight } = require('../metrics');

const normalizeRoute = (req) => {
  if (req.route && req.route.path) {
    return `${req.baseUrl || ''}${req.route.path}` || req.route.path;
  }

  if (req.originalUrl) {
    return req.originalUrl.split('?')[0];
  }

  return 'unknown';
};

const scrubDynamicSegments = (route) =>
  route
    .replace(/\d+/g, ':number')
    .replace(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g, ':uuid')
    .replace(/\/\*/g, '') || route;

module.exports = (req, res, next) => {
  const method = req.method.toUpperCase();
  const start = process.hrtime.bigint();
  httpRequestsInFlight.inc({ method });

  const done = () => {
    const end = process.hrtime.bigint();
    const durationInSeconds = Number(end - start) / 1e9;
    const rawRoute = normalizeRoute(req);
    const route = scrubDynamicSegments(rawRoute);
    const labels = {
      method,
      route,
      status_code: res.statusCode,
    };

    httpRequestCounter.inc(labels);
    httpRequestDuration.observe(labels, durationInSeconds);
    httpRequestsInFlight.dec({ method });
  };

  res.once('finish', done);
  res.once('close', () => {
    if (res.writableFinished) {
      return;
    }
    httpRequestsInFlight.dec({ method });
  });

  next();
};
