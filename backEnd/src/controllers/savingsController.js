const savingsModel = require('../models/savingsModel');
const { AppError } = require('../utils/helpers');

/**
 * Create savings goal
 * @route POST /api/savings/goals
 */
exports.createSavingsGoal = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { 
      name, target_amount, current_amount, 
      start_date, target_date 
    } = req.body;
    
    // Create savings goal
    const goal = await savingsModel.createSavingsGoal({
      user_id: userId,
      name,
      target_amount,
      current_amount,
      start_date,
      target_date
    });
    
    res.status(201).json({
      status: 'success',
      data: {
        goal
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all savings goals
 * @route GET /api/savings/goals
 */
exports.getSavingsGoals = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get savings goals
    const goals = await savingsModel.getSavingsGoals(userId);
    
    res.status(200).json({
      status: 'success',
      data: {
        goals
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get savings goal by ID
 * @route GET /api/savings/goals/:id
 */
exports.getSavingsGoal = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    // Get savings goal
    const goal = await savingsModel.getSavingsGoalById(id, userId);
    
    if (!goal) {
      return next(new AppError('Savings goal not found', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        goal
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update savings goal
 * @route PATCH /api/savings/goals/:id
 */
exports.updateSavingsGoal = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { 
      name, target_amount, current_amount, 
      start_date, target_date, is_completed 
    } = req.body;
    
    // Update savings goal
    const goal = await savingsModel.updateSavingsGoal(id, userId, {
      name,
      target_amount,
      current_amount,
      start_date,
      target_date,
      is_completed
    });
    
    if (!goal) {
      return next(new AppError('Savings goal not found', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        goal
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete savings goal
 * @route DELETE /api/savings/goals/:id
 */
exports.deleteSavingsGoal = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    // Delete savings goal
    const success = await savingsModel.deleteSavingsGoal(id, userId);
    
    if (!success) {
      return next(new AppError('Savings goal not found', 404));
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
 * Create recurring payment
 * @route POST /api/savings/recurring
 */
exports.createRecurringPayment = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { 
      name, amount, current_amount, 
      due_date, frequency, category 
    } = req.body;
    
    // Create recurring payment
    const payment = await savingsModel.createRecurringPayment({
      user_id: userId,
      name,
      amount,
      current_amount,
      due_date,
      frequency,
      category
    });
    
    res.status(201).json({
      status: 'success',
      data: {
        payment
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all recurring payments
 * @route GET /api/savings/recurring
 */
exports.getRecurringPayments = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get recurring payments
    const payments = await savingsModel.getRecurringPayments(userId);
    
    res.status(200).json({
      status: 'success',
      data: {
        payments
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get recurring payment by ID
 * @route GET /api/savings/recurring/:id
 */
exports.getRecurringPayment = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    // Get recurring payment
    const payment = await savingsModel.getRecurringPaymentById(id, userId);
    
    if (!payment) {
      return next(new AppError('Recurring payment not found', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        payment
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update recurring payment
 * @route PATCH /api/savings/recurring/:id
 */
exports.updateRecurringPayment = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { 
      name, amount, current_amount, 
      due_date, frequency, category 
    } = req.body;
    
    // Update recurring payment
    const payment = await savingsModel.updateRecurringPayment(id, userId, {
      name,
      amount,
      current_amount,
      due_date,
      frequency,
      category
    });
    
    if (!payment) {
      return next(new AppError('Recurring payment not found', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        payment
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete recurring payment
 * @route DELETE /api/savings/recurring/:id
 */
exports.deleteRecurringPayment = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    // Delete recurring payment
    const success = await savingsModel.deleteRecurringPayment(id, userId);
    
    if (!success) {
      return next(new AppError('Recurring payment not found', 404));
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
 * Get savings goal progress
 * @route GET /api/savings/goals/:id/progress
 */
exports.getSavingsGoalProgress = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    // Get savings goal progress
    const progress = await savingsModel.getSavingsGoalProgress(id, userId);
    
    if (!progress) {
      return next(new AppError('Savings goal not found', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        progress
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get recurring payment progress
 * @route GET /api/savings/recurring/:id/progress
 */
exports.getRecurringPaymentProgress = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    // Get recurring payment progress
    const progress = await savingsModel.getRecurringPaymentProgress(id, userId);
    
    if (!progress) {
      return next(new AppError('Recurring payment not found', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        progress
      }
    });
  } catch (error) {
    next(error);
  }
};