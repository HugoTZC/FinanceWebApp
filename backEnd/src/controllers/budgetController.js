const budgetModel = require('../models/budgetModel');
const { AppError } = require('../utils/helpers');

/**
 * Create or update budget
 * @route POST /api/budgets
 */
exports.createOrUpdateBudget = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { year, month, categories } = req.body;

    // Validate required fields
    if (!year || !month || !Array.isArray(categories)) {
      return next(new AppError('Missing required fields: year, month, and categories array', 400));
    }

    // Validate year and month
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    if (year < currentYear || year > currentYear + 1) {
      return next(new AppError('Invalid year. Can only set budgets for current or next year.', 400));
    }
    if (month < 1 || month > 12) {
      return next(new AppError('Invalid month. Must be between 1 and 12.', 400));
    }

    // Validate categories
    if (categories.length === 0) {
      return next(new AppError('At least one category is required', 400));
    }

    // Create budget period
    const budgetPeriod = await budgetModel.createPeriod({
      user_id: userId,
      year,
      month
    });

    // Set budget categories
    const budgetCategories = [];
    const processedCategories = new Set(); // Track processed categories to prevent duplicates

    for (const category of categories) {
      const { category_id, user_category_id, amount } = category;

      // Create a unique key for the category
      const categoryKey = `${category_id || ''}-${user_category_id || ''}`;
      
      // Check for duplicate categories
      if (processedCategories.has(categoryKey)) {
        return next(new AppError('Duplicate categories found in request', 400));
      }
      processedCategories.add(categoryKey);

      // Validate category data
      if (!category_id && !user_category_id) {
        return next(new AppError('Either category_id or user_category_id is required for each category', 400));
      }
      if (typeof amount !== 'number' || amount < 0) {
        return next(new AppError('Invalid amount. Must be a non-negative number.', 400));
      }

      try {
        const budgetCategory = await budgetModel.setBudgetCategory(
          budgetPeriod.id,
          category_id,
          user_category_id,
          amount
        );
        budgetCategories.push(budgetCategory);
      } catch (error) {
        console.error('Error setting budget category:', error);
        return next(new AppError('Error setting budget category. Please check your category IDs.', 400));
      }
    }

    res.status(201).json({
      status: 'success',
      data: {
        budget: {
          period: budgetPeriod,
          categories: budgetCategories
        }
      }
    });
  } catch (error) {
    console.error('Budget creation error:', error);
    next(new AppError('Failed to create budget. Please try again.', 500));
  }
};

/**
 * Get budget
 * @route GET /api/budgets/:year/:month
 */
exports.getBudget = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { year, month } = req.params;
    
    // Get budget with spending
    const budget = await budgetModel.getBudgetWithSpending(userId, year, month);
    
    res.status(200).json({
      status: 'success',
      data: {
        budget
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get budget by year and month
 * @route GET /api/budgets/:year/:month
 */
exports.getBudgetByYearMonth = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const year = parseInt(req.params.year, 10);
    const month = parseInt(req.params.month, 10);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return next(new AppError('Invalid year or month', 400));
    }

    // Get budget with spending
    const budget = await budgetModel.getBudgetWithSpending(userId, year, month);
    
    res.status(200).json({
      status: 'success',
      data: {
        budget: budget || null
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete budget category
 * @route DELETE /api/budgets/categories/:id
 */
exports.deleteBudgetCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Delete budget category
    const success = await budgetModel.deleteBudgetCategory(id);
    
    if (!success) {
      return next(new AppError('Budget category not found', 404));
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
 * Get budget alerts
 * @route GET /api/budgets/alerts
 */
exports.getBudgetAlerts = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get budget alerts
    const alerts = await budgetModel.getBudgetAlerts(userId);
    
    res.status(200).json({
      status: 'success',
      data: {
        alerts
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark budget alert as read
 * @route PATCH /api/budgets/alerts/:id
 */
exports.markAlertAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    // Mark alert as read
    const success = await budgetModel.markAlertAsRead(id, userId);
    
    if (!success) {
      return next(new AppError('Budget alert not found', 404));
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Budget alert marked as read'
    });
  } catch (error) {
    next(error);
  }
};