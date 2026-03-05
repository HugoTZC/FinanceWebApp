const db = require('../config/database');

const budgetModel = {
  /**
   * Create budget period
   * @param {Object} budgetData - Budget period data
   * @returns {Object} Created budget period
   */
  async createPeriod(budgetData) {
    const { user_id, year, month } = budgetData;
    
    // Calculate start and end dates
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of the month
    
    const query = `
      INSERT INTO public.budget_periods (user_id, year, month, start_date, end_date)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const values = [user_id, year, month, startDate, endDate];
    
    try {
      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      // If budget period already exists, return the existing one
      if (error.code === '23505') { // Unique violation
        const existingQuery = `
          SELECT *
          FROM public.budget_periods
          WHERE user_id = $1 AND year = $2 AND month = $3
        `;
        
        const existingResult = await db.query(existingQuery, [user_id, year, month]);
        return existingResult.rows[0];
      }
      throw error;
    }
  },
  
  /**
   * Get budget period
   * @param {string} userId - User ID
   * @param {number} year - Year
   * @param {number} month - Month
   * @returns {Object} Budget period
   */
  async getPeriod(userId, year, month) {
    const query = `
      SELECT *
      FROM public.budget_periods
      WHERE user_id = $1 AND year = $2 AND month = $3
    `;
    
    const result = await db.query(query, [userId, year, month]);
    return result.rows[0] || null;
  },
  
  /**
   * Get budget period by ID
   * @param {string} id - Budget period ID
   * @returns {Object} Budget period
   */
  async getPeriodById(id) {
    const query = `
      SELECT *
      FROM public.budget_periods
      WHERE id = $1
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  },
  
  /**
   * Set budget category amount
   * @param {string} budgetPeriodId - Budget period ID
   * @param {string} categoryId - Category ID (default category)
   * @param {string} userCategoryId - User category ID
   * @param {number} amount - Budget amount
   * @returns {Object} Budget category
   */
  async setBudgetCategory(budgetPeriodId, categoryId, userCategoryId, amount) {
    // Get the user_id from the budget period for validation
    const periodQuery = `
      SELECT user_id FROM public.budget_periods WHERE id = $1
    `;
    const periodResult = await db.query(periodQuery, [budgetPeriodId]);
    if (!periodResult.rows.length) {
      throw new Error('Budget period not found');
    }

    // Ensure that only one field has a value and the other is NULL
    // This is essential to comply with the budget_categories_check constraint
    let actualCategoryId = null;
    let actualUserCategoryId = null;
    
    if (categoryId && categoryId !== '00000000-0000-0000-0000-000000000000') {
      actualCategoryId = categoryId;
    } else if (userCategoryId && userCategoryId !== '00000000-0000-0000-0000-000000000000') {
      actualUserCategoryId = userCategoryId;
    } else {
      throw new Error('Either category_id or user_category_id must be provided');
    }

    // Fetch all budget categories for this period and filter in JS
    const checkQuery = `
      SELECT * FROM public.budget_categories
      WHERE budget_period_id = $1
    `;
    
    const checkResult = await db.query(checkQuery, [budgetPeriodId]);
    
    // Filter in JS: find matching category_id or user_category_id
    const existing = checkResult.rows.find(row => {
      if (actualCategoryId && row.category_id === actualCategoryId) return true;
      if (actualUserCategoryId && row.user_category_id === actualUserCategoryId) return true;
      return false;
    });
    
    let result;
    
    if (existing) {
      // If the category exists, update it with fresh sequential params
      const updateQuery = `
        UPDATE public.budget_categories
        SET amount = $1
        WHERE id = $2
        RETURNING *
      `;
      
      result = await db.query(updateQuery, [amount, existing.id]);
    } else {
      // If the category doesn't exist, insert it
      const insertQuery = `
        INSERT INTO public.budget_categories (budget_period_id, category_id, user_category_id, amount)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      
      result = await db.query(insertQuery, [budgetPeriodId, actualCategoryId, actualUserCategoryId, amount]);
    }
    
    return result.rows[0];
  },
  
  /**
   * Get budget categories for a period
   * @param {string} budgetPeriodId - Budget period ID
   * @returns {Array} Budget categories
   */
  async getBudgetCategories(budgetPeriodId) {
    try {
      // Step 1: Get budget categories (without joins)
      const budgetCategoriesQuery = `
        SELECT * FROM public.budget_categories
        WHERE budget_period_id = $1
      `;
      const budgetCategoriesResult = await db.query(budgetCategoriesQuery, [budgetPeriodId]);
      
      if (!budgetCategoriesResult.rows || budgetCategoriesResult.rows.length === 0) {
        return [];
      }
      
      const budgetCategories = budgetCategoriesResult.rows;
      
      // Step 2: Get unique category IDs
      const categoryIds = [...new Set(budgetCategories.map(bc => bc.category_id).filter(id => id))];
      const userCategoryIds = [...new Set(budgetCategories.map(bc => bc.user_category_id).filter(id => id))];
      
      // Step 3: Fetch categories separately
      const categoriesMap = new Map();
      const userCategoriesMap = new Map();
      
      // Fetch default categories
      for (const categoryId of categoryIds) {
        try {
          const catQuery = `SELECT id, name, type, category_group, icon, color FROM public.categories WHERE id = $1`;
          const catResult = await db.query(catQuery, [categoryId]);
          if (catResult.rows && catResult.rows[0]) {
            categoriesMap.set(categoryId, catResult.rows[0]);
          }
        } catch (e) {
          console.error(`Error fetching category ${categoryId}:`, e);
        }
      }
      
      // Fetch user categories
      for (const userCategoryId of userCategoryIds) {
        try {
          const catQuery = `SELECT id, name, type, category_group, icon, color FROM public.user_categories WHERE id = $1`;
          const catResult = await db.query(catQuery, [userCategoryId]);
          if (catResult.rows && catResult.rows[0]) {
            userCategoriesMap.set(userCategoryId, catResult.rows[0]);
          }
        } catch (e) {
          console.error(`Error fetching user category ${userCategoryId}:`, e);
        }
      }
      
      // Step 4: Combine data
      const result = budgetCategories.map(bc => {
        const category = categoriesMap.get(bc.category_id);
        const userCategory = userCategoriesMap.get(bc.user_category_id);
        
        return {
          ...bc,
          category_name: category?.name || null,
          category_type: category?.type || null,
          category_group: category?.category_group || null,
          icon: category?.icon || null,
          color: category?.color || null,
          user_category_name: userCategory?.name || null,
          user_category_type: userCategory?.type || null,
          user_category_group: userCategory?.category_group || null,
          user_category_icon: userCategory?.icon || null,
          user_category_color: userCategory?.color || null
        };
      });
      
      return result;
    } catch (error) {
      console.error('Error in getBudgetCategories:', error);
      return [];
    }
  },
  
  /**
   * Delete budget category
   * @param {string} id - Budget category ID
   * @returns {boolean} Success
   */
  async deleteBudgetCategory(id) {
    const query = `
      DELETE FROM public.budget_categories
      WHERE id = $1
      RETURNING id
    `;
    
    const result = await db.query(query, [id]);
    return result.rows.length > 0;
  },
  
  /**
   * Get budget with spending
   * @param {string} userId - User ID
   * @param {number} year - Year
   * @param {number} month - Month
   * @returns {Object} Budget with spending
   */
  async getBudgetWithSpending(userId, year, month) {
    try {
      // Convert parameters to numbers and validate
      const numYear = parseInt(year, 10);
      const numMonth = parseInt(month, 10);
      
      if (isNaN(numYear) || isNaN(numMonth)) {
        throw new Error('Invalid year or month format');
      }

      console.log(`Getting budget with spending for user ${userId}, year ${numYear}, month ${numMonth}`);

      // First get or create the budget period
      let budgetPeriod = await this.getPeriod(userId, numYear, numMonth);
      
      if (!budgetPeriod) {
        budgetPeriod = await this.createPeriod({ user_id: userId, year: numYear, month: numMonth });
      }
      
      // Get budget categories
      const budgetCategories = await this.getBudgetCategories(budgetPeriod.id);
      
      // Get all transactions for the user and filter in JavaScript
      const transactionsQuery = `
        SELECT category_id, user_category_id, amount, transaction_date, type
        FROM public.transactions
        WHERE user_id = $1
      `;
      
      const transactionsResult = await db.query(transactionsQuery, [userId]);
      
      // Filter transactions by month/year and type in JavaScript
      const monthlyExpenses = transactionsResult.rows.filter(t => {
        if (t.type === 'income') return false;
        
        const date = new Date(t.transaction_date);
        return date.getFullYear() === numYear && (date.getMonth() + 1) === numMonth;
      });
      
      // Calculate spending per category in JavaScript
      const spendingByCategory = new Map();
      
      monthlyExpenses.forEach(t => {
        const categoryId = t.category_id || t.user_category_id;
        if (categoryId) {
          const current = spendingByCategory.get(categoryId) || 0;
          spendingByCategory.set(categoryId, current + parseFloat(t.amount));
        }
      });
      
      // Map spending to budget categories
      const budgetWithSpending = budgetCategories.map(category => {
        const categoryId = category.category_id || category.user_category_id;
        const spent = spendingByCategory.get(categoryId) || 0;
        
        return {
          ...category,
          spent: spent,
          remaining: parseFloat(category.amount || 0) - spent
        };
      });
      
      console.log(`Returning ${budgetWithSpending.length} budget categories with spending`);
      
      return {
        period: budgetPeriod,
        categories: budgetWithSpending || []
      };
    } catch (error) {
      console.error('Error in getBudgetWithSpending:', error);
      // Return empty result instead of throwing
      return {
        period: null,
        categories: []
      };
    }
  },
  
  /**
   * Get budget alerts
   * @param {string} userId - User ID
   * @returns {Array} Budget alerts
   */
  async getBudgetAlerts(userId) {
    try {
      // Get current month and year for filtering
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      console.log(`Getting budget alerts for user ${userId}, year ${currentYear}, month ${currentMonth}`);

      // Step 1: Get budget period for current month
      const periodQuery = `
        SELECT * FROM public.budget_periods
        WHERE user_id = $1 AND year = $2 AND month = $3
      `;
      const periodResult = await db.query(periodQuery, [userId, currentYear, currentMonth]);
      
      if (!periodResult.rows || periodResult.rows.length === 0) {
        console.log('No budget period found for current month');
        return [];
      }
      
      const budgetPeriod = periodResult.rows[0];
      console.log('Found budget period:', budgetPeriod.id);

      // Step 2: Get budget categories with category names
      const categoriesQuery = `
        SELECT bc.*,
          c.name as category_name,
          uc.name as user_category_name
        FROM public.budget_categories bc
        LEFT JOIN public.categories c ON bc.category_id = c.id
        LEFT JOIN public.user_categories uc ON bc.user_category_id = uc.id
        WHERE bc.budget_period_id = $1
      `;
      const categoriesResult = await db.query(categoriesQuery, [budgetPeriod.id]);
      
      if (!categoriesResult.rows || categoriesResult.rows.length === 0) {
        console.log('No budget categories found');
        return [];
      }
      
      console.log(`Found ${categoriesResult.rows.length} budget categories`);

      // Step 3: Get all transactions for the current month
      const transactionsQuery = `
        SELECT category_id, user_category_id, amount
        FROM public.transactions
        WHERE user_id = $1
      `;
      const transactionsResult = await db.query(transactionsQuery, [userId]);
      
      // Filter transactions by year and month in JavaScript
      const filteredTransactions = transactionsResult.rows.filter(t => {
        // We don't have transaction_date in the select, so we need to fetch it
        return true; // We'll handle this differently
      });

      // Actually, let's fetch transactions with dates and filter in JS
      const transactionsWithDatesQuery = `
        SELECT category_id, user_category_id, amount, transaction_date
        FROM public.transactions
        WHERE user_id = $1
      `;
      const transactionsWithDatesResult = await db.query(transactionsWithDatesQuery, [userId]);
      
      // Filter by current month/year in JavaScript
      const monthlyTransactions = transactionsWithDatesResult.rows.filter(t => {
        const date = new Date(t.transaction_date);
        return date.getFullYear() === currentYear && (date.getMonth() + 1) === currentMonth && t.type !== 'income';
      });

      console.log(`Found ${monthlyTransactions.length} transactions for current month`);

      // Step 4: Calculate spending per category
      const spendingByCategory = new Map();
      
      monthlyTransactions.forEach(t => {
        const categoryId = t.category_id || t.user_category_id;
        if (categoryId) {
          const current = spendingByCategory.get(categoryId) || 0;
          spendingByCategory.set(categoryId, current + parseFloat(t.amount));
        }
      });

      // Step 5: Build alerts for categories over 75% of budget
      const alerts = [];
      
      for (const category of categoriesResult.rows) {
        const categoryId = category.category_id || category.user_category_id;
        const categoryName = category.category_name || category.user_category_name || 'Unknown';
        const budgetAmount = parseFloat(category.amount) || 0;
        const spentAmount = spendingByCategory.get(categoryId) || 0;
        
        if (budgetAmount > 0 && spentAmount >= budgetAmount * 0.75) {
          const percentage = (spentAmount / budgetAmount) * 100;
          let alertLevel = 'LOW';
          
          if (spentAmount >= budgetAmount * 0.9) {
            alertLevel = 'HIGH';
          } else if (spentAmount >= budgetAmount * 0.75) {
            alertLevel = 'MEDIUM';
          }
          
          alerts.push({
            budget_period_id: budgetPeriod.id,
            year: currentYear,
            month: currentMonth,
            budget_category_id: category.id,
            category_name: categoryName,
            budget_amount: budgetAmount,
            spent_amount: spentAmount,
            alert_level: alertLevel,
            threshold_percentage: Math.round(percentage * 10) / 10
          });
        }
      }

      // Sort by percentage descending
      alerts.sort((a, b) => b.threshold_percentage - a.threshold_percentage);
      
      console.log(`Generated ${alerts.length} budget alerts`);
      return alerts;
    } catch (error) {
      console.error('Error in getBudgetAlerts:', error);
      // Return empty array instead of throwing
      return [];
    }
  },
  
  /**
   * Mark budget alert as read
   * @param {string} alertId - Alert ID
   * @param {string} userId - User ID
   * @returns {boolean} Success
   */
  async markAlertAsRead(alertId, userId) {
    const query = `
      UPDATE public.budget_alerts
      SET is_read = TRUE
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;
    
    const result = await db.query(query, [alertId, userId]);
    return result.rows.length > 0;
  }
};

module.exports = budgetModel;