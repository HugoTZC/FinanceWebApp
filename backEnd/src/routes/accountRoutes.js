const express = require('express');
const accountController = require('../controllers/accountController');

const router = express.Router();

// Bank account routes
router.route('/')
  .get(accountController.getBankAccounts)
  .post(accountController.createBankAccount);

router.route('/:id')
  .get(accountController.getBankAccount)
  .patch(accountController.updateBankAccount)
  .delete(accountController.deleteBankAccount);

// Account balance history route
router.get('/:id/history', accountController.getAccountBalanceHistory);

module.exports = router;