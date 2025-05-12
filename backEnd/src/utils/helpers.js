/**
 * Custom error class for API errors
 */
class AppError extends Error {
    constructor(message, statusCode) {
      super(message);
      this.statusCode = statusCode;
      this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
      this.isOperational = true;
  
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  /**
   * Global error handler middleware
   */
  const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';
  
    // Development error response
    if (process.env.NODE_ENV === 'development') {
      return res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack
      });
    }
  
    // Production error response
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
  
  /**
   * Get pagination parameters from query
   * @param {Object} query - Query object with page and limit
   * @returns {Object} - Object with page, limit and offset
   */
  const getPaginationParams = (query = {}) => {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const offset = (page - 1) * limit;
    
    return { page, limit, offset };
  };
  
  /**
   * Create paginated response
   * @param {Array} data - Data array
   * @param {number} total - Total number of items
   * @param {Object} pagination - Pagination object with page and limit
   * @returns {Object} - Paginated response
   */
  const paginatedResponse = (data, total, pagination = {}) => {
    const { page = 1, limit = 10 } = pagination;
    const pages = Math.ceil(total / limit);
    
    return {
      data: {
        transactions: data,
        pagination: {
          total,
          page,
          limit,
          pages
        }
      }
    };
  };
  
  /**
   * Pagination helper
   * @param {number} page - Current page
   * @param {number} limit - Items per page
   * @returns {Object} - Pagination object with skip and limit
   */
  const paginate = (page = 1, limit = 10) => {
    const skip = (page - 1) * limit;
    return { skip, limit };
  };
  
  /**
   * Format date to YYYY-MM-DD
   * @param {Date} date - Date to format
   * @returns {string} - Formatted date
   */
  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };
  
  /**
   * Calculate percentage
   * @param {number} value - Current value
   * @param {number} total - Total value
   * @returns {number} - Percentage
   */
  const calculatePercentage = (value, total) => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };
  
  /**
   * Generate random string
   * @param {number} length - Length of string
   * @returns {string} - Random string
   */
  const generateRandomString = (length = 10) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  };
  
  module.exports = {
    AppError,
    errorHandler,
    paginate,
    formatDate,
    calculatePercentage,
    generateRandomString,
    getPaginationParams,
    paginatedResponse
  };