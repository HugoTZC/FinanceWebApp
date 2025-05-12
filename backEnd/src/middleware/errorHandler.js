const logger = require('../utils/logger');

/**
 * Error handler middleware
 */
exports.errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error
  logger.error(`${err.statusCode} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  if (process.env.NODE_ENV === 'development') {
    logger.error(err.stack);
  }

  // Handle specific error types
  if (err.code === '23505') { // PostgreSQL unique violation
    return res.status(400).json({
      status: 'fail',
      message: 'Duplicate field value. Please use another value.'
    });
  }

  if (err.code === '22P02') { // PostgreSQL invalid text representation
    return res.status(400).json({
      status: 'fail',
      message: 'Invalid input data type.'
    });
  }
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'fail',
      message: 'Invalid token. Please log in again.'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      status: 'fail',
      message: 'Your token has expired. Please log in again.'
    });
  }

  // Handle database connection errors
  if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
    return res.status(500).json({
      status: 'error',
      message: 'Database connection error. Please try again later.'
    });
  }
  
  // Handle database query errors
  if (err.code && err.code.startsWith('42')) { // SQL syntax errors
    return res.status(500).json({
      status: 'error',
      message: 'Database query error.'
    });
  }

  // Send error response
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  }

  // For programming or unknown errors, don't leak error details
  console.error('ERROR 💥', err);
  return res.status(500).json({
    status: 'error',
    message: 'Something went wrong'
  });
};