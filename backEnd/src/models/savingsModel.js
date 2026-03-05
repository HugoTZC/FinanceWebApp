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
      INSERT INTO public.savings_goals (
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
      FROM public.savings_goals
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
      FROM public.savings_goals
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
      UPDATE public.savings_goals
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
      DELETE FROM public.savings_goals
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
      INSERT INTO public.recurring_payments (
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
      FROM public.recurring_payments
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
      FROM public.recurring_payments
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
      UPDATE public.recurring_payments
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
      DELETE FROM public.recurring_payments
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
    // Fetch the savings goal
    const goalResult = await db.query(
      'SELECT * FROM public.savings_goals WHERE id = $1 AND user_id = $2',
      [goalId, userId]
    );

    if (goalResult.rows.length === 0) return null;

    const goal = goalResult.rows[0];

    // Fetch related transactions
    const txResult = await db.query(
      'SELECT * FROM public.transactions WHERE savings_goal_id = $1',
      [goalId]
    );

    const totalContributions = txResult.rows.reduce(
      (sum, t) => sum + parseFloat(t.amount || 0), 0
    );
    const contributionCount = txResult.rows.length;

    return {
      ...goal,
      total_contributions: totalContributions,
      contribution_count: contributionCount
    };
  },
  
  /**
   * Get recurring payment progress
   * @param {string} paymentId - Recurring payment ID
   * @param {string} userId - User ID
   * @returns {Object} Recurring payment progress
   */
  async getRecurringPaymentProgress(paymentId, userId) {
    // Fetch the recurring payment
    const paymentResult = await db.query(
      'SELECT * FROM public.recurring_payments WHERE id = $1 AND user_id = $2',
      [paymentId, userId]
    );

    if (paymentResult.rows.length === 0) return null;

    const payment = paymentResult.rows[0];

    // Fetch related transactions
    const txResult = await db.query(
      'SELECT * FROM public.transactions WHERE recurring_payment_id = $1',
      [paymentId]
    );

    const totalContributions = txResult.rows.reduce(
      (sum, t) => sum + parseFloat(t.amount || 0), 0
    );
    const contributionCount = txResult.rows.length;

    return {
      ...payment,
      total_contributions: totalContributions,
      contribution_count: contributionCount
    };
  }
};

module.exports = savingsModel;