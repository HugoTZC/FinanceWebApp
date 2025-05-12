const db = require('../config/database');

const categoryModel = {
  /**
   * Get all default categories
   * @returns {Array} Categories
   */
  async getDefaultCategories() {
    const query = `
      SELECT *
      FROM finance.categories
      WHERE is_default = TRUE
      ORDER BY name
    `;
    
    const result = await db.query(query);
    return result.rows;
  },
  
  /**
   * Get category by ID
   * @param {string} id - Category ID
   * @returns {Object} Category
   */
  async findById(id) {
    const query = `
      SELECT *
      FROM finance.categories
      WHERE id = $1
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  },
  
  /**
   * Create user category
   * @param {Object} categoryData - Category data
   * @returns {Object} Created category
   */
  async createUserCategory(categoryData) {
    const { user_id, name, type, category_group, icon, color } = categoryData;
    
    const query = `
      INSERT INTO finance.user_categories (user_id, name, type, category_group, icon, color)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const values = [user_id, name, type, category_group, icon || null, color || null];
    
    const result = await db.query(query, values);
    return result.rows[0];
  },
  
  /**
   * Get user categories
   * @param {string} userId - User ID
   * @returns {Array} User categories
   */
  async getUserCategories(userId) {
    const query = `
      SELECT *
      FROM finance.user_categories
      WHERE user_id = $1
      ORDER BY name
    `;
    
    const result = await db.query(query, [userId]);
    return result.rows;
  },
  
  /**
   * Get user category by ID
   * @param {string} id - Category ID
   * @param {string} userId - User ID
   * @returns {Object} Category
   */
  async findUserCategoryById(id, userId) {
    const query = `
      SELECT *
      FROM finance.user_categories
      WHERE id = $1 AND user_id = $2
    `;
    
    const result = await db.query(query, [id, userId]);
    return result.rows[0] || null;
  },
  
  /**
   * Update user category
   * @param {string} id - Category ID
   * @param {string} userId - User ID
   * @param {Object} categoryData - Category data to update
   * @returns {Object} Updated category
   */
  async updateUserCategory(id, userId, categoryData) {
    const allowedFields = ['name', 'type', 'category_group', 'icon', 'color'];
    const updateFields = [];
    const values = [];
    
    // Build dynamic query based on provided fields
    let fieldIndex = 1;
    for (const [key, value] of Object.entries(categoryData)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = $${fieldIndex}`);
        values.push(value);
        fieldIndex++;
      }
    }
    
    if (updateFields.length === 0) {
      return null;
    }
    
    values.push(id, userId);
    
    const query = `
      UPDATE finance.user_categories
      SET ${updateFields.join(', ')}
      WHERE id = $${fieldIndex} AND user_id = $${fieldIndex + 1}
      RETURNING *
    `;
    
    const result = await db.query(query, values);
    return result.rows[0] || null;
  },
  
  /**
   * Delete user category
   * @param {string} id - Category ID
   * @param {string} userId - User ID
   * @returns {boolean} Success
   */
  async deleteUserCategory(id, userId) {
    const query = `
      DELETE FROM finance.user_categories
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;
    
    const result = await db.query(query, [id, userId]);
    return result.rows.length > 0;
  },
  
  /**
   * Get all categories (default + user)
   * @param {string} userId - User ID
   * @returns {Array} All categories
   */
  async getAllCategories(userId) {
    const query = `
      SELECT id, name, type, category_group, icon, color, 'default' as source
      FROM finance.categories
      WHERE is_default = TRUE
      
      UNION ALL
      
      SELECT id, name, type, category_group, icon, color, 'user' as source
      FROM finance.user_categories
      WHERE user_id = $1
      
      ORDER BY name
    `;
    
    const result = await db.query(query, [userId]);
    return result.rows;
  },
  
  /**
   * Get categories by type
   * @param {string} userId - User ID
   * @param {string} type - Category type (income/expense)
   * @returns {Array} Categories of specified type
   */
  async getCategoriesByType(userId, type) {
    const query = `
      SELECT id, name, type, category_group, icon, color, 'default' as source
      FROM finance.categories
      WHERE is_default = TRUE AND type = $1
      
      UNION ALL
      
      SELECT id, name, type, category_group, icon, color, 'user' as source
      FROM finance.user_categories
      WHERE user_id = $2 AND type = $1
      
      ORDER BY name
    `;
    
    const result = await db.query(query, [type, userId]);
    return result.rows;
  }
};

module.exports = categoryModel;