const express = require('express');
const savingsController = require('../controllers/savingsController');

const router = express.Router();

// Savings goal routes
router.route('/goals')
  .get(savingsController.getSavingsGoals)
  .post(savingsController.createSavingsGoal);

router.route('/goals/:id')
  .get(savingsController.getSavingsGoal)
  .patch(savingsController.updateSavingsGoal)
  .delete(savingsController.deleteSavingsGoal);

// Savings goal progress route
router.get('/goals/:id/progress', savingsController.getSavingsGoalProgress);

// Recurring payment routes
router.route('/recurring')
  .get(savingsController.getRecurringPayments)
  .post(savingsController.createRecurringPayment);

router.route('/recurring/:id')
  .get(savingsController.getRecurringPayment)
  .patch(savingsController.updateRecurringPayment)
  .delete(savingsController.deleteRecurringPayment);

// Recurring payment progress route
router.get('/recurring/:id/progress', savingsController.getRecurringPaymentProgress);

module.exports = router;