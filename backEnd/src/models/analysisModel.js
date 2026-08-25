const db = require('../config/database');

/**
 * Analysis model for database operations
 * All complex queries are replaced with simple SELECTs + JS computation
 * to be compatible with the REST API translation layer.
 */
const AnalysisModel = {
  /**
   * Get budget analysis for a user
   * @param {String} userId - User ID
   * @param {Number} year - Year (optional)
   * @param {Number} month - Month (optional)
   * @returns {Promise<Object>} - Budget analysis data
   */
  async getBudgetAnalysis(userId, year = null, month = null) {
    const currentDate = new Date();
    const currentYear = year || currentDate.getFullYear();
    const currentMonth = month || currentDate.getMonth() + 1;

    // Fetch budget period for the given year/month
    const periodResult = await db.query(
      'SELECT * FROM public.budget_periods WHERE user_id = $1 AND year = $2 AND month = $3',
      [userId, currentYear, currentMonth]
    );

    if (periodResult.rows.length === 0) {
      return {
        budget_period: null,
        categories: [],
        total_budget: 0,
        total_spent: 0,
        remaining: 0
      };
    }

    // Incremental Python API integration. Vercel injects PYTHON_API_URL through
    // the service binding; the localhost fallback preserves split local dev.
    const pythonApiUrl = process.env.PYTHON_API_URL || 'http://localhost:8000';
    try {
      const res = await fetch(new URL('/pago-minimo', pythonApiUrl), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saldo: 5000, banco: 'mercado_pago' })
      });
      if (!res.ok) {
        throw new Error(`Python API responded with ${res.status}`);
      }
      const data = await res.json();
      console.log('Estimated minimum payment:', data.pago_minimo);
    } catch (error) {
      // Analysis remains available while endpoints are migrated incrementally.
      console.warn('Python API unavailable; continuing with legacy analysis:', error.message);
    }



    const budgetPeriod = periodResult.rows[0];

    // Fetch budget categories for this period
    const budgetCatsResult = await db.query(
      'SELECT * FROM public.budget_categories WHERE budget_period_id = $1',
      [budgetPeriod.id]
    );

    // Fetch transactions for this user in the date range
    const transactionsResult = await db.query(
      'SELECT * FROM public.transactions WHERE user_id = $1 AND type = $2',
      [userId, 'expense']
    );

    // Filter transactions to the budget period date range
    const startDate = new Date(budgetPeriod.start_date);
    const endDate = new Date(budgetPeriod.end_date);
    const periodTransactions = transactionsResult.rows.filter(t => {
      const txDate = new Date(t.transaction_date);
      return txDate >= startDate && txDate <= endDate;
    });

    // Compute spending per category
    const categories = budgetCatsResult.rows.map(bc => {
      const spent = periodTransactions
        .filter(t => t.category_id === bc.category_id || t.user_category_id === bc.user_category_id)
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

      return {
        ...bc,
        spent: spent,
        remaining: parseFloat(bc.amount) - spent
      };
    });

    const totalBudget = budgetCatsResult.rows.reduce((sum, bc) => sum + parseFloat(bc.amount || 0), 0);
    const totalSpent = categories.reduce((sum, c) => sum + c.spent, 0);

    return {
      budget_period: budgetPeriod,
      categories,
      total_budget: totalBudget,
      total_spent: totalSpent,
      remaining: totalBudget - totalSpent
    };
  },

  /**
   * Get weekly analysis for a user
   * @param {String} userId - User ID
   * @param {Number} weeksBack - Number of weeks to analyze
   * @returns {Promise<Array>} - Weekly analysis data
   */
  async getWeeklyAnalysis(userId, weeksBack = 4) {
    // Fetch transactions for the user
    const result = await db.query(
      'SELECT * FROM public.transactions WHERE user_id = $1',
      [userId]
    );

    const now = new Date();
    const cutoffDate = new Date(now);
    cutoffDate.setDate(cutoffDate.getDate() - (weeksBack * 7));

    // Filter to recent transactions
    const recentTransactions = result.rows.filter(t => {
      const txDate = new Date(t.transaction_date);
      return txDate >= cutoffDate && txDate <= now;
    });

    // Group by week
    const weeks = [];
    for (let i = 0; i < weeksBack; i++) {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - (i * 7));
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 7);

      const weekTransactions = recentTransactions.filter(t => {
        const txDate = new Date(t.transaction_date);
        return txDate > weekStart && txDate <= weekEnd;
      });

      const income = weekTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

      const expenses = weekTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

      const weekLabel = `${weekStart.toISOString().slice(0, 10)} - ${weekEnd.toISOString().slice(0, 10)}`;

      weeks.push({
        week: weekLabel,
        week_start: weekStart.toISOString().slice(0, 10),
        week_end: weekEnd.toISOString().slice(0, 10),
        income,
        expenses,
        net: income - expenses,
        transaction_count: weekTransactions.length
      });
    }

    return weeks.reverse();
  },

  /**
   * Get upcoming due dates for a user
   * @param {String} userId - User ID
   * @param {Number} days - Number of days to look ahead
   * @returns {Promise<Array>} - Upcoming due dates
   */
  async getUpcomingDueDates(userId, days = 7) {
    // Fetch recurring payments
    const recurringResult = await db.query(
      'SELECT * FROM public.recurring_payments WHERE user_id = $1',
      [userId]
    );

    // Fetch credit cards
    const creditResult = await db.query(
      'SELECT * FROM public.credit_cards WHERE user_id = $1',
      [userId]
    );

    // Fetch loans
    const loansResult = await db.query(
      'SELECT * FROM public.loans WHERE user_id = $1',
      [userId]
    );

    const now = new Date();
    const cutoffDate = new Date(now);
    cutoffDate.setDate(cutoffDate.getDate() + days);

    const dueDates = [];

    // Process recurring payments
    for (const rp of recurringResult.rows) {
      if (rp.due_date) {
        const dueDate = new Date(rp.due_date);
        // Adjust to current/next occurrence within the window
        const daysDiff = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
        if (daysDiff >= 0 && daysDiff <= days) {
          dueDates.push({
            id: rp.id,
            name: rp.name,
            type: 'recurring_payment',
            amount: parseFloat(rp.amount),
            due_date: rp.due_date,
            days_until_due: daysDiff
          });
        }
      }
    }

    // Process credit cards
    for (const cc of creditResult.rows) {
      if (cc.due_date) {
        const dueDate = new Date(cc.due_date);
        const daysDiff = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
        if (daysDiff >= 0 && daysDiff <= days) {
          dueDates.push({
            id: cc.id,
            name: cc.name,
            type: 'credit_card',
            amount: parseFloat(cc.min_payment || 0),
            due_date: cc.due_date,
            days_until_due: daysDiff
          });
        }
      }
    }

    // Process loans
    for (const loan of loansResult.rows) {
      if (loan.due_date) {
        const dueDate = new Date(loan.due_date);
        const daysDiff = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
        if (daysDiff >= 0 && daysDiff <= days) {
          dueDates.push({
            id: loan.id,
            name: loan.name,
            type: 'loan',
            amount: parseFloat(loan.monthly_payment || 0),
            due_date: loan.due_date,
            days_until_due: daysDiff
          });
        }
      }
    }

    // Sort by days_until_due
    dueDates.sort((a, b) => a.days_until_due - b.days_until_due);

    return dueDates;
  },

  /**
   * Get monthly obligations for a user
   * @param {String} userId - User ID
   * @returns {Promise<Object>} - Monthly obligations data
   */
  async getMonthlyObligations(userId) {
    // Fetch recurring payments
    const recurringResult = await db.query(
      'SELECT * FROM public.recurring_payments WHERE user_id = $1',
      [userId]
    );

    // Fetch credit cards
    const creditResult = await db.query(
      'SELECT * FROM public.credit_cards WHERE user_id = $1',
      [userId]
    );

    // Fetch loans
    const loansResult = await db.query(
      'SELECT * FROM public.loans WHERE user_id = $1',
      [userId]
    );

    const recurringTotal = recurringResult.rows.reduce(
      (sum, rp) => sum + parseFloat(rp.amount || 0), 0
    );
    const creditTotal = creditResult.rows.reduce(
      (sum, cc) => sum + parseFloat(cc.min_payment || 0), 0
    );
    const loansTotal = loansResult.rows.reduce(
      (sum, l) => sum + parseFloat(l.monthly_payment || 0), 0
    );

    return {
      recurring_payments_total: recurringTotal,
      credit_cards_total: creditTotal,
      loans_total: loansTotal,
      total: recurringTotal + creditTotal + loansTotal
    };
  },

  /**
   * Get monthly income and expenses for a user
   * @param {String} userId - User ID
   * @param {Number} months - Number of months to analyze
   * @returns {Promise<Array>} - Monthly income and expenses data
   */
  async getMonthlyIncomeAndExpenses(userId, months = 6) {
    // Fetch all transactions for the user
    const result = await db.query(
      'SELECT * FROM public.transactions WHERE user_id = $1',
      [userId]
    );

    const now = new Date();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Build month buckets
    const monthlyData = [];
    for (let i = months - 1; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const targetYear = targetDate.getFullYear();
      const targetMonth = targetDate.getMonth(); // 0-indexed

      const monthTransactions = result.rows.filter(t => {
        const txDate = new Date(t.transaction_date);
        return txDate.getFullYear() === targetYear && txDate.getMonth() === targetMonth;
      });

      const income = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

      const expenses = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

      monthlyData.push({
        month: monthNames[targetMonth],
        year: targetYear,
        income,
        expenses
      });
    }

    return monthlyData;
  },
};

module.exports = AnalysisModel;
