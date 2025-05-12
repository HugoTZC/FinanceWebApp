const express = require('express');
const budgetController = require('../controllers/budgetController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Protect all routes
router.use(protect);

// Budget routes
router.post('/', budgetController.createOrUpdateBudget);
router.get('/:year/:month', budgetController.getBudget);

// Budget category routes
router.delete('/categories/:id', budgetController.deleteBudgetCategory);

// Budget alert routes
router.get('/alerts', budgetController.getBudgetAlerts);
router.patch('/alerts/:id', budgetController.markAlertAsRead);

module.exports = router;