const userModel = require('../models/userModel');
const { AppError } = require('../utils/helpers');
const fs = require('fs');
const path = require('path');

/**
 * Get user profile
 * @route GET /api/users/profile
 */
exports.getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get user
    const user = await userModel.findById(userId);
    
    if (!user) {
      return next(new AppError('User not found', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile
 * @route PATCH /api/users/profile
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { first_name, last_name, second_last_name, nickname } = req.body;
    
    // Si hay un archivo de avatar, usar la URL generada por el middleware
    let updateData = {
      first_name,
      last_name,
      second_last_name,
      nickname
    };
    
    // Si req.avatarUrl existe, fue establecido por el middleware de upload
    if (req.avatarUrl) {
      updateData.avatar_url = req.avatarUrl;
      
      // Si el usuario ya tenía un avatar, borrarlo (excepto si es el avatar por defecto)
      const currentUser = await userModel.findById(userId);
      if (currentUser && currentUser.avatar_url && 
          !currentUser.avatar_url.includes('placeholder') &&
          fs.existsSync(path.join(__dirname, '../../public', currentUser.avatar_url))) {
        fs.unlinkSync(path.join(__dirname, '../../public', currentUser.avatar_url));
      }
    }
    
    // Update user
    const updatedUser = await userModel.update(userId, updateData);
    
    if (!updatedUser) {
      return next(new AppError('User not found', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload user avatar
 * @route POST /api/users/avatar
 */
exports.uploadAvatar = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Si no hay archivo, devolver error
    if (!req.file) {
      return next(new AppError('Por favor, sube un archivo de imagen', 400));
    }
    
    // La URL del avatar fue añadida por el middleware
    const avatar_url = req.avatarUrl;
    
    // Actualizar el usuario con la nueva URL de avatar
    const updatedUser = await userModel.update(userId, { avatar_url });
    
    // Eliminar avatar anterior si existe (excepto si es el avatar por defecto)
    const currentUser = await userModel.findById(userId);
    if (currentUser && currentUser.avatar_url && 
        !currentUser.avatar_url.includes('placeholder') &&
        currentUser.avatar_url !== avatar_url &&
        fs.existsSync(path.join(__dirname, '../../public', currentUser.avatar_url))) {
      fs.unlinkSync(path.join(__dirname, '../../public', currentUser.avatar_url));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user settings
 * @route GET /api/users/settings
 */
exports.getSettings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get user settings
    const settings = await userModel.getSettings(userId);
    
    if (!settings) {
      return next(new AppError('Settings not found', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        settings
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user settings
 * @route PATCH /api/users/settings
 */
exports.updateSettings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { language, currency, theme } = req.body;
    
    // Update settings
    const updatedSettings = await userModel.updateSettings(userId, {
      language,
      currency,
      theme
    });
    
    if (!updatedSettings) {
      return next(new AppError('Settings not found', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        settings: updatedSettings
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get notification preferences
 * @route GET /api/users/notification-preferences
 */
exports.getNotificationPreferences = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get notification preferences
    const preferences = await userModel.getNotificationPreferences(userId);
    
    if (!preferences) {
      return next(new AppError('Notification preferences not found', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        preferences
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update notification preferences
 * @route PATCH /api/users/notification-preferences
 */
exports.updateNotificationPreferences = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      budget_email, payment_email, savings_email, credit_email,
      budget_push, payment_push, savings_push, credit_push
    } = req.body;
    
    // Update notification preferences
    const updatedPreferences = await userModel.updateNotificationPreferences(userId, {
      budget_email,
      payment_email,
      savings_email,
      credit_email,
      budget_push,
      payment_push,
      savings_push,
      credit_push
    });
    
    if (!updatedPreferences) {
      return next(new AppError('Notification preferences not found', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        preferences: updatedPreferences
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user account
 * @route DELETE /api/users
 */
exports.deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Delete user
    await userModel.delete(userId);
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};