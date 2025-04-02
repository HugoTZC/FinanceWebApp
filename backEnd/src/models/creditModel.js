const { pool } = require("../config/database")

/**
 * Credit model for database operations
 */
const CreditModel = {
  /**
   * Get all credit cards for a user
   * @param {String} userId - User ID
   * @returns {Promise<Array>} - Array of credit cards
   */
  async getCards(userId) {
    const query = `
      SELECT * FROM credit_cards
      WHERE user_id = $1
      ORDER BY name
    `

    const result = await pool.query(query, [userId])
    return result.rows
  },

  /**
   * Get a credit card by ID
   * @param {String} id - Credit card ID
   * @param {String} userId - User ID (for authorization)
   * @returns {Promise<Object|null>} - Credit card or null
   */
  async getCardById(id, userId) {
    const query = `
      SELECT * FROM credit_cards
      WHERE id = $1 AND user_id = $2
    `

    const result = await pool.query(query, [id, userId])
    return result.rows[0] || null
  },

  /**
   * Add a new credit card
   * @param {Object} cardData - Credit card data
   * @returns {Promise<Object>} - Created credit card
   */
  async addCard(cardData) {
    const { user_id, name, last_four, balance, credit_limit, due_date, min_payment, interest_rate } = cardData

    const query = `
      INSERT INTO credit_cards (
        user_id, name, last_four, balance, credit_limit, due_date, min_payment, interest_rate
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `

    const values = [user_id, name, last_four, balance || 0, credit_limit, due_date, min_payment, interest_rate]

    const result = await pool.query(query, values)
    return result.rows[0]
  },

  /**
   * Update a credit card
   * @param {String} id - Credit card ID
   * @param {String} userId - User ID (for authorization)
   * @param {Object} cardData - Credit card data to update
   * @returns {Promise<Object|null>} - Updated credit card or null
   */
  async updateCard(id, userId, cardData) {
    const { name, last_four, balance, credit_limit, due_date, min_payment, interest_rate } = cardData

    const query = `
      UPDATE credit_cards
      SET 
        name = COALESCE($1, name),
        last_four = COALESCE($2, last_four),
        balance = COALESCE($3, balance),
        credit_limit = COALESCE($4, credit_limit),
        due_date = COALESCE($5, due_date),
        min_payment = COALESCE($6, min_payment),
        interest_rate = COALESCE($7, interest_rate),
        updated_at = NOW()
      WHERE id = $8 AND user_id = $9
      RETURNING *
    `

    const values = [name, last_four, balance, credit_limit, due_date, min_payment, interest_rate, id, userId]

    const result = await pool.query(query, values)
    return result.rows[0] || null
  },

  /**
   * Delete a credit card
   * @param {String} id - Credit card ID
   * @param {String} userId - User ID (for authorization)
   * @returns {Promise<Boolean>} - Success status
   */
  async deleteCard(id, userId) {
    const query = `
      DELETE FROM credit_cards
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `

    const result = await pool.query(query, [id, userId])
    return result.rows.length > 0
  },

  /**
   * Get all loans for a user
   * @param {String} userId - User ID
   * @returns {Promise<Array>} - Array of loans
   */
  async getLoans(userId) {
    const query = `
      SELECT * FROM loans
      WHERE user_id = $1
      ORDER BY name
    `

    const result = await pool.query(query, [userId])
    return result.rows
  },

  /**
   * Get a loan by ID
   * @param {String} id - Loan ID
   * @param {String} userId - User ID (for authorization)
   * @returns {Promise<Object|null>} - Loan or null
   */
  async getLoanById(id, userId) {
    const query = `
      SELECT * FROM loans
      WHERE id = $1 AND user_id = $2
    `

    const result = await pool.query(query, [id, userId])
    return result.rows[0] || null
  },

  /**
   * Add a new loan
   * @param {Object} loanData - Loan data
   * @returns {Promise<Object>} - Created loan
   */
  async addLoan(loanData) {
    const { user_id, name, bank_number, balance, original_amount, interest_rate, monthly_payment, due_date, term } =
      loanData

    const query = `
      INSERT INTO loans (
        user_id, name, bank_number, balance, original_amount, interest_rate, monthly_payment, due_date, term
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `

    const values = [
      user_id,
      name,
      bank_number,
      balance,
      original_amount,
      interest_rate,
      monthly_payment,
      due_date,
      term,
    ]

    const result = await pool.query(query, values)
    return result.rows[0]
  },

  /**
   * Update a loan
   * @param {String} id - Loan ID
   * @param {String} userId - User ID (for authorization)
   * @param {Object} loanData - Loan data to update
   * @returns {Promise<Object|null>} - Updated loan or null
   */
  async updateLoan(id, userId, loanData) {
    const { name, bank_number, balance, original_amount, interest_rate, monthly_payment, due_date, term } = loanData

    const query = `
      UPDATE loans
      SET 
        name = COALESCE($1, name),
        bank_number = COALESCE($2, bank_number),
        balance = COALESCE($3, balance),
        original_amount = COALESCE($4, original_amount),
        interest_rate = COALESCE($5, interest_rate),
        monthly_payment = COALESCE($6, monthly_payment),
        due_date = COALESCE($7, due_date),
        term = COALESCE($8, term),
        updated_at = NOW()
      WHERE id = $9 AND user_id = $10
      RETURNING *
    `

    const values = [
      name,
      bank_number,
      balance,
      original_amount,
      interest_rate,
      monthly_payment,
      due_date,
      term,
      id,
      userId,
    ]

    const result = await pool.query(query, values)
    return result.rows[0] || null
  },

  /**
   * Delete a loan
   * @param {String} id - Loan ID
   * @param {String} userId - User ID (for authorization)
   * @returns {Promise<Boolean>} - Success status
   */
  async deleteLoan(id, userId) {
    const query = `
      DELETE FROM loans
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `

    const result = await pool.query(query, [id, userId])
    return result.rows.length > 0
  },

  /**
   * Get credit card spending
   * @param {String} cardId - Credit card ID
   * @param {String} userId - User ID (for authorization)
   * @param {Number} year - Year (optional)
   * @param {Number} month - Month (optional)
   * @returns {Promise<Array>} - Credit card spending data
   */
  async getCardSpending(cardId, userId, year = null, month = null) {
    let query = `
      SELECT * FROM credit_card_spending
      WHERE credit_card_id = $1 AND user_id = $2
    `

    const queryParams = [cardId, userId]
    let paramIndex = 3

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
   * Get credit card spending by category
   * @param {String} cardId - Credit card ID
   * @param {String} userId - User ID (for authorization)
   * @param {Number} year - Year
   * @param {Number} month - Month
   * @returns {Promise<Array>} - Credit card category spending data
   */
  async getCardSpendingByCategory(cardId, userId, year, month) {
    const query = `
      SELECT * FROM credit_card_category_spending
      WHERE credit_card_id = $1 AND user_id = $2 AND year = $3 AND month = $4
      ORDER BY total_amount DESC
    `

    const result = await pool.query(query, [cardId, userId, year, month])
    return result.rows
  },

  /**
   * Get credit card monthly spending
   * @param {String} cardId - Credit card ID
   * @param {String} userId - User ID (for authorization)
   * @param {Number} year - Year
   * @returns {Promise<Array>} - Credit card monthly spending data
   */
  async getCardMonthlySpending(cardId, userId, year) {
    const query = `
      SELECT * FROM credit_card_spending
      WHERE credit_card_id = $1 AND user_id = $2 AND year = $3
      ORDER BY month
    `

    const result = await pool.query(query, [cardId, userId, year])
    return result.rows
  },
}

module.exports = CreditModel

