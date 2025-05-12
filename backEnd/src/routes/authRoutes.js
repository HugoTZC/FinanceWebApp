const express = require('express');
const { 
    register, 
    login, 
    forgotPassword, 
    resetPassword, 
    updatePassword,
    getMe,
    logout,
    protect,
    refreshToken,
 } = require('../controllers/authController');

const router = express.Router();

// Public authentication routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.patch('/reset-password/:token', resetPassword);
router.post("/refresh-token", refreshToken);  // Moved before protect middleware

// Protected routes
router.use(protect);
router.patch('/update-password', updatePassword);
router.get('/me', getMe);

module.exports = router;