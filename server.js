const fs = require('fs');
const express = require('express');
const path = require('path');

const config = require('./config');
const logger = require('./utils/logger');

const corsMiddleware = require('./middleware/cors.middleware');
const requestLogger = require('./middleware/logger.middleware');
const errorHandler = require('./middleware/errorHandler.middleware');
const notFound = require('./middleware/notFound.middleware');
const { apiLimiter } = require('./middleware/rateLimit.middleware');

const apiRoutes = require('./routes');
const healthRoutes = require('./routes/health.routes');
const app = express();
const buildDir = path.join(__dirname, 'build');
const buildIndexPath = path.join(buildDir, 'index.html');
const hasFrontendBuild = fs.existsSync(buildIndexPath);

// ── Global middleware ──────────────────────────────────────────────────────────
app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(requestLogger);

// ── Health check (no rate limit, no auth) ─────────────────────────────────────
app.use('/health', healthRoutes);

// ── API routes ─────────────────────────────────────────────────────────────────
app.use('/api', apiLimiter, apiRoutes);

// ── Static build (production) ──────────────────────────────────────────────────
if (hasFrontendBuild) {
  app.use(express.static(buildDir));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') {
      return next();
    }

    return res.sendFile(buildIndexPath);
  });
} else {
  app.get('/', (req, res) => {
    res.status(200).json({
      success: true,
      message:
        'API server is running. Frontend build not found. Use `npm start` for the React dev server or `npm run build` before serving the production bundle.',
    });
  });
}

// ── Error handling (must be last) ──────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start server ───────────────────────────────────────────────────────────────
const server = app.listen(config.port, () => {
  logger.sysinfo(`Environment : ${config.env}`);
  logger.info(`Server      : http://localhost:${config.port}`);
  logger.info(`API         : http://localhost:${config.port}/api`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`Port ${config.port} is already in use.`);
    logger.error('Set a different port via PORT= environment variable.');
    process.exit(1);
  } else {
    throw err;
  }
});

module.exports = app;
