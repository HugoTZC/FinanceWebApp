const db = require('../config/database');

const accountModel = {
  /**
   * Create bank account
   * @param {Object} accountData - Bank account data
   * @returns {Object} Created bank account
   */
  async createBankAccount(accountData) {
    const { user_id, name, account_number, account_type, balance, is_default } = accountData;
    
    const query = `
      INSERT INTO finance.bank_accounts (user_id, name, account_number, account_type, balance, is_default)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const values = [
      user_id, 
      name, 
      account_number || null, 
      account_type, 
      balance || 0, 
      is_default || false
    ];
    
    const result = await db.query(query, values);
    
    // If this is the default account, update other accounts
    if (is_default) {
      await db.query(
        `UPDATE finance.bank_accounts 
         SET is_default = FALSE 
         WHERE user_id = $1 AND id != $2`,
        [user_id, result.rows[0].id]
      );
    }
    
    return result.rows[0];
  },
  
  /**
   * Get bank accounts for user
   * @param {string} userId - User ID
   * @returns {Array} Bank accounts
   */
  async getBankAccounts(userId) {
    const query = `
      SELECT *
      FROM finance.bank_accounts
      WHERE user_id = $1
      ORDER BY is_default DESC, name
    `;
    
    const result = await db.query(query, [userId]);
    return result.rows;
  },
  
  /**
   * Get bank account by ID
   * @param {string} id - Bank account ID
   * @param {string} userId - User ID
   * @returns {Object} Bank account
   */
  async getBankAccountById(id, userId) {
    const query = `
      SELECT *
      FROM finance.bank_accounts
      WHERE id = $1 AND user_id = $2
    `;
    
    const result = await db.query(query, [id, userId]);
    return result.rows[0] || null;
  },
  
  /**
   * Update bank account
   * @param {string} id - Bank account ID
   * @param {string} userId - User ID
   * @param {Object} accountData - Bank account data to update
   * @returns {Object} Updated bank account
   */
  async updateBankAccount(id, userId, accountData) {
    const allowedFields = ['name', 'account_number', 'account_type', 'balance', 'is_default'];
    const updateFields = [];
    const values = [];
    
    // Build dynamic query based on provided fields
    let fieldIndex = 1;
    for (const [key, value] of Object.entries(accountData)) {
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
      UPDATE finance.bank_accounts
      SET ${updateFields.join(', ')}
      WHERE id = $${fieldIndex} AND user_id = $${fieldIndex + 1}
      RETURNING *
    `;
    
    const result = await db.query(query, values);
    
    // If this is the default account, update other accounts
    if (accountData.is_default) {
      await db.query(
        `UPDATE finance.bank_accounts 
         SET is_default = FALSE 
         WHERE user_id = $1 AND id != $2`,
        [userId, id]
      );
    }
    
    return result.rows[0] || null;
  },
  
  /**
   * Delete bank account
   * @param {string} id - Bank account ID
   * @param {string} userId - User ID
   * @returns {boolean} Success
   */
  async deleteBankAccount(id, userId) {
    const query = `
      DELETE FROM finance.bank_accounts
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;
    
    const result = await db.query(query, [id, userId]);
    return result.rows.length > 0;
  },
  
  /**
   * Get account balance history
   * @param {string} accountId - Bank account ID
   * @param {string} userId - User ID
   * @param {number} months - Number of months to look back
   * @returns {Array} Balance history
   */
  async getAccountBalanceHistory(accountId, userId, months = 6) {
    const query = `
      WITH monthly_transactions AS (
        SELECT
          DATE_TRUNC('month', t.transaction_date) as month,
          SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END) as net_change
        FROM finance.transactions t
        WHERE t.user_id = $1 
          AND t.bank_account_id = $2
          AND t.transaction_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '${months} months'
        GROUP BY DATE_TRUNC('month', t.transaction_date)
      ),
      months AS (
        SELECT generate_series(
          DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '${months - 1} months',
          DATE_TRUNC('month', CURRENT_DATE),
          '1 month'::interval
        ) as month
      )
      SELECT 
        TO_CHAR(m.month, 'YYYY-MM') as month,
        COALESCE(mt.net_change, 0) as net_change
      FROM months m
      LEFT JOIN monthly_transactions mt ON m.month = mt.month
      ORDER BY m.month
    `;
    
    const result = await db.query(query, [userId, accountId]);
    return result.rows;
  }
};

module.exports = accountModel;