const { pool } = require("../config/database")
const bcrypt = require("bcryptjs")

/**
 * User model for database operations
 */
const UserModel = {
  /**
   * Create a new user
   * @param {Object} userData - User data (email, password, full_name)
   * @returns {Promise<Object>} - Created user
   */
  async create(userData) {
    const { email, password, full_name } = userData

    // Hash password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    const query = `
      INSERT INTO users (email, password_hash, full_name)
      VALUES ($1, $2, $3)
      RETURNING id, email, full_name, preferred_currency, preferred_language, preferred_theme, created_at
    `

    const result = await pool.query(query, [email, hashedPassword, full_name])
    return result.rows[0]
  },

  /**
   * Find a user by email
   * @param {String} email - User email
   * @returns {Promise<Object|null>} - User object or null
   */
  async findByEmail(email) {
    const query = `
      SELECT id, email, password_hash, full_name, preferred_currency, preferred_language, preferred_theme
      FROM users
      WHERE email = $1
    `

    const result = await pool.query(query, [email])
    return result.rows[0] || null
  },

  /**
   * Find a user by ID
   * @param {String} id - User ID
   * @returns {Promise<Object|null>} - User object or null
   */
  async findById(id) {
    const query = `
      SELECT id, email, full_name, preferred_currency, preferred_language, preferred_theme, created_at, updated_at
      FROM users
      WHERE id = $1
    `

    const result = await pool.query(query, [id])
    return result.rows[0] || null
  },

  /**
   * Update user profile
   * @param {String} id - User ID
   * @param {Object} userData - User data to update
   * @returns {Promise<Object>} - Updated user
   */
  async update(id, userData) {
    const { full_name, preferred_currency, preferred_language, preferred_theme, avatar_url } = userData

    const query = `
      UPDATE users
      SET 
        full_name = COALESCE($1, full_name),
        preferred_currency = COALESCE($2, preferred_currency),
        preferred_language = COALESCE($3, preferred_language),
        preferred_theme = COALESCE($4, preferred_theme),
        avatar_url = COALESCE($5, avatar_url),
        updated_at = NOW()
      WHERE id = $6
      RETURNING id, email, full_name, preferred_currency, preferred_language, preferred_theme, avatar_url, created_at, updated_at
    `

    const result = await pool.query(query, [
      full_name,
      preferred_currency,
      preferred_language,
      preferred_theme,
      avatar_url,
      id,
    ])

    return result.rows[0]
  },

  /**
   * Change user password
   * @param {String} id - User ID
   * @param {String} newPassword - New password
   * @returns {Promise<Boolean>} - Success status
   */
  async changePassword(id, newPassword) {
    // Hash password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(newPassword, salt)

    const query = `
      UPDATE users
      SET password_hash = $1, updated_at = NOW()
      WHERE id = $2
    `

    await pool.query(query, [hashedPassword, id])
    return true
  },

  /**
   * Compare password with stored hash
   * @param {String} password - Plain password
   * @param {String} hashedPassword - Stored hashed password
   * @returns {Promise<Boolean>} - Whether passwords match
   */
  async comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword)
  },
}

module.exports = UserModel

