const express = require('express');
const dashboardController = require('../controllers/dashboardController');

const router = express.Router();

// Dashboard overview route
router.get('/overview', dashboardController.getDashboardOverview);

// Monthly data for dashboard charts
router.get('/monthly/:year', dashboardController.getMonthlyData);

// Category breakdown
router.get('/categories/:year/:month?', dashboardController.getCategoryBreakdown);

// Recent transactions
router.get('/transactions/recent', dashboardController.getRecentTransactions);

module.exports = router;