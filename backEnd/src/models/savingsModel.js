const db = require('../config/database');

const savingsModel = {
  /**
   * Create savings goal
   * @param {Object} goalData - Savings goal data
   * @returns {Object} Created savings goal
   */
  async createSavingsGoal(goalData) {
    const { 
      user_id, name, target_amount, current_amount, 
      start_date, target_date 
    } = goalData;
    
    const query = `
      INSERT INTO finance.savings_goals (
        user_id, name, target_amount, current_amount, 
        start_date, target_date
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const values = [
      user_id, name, target_amount, current_amount || 0,
      start_date || new Date(), target_date
    ];
    
    const result = await db.query(query, values);
    return result.rows[0];
  },
  
  /**
   * Get savings goals for user
   * @param {string} userId - User ID
   * @returns {Array} Savings goals
   */
  async getSavingsGoals(userId) {
    const query = `
      SELECT *
      FROM finance.savings_goals
      WHERE user_id = $1
      ORDER BY is_completed, target_date
    `;
    
    const result = await db.query(query, [userId]);
    return result.rows;
  },
  
  /**
   * Get savings goal by ID
   * @param {string} id - Savings goal ID
   * @param {string} userId - User ID
   * @returns {Object} Savings goal
   */
  async getSavingsGoalById(id, userId) {
    const query = `
      SELECT *
      FROM finance.savings_goals
      WHERE id = $1 AND user_id = $2
    `;
    
    const result = await db.query(query, [id, userId]);
    return result.rows[0] || null;
  },
  
  /**
   * Update savings goal
   * @param {string} id - Savings goal ID
   * @param {string} userId - User ID
   * @param {Object} goalData - Savings goal data to update
   * @returns {Object} Updated savings goal
   */
  async updateSavingsGoal(id, userId, goalData) {
    const allowedFields = [
      'name', 'target_amount', 'current_amount', 
      'start_date', 'target_date', 'is_completed'
    ];
    
    const updateFields = [];
    const values = [];
    
    // Build dynamic query based on provided fields
    let fieldIndex = 1;
    for (const [key, value] of Object.entries(goalData)) {
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
      UPDATE finance.savings_goals
      SET ${updateFields.join(', ')}
      WHERE id = $${fieldIndex} AND user_id = $${fieldIndex + 1}
      RETURNING *
    `;
    
    const result = await db.query(query, values);
    return result.rows[0] || null;
  },
  
  /**
   * Delete savings goal
   * @param {string} id - Savings goal ID
   * @param {string} userId - User ID
   * @returns {boolean} Success
   */
  async deleteSavingsGoal(id, userId) {
    const query = `
      DELETE FROM finance.savings_goals
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;
    
    const result = await db.query(query, [id, userId]);
    return result.rows.length > 0;
  },
  
  /**
   * Create recurring payment
   * @param {Object} paymentData - Recurring payment data
   * @returns {Object} Created recurring payment
   */
  async createRecurringPayment(paymentData) {
    const { 
      user_id, name, amount, current_amount, 
      due_date, frequency, category 
    } = paymentData;
    
    const query = `
      INSERT INTO finance.recurring_payments (
        user_id, name, amount, current_amount, 
        due_date, frequency, category
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      user_id, name, amount, current_amount || 0,
      due_date, frequency, category
    ];
    
    const result = await db.query(query, values);
    return result.rows[0];
  },
  
  /**
   * Get recurring payments for user
   * @param {string} userId - User ID
   * @returns {Array} Recurring payments
   */
  async getRecurringPayments(userId) {
    const query = `
      SELECT *
      FROM finance.recurring_payments
      WHERE user_id = $1
      ORDER BY due_date
    `;
    
    const result = await db.query(query, [userId]);
    return result.rows;
  },
  
  /**
   * Get recurring payment by ID
   * @param {string} id - Recurring payment ID
   * @param {string} userId - User ID
   * @returns {Object} Recurring payment
   */
  async getRecurringPaymentById(id, userId) {
    const query = `
      SELECT *
      FROM finance.recurring_payments
      WHERE id = $1 AND user_id = $2
    `;
    
    const result = await db.query(query, [id, userId]);
    return result.rows[0] || null;
  },
  
  /**
   * Update recurring payment
   * @param {string} id - Recurring payment ID
   * @param {string} userId - User ID
   * @param {Object} paymentData - Recurring payment data to update
   * @returns {Object} Updated recurring payment
   */
  async updateRecurringPayment(id, userId, paymentData) {
    const allowedFields = [
      'name', 'amount', 'current_amount', 
      'due_date', 'frequency', 'category'
    ];
    
    const updateFields = [];
    const values = [];
    
    // Build dynamic query based on provided fields
    let fieldIndex = 1;
    for (const [key, value] of Object.entries(paymentData)) {
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
      UPDATE finance.recurring_payments
      SET ${updateFields.join(', ')}
      WHERE id = $${fieldIndex} AND user_id = $${fieldIndex + 1}
      RETURNING *
    `;
    
    const result = await db.query(query, values);
    return result.rows[0] || null;
  },
  
  /**
   * Delete recurring payment
   * @param {string} id - Recurring payment ID
   * @param {string} userId - User ID
   * @returns {boolean} Success
   */
  async deleteRecurringPayment(id, userId) {
    const query = `
      DELETE FROM finance.recurring_payments
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;
    
    const result = await db.query(query, [id, userId]);
    return result.rows.length > 0;
  },
  
  /**
   * Get savings goal progress
   * @param {string} goalId - Savings goal ID
   * @param {string} userId - User ID
   * @returns {Object} Savings goal progress
   */
  async getSavingsGoalProgress(goalId, userId) {
    const query = `
      SELECT 
        sg.*,
        COALESCE(SUM(t.amount), 0) as total_contributions,
        COUNT(t.id) as contribution_count
      FROM finance.savings_goals sg
      LEFT JOIN finance.transactions t ON t.savings_goal_id = sg.id
      WHERE sg.id = $1 AND sg.user_id = $2
      GROUP BY sg.id
    `;
    
    const result = await db.query(query, [goalId, userId]);
    return result.rows[0] || null;
  },
  
  /**
   * Get recurring payment progress
   * @param {string} paymentId - Recurring payment ID
   * @param {string} userId - User ID
   * @returns {Object} Recurring payment progress
   */
  async getRecurringPaymentProgress(paymentId, userId) {
    const query = `
      SELECT 
        rp.*,
        COALESCE(SUM(t.amount), 0) as total_contributions,
        COUNT(t.id) as contribution_count
      FROM finance.recurring_payments rp
      LEFT JOIN finance.transactions t ON t.recurring_payment_id = rp.id
      WHERE rp.id = $1 AND rp.user_id = $2
      GROUP BY rp.id
    `;
    
    const result = await db.query(query, [paymentId, userId]);
    return result.rows[0] || null;
  }
};

module.exports = savingsModel;