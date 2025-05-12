const db = require('../config/database');
const { getPaginationParams, paginatedResponse } = require('../utils/helpers');

const notificationModel = {
  /**
   * Create notification
   * @param {Object} notificationData - Notification data
   * @returns {Object} Created notification
   */
  async create(notificationData) {
    const { 
      user_id, title, description, type, 
      related_id, related_type 
    } = notificationData;
    
    const query = `
      INSERT INTO finance.notifications (
        user_id, title, description, type, 
        related_id, related_type
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const values = [
      user_id, title, description, type,
      related_id || null, related_type || null
    ];
    
    const result = await db.query(query, values);
    return result.rows[0];
  },
  
  /**
   * Get notifications for user
   * @param {string} userId - User ID
   * @param {Object} filters - Filter options
   * @param {Object} query - Query parameters for pagination
   * @returns {Object} Notifications with pagination
   */
  async getNotifications(userId, filters = {}, query = {}) {
    const { page, limit, offset } = getPaginationParams(query);
    
    // Build WHERE clauses based on filters
    const whereConditions = ['user_id = $1'];
    const queryParams = [userId];
    let paramIndex = 2;
    
    if (filters.type) {
      whereConditions.push(`type = $${paramIndex}`);
      queryParams.push(filters.type);
      paramIndex++;
    }
    
    if (filters.is_read !== undefined) {
      whereConditions.push(`is_read = $${paramIndex}`);
      queryParams.push(filters.is_read);
      paramIndex++;
    }
    
    // Count total records
    const countQuery = `
      SELECT COUNT(*) 
      FROM finance.notifications
      WHERE ${whereConditions.join(' AND ')}
    `;
    
    const countResult = await db.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count, 10);
    
    // Get paginated data
    const dataQuery = `
      SELECT *
      FROM finance.notifications
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY notification_date DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(limit, offset);
    const dataResult = await db.query(dataQuery, queryParams);
    
    return paginatedResponse(dataResult.rows, total, { page, limit });
  },
  
  /**
   * Get notification by ID
   * @param {string} id - Notification ID
   * @param {string} userId - User ID
   * @returns {Object} Notification
   */
  async getNotificationById(id, userId) {
    const query = `
      SELECT *
      FROM finance.notifications
      WHERE id = $1 AND user_id = $2
    `;
    
    const result = await db.query(query, [id, userId]);
    return result.rows[0] || null;
  },
  
  /**
   * Mark notification as read
   * @param {string} id - Notification ID
   * @param {string} userId - User ID
   * @returns {Object} Updated notification
   */
  async markAsRead(id, userId) {
    const query = `
      UPDATE finance.notifications
      SET is_read = TRUE
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;
    
    const result = await db.query(query, [id, userId]);
    return result.rows[0] || null;
  },
  
  /**
   * Mark all notifications as read
   * @param {string} userId - User ID
   * @returns {number} Number of updated notifications
   */
  async markAllAsRead(userId) {
    const query = `
      UPDATE finance.notifications
      SET is_read = TRUE
      WHERE user_id = $1 AND is_read = FALSE
      RETURNING id
    `;
    
    const result = await db.query(query, [userId]);
    return result.rows.length;
  },
  
  /**
   * Delete notification
   * @param {string} id - Notification ID
   * @param {string} userId - User ID
   * @returns {boolean} Success
   */
  async delete(id, userId) {
    const query = `
      DELETE FROM finance.notifications
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;
    
    const result = await db.query(query, [id, userId]);
    return result.rows.length > 0;
  },
  
  /**
   * Delete all read notifications
   * @param {string} userId - User ID
   * @returns {number} Number of deleted notifications
   */
  async deleteAllRead(userId) {
    const query = `
      DELETE FROM finance.notifications
      WHERE user_id = $1 AND is_read = TRUE
      RETURNING id
    `;
    
    const result = await db.query(query, [userId]);
    return result.rows.length;
  },
  
  /**
   * Get unread notification count
   * @param {string} userId - User ID
   * @returns {number} Unread count
   */
  async getUnreadCount(userId) {
    const query = `
      SELECT COUNT(*) as count
      FROM finance.notifications
      WHERE user_id = $1 AND is_read = FALSE
    `;
    
    const result = await db.query(query, [userId]);
    return parseInt(result.rows[0].count, 10);
  }
};

module.exports = notificationModel;