const jwt = require('jsonwebtoken');
const { AppError } = require('../utils/helpers');
const config = require('../config/config');
const userModel = require('../models/userModel');
const logger = require('../utils/logger');

/**
 * Protect routes - Verify JWT token with enhanced error handling
 */
exports.protect = async (req, res, next) => {
  try {
    logger.info('🔒 Authentication middleware started');
    logger.debug('Headers:', JSON.stringify(req.headers));
    logger.debug('Cookies:', JSON.stringify(req.cookies));

    // 1) Get token from header or cookies
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      logger.info('🎟️ Token found in Authorization header');
    } else if (req.cookies?.jwt) {
      token = req.cookies.jwt;
      logger.info('🍪 Token found in cookies');
    }

    // Modified error handling: Return a clear 401 response instead of passing to error handler
    if (!token) {
      logger.warn('❌ No token found in request');
      return res.status(401).json({
        status: 'fail',
        message: 'Authentication required. Please log in to access this resource.'
      });
    }

    logger.debug('Token:', token);

    // 2) Verify token with specific error handling
    try {
      logger.info('🔍 Verifying token');
      const decoded = jwt.verify(token, config.jwt.secret);
      logger.debug('Decoded token:', decoded);

      // 3) Check if user still exists
      logger.info(`👤 Looking up user with ID: ${decoded.id}`);
      const user = await userModel.findById(decoded.id);
      
      if (!user) {
        logger.warn('❌ User not found for token');
        return res.status(401).json({
          status: 'fail',
          message: 'The user associated with this token no longer exists.'
        });
      }
      
      logger.info('User found:', user.email);

      // 4) Check if user changed password after token was issued
      if (user.password_changed_at) {
        const changedTimestamp = parseInt(
          new Date(user.password_changed_at).getTime() / 1000,
          10
        );

        if (decoded.iat < changedTimestamp) {
          logger.warn('❌ User changed password after token was issued');
          return res.status(401).json({
            status: 'fail',
            message: 'Your password was changed recently. Please log in again.'
          });
        }
      }

      // 5) Grant access to protected route
      logger.info('✅ Authentication successful');
      req.user = user;
      next();
    } catch (tokenError) {
      logger.error('🔑 Token verification error:', tokenError);
      
      // Handle different token errors with specific messages
      if (tokenError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          status: 'fail',
          message: 'Invalid authentication token. Please log in again.'
        });
      }
      
      if (tokenError.name === 'TokenExpiredError') {
        return res.status(401).json({
          status: 'fail',
          message: 'Your authentication token has expired. Please log in again.'
        });
      }
      
      // Generic token error
      return res.status(401).json({
        status: 'fail',
        message: 'Authentication failed. Please log in again.'
      });
    }
  } catch (error) {
    logger.error('❌ Unexpected authentication error:', error);
    // Return a generic 401 response instead of passing to error handler
    return res.status(401).json({
      status: 'fail',
      message: 'Authentication error. Please try logging in again.'
    });
  }
};