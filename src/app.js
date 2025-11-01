const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pinoHttp = require('pino-http');
const swaggerUi = require('swagger-ui-express');
const { randomUUID } = require('crypto');
require('dotenv').config();

const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');
const metricsMiddleware = require('./middleware/requestMetrics');
const sanitizeInput = require('./middleware/sanitizeInput');
const logger = require('./utils/logger');
const { register } = require('./metrics');
const openApiDocument = require('./docs/openapi.json');

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  const requestId = req.headers['x-request-id'] || randomUUID();
  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
});

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https:'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", ...allowedOrigins],
        fontSrc: ["'self'", 'https:', 'data:'],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, origin || true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-Id'],
    maxAge: 86400,
  })
);

app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignorePaths: ['/health', '/metrics'],
    },
    customProps: (req) => ({ requestId: req.id }),
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(sanitizeInput);
app.use(metricsMiddleware);

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument, { explorer: true }));

// API Routes
app.use('/api', generalLimiter, routes);

app.get('/metrics', async (req, res) => {
  res.setHeader('Content-Type', register.contentType);
  res.send(await register.metrics());
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Temporary root route
app.get('/', (req, res) => {
  res.json({
    message: 'Travel Checklist API',
    version: '1.0.0',
    documentation: '/api/docs'
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found',
      code: 'NOT_FOUND',
      path: req.path
    }
  });
});

// Centralized error handler
app.use(errorHandler);

module.exports = app;
