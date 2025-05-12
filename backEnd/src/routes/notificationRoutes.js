const express = require('express');
const notificationController = require('../controllers/notificationController');

const router = express.Router();

// Notification routes
router.get('/', notificationController.getNotifications);
router.patch('/:id/read', notificationController.markAsRead);
router.patch('/read-all', notificationController.markAllAsRead);
router.delete('/:id', notificationController.deleteNotification);
router.delete('/clear-all', notificationController.clearAllNotifications);

module.exports = router;