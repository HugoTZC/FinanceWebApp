const db = require('../config/database');

const creditModel = {
  /**
   * Create credit card
   * @param {Object} cardData - Credit card data
   * @returns {Object} Created credit card
   */
  async createCreditCard(cardData) {
    const { 
      user_id, name, last_four, card_type, balance, 
      credit_limit, interest_rate, due_date, min_payment 
    } = cardData;
    
    const query = `
      INSERT INTO public.credit_cards (
        user_id, name, last_four, card_type, balance, 
        credit_limit, interest_rate, due_date, min_payment
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const values = [
      user_id, name, last_four, card_type || null, balance || 0,
      credit_limit, interest_rate, due_date, min_payment
    ];
    
    const result = await db.query(query, values);
    return result.rows[0];
  },
  
  /**
   * Get credit cards for user
   * @param {string} userId - User ID
   * @returns {Array} Credit cards
   */
  async getCreditCards(userId) {
    const query = `
      SELECT *
      FROM public.credit_cards
      WHERE user_id = $1
      ORDER BY name
    `;
    
    const result = await db.query(query, [userId]);
    return result.rows;
  },
  
  /**
   * Get credit card by ID
   * @param {string} id - Credit card ID
   * @param {string} userId - User ID
   * @returns {Object} Credit card
   */
  async getCreditCardById(id, userId) {
    const query = `
      SELECT *
      FROM public.credit_cards
      WHERE id = $1 AND user_id = $2
    `;
    
    const result = await db.query(query, [id, userId]);
    return result.rows[0] || null;
  },
  
  /**
   * Update credit card
   * @param {string} id - Credit card ID
   * @param {string} userId - User ID
   * @param {Object} cardData - Credit card data to update
   * @returns {Object} Updated credit card
   */
  async updateCreditCard(id, userId, cardData) {
    const allowedFields = [
      'name', 'last_four', 'card_type', 'balance', 
      'credit_limit', 'interest_rate', 'due_date', 'min_payment'
    ];
    
    const updateFields = [];
    const values = [];
    
    // Build dynamic query based on provided fields
    let fieldIndex = 1;
    for (const [key, value] of Object.entries(cardData)) {
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
      UPDATE public.credit_cards
      SET ${updateFields.join(', ')}
      WHERE id = $${fieldIndex} AND user_id = $${fieldIndex + 1}
      RETURNING *
    `;
    
    const result = await db.query(query, values);
    return result.rows[0] || null;
  },
  
  /**
   * Delete credit card
   * @param {string} id - Credit card ID
   * @param {string} userId - User ID
   * @returns {boolean} Success
   */
  async deleteCreditCard(id, userId) {
    const query = `
      DELETE FROM public.credit_cards
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;
    
    const result = await db.query(query, [id, userId]);
    return result.rows.length > 0;
  },
  
  /**
   * Create loan
   * @param {Object} loanData - Loan data
   * @returns {Object} Created loan
   */
  async createLoan(loanData) {
    const { 
      user_id, name, loan_type, bank_number, original_amount,
      balance, interest_rate, term, monthly_payment, due_date,
      start_date, end_date
    } = loanData;
    
    const query = `
      INSERT INTO public.loans (
        user_id, name, loan_type, bank_number, original_amount,
        balance, interest_rate, term, monthly_payment, due_date,
        start_date, end_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    
    const values = [
      user_id, 
      name, 
      loan_type || 'personal', 
      bank_number || null, 
      original_amount || balance,  // Si no se proporciona monto original, usar el balance actual
      balance, 
      interest_rate, 
      term || null, 
      monthly_payment, 
      due_date,
      start_date || new Date().toISOString(),  // Usar fecha actual si no se proporciona
      end_date || null
    ];
    
    const result = await db.query(query, values);
    return result.rows[0];
  },
  
  /**
   * Get loans for user
   * @param {string} userId - User ID
   * @returns {Array} Loans
   */
  async getLoans(userId) {
    const query = `
      SELECT *
      FROM public.loans
      WHERE user_id = $1
      ORDER BY name
    `;
    
    const result = await db.query(query, [userId]);
    return result.rows;
  },
  
  /**
   * Get loan by ID
   * @param {string} id - Loan ID
   * @param {string} userId - User ID
   * @returns {Object} Loan
   */
  async getLoanById(id, userId) {
    const query = `
      SELECT *
      FROM public.loans
      WHERE id = $1 AND user_id = $2
    `;
    
    const result = await db.query(query, [id, userId]);
    return result.rows[0] || null;
  },
  
  /**
   * Update loan
   * @param {string} id - Loan ID
   * @param {string} userId - User ID
   * @param {Object} loanData - Loan data to update
   * @returns {Object} Updated loan
   */
  async updateLoan(id, userId, loanData) {
    const allowedFields = [
      'name', 'loan_type', 'bank_number', 'original_amount',
      'balance', 'interest_rate', 'term', 'monthly_payment', 
      'due_date', 'start_date', 'end_date'
    ];
    
    const updateFields = [];
    const values = [];
    
    // Build dynamic query based on provided fields
    let fieldIndex = 1;
    for (const [key, value] of Object.entries(loanData)) {
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
      UPDATE public.loans
      SET ${updateFields.join(', ')}
      WHERE id = $${fieldIndex} AND user_id = $${fieldIndex + 1}
      RETURNING *
    `;
    
    const result = await db.query(query, values);
    return result.rows[0] || null;
  },
  
  /**
   * Delete loan
   * @param {string} id - Loan ID
   * @param {string} userId - User ID
   * @returns {boolean} Success
   */
  async deleteLoan(id, userId) {
    const query = `
      DELETE FROM public.loans
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;
    
    const result = await db.query(query, [id, userId]);
    return result.rows.length > 0;
  },

  /**
   * Get credit card spending by category
   * @param {string} cardId - Credit card ID
   * @param {string} userId - User ID
   * @param {number} year - Year
   * @param {number} month - Month
   * @returns {Array} Spending by category
   */
  async getCardSpending(cardId, userId, year, month) {
    const query = `
      SELECT 
        COALESCE(c.name, uc.name) as category_name,
        SUM(t.amount) as amount
      FROM public.transactions t
      LEFT JOIN public.categories c ON t.category_id = c.id
      LEFT JOIN public.user_categories uc ON t.user_category_id = uc.id
      WHERE t.user_id = $1
        AND t.credit_card_id = $2
        AND t.type = 'expense'
        AND EXTRACT(YEAR FROM t.transaction_date) = $3
        AND EXTRACT(MONTH FROM t.transaction_date) = $4
      GROUP BY COALESCE(c.name, uc.name)
      ORDER BY amount DESC
    `;
    
    const result = await db.query(query, [userId, cardId, year, month]);
    return result.rows;
  },
  
  /**
   * Get credit card spending by category
   * @param {string} cardId - Credit card ID
   * @param {string} userId - User ID
   * @param {number} year - Year
   * @param {number} month - Month
   * @returns {Array} Spending by category
   */
  async getCardSpendingByCategory(cardId, userId, year, month) {
    const query = `
      SELECT 
        COALESCE(c.name, uc.name) as category_name,
        SUM(t.amount) as amount
      FROM public.transactions t
      LEFT JOIN public.categories c ON t.category_id = c.id
      LEFT JOIN public.user_categories uc ON t.user_category_id = uc.id
      WHERE t.user_id = $1
        AND t.credit_card_id = $2
        AND t.type = 'expense'
        AND EXTRACT(YEAR FROM t.transaction_date) = $3
        AND EXTRACT(MONTH FROM t.transaction_date) = $4
      GROUP BY COALESCE(c.name, uc.name)
      ORDER BY amount DESC
    `;
    
    const result = await db.query(query, [userId, cardId, year, month]);
    return result.rows;
  },
  
  /**
   * Get credit card monthly spending
   * @param {string} cardId - Credit card ID
   * @param {string} userId - User ID
   * @param {number} year - Year
   * @returns {Array} Monthly spending
   */
  async getCardMonthlySpending(cardId, userId, year) {
    const query = `
      WITH months AS (
        SELECT generate_series(1, 12) as month
      )
      SELECT 
        TO_CHAR(TO_DATE(m.month::text, 'MM'), 'Mon') as month,
        COALESCE(SUM(t.amount), 0) as amount
      FROM months m
      LEFT JOIN public.transactions t ON 
        EXTRACT(MONTH FROM t.transaction_date) = m.month
        AND EXTRACT(YEAR FROM t.transaction_date) = $3
        AND t.user_id = $1
        AND t.credit_card_id = $2
        AND t.type = 'expense'
      GROUP BY m.month
      ORDER BY m.month
    `;
    
    const result = await db.query(query, [userId, cardId, year]);
    return result.rows;
  }
};

module.exports = creditModel;