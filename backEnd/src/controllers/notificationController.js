const notificationModel = require('../models/notificationModel');
const { AppError } = require('../utils/helpers');

/**
 * Get all notifications
 * @route GET /api/notifications
 */
exports.getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page, limit, unread_only } = req.query;
    
    // Get notifications
    const notifications = await notificationModel.getNotifications(
      userId, 
      { page, limit, unread_only: unread_only === 'true' }
    );
    
    res.status(200).json({
      status: 'success',
      ...notifications
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark notification as read
 * @route PATCH /api/notifications/:id/read
 */
exports.markAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    // Mark notification as read
    const success = await notificationModel.markAsRead(id, userId);
    
    if (!success) {
      return next(new AppError('Notification not found', 404));
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Notification marked as read'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark all notifications as read
 * @route PATCH /api/notifications/read-all
 */
exports.markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Mark all notifications as read
    await notificationModel.markAllAsRead(userId);
    
    res.status(200).json({
      status: 'success',
      message: 'All notifications marked as read'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete notification
 * @route DELETE /api/notifications/:id
 */
exports.deleteNotification = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    // Delete notification
    const success = await notificationModel.deleteNotification(id, userId);
    
    if (!success) {
      return next(new AppError('Notification not found', 404));
    }
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Clear all notifications
 * @route DELETE /api/notifications/clear-all
 */
exports.clearAllNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Clear all notifications
    await notificationModel.clearAllNotifications(userId);
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};