const accountModel = require('../models/accountModel');
const { AppError } = require('../utils/helpers');

/**
 * Create bank account
 * @route POST /api/accounts
 */
exports.createBankAccount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, account_number, account_type, balance, is_default } = req.body;
    
    // Create bank account
    const account = await accountModel.createBankAccount({
      user_id: userId,
      name,
      account_number,
      account_type,
      balance,
      is_default
    });
    
    res.status(201).json({
      status: 'success',
      data: {
        account
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all bank accounts
 * @route GET /api/accounts
 */
exports.getBankAccounts = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get bank accounts
    const accounts = await accountModel.getBankAccounts(userId);
    
    res.status(200).json({
      status: 'success',
      data: {
        accounts
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get bank account by ID
 * @route GET /api/accounts/:id
 */
exports.getBankAccount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    // Get bank account
    const account = await accountModel.getBankAccountById(id, userId);
    
    if (!account) {
      return next(new AppError('Bank account not found', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        account
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update bank account
 * @route PATCH /api/accounts/:id
 */
exports.updateBankAccount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, account_number, account_type, balance, is_default } = req.body;
    
    // Update bank account
    const account = await accountModel.updateBankAccount(id, userId, {
      name,
      account_number,
      account_type,
      balance,
      is_default
    });
    
    if (!account) {
      return next(new AppError('Bank account not found', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        account
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete bank account
 * @route DELETE /api/accounts/:id
 */
exports.deleteBankAccount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    // Delete bank account
    const success = await accountModel.deleteBankAccount(id, userId);
    
    if (!success) {
      return next(new AppError('Bank account not found', 404));
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
 * Get account balance history
 * @route GET /api/accounts/:id/history
 */
exports.getAccountBalanceHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { months } = req.query;
    
    // Get account balance history
    const history = await accountModel.getAccountBalanceHistory(id, userId, months || 6);
    
    res.status(200).json({
      status: 'success',
      data: {
        history
      }
    });
  } catch (error) {
    next(error);
  }
};