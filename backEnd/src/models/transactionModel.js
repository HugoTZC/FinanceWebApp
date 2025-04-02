const { pool } = require("../config/database")

/**
 * Transaction model for database operations
 */
const TransactionModel = {
  /**
   * Create a new transaction
   * @param {Object} transactionData - Transaction data
   * @returns {Promise<Object>} - Created transaction
   */
  async create(transactionData) {
    const {
      user_id,
      title,
      amount,
      transaction_date,
      type,
      category_id,
      payment_method,
      credit_card_id,
      savings_goal_id,
      recurring_payment_id,
      comment,
    } = transactionData

    const query = `
      INSERT INTO transactions (
        user_id, title, amount, transaction_date, type, category_id,
        payment_method, credit_card_id, savings_goal_id, recurring_payment_id, comment
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `

    const values = [
      user_id,
      title,
      amount,
      transaction_date,
      type,
      category_id,
      payment_method,
      credit_card_id,
      savings_goal_id,
      recurring_payment_id,
      comment,
    ]

    const result = await pool.query(query, values)
    return result.rows[0]
  },

  /**
   * Get all transactions for a user with optional filters
   * @param {String} userId - User ID
   * @param {Object} filters - Optional filters (type, category, date range, etc.)
   * @returns {Promise<Array>} - Array of transactions
   */
  async getAll(userId, filters = {}) {
    let query = `
      SELECT t.*, c.name as category_name, c.color as category_color
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1
    `

    const queryParams = [userId]
    let paramIndex = 2

    // Apply filters
    if (filters.type) {
      query += ` AND t.type = $${paramIndex}`
      queryParams.push(filters.type)
      paramIndex++
    }

    if (filters.category_id) {
      query += ` AND t.category_id = $${paramIndex}`
      queryParams.push(filters.category_id)
      paramIndex++
    }

    if (filters.start_date) {
      query += ` AND t.transaction_date >= $${paramIndex}`
      queryParams.push(filters.start_date)
      paramIndex++
    }

    if (filters.end_date) {
      query += ` AND t.transaction_date <= $${paramIndex}`
      queryParams.push(filters.end_date)
      paramIndex++
    }

    if (filters.payment_method) {
      query += ` AND t.payment_method = $${paramIndex}`
      queryParams.push(filters.payment_method)
      paramIndex++
    }

    if (filters.credit_card_id) {
      query += ` AND t.credit_card_id = $${paramIndex}`
      queryParams.push(filters.credit_card_id)
      paramIndex++
    }

    if (filters.savings_goal_id) {
      query += ` AND t.savings_goal_id = $${paramIndex}`
      queryParams.push(filters.savings_goal_id)
      paramIndex++
    }

    // Add sorting
    query += ` ORDER BY t.transaction_date DESC`

    // Add pagination
    if (filters.limit) {
      query += ` LIMIT $${paramIndex}`
      queryParams.push(filters.limit)
      paramIndex++

      if (filters.offset) {
        query += ` OFFSET $${paramIndex}`
        queryParams.push(filters.offset)
      }
    }

    const result = await pool.query(query, queryParams)
    return result.rows
  },

  /**
   * Get a transaction by ID
   * @param {String} id - Transaction ID
   * @param {String} userId - User ID (for authorization)
   * @returns {Promise<Object|null>} - Transaction or null
   */
  async getById(id, userId) {
    const query = `
      SELECT t.*, c.name as category_name, c.color as category_color
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.id = $1 AND t.user_id = $2
    `

    const result = await pool.query(query, [id, userId])
    return result.rows[0] || null
  },

  /**
   * Update a transaction
   * @param {String} id - Transaction ID
   * @param {String} userId - User ID (for authorization)
   * @param {Object} transactionData - Transaction data to update
   * @returns {Promise<Object|null>} - Updated transaction or null
   */
  async update(id, userId, transactionData) {
    const {
      title,
      amount,
      transaction_date,
      type,
      category_id,
      payment_method,
      credit_card_id,
      savings_goal_id,
      recurring_payment_id,
      comment,
    } = transactionData

    const query = `
      UPDATE transactions
      SET 
        title = COALESCE($1, title),
        amount = COALESCE($2, amount),
        transaction_date = COALESCE($3, transaction_date),
        type = COALESCE($4, type),
        category_id = COALESCE($5, category_id),
        payment_method = COALESCE($6, payment_method),
        credit_card_id = COALESCE($7, credit_card_id),
        savings_goal_id = COALESCE($8, savings_goal_id),
        recurring_payment_id = COALESCE($9, recurring_payment_id),
        comment = COALESCE($10, comment),
        updated_at = NOW()
      WHERE id = $11 AND user_id = $12
      RETURNING *
    `

    const values = [
      title,
      amount,
      transaction_date,
      type,
      category_id,
      payment_method,
      credit_card_id,
      savings_goal_id,
      recurring_payment_id,
      comment,
      id,
      userId,
    ]

    const result = await pool.query(query, values)
    return result.rows[0] || null
  },

  /**
   * Delete a transaction
   * @param {String} id - Transaction ID
   * @param {String} userId - User ID (for authorization)
   * @returns {Promise<Boolean>} - Success status
   */
  async delete(id, userId) {
    const query = `
      DELETE FROM transactions
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `

    const result = await pool.query(query, [id, userId])
    return result.rows.length > 0
  },

  /**
   * Get monthly summary for a user
   * @param {String} userId - User ID
   * @param {Number} year - Year (optional)
   * @param {Number} month - Month (optional)
   * @returns {Promise<Array>} - Monthly summary data
   */
  async getMonthlySummary(userId, year = null, month = null) {
    let query = `
      SELECT * FROM monthly_summary
      WHERE user_id = $1
    `

    const queryParams = [userId]
    let paramIndex = 2

    if (year) {
      query += ` AND year = $${paramIndex}`
      queryParams.push(year)
      paramIndex++

      if (month) {
        query += ` AND month = $${paramIndex}`
        queryParams.push(month)
      }
    }

    query += ` ORDER BY year DESC, month DESC`

    const result = await pool.query(query, queryParams)
    return result.rows
  },

  /**
   * Get transactions by credit card ID
   * @param {String} creditCardId - Credit card ID
   * @param {String} userId - User ID (for authorization)
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} - Array of transactions
   */
  async getByCardId(creditCardId, userId, filters = {}) {
    let query = `
      SELECT t.*, c.name as category_name, c.color as category_color
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.credit_card_id = $1 AND t.user_id = $2
    `

    const queryParams = [creditCardId, userId]
    let paramIndex = 3

    // Apply filters
    if (filters.year) {
      query += ` AND EXTRACT(YEAR FROM t.transaction_date) = $${paramIndex}`
      queryParams.push(filters.year)
      paramIndex++

      if (filters.month) {
        query += ` AND EXTRACT(MONTH FROM t.transaction_date) = $${paramIndex}`
        queryParams.push(filters.month)
      }
    }

    query += ` ORDER BY t.transaction_date DESC`

    const result = await pool.query(query, queryParams)
    return result.rows
  },
}

module.exports = TransactionModel

