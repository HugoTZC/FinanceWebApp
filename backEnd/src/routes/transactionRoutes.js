const express = require('express');
const transactionController = require('../controllers/transactionController');

const router = express.Router();

// Transaction routes
router.route('/')
  .get(transactionController.getTransactions)
  .post(transactionController.createTransaction);

// Special endpoints with fixed paths should come BEFORE parameterized routes
router.get('/years', transactionController.getTransactionYears);
router.get('/summary/:year/:month', transactionController.getMonthlySummary);
router.get('/categories/:year/:month', transactionController.getCategoryBreakdown);
router.get('/card/:cardId', transactionController.getTransactionsByCard);

// Transaction routes with parameters
router.route('/:id')
  .get(transactionController.getTransaction)
  .patch(transactionController.updateTransaction)
  .delete(transactionController.deleteTransaction);

module.exports = router;