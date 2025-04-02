const { pool } = require("../config/database")

/**
 * Category model for database operations
 */
const CategoryModel = {
  /**
   * Get all categories for a user
   * @param {String} userId - User ID
   * @param {String} type - Category type (income, expense, or null for all)
   * @returns {Promise<Array>} - Array of categories
   */
  async getAll(userId, type = null) {
    let query = `
      SELECT * FROM categories
      WHERE user_id = $1
    `

    const queryParams = [userId]

    if (type) {
      query += ` AND type = $2`
      queryParams.push(type)
    }

    query += ` ORDER BY name`

    const result = await pool.query(query, queryParams)
    return result.rows
  },

  /**
   * Get a category by ID
   * @param {String} id - Category ID
   * @param {String} userId - User ID (for authorization)
   * @returns {Promise<Object|null>} - Category or null
   */
  async getById(id, userId) {
    const query = `
      SELECT * FROM categories
      WHERE id = $1 AND user_id = $2
    `

    const result = await pool.query(query, [id, userId])
    return result.rows[0] || null
  },

  /**
   * Create a new category
   * @param {Object} categoryData - Category data
   * @returns {Promise<Object>} - Created category
   */
  async create(categoryData) {
    const { user_id, name, color, type } = categoryData

    const query = `
      INSERT INTO categories (user_id, name, color, type)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `

    const result = await pool.query(query, [user_id, name, color, type])
    return result.rows[0]
  },

  /**
   * Update a category
   * @param {String} id - Category ID
   * @param {String} userId - User ID (for authorization)
   * @param {Object} categoryData - Category data to update
   * @returns {Promise<Object|null>} - Updated category or null
   */
  async update(id, userId, categoryData) {
    const { name, color, type } = categoryData

    const query = `
      UPDATE categories
      SET 
        name = COALESCE($1, name),
        color = COALESCE($2, color),
        type = COALESCE($3, type),
        updated_at = NOW()
      WHERE id = $4 AND user_id = $5
      RETURNING *
    `

    const result = await pool.query(query, [name, color, type, id, userId])
    return result.rows[0] || null
  },

  /**
   * Delete a category
   * @param {String} id - Category ID
   * @param {String} userId - User ID (for authorization)
   * @returns {Promise<Boolean>} - Success status
   */
  async delete(id, userId) {
    // Check if it's a default category
    const checkQuery = `
      SELECT is_default FROM categories
      WHERE id = $1 AND user_id = $2
    `

    const checkResult = await pool.query(checkQuery, [id, userId])

    if (checkResult.rows.length === 0) {
      return false
    }

    if (checkResult.rows[0].is_default) {
      throw new Error("Cannot delete default category")
    }

    const query = `
      DELETE FROM categories
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `

    const result = await pool.query(query, [id, userId])
    return result.rows.length > 0
  },

  /**
   * Get category spending for a user
   * @param {String} userId - User ID
   * @param {Number} year - Year
   * @param {Number} month - Month
   * @returns {Promise<Array>} - Category spending data
   */
  async getCategorySpending(userId, year, month) {
    const query = `
      SELECT * FROM category_spending
      WHERE user_id = $1 AND year = $2 AND month = $3
      ORDER BY total_amount DESC
    `

    const result = await pool.query(query, [userId, year, month])
    return result.rows
  },
}

module.exports = CategoryModel

