const client = require('prom-client');

const register = new client.Registry();

client.collectDefaultMetrics({
  register,
  labels: { app: 'travel-checklist-api' },
});

const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Count of HTTP requests received',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration histogram of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

const httpRequestsInFlight = new client.Gauge({
  name: 'http_requests_in_flight',
  help: 'Gauge of HTTP requests currently being processed',
  labelNames: ['method'],
  registers: [register],
});

module.exports = {
  client,
  register,
  httpRequestCounter,
  httpRequestDuration,
  httpRequestsInFlight,
};
