// middleware/error.js
import { logger } from '../config/logger.js';

export const notFound = (req, res) =>
  res.status(404).json({ success: false, code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` });

export const errorHandler = (err, req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  logger.error('Request error', { path: req.path, method: req.method, error: err.message });
  res.status(status).json({
    success: false,
    code: err.code || 'INTERNAL_ERROR',
    message: err.message || 'Internal server error',
  });
};
