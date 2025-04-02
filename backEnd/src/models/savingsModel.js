const { pool } = require("../config/database")

/**
 * Savings model for database operations
 */
const SavingsModel = {
  /**
   * Get all savings goals for a user
   * @param {String} userId - User ID
   * @returns {Promise<Array>} - Array of savings goals
   */
  async getAll(userId) {
    const query = `
      SELECT * FROM savings_goals
      WHERE user_id = $1
      ORDER BY is_completed, due_date
    `

    const result = await pool.query(query, [userId])
    return result.rows
  },

  /**
   * Get a savings goal by ID
   * @param {String} id - Savings goal ID
   * @param {String} userId - User ID (for authorization)
   * @returns {Promise<Object|null>} - Savings goal or null
   */
  async getById(id, userId) {
    const query = `
      SELECT * FROM savings_goals
      WHERE id = $1 AND user_id = $2
    `

    const result = await pool.query(query, [id, userId])
    return result.rows[0] || null
  },

  /**
   * Create a new savings goal
   * @param {Object} goalData - Savings goal data
   * @returns {Promise<Object>} - Created savings goal
   */
  async create(goalData) {
    const { user_id, name, target_amount, current_amount, due_date, due_date_day, monthly_contribution } = goalData

    const query = `
      INSERT INTO savings_goals (
        user_id, name, target_amount, current_amount, due_date, due_date_day, monthly_contribution
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `

    const values = [user_id, name, target_amount, current_amount || 0, due_date, due_date_day, monthly_contribution]

    const result = await pool.query(query, values)
    return result.rows[0]
  },

  /**
   * Update a savings goal
   * @param {String} id - Savings goal ID
   * @param {String} userId - User ID (for authorization)
   * @param {Object} goalData - Savings goal data to update
   * @returns {Promise<Object|null>} - Updated savings goal or null
   */
  async update(id, userId, goalData) {
    const { name, target_amount, current_amount, due_date, due_date_day, monthly_contribution, is_completed } = goalData

    const query = `
      UPDATE savings_goals
      SET 
        name = COALESCE($1, name),
        target_amount = COALESCE($2, target_amount),
        current_amount = COALESCE($3, current_amount),
        due_date = COALESCE($4, due_date),
        due_date_day = COALESCE($5, due_date_day),
        monthly_contribution = COALESCE($6, monthly_contribution),
        is_completed = COALESCE($7, is_completed),
        updated_at = NOW()
      WHERE id = $8 AND user_id = $9
      RETURNING *
    `

    const values = [
      name,
      target_amount,
      current_amount,
      due_date,
      due_date_day,
      monthly_contribution,
      is_completed,
      id,
      userId,
    ]

    const result = await pool.query(query, values)
    return result.rows[0] || null
  },

  /**
   * Delete a savings goal
   * @param {String} id - Savings goal ID
   * @param {String} userId - User ID (for authorization)
   * @returns {Promise<Boolean>} - Success status
   */
  async delete(id, userId) {
    const query = `
      DELETE FROM savings_goals
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `

    const result = await pool.query(query, [id, userId])
    return result.rows.length > 0
  },

  /**
   * Get savings goal progress
   * @param {String} userId - User ID
   * @returns {Promise<Array>} - Savings goal progress data
   */
  async getSavingsProgress(userId) {
    const query = `
      SELECT * FROM savings_goal_progress
      WHERE user_id = $1
      ORDER BY days_remaining NULLS LAST
    `

    const result = await pool.query(query, [userId])
    return result.rows
  },

  /**
   * Get transactions for a savings goal
   * @param {String} goalId - Savings goal ID
   * @param {String} userId - User ID (for authorization)
   * @returns {Promise<Array>} - Array of transactions
   */
  async getTransactions(goalId, userId) {
    const query = `
      SELECT t.*, c.name as category_name, c.color as category_color
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.savings_goal_id = $1 AND t.user_id = $2
      ORDER BY t.transaction_date DESC
    `

    const result = await pool.query(query, [goalId, userId])
    return result.rows
  },
}

module.exports = SavingsModel

