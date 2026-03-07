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
   * Get recent credit card transactions
   * @param {string} cardId - Credit card ID
   * @param {string} userId - User ID
   * @param {number} year - Year
   * @param {number} month - Month
   * @returns {Array} Recent transactions
   */
  async getRecentTransactions(cardId, userId, year, month) {
    // Fetch transactions for this user + credit card
    const txResult = await db.query(
      'SELECT * FROM public.transactions WHERE user_id = $1 AND credit_card_id = $2 ORDER BY transaction_date DESC',
      [userId, cardId]
    );

    // Fetch categories and user_categories for name lookup
    const catsResult = await db.query('SELECT * FROM public.categories', []);
    const userCatsResult = await db.query(
      'SELECT * FROM public.user_categories WHERE user_id = $1',
      [userId]
    );

    const catMap = {};
    for (const c of catsResult.rows) catMap[c.id] = c.name;
    const userCatMap = {};
    for (const uc of userCatsResult.rows) userCatMap[uc.id] = uc.name;

    // Filter by year and month if provided
    let filtered = txResult.rows;
    if (year && month) {
      filtered = txResult.rows.filter(t => {
        const txDate = new Date(t.transaction_date);
        return txDate.getFullYear() === Number(year) &&
          (txDate.getMonth() + 1) === Number(month);
      });
    }

    // Add category names to each transaction
    return filtered.map(t => ({
      ...t,
      category_name: (t.category_id && catMap[t.category_id]) ||
        (t.user_category_id && userCatMap[t.user_category_id]) ||
        'Uncategorized'
    }));
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
    // Fetch transactions for this user + credit card
    const txResult = await db.query(
      'SELECT * FROM public.transactions WHERE user_id = $1 AND credit_card_id = $2',
      [userId, cardId]
    );

    // Fetch categories and user_categories for name lookup
    const catsResult = await db.query('SELECT * FROM public.categories', []);
    const userCatsResult = await db.query(
      'SELECT * FROM public.user_categories WHERE user_id = $1',
      [userId]
    );

    const catMap = {};
    for (const c of catsResult.rows) catMap[c.id] = c.name;
    const userCatMap = {};
    for (const uc of userCatsResult.rows) userCatMap[uc.id] = uc.name;

    // Filter by year, month, and type='expense'
    const filtered = txResult.rows.filter(t => {
      const txDate = new Date(t.transaction_date);
      return t.type === 'expense' &&
        txDate.getFullYear() === Number(year) &&
        (txDate.getMonth() + 1) === Number(month);
    });

    // Group by category name and sum amounts
    const spending = {};
    for (const t of filtered) {
      const categoryName = (t.category_id && catMap[t.category_id]) ||
        (t.user_category_id && userCatMap[t.user_category_id]) ||
        'Uncategorized';
      spending[categoryName] = (spending[categoryName] || 0) + parseFloat(t.amount || 0);
    }

    // Convert to array and sort by amount descending
    return Object.entries(spending)
      .map(([category_name, amount]) => ({ category_name, amount }))
      .sort((a, b) => b.amount - a.amount);
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
    // Fetch transactions for this user + credit card
    const txResult = await db.query(
      'SELECT * FROM public.transactions WHERE user_id = $1 AND credit_card_id = $2',
      [userId, cardId]
    );

    // Fetch categories and user_categories for name lookup
    const catsResult = await db.query('SELECT * FROM public.categories', []);
    const userCatsResult = await db.query(
      'SELECT * FROM public.user_categories WHERE user_id = $1',
      [userId]
    );

    const catMap = {};
    for (const c of catsResult.rows) catMap[c.id] = c.name;
    const userCatMap = {};
    for (const uc of userCatsResult.rows) userCatMap[uc.id] = uc.name;

    // Filter by year, month (if provided), and type='expense'
    const filtered = txResult.rows.filter(t => {
      const txDate = new Date(t.transaction_date);
      const yearMatch = txDate.getFullYear() === Number(year);
      const monthMatch = !month || (txDate.getMonth() + 1) === Number(month);
      return t.type === 'expense' && yearMatch && monthMatch;
    });

    // Group by category name and sum amounts
    const spending = {};
    for (const t of filtered) {
      const categoryName = (t.category_id && catMap[t.category_id]) ||
        (t.user_category_id && userCatMap[t.user_category_id]) ||
        'Uncategorized';
      spending[categoryName] = (spending[categoryName] || 0) + parseFloat(t.amount || 0);
    }

    // Convert to array and sort by amount descending
    return Object.entries(spending)
      .map(([category_name, amount]) => ({ category_name, amount }))
      .sort((a, b) => b.amount - a.amount);
  },
  
  /**
   * Get credit card monthly spending
   * @param {string} cardId - Credit card ID
   * @param {string} userId - User ID
   * @param {number} year - Year
   * @returns {Array} Monthly spending
   */
  async getCardMonthlySpending(cardId, userId, year) {
    // Fetch all transactions for this user + credit card
    const txResult = await db.query(
      'SELECT * FROM public.transactions WHERE user_id = $1 AND credit_card_id = $2',
      [userId, cardId]
    );

    // Filter by year and type='expense'
    const filtered = txResult.rows.filter(t => {
      const txDate = new Date(t.transaction_date);
      return t.type === 'expense' && txDate.getFullYear() === Number(year);
    });

    // Group by month
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlySpending = new Array(12).fill(0);
    for (const t of filtered) {
      const txDate = new Date(t.transaction_date);
      monthlySpending[txDate.getMonth()] += parseFloat(t.amount || 0);
    }

    // Return all 12 months, filling missing with 0
    return monthlySpending.map((amount, i) => ({
      month: monthNames[i],
      amount
    }));
  }
};

module.exports = creditModel;