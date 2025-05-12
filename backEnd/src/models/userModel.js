const db = require('../config/database');
const bcrypt = require('bcryptjs');
const { AppError } = require('../utils/helpers');

const userModel = {
  /**
   * Create a new user
   * @param {Object} userData - User data
   * @returns {Object} Created user
   */
  async create(userData) {
    const { email, password, first_name, last_name, second_last_name, nickname } = userData;
    console.log('Creating user:', userData);
    // Validate required fields
    if (!email || !password || !first_name || !last_name) {
      throw new AppError('Missing required fields', 400);
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    
    const query = `
      INSERT INTO finance.users (email, password_hash, first_name, last_name, second_last_name, nickname)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, first_name, last_name, second_last_name, nickname, created_at
    `;
    
    const values = [email, password_hash, first_name, last_name, second_last_name || null, nickname || null];
    
    try {
      const result = await db.query(query, values);
      console.log('User created:', result.rows[0]);
      // Create user settings with defaults
      await db.query(
        'INSERT INTO finance.user_settings (user_id) VALUES ($1)',
        [result.rows[0].id]
      );
      
      // Create notification preferences with defaults
      await db.query(
        'INSERT INTO finance.notification_preferences (user_id) VALUES ($1)',
        [result.rows[0].id]
      );
      
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new AppError('Email already in use', 400);
      }
      throw error;
    }
  },
  
  /**
   * Find user by ID
   * @param {string} id - User ID
   * @returns {Object} User
   */
  async findById(id) {
    const query = `
      SELECT id, email, first_name, last_name, second_last_name, nickname, avatar_url, created_at, updated_at
      FROM finance.users
      WHERE id = $1
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  },
  
  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Object} User
   */
  async findByEmail(email) {
    const query = `
      SELECT id, email, password_hash, first_name, last_name, second_last_name, nickname, avatar_url, created_at, updated_at
      FROM finance.users
      WHERE email = $1
    `;
    
    const result = await db.query(query, [email]);
    return result.rows[0] || null;
  },
  
  /**
   * Update user
   * @param {string} id - User ID
   * @param {Object} userData - User data to update
   * @returns {Object} Updated user
   */
  async update(id, userData) {
    const allowedFields = ['first_name', 'last_name', 'second_last_name', 'nickname', 'avatar_url'];
    const updateFields = [];
    const values = [];
    
    // Build dynamic query based on provided fields
    let fieldIndex = 1;
    for (const [key, value] of Object.entries(userData)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = $${fieldIndex}`);
        values.push(value);
        fieldIndex++;
      }
    }
    
    if (updateFields.length === 0) {
      throw new AppError('No valid fields to update', 400);
    }
    
    values.push(id);
    
    const query = `
      UPDATE finance.users
      SET ${updateFields.join(', ')}
      WHERE id = $${fieldIndex}
      RETURNING id, email, first_name, last_name, second_last_name, nickname, avatar_url, created_at, updated_at
    `;
    
    const result = await db.query(query, values);
    return result.rows[0];
  },
  
  /**
   * Update user password
   * @param {string} id - User ID
   * @param {string} newPassword - New password
   * @returns {boolean} Success
   */
  async updatePassword(id, newPassword) {
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(newPassword, salt);
    
    const query = `
      UPDATE finance.users
      SET password_hash = $1
      WHERE id = $2
    `;
    
    await db.query(query, [password_hash, id]);
    return true;
  },
  
  /**
   * Get user settings
   * @param {string} userId - User ID
   * @returns {Object} User settings
   */
  async getSettings(userId) {
    const query = `
      SELECT user_id, language, currency, theme, created_at, updated_at
      FROM finance.user_settings
      WHERE user_id = $1
    `;
    
    const result = await db.query(query, [userId]);
    return result.rows[0] || null;
  },
  
  /**
   * Update user settings
   * @param {string} userId - User ID
   * @param {Object} settings - Settings to update
   * @returns {Object} Updated settings
   */
  async updateSettings(userId, settings) {
    const allowedFields = ['language', 'currency', 'theme'];
    const updateFields = [];
    const values = [];
    
    // Build dynamic query based on provided fields
    let fieldIndex = 1;
    for (const [key, value] of Object.entries(settings)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = $${fieldIndex}`);
        values.push(value);
        fieldIndex++;
      }
    }
    
    if (updateFields.length === 0) {
      throw new AppError('No valid fields to update', 400);
    }
    
    values.push(userId);
    
    const query = `
      UPDATE finance.user_settings
      SET ${updateFields.join(', ')}
      WHERE user_id = $${fieldIndex}
      RETURNING user_id, language, currency, theme, created_at, updated_at
    `;
    
    const result = await db.query(query, values);
    return result.rows[0];
  },
  
  /**
   * Get notification preferences
   * @param {string} userId - User ID
   * @returns {Object} Notification preferences
   */
  async getNotificationPreferences(userId) {
    const query = `
      SELECT *
      FROM finance.notification_preferences
      WHERE user_id = $1
    `;
    
    const result = await db.query(query, [userId]);
    return result.rows[0] || null;
  },
  
  /**
   * Update notification preferences
   * @param {string} userId - User ID
   * @param {Object} preferences - Preferences to update
   * @returns {Object} Updated preferences
   */
  async updateNotificationPreferences(userId, preferences) {
    const allowedFields = [
      'budget_email', 'payment_email', 'savings_email', 'credit_email',
      'budget_push', 'payment_push', 'savings_push', 'credit_push'
    ];
    
    const updateFields = [];
    const values = [];
    
    // Build dynamic query based on provided fields
    let fieldIndex = 1;
    for (const [key, value] of Object.entries(preferences)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = $${fieldIndex}`);
        values.push(value);
        fieldIndex++;
      }
    }
    
    if (updateFields.length === 0) {
      throw new AppError('No valid fields to update', 400);
    }
    
    values.push(userId);
    
    const query = `
      UPDATE finance.notification_preferences
      SET ${updateFields.join(', ')}
      WHERE user_id = $${fieldIndex}
      RETURNING *
    `;
    
    const result = await db.query(query, values);
    return result.rows[0];
  },
  
  /**
   * Delete user
   * @param {string} id - User ID
   * @returns {boolean} Success
   */
  async delete(id) {
    // Note: This will cascade delete all user data due to foreign key constraints
    const query = `
      DELETE FROM finance.users
      WHERE id = $1
    `;
    
    await db.query(query, [id]);
    return true;
  },
  
  /**
   * Compare password
   * @param {string} candidatePassword - Password to compare
   * @param {string} hashedPassword - Stored hashed password
   * @returns {boolean} Match result
   */
  async comparePassword(candidatePassword, hashedPassword) {
    console.log('🔍 Comparing password with hash:');
    console.log('📝 Candidate password:', candidatePassword);
    console.log('🔒 Stored hash:', hashedPassword);
    const result = await bcrypt.compare(candidatePassword, hashedPassword);
    console.log('✅ Password comparison result:', result);
    return result;
  }
};

module.exports = userModel;