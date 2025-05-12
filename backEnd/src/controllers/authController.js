const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { promisify } = require('util');
const ms = require('ms');
const userModel = require('../models/userModel');
const { AppError } = require('../utils/helpers');
const config = require('../config/config');
const logger = require('../utils/logger');

const signToken = (id) => {
  const expiresIn = config.jwt.expiresIn;
  const currentTime = new Date();
  const expirationTime = new Date(currentTime.getTime() + ms(expiresIn));
  
  logger.info('🕒 Token Creation Times:', {
    currentTime: currentTime.toISOString(),
    expiresIn,
    willExpireAt: expirationTime.toISOString()
  });
  
  return jwt.sign({ id }, config.jwt.secret, { expiresIn });
};

const signRefreshToken = (id) => {
  const expiresIn = config.jwt.refreshExpiresIn;
  const currentTime = new Date();
  const expirationTime = new Date(currentTime.getTime() + ms(expiresIn));
  
  logger.info('🔄 Refresh Token Creation Times:', {
    currentTime: currentTime.toISOString(),
    expiresIn,
    willExpireAt: expirationTime.toISOString()
  });
  
  return jwt.sign({ id }, config.jwt.refreshSecret, { expiresIn });
};

const createSendToken = (user, statusCode, res) => {
  logger.info('🎟️ Creating tokens for user:', user.email);
  
  const token = signToken(user.id);
  logger.info('🔑 Access token created');
  
  const refreshToken = signRefreshToken(user.id);
  logger.info('🔄 Refresh token created');

  // Set cookies for cookie-based auth
  const cookieOptions = {
    expires: new Date(Date.now() + ms(config.jwt.expiresIn)),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax"
  };

  const refreshCookieOptions = {
    expires: new Date(Date.now() + ms(config.jwt.refreshExpiresIn)),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax"
  };

  logger.info('🍪 Cookie Expiration Times:', {
    accessTokenCookieExpires: cookieOptions.expires.toISOString(),
    refreshTokenCookieExpires: refreshCookieOptions.expires.toISOString()
  });

  res.cookie("jwt", token, cookieOptions);
  res.cookie("refreshJwt", refreshToken, refreshCookieOptions);

  // Send tokens in response for header-based auth
  res.status(statusCode).json({
    status: "success",
    token, // For Authorization header
    refreshToken, // For token refresh
    data: {
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        nickname: user.nickname
      }
    }
  });
};

exports.register = async (req, res, next) => {
  try {
    const { 
      email, password, password_confirm, 
      first_name, last_name, second_last_name, nickname 
    } = req.body;

    if (password !== password_confirm) {
      return next(new AppError('Passwords do not match', 400));
    }

    const newUser = await userModel.create({
      email,
      password,
      first_name,
      last_name,
      second_last_name,
      nickname
    });
    
    createSendToken(newUser, 201, res);
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return next(new AppError('Please provide email and password', 400));
    }
    
    const user = await userModel.findByEmail(email);
    if (!user || !(await userModel.comparePassword(password, user.password_hash))) {
      return next(new AppError('Incorrect email or password', 401));
    }
    
    createSendToken(user, 200, res);
  } catch (error) {
    next(error);
  }
};

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now()),
    httpOnly: true,
    sameSite: "lax"
  });
  
  res.cookie('refreshJwt', 'loggedout', {
    expires: new Date(Date.now()),
    httpOnly: true,
    sameSite: "lax"
  });
  
  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully'
  });
};

exports.protect = async (req, res, next) => {
  try {
    logger.info('🔒 Authentication middleware started');
    logger.debug('Headers:', req.headers);
    logger.debug('Cookies:', req.cookies);
    
    const currentTime = new Date();
    logger.info('⏰ Current server time:', currentTime.toISOString());

    // 1) Get token from header or cookies
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      logger.info('🎟️ Token found in Authorization header');
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
      logger.info('🍪 Token found in cookies');
    }

    if (!token) {
      logger.warn('❌ No token found in request');
      return next(new AppError('You are not logged in. Please log in to get access.', 401));
    }

    // 2) Verify token and decode payload
    logger.info('🔍 Verifying token');
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Log token details
    const tokenIssuedAt = new Date(decoded.iat * 1000);
    const tokenExpiresAt = new Date(decoded.exp * 1000);
    
    logger.info('🎟️ Token Times:', {
      issuedAt: tokenIssuedAt.toISOString(),
      expiresAt: tokenExpiresAt.toISOString(),
      currentTime: currentTime.toISOString(),
      timeUntilExpiration: `${(tokenExpiresAt.getTime() - currentTime.getTime()) / 1000} seconds`
    });

    // 3) Check if user still exists
    logger.info(`👤 Looking up user with ID: ${decoded.id}`);
    const user = await userModel.findById(decoded.id);
    
    if (!user) {
      logger.warn('❌ User not found for token');
      return next(new AppError('The user belonging to this token no longer exists.', 401));
    }
    
    // 4) Check if user changed password after token was issued
    if (user.password_changed_at) {
      const changedTimestamp = parseInt(
        new Date(user.password_changed_at).getTime() / 1000,
        10
      );

      if (decoded.iat < changedTimestamp) {
        logger.warn('❌ User changed password after token was issued', {
          tokenIssuedAt: tokenIssuedAt.toISOString(),
          passwordChangedAt: new Date(changedTimestamp * 1000).toISOString()
        });
        return next(new AppError('User recently changed password. Please log in again.', 401));
      }
    }

    // 5) Grant access to protected route
    logger.info('✅ Authentication successful');
    req.user = user;
    next();
  } catch (error) {
    logger.error('❌ Authentication error:', {
      errorName: error.name,
      errorMessage: error.message,
      currentTime: new Date().toISOString()
    });
    
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token. Please log in again.', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Your token has expired. Please log in again.', 401));
    }
    next(error);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    logger.info('🔄 Starting token refresh');
    
    // Get refresh token
    let refreshToken = req.cookies.refreshJwt;
    if (!refreshToken && req.headers.authorization?.startsWith('Bearer')) {
      refreshToken = req.headers.authorization.split(' ')[1];
      logger.info('🎟️ Using refresh token from Authorization header');
    }
    
    if (!refreshToken) {
      logger.warn('❌ No refresh token provided');
      return next(new AppError('No refresh token found', 401));
    }

    logger.info('🔍 Verifying refresh token');
    const decoded = await promisify(jwt.verify)(refreshToken, config.jwt.refreshSecret);
    logger.debug('Decoded refresh token:', decoded);
    
    // Check user
    const currentUser = await userModel.findById(decoded.id);
    if (!currentUser) {
      logger.warn('❌ User not found for refresh token');
      return next(new AppError('The user belonging to this token no longer exists', 401));
    }

    // Generate new tokens
    logger.info('🔑 Generating new tokens');
    const newAccessToken = signToken(currentUser.id);
    const newRefreshToken = signRefreshToken(currentUser.id);

    // Set cookies
    const cookieOptions = {
      expires: new Date(Date.now() + ms(config.jwt.expiresIn)),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    };

    const refreshCookieOptions = {
      expires: new Date(Date.now() + ms(config.jwt.refreshExpiresIn)),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    };

    logger.info('🍪 Setting new cookies with expiration:', {
      accessTokenExpires: cookieOptions.expires.toISOString(),
      refreshTokenExpires: refreshCookieOptions.expires.toISOString()
    });

    res.cookie('jwt', newAccessToken, cookieOptions);
    res.cookie('refreshJwt', newRefreshToken, refreshCookieOptions);
    
    // Send response
    res.status(200).json({
      status: 'success',
      token: newAccessToken,
      refreshToken: newRefreshToken
    });
    
    logger.info('✅ Token refresh successful');
  } catch (error) {
    logger.error('❌ Token refresh failed:', error);
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid refresh token', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Refresh token has expired', 401));
    }
    next(error);
  }
};

exports.getMe = (req, res, next) => {
  res.status(200).json({
    status: 'success',
    data: {
      user: {
        id: req.user.id,
        email: req.user.email,
        first_name: req.user.first_name,
        last_name: req.user.last_name,
        nickname: req.user.nickname
      }
    }
  });
};

/**
 * Update password
 * @route PATCH /api/auth/update-password
 */
exports.updatePassword = async (req, res, next) => {
  try {
    const { current_password, new_password, new_password_confirm } = req.body;
    
    // Check if passwords match
    if (new_password !== new_password_confirm) {
      return next(new AppError('New passwords do not match', 400));
    }
    
    // Get user with password
    const user = await userModel.findByIdWithPassword(req.user.id);
    
    // Check if current password is correct
    if (!(await userModel.correctPassword(current_password, user.password))) {
      return next(new AppError('Your current password is incorrect', 401));
    }
    
    // Update password
    const updatedUser = await userModel.updatePassword(user.id, new_password);
    
    // Create and send token
    createSendToken(updatedUser, 200, res);
  } catch (error) {
    next(error);
  }
};

/**
 * Forgot password
 * @route POST /api/auth/forgot-password
 */
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    // Get user by email
    const user = await userModel.findByEmail(email);
    
    if (!user) {
      return next(new AppError('There is no user with that email address', 404));
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    const passwordResetExpires = new Date(
      Date.now() + 10 * 60 * 1000 // 10 minutes
    );
    
    // Save reset token to user
    await userModel.saveResetToken(user.id, passwordResetToken, passwordResetExpires);
    
    // Send email with reset token (implementation would depend on email service)
    // For now, we'll just return the token in the response (not for production)
    
    res.status(200).json({
      status: 'success',
      message: 'Token sent to email',
      resetToken // Remove this in production
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password
 * @route PATCH /api/auth/reset-password/:token
 */
exports.resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password, password_confirm } = req.body;
    
    // Check if passwords match
    if (password !== password_confirm) {
      return next(new AppError('Passwords do not match', 400));
    }
    
    // Hash token
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    // Find user by reset token
    const user = await userModel.findByResetToken(hashedToken);
    
    if (!user) {
      return next(new AppError('Token is invalid or has expired', 400));
    }
    
    // Update password
    const updatedUser = await userModel.resetPassword(user.id, password);
    
    // Create and send token
    createSendToken(updatedUser, 200, res);
  } catch (error) {
    next(error);
  }
};