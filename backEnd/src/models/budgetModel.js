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
      INSERT INTO finance.budget_periods (user_id, year, month, start_date, end_date)
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
          FROM finance.budget_periods
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
      FROM finance.budget_periods
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
      FROM finance.budget_periods
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
      SELECT user_id FROM finance.budget_periods WHERE id = $1
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

    // First check if the budget category already exists
    const checkQuery = `
      SELECT id FROM finance.budget_categories 
      WHERE budget_period_id = $1 
      AND (
        (category_id = $2 AND $2 IS NOT NULL)
        OR 
        (user_category_id = $3 AND $3 IS NOT NULL)
      )
    `;
    
    const checkResult = await db.query(checkQuery, [budgetPeriodId, actualCategoryId, actualUserCategoryId]);
    
    let result;
    
    if (checkResult.rows.length > 0) {
      // If the category exists, update it
      const updateQuery = `
        UPDATE finance.budget_categories 
        SET amount = $4 
        WHERE id = $5
        RETURNING *
      `;
      
      result = await db.query(updateQuery, [amount, checkResult.rows[0].id]);
    } else {
      // If the category doesn't exist, insert it
      const insertQuery = `
        INSERT INTO finance.budget_categories (budget_period_id, category_id, user_category_id, amount)
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
    const query = `
      SELECT bc.*, 
        c.name as category_name, 
        c.type as category_type,
        c.category_group,
        c.icon,
        c.color,
        uc.name as user_category_name,
        uc.type as user_category_type,
        uc.category_group as user_category_group,
        uc.icon as user_category_icon,
        uc.color as user_category_color
      FROM finance.budget_categories bc
      LEFT JOIN finance.categories c ON bc.category_id = c.id
      LEFT JOIN finance.user_categories uc ON bc.user_category_id = uc.id
      WHERE bc.budget_period_id = $1
    `;
    
    const result = await db.query(query, [budgetPeriodId]);
    return result.rows;
  },
  
  /**
   * Delete budget category
   * @param {string} id - Budget category ID
   * @returns {boolean} Success
   */
  async deleteBudgetCategory(id) {
    const query = `
      DELETE FROM finance.budget_categories
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

      // First get or create the budget period
      let budgetPeriod = await this.getPeriod(userId, numYear, numMonth);
      
      if (!budgetPeriod) {
        budgetPeriod = await this.createPeriod({ user_id: userId, year: numYear, month: numMonth });
      }
      
      // Get budget categories
      const budgetCategories = await this.getBudgetCategories(budgetPeriod.id);
      
      // Get spending for each category
      const startDate = new Date(Date.UTC(numYear, numMonth - 1, 1));
      const endDate = new Date(Date.UTC(numYear, numMonth, 0)); // Last day of the month
      
      const spendingQuery = `
        SELECT 
          COALESCE(t.category_id, t.user_category_id) as category_id,
          SUM(t.amount) as spent
        FROM finance.transactions t
        WHERE t.user_id = $1
          AND t.transaction_date BETWEEN $2 AND $3
          AND t.type = 'expense'
        GROUP BY COALESCE(t.category_id, t.user_category_id)
      `;
      
      const spendingResult = await db.query(spendingQuery, [userId, startDate, endDate]);
      
      // Map spending to budget categories
      const budgetWithSpending = budgetCategories.map(category => {
        const categoryId = category.category_id || category.user_category_id;
        const spending = spendingResult.rows.find(row => row.category_id === categoryId);
        
        return {
          ...category,
          spent: spending ? parseFloat(spending.spent) : 0,
          remaining: parseFloat(category.amount || 0) - (spending ? parseFloat(spending.spent) : 0)
        };
      });
      
      return {
        period: budgetPeriod,
        categories: budgetWithSpending || []
      };
    } catch (error) {
      console.error('Error in getBudgetWithSpending:', error);
      throw error;
    }
  },
  
  /**
   * Get budget alerts
   * @param {string} userId - User ID
   * @returns {Array} Budget alerts
   */
  async getBudgetAlerts(userId) {
    // Get current month and year for filtering
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const query = `
      WITH budget_spending AS (
        SELECT 
          bp.id as budget_period_id,
          bp.year,
          bp.month,
          bc.id as budget_category_id,
          COALESCE(c.name, uc.name) as category_name,
          bc.amount as budget_amount,
          COALESCE(SUM(t.amount), 0) as spent_amount
        FROM finance.budget_periods bp
        JOIN finance.budget_categories bc ON bp.id = bc.budget_period_id
        LEFT JOIN finance.categories c ON bc.category_id = c.id
        LEFT JOIN finance.user_categories uc ON bc.user_category_id = uc.id
        LEFT JOIN finance.transactions t ON (
          (t.category_id = bc.category_id OR t.user_category_id = bc.user_category_id)
          AND EXTRACT(YEAR FROM t.transaction_date) = bp.year 
          AND EXTRACT(MONTH FROM t.transaction_date) = bp.month
        )
        WHERE bp.user_id = $1
          AND bp.year = $2 
          AND bp.month = $3
        GROUP BY bp.id, bp.year, bp.month, bc.id, c.name, uc.name, bc.amount
      )
      SELECT 
        bs.*,
        CASE 
          WHEN spent_amount >= budget_amount * 0.9 THEN 'HIGH'
          WHEN spent_amount >= budget_amount * 0.75 THEN 'MEDIUM'
          ELSE 'LOW'
        END as alert_level,
        ROUND((spent_amount / budget_amount * 100)::numeric, 1) as threshold_percentage
      FROM budget_spending bs
      WHERE spent_amount >= budget_amount * 0.75
      ORDER BY spent_amount / budget_amount DESC;
    `;

    const result = await db.query(query, [userId, currentYear, currentMonth]);
    return result.rows;
  },
  
  /**
   * Mark budget alert as read
   * @param {string} alertId - Alert ID
   * @param {string} userId - User ID
   * @returns {boolean} Success
   */
  async markAlertAsRead(alertId, userId) {
    const query = `
      UPDATE finance.budget_alerts
      SET is_read = TRUE
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;
    
    const result = await db.query(query, [alertId, userId]);
    return result.rows.length > 0;
  }
};

module.exports = budgetModel;