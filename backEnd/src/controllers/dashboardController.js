const transactionModel = require('../models/transactionModel');
const { AppError } = require('../utils/helpers');

/**
 * Get dashboard overview data including monthly income, expenses, and balances
 * @route GET /api/dashboard/overview
 */
exports.getDashboardOverview = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get current date
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // JavaScript months are 0-based
    
    // Get last month
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    
    // Get current month summary
    const currentMonthSummary = await transactionModel.getMonthlySummary(userId, currentYear, currentMonth);
    
    // Get last month summary
    const lastMonthSummary = await transactionModel.getMonthlySummary(userId, lastMonthYear, lastMonth);
    
    // Calculate balances and differences
    const currentIncome = parseFloat(currentMonthSummary?.total_income || 0);
    const currentExpenses = parseFloat(currentMonthSummary?.total_expenses || 0);
    const currentBalance = currentIncome - currentExpenses;
    
    const lastIncome = parseFloat(lastMonthSummary?.total_income || 0);
    const lastExpenses = parseFloat(lastMonthSummary?.total_expenses || 0);
    const lastBalance = lastIncome - lastExpenses;
    
    // Calculate differences from last month
    const incomeDifference = currentIncome - lastIncome;
    const expensesDifference = currentExpenses - lastExpenses;
    const balanceDifference = currentBalance - lastBalance;
    
    res.status(200).json({
      status: 'success',
      data: {
        currentMonth: {
          year: currentYear,
          month: currentMonth,
          income: currentIncome,
          expenses: currentExpenses,
          balance: currentBalance
        },
        lastMonth: {
          year: lastMonthYear,
          month: lastMonth,
          income: lastIncome,
          expenses: lastExpenses,
          balance: lastBalance
        },
        difference: {
          income: incomeDifference,
          expenses: expensesDifference,
          balance: balanceDifference
        }
      }
    });
  } catch (error) {
    console.error('Error getting dashboard overview:', error);
    next(error);
  }
};

/**
 * Get monthly data for dashboard charts
 * @route GET /api/dashboard/monthly/:year
 */
exports.getMonthlyData = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { year } = req.params;
    
    // Get income and expense data for each month
    const monthlyData = [];
    
    for (let month = 1; month <= 12; month++) {
      const summary = await transactionModel.getMonthlySummary(userId, year, month);
      
      monthlyData.push({
        name: new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'short' }),
        income: parseFloat(summary?.total_income || 0),
        expenses: parseFloat(summary?.total_expenses || 0)
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: monthlyData
    });
  } catch (error) {
    console.error('Error getting monthly dashboard data:', error);
    next(error);
  }
};

/**
 * Get category breakdown for dashboard
 * @route GET /api/dashboard/categories/:year/:month?
 */
exports.getCategoryBreakdown = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { year, month } = req.params;
    
    // If month is not provided, use current month
    const targetMonth = month || new Date().getMonth() + 1;
    
    // Get category breakdown
    const categories = await transactionModel.getCategoryBreakdown(userId, year, targetMonth);
    
    // Format data for the frontend
    const formattedCategories = categories.map((category, index) => {
      // Assign a color based on the index
      const colors = ['#4ade80', '#60a5fa', '#f87171', '#fbbf24', '#a78bfa', '#fb923c', 
                      '#34d399', '#818cf8', '#f472b6', '#fb7185', '#c084fc', '#fdba74'];
      const color = colors[index % colors.length];
      
      return {
        name: category.category_name || 'Uncategorized',
        value: parseFloat(category.total_amount || 0),
        color
      };
    });
    
    res.status(200).json({
      status: 'success',
      data: formattedCategories
    });
  } catch (error) {
    console.error('Error getting category breakdown:', error);
    next(error);
  }
};

/**
 * Get recent transactions for dashboard
 * @route GET /api/dashboard/transactions/recent
 */
exports.getRecentTransactions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit = 5 } = req.query;
    
    // Get recent transactions
    const transactions = await transactionModel.getTransactions({
      userId,
      page: 1,
      limit: parseInt(limit),
      orderBy: 'transaction_date',
      order: 'DESC'
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        transactions: transactions.transactions
      }
    });
  } catch (error) {
    console.error('Error getting recent transactions:', error);
    next(error);
  }
};