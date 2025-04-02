const { pool } = require("../config/database")

/**
 * Budget model for database operations
 */
const BudgetModel = {
  /**
   * Get all budgets for a user
   * @param {String} userId - User ID
   * @param {Number} year - Year (optional)
   * @param {Number} month - Month (optional)
   * @returns {Promise<Array>} - Array of budgets
   */
  async getAll(userId, year = null, month = null) {
    let query = `
      SELECT b.*, c.name as category_name, c.color as category_color
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      WHERE b.user_id = $1
    `

    const queryParams = [userId]
    let paramIndex = 2

    if (year) {
      query += ` AND b.year = $${paramIndex}`
      queryParams.push(year)
      paramIndex++

      if (month) {
        query += ` AND b.month = $${paramIndex}`
        queryParams.push(month)
      }
    }

    query += ` ORDER BY c.name`

    const result = await pool.query(query, queryParams)
    return result.rows
  },

  /**
   * Get budget progress for a user
   * @param {String} userId - User ID
   * @param {Number} year - Year
   * @param {Number} month - Month
   * @returns {Promise<Array>} - Budget progress data
   */
  async getBudgetProgress(userId, year, month) {
    const query = `
      SELECT * FROM budget_progress
      WHERE user_id = $1 AND year = $2 AND month = $3
      ORDER BY percentage_used DESC
    `

    const result = await pool.query(query, [userId, year, month])
    return result.rows
  },

  /**
   * Create or update a budget
   * @param {Object} budgetData - Budget data
   * @returns {Promise<Object>} - Created or updated budget
   */
  async createOrUpdate(budgetData) {
    const { user_id, category_id, amount, year, month } = budgetData

    const query = `
      INSERT INTO budgets (user_id, category_id, amount, year, month)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, category_id, year, month)
      DO UPDATE SET amount = $3, updated_at = NOW()
      RETURNING *
    `

    const result = await pool.query(query, [user_id, category_id, amount, year, month])
    return result.rows[0]
  },

  /**
   * Delete a budget
   * @param {String} userId - User ID
   * @param {String} categoryId - Category ID
   * @param {Number} year - Year
   * @param {Number} month - Month
   * @returns {Promise<Boolean>} - Success status
   */
  async delete(userId, categoryId, year, month) {
    const query = `
      DELETE FROM budgets
      WHERE user_id = $1 AND category_id = $2 AND year = $3 AND month = $4
      RETURNING id
    `

    const result = await pool.query(query, [userId, categoryId, year, month])
    return result.rows.length > 0
  },

  /**
   * Generate monthly budgets based on previous month
   * @returns {Promise<Boolean>} - Success status
   */
  async generateMonthlyBudgets() {
    await pool.query("SELECT generate_monthly_budgets()")
    return true
  },
}

module.exports = BudgetModel

