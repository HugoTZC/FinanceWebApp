const express = require('express');
const userController = require('../controllers/userController');
const { handleAvatarUpload } = require('../middleware/upload');

const router = express.Router();

// User profile routes
router.get('/profile', userController.getProfile);
router.patch('/profile', handleAvatarUpload, userController.updateProfile);

// Avatar route
router.post('/avatar', handleAvatarUpload, userController.uploadAvatar);

// User settings routes
router.get('/settings', userController.getSettings);
router.patch('/settings', userController.updateSettings);

// Notification preferences routes
router.get('/notification-preferences', userController.getNotificationPreferences);
router.patch('/notification-preferences', userController.updateNotificationPreferences);

// Delete account route
router.delete('/', userController.deleteAccount);

module.exports = router;