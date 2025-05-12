const express = require('express');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const transactionRoutes = require('./transactionRoutes');
const categoryRoutes = require('./categoryRoutes');
const budgetRoutes = require('./budgetRoutes');
const accountRoutes = require('./accountRoutes');
const creditRoutes = require('./creditRoutes');
const savingsRoutes = require('./savingsRoutes');
const notificationRoutes = require('./notificationRoutes');
const dashboardRoutes = require('./dashboardRoutes'); // Added dashboard routes
const { protect } = require('../middleware/auth'); // Importación corregida del middleware de autenticación

const router = express.Router();

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API is running'
  });
});

// Auth routes
router.use('/auth', authRoutes);

// Protected routes
router.use('/users', protect, userRoutes);
router.use('/transactions', protect, transactionRoutes);
router.use('/categories', protect, categoryRoutes);
router.use('/budgets', protect, budgetRoutes);
router.use('/accounts', protect, accountRoutes);
router.use('/credit', protect, creditRoutes);
router.use('/savings', protect, savingsRoutes);
router.use('/notifications', protect, notificationRoutes);
router.use('/dashboard', protect, dashboardRoutes); // Added dashboard routes

module.exports = router;