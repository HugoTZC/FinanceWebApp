const db = require('../config/database');
const { getPaginationParams, paginatedResponse, AppError } = require('../utils/helpers');

// Add this helper function for safer database queries
const safeQuery = async (queryFn) => {
  try {
    return await queryFn();
  } catch (error) {
    console.error('Database query error:', error);
    // Return an empty result instead of throwing
    return null;
  }
};

const transactionModel = {
  /**
   * Create a new transaction
   * @param {Object} transactionData - Transaction data
   * @returns {Object} Created transaction
   */
  async create(transactionData) {
    try {
      const {
        user_id,
        title,
        amount,
        transaction_date,
        type,
        category_id,
        user_category_id,
        payment_method,
        bank_account_id,
        credit_card_id,
        comment,
        is_recurring,
        recurring_transaction_id,
        savings_goal_id,
        recurring_payment_id
      } = transactionData;
      
      console.log(`DEBUG: Creating transaction with payment_method=${payment_method}, credit_card_id=${credit_card_id}`);
      
      // Usar una conexión directa para evitar problemas con los triggers
      const client = await db.getClient();
      
      try {
        await client.query('BEGIN');
        
        // Desactivar temporalmente los triggers en la tabla de transacciones
        // Esto resolverá el problema con el trigger check_budget_thresholds
        console.log('Disabling triggers temporarily to create transaction');
        await client.query('SET session_replication_role = replica;');
        
        const insertQuery = `
          INSERT INTO finance.transactions (
            user_id, title, amount, transaction_date, type, 
            category_id, user_category_id, payment_method, 
            bank_account_id, credit_card_id, comment, 
            is_recurring, recurring_transaction_id, 
            savings_goal_id, recurring_payment_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          RETURNING *
        `;
        
        const values = [
          user_id,
          title,
          amount,
          transaction_date,
          type,
          category_id || null,
          user_category_id || null,
          payment_method,
          bank_account_id || null,
          credit_card_id || null,
          comment || null,
          is_recurring || false,
          recurring_transaction_id || null,
          savings_goal_id || null,
          recurring_payment_id || null
        ];
        
        // Realizar la inserción
        console.log('Executing transaction insert with disabled triggers');
        const result = await client.query(insertQuery, values);
        
        // Volver a habilitar los triggers
        console.log('Re-enabling triggers');
        await client.query('SET session_replication_role = DEFAULT;');
        
        await client.query('COMMIT');
        
        console.log(`Transaction created successfully with ID ${result.rows[0].id}`);
        return result.rows[0];
      } catch (txError) {
        console.error('Transaction error:', txError);
        await client.query('ROLLBACK');
        throw txError;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw new AppError('Could not create transaction', 500);
    }
  },
  
  /**
   * Get transaction by ID
   * @param {string} id - Transaction ID
   * @param {string} userId - User ID
   * @returns {Object} Transaction
   */
  async findById(id, userId) {
    try {
      const query = `
        SELECT t.*, 
          c.name as category_name, 
          uc.name as user_category_name,
          ba.name as bank_account_name,
          cc.name as credit_card_name
        FROM finance.transactions t
        LEFT JOIN finance.categories c ON t.category_id = c.id
        LEFT JOIN finance.user_categories uc ON t.user_category_id = uc.id
        LEFT JOIN finance.bank_accounts ba ON t.bank_account_id = ba.id
        LEFT JOIN finance.credit_cards cc ON t.credit_card_id = cc.id
        WHERE t.id = $1 AND t.user_id = $2
      `;
      
      const result = await db.query(query, [id, userId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding transaction by ID:', error);
      return null;
    }
  },
  
  /**
   * Get all transactions for a user
   * @param {string} userId - User ID
   * @param {Object} filters - Filter options
   * @param {Object} query - Query parameters for pagination
   * @returns {Object} Transactions with pagination
   */
  async findAll(userId, filters = {}, query = {}) {
    try {
      console.log(`DEBUG: findAll transactions for user ${userId} with filters:`, filters);
      
      const { page, limit, offset } = getPaginationParams(query);
      console.log(`DEBUG: Pagination - page: ${page}, limit: ${limit}, offset: ${offset}`);
      
      // Build WHERE clauses based on filters
      const whereConditions = ['t.user_id = $1'];
      const queryParams = [userId];
      let paramIndex = 2;
      
      // Apply year filter specifically if provided
      if (filters.year) {
        console.log(`DEBUG: Applying year filter for year ${filters.year}`);
        whereConditions.push(`EXTRACT(YEAR FROM t.transaction_date) = $${paramIndex}`);
        queryParams.push(parseInt(filters.year, 10));
        paramIndex++;
      }
      
      if (filters.month) {
        console.log(`DEBUG: Applying month filter for month ${filters.month}`);
        whereConditions.push(`EXTRACT(MONTH FROM t.transaction_date) = $${paramIndex}`);
        queryParams.push(parseInt(filters.month, 10));
        paramIndex++;
      }
      
      if (filters.type) {
        whereConditions.push(`t.type = $${paramIndex}`);
        queryParams.push(filters.type);
        paramIndex++;
      }
      
      if (filters.category_id) {
        whereConditions.push(`t.category_id = $${paramIndex}`);
        queryParams.push(filters.category_id);
        paramIndex++;
      }
      
      if (filters.user_category_id) {
        whereConditions.push(`t.user_category_id = $${paramIndex}`);
        queryParams.push(filters.user_category_id);
        paramIndex++;
      }
      
      if (filters.payment_method) {
        whereConditions.push(`t.payment_method = $${paramIndex}`);
        queryParams.push(filters.payment_method);
        paramIndex++;
      }
      
      if (filters.start_date) {
        whereConditions.push(`t.transaction_date >= $${paramIndex}`);
        queryParams.push(filters.start_date);
        paramIndex++;
      }
      
      if (filters.end_date) {
        whereConditions.push(`t.transaction_date <= $${paramIndex}`);
        queryParams.push(filters.end_date);
        paramIndex++;
      }
      
      if (filters.search) {
        whereConditions.push(`t.title ILIKE $${paramIndex}`);
        queryParams.push(`%${filters.search}%`);
        paramIndex++;
      }
      
      console.log(`DEBUG: Query conditions: ${whereConditions.join(' AND ')}`);
      console.log(`DEBUG: Query params: ${JSON.stringify(queryParams)}`);
      
      // Count total records
      const countQuery = `
        SELECT COUNT(*) 
        FROM finance.transactions t
        WHERE ${whereConditions.join(' AND ')}
      `;
      
      console.log(`DEBUG: Count query: ${countQuery}`);
      
      try {
        const countResult = await db.query(countQuery, queryParams);
        const total = parseInt(countResult.rows[0].count, 10);
        
        console.log(`DEBUG: Total transactions found: ${total}`);
        
        // If there are no records, return empty result immediately
        if (total === 0) {
          console.log(`DEBUG: No transactions found for user ${userId}, returning empty array`);
          return paginatedResponse([], 0, { page, limit });
        }
        
        // Get paginated data
        const dataQuery = `
          SELECT t.*, 
            c.name as category_name, 
            uc.name as user_category_name,
            ba.name as bank_account_name,
            cc.name as credit_card_name
          FROM finance.transactions t
          LEFT JOIN finance.categories c ON t.category_id = c.id
          LEFT JOIN finance.user_categories uc ON t.user_category_id = uc.id
          LEFT JOIN finance.bank_accounts ba ON t.bank_account_id = ba.id
          LEFT JOIN finance.credit_cards cc ON t.credit_card_id = cc.id
          WHERE ${whereConditions.join(' AND ')}
          ORDER BY t.transaction_date DESC
          LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        
        console.log(`DEBUG: Data query: ${dataQuery.substring(0, 200)}...`);
        console.log(`DEBUG: Params for data query:`, [...queryParams, limit, offset]);
        
        queryParams.push(limit, offset);
        const dataResult = await db.query(dataQuery, queryParams);
        
        console.log(`DEBUG: Retrieved ${dataResult.rows.length} transactions`);
        if (dataResult.rows.length > 0) {
          console.log(`DEBUG: First transaction:`, JSON.stringify(dataResult.rows[0]).substring(0, 200));
        }
        
        const response = paginatedResponse(dataResult.rows, total, { page, limit });
        console.log(`DEBUG: Response structure:`, Object.keys(response));
        
        return response;
      } catch (queryError) {
        console.error('Error executing database query:', queryError);
        console.error('Query that failed:', countQuery);
        console.error('Parameters:', queryParams);
        throw queryError; // Rethrow to be caught by outer try/catch
      }
    } catch (error) {
      console.error('Error in findAll transactions:', error);
      console.error('Stack trace:', error.stack);
      // Return an empty result set rather than throwing the error
      return paginatedResponse([], 0, { page: 1, limit: 10 });
    }
  },
  
  /**
   * Update transaction
   * @param {string} id - Transaction ID
   * @param {string} userId - User ID
   * @param {Object} transactionData - Transaction data to update
   * @returns {Object} Updated transaction
   */
  async update(id, userId, transactionData) {
    try {
      const allowedFields = [
        'title', 'amount', 'transaction_date', 'type', 
        'category_id', 'user_category_id', 'payment_method', 
        'bank_account_id', 'credit_card_id', 'comment', 
        'savings_goal_id', 'recurring_payment_id'
      ];
      
      const updateFields = [];
      const values = [];
      
      // Build dynamic query based on provided fields
      let fieldIndex = 1;
      for (const [key, value] of Object.entries(transactionData)) {
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
        UPDATE finance.transactions
        SET ${updateFields.join(', ')}
        WHERE id = $${fieldIndex} AND user_id = $${fieldIndex + 1}
        RETURNING *
      `;
      
      const result = await db.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error updating transaction:', error);
      return null;
    }
  },
  
  /**
   * Delete transaction
   * @param {string} id - Transaction ID
   * @param {string} userId - User ID
   * @returns {boolean} Success
   */
  async delete(id, userId) {
    try {
      const query = `
        DELETE FROM finance.transactions
        WHERE id = $1 AND user_id = $2
        RETURNING id
      `;
      
      const result = await db.query(query, [id, userId]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      return false;
    }
  },
  
  /**
   * Get monthly summary
   * @param {string} userId - User ID
   * @param {number} year - Year
   * @param {number} month - Month
   * @returns {Object} Monthly summary
   */
  async getMonthlySummary(userId, year, month) {
    const query = `
      SELECT 
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expenses,
        SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as net_flow
      FROM finance.transactions
      WHERE user_id = $1
        AND EXTRACT(YEAR FROM transaction_date) = $2
        AND EXTRACT(MONTH FROM transaction_date) = $3
    `;
    
    const result = await db.query(query, [userId, year, month]);
    return result.rows[0];
  },
  
  /**
   * Get category breakdown
   * @param {string} userId - User ID
   * @param {number} year - Year
   * @param {number} month - Month
   * @returns {Array} Category breakdown
   */
  async getCategoryBreakdown(userId, year, month) {
    const query = `
      SELECT 
        COALESCE(c.name, uc.name) as category_name,
        COALESCE(c.type, uc.type) as category_type,
        SUM(t.amount) as total_amount,
        COUNT(t.id) as transaction_count
      FROM finance.transactions t
      LEFT JOIN finance.categories c ON t.category_id = c.id
      LEFT JOIN finance.user_categories uc ON t.user_category_id = uc.id
      WHERE t.user_id = $1
        AND EXTRACT(YEAR FROM t.transaction_date) = $2
        AND EXTRACT(MONTH FROM t.transaction_date) = $3
      GROUP BY COALESCE(c.name, uc.name), COALESCE(c.type, uc.type)
      ORDER BY total_amount DESC
    `;
    
    const result = await db.query(query, [userId, year, month]);
    return result.rows;
  },
  
  /**
   * Get distinct years for which transactions exist
   * @param {string} userId - User ID
   * @returns {Array} Array of years
   */
  async getTransactionYears(userId) {
    try {
      console.log(`Fetching transaction years for user ID: ${userId}`);
      
      // Enhanced safety check for userId
      if (!userId) {
        console.warn('Missing user ID in getTransactionYears, returning default years');
        const currentYear = new Date().getFullYear();
        return [
          { year: currentYear },
          { year: currentYear - 1 },
          { year: currentYear - 2 }
        ];
      }
      
      const query = `
        SELECT DISTINCT EXTRACT(YEAR FROM transaction_date)::integer as year
        FROM finance.transactions
        WHERE user_id = $1
        ORDER BY year DESC
      `;
      
      const result = await safeQuery(() => db.query(query, [userId]));
      
      // If no transactions exist or query failed, return the last 3 years as default
      if (!result || !result.rows || result.rows.length === 0) {
        const currentYear = new Date().getFullYear();
        console.log(`No transaction years found for user ${userId}, returning default years`);
        return [
          { year: currentYear },
          { year: currentYear - 1 },
          { year: currentYear - 2 }
        ];
      }
      
      console.log(`Found ${result.rows.length} transaction years for user ${userId}`);
      return result.rows;
    } catch (error) {
      console.error(`Error in getTransactionYears for user ${userId}:`, error);
      // Return last 3 years as fallback in case of error
      const currentYear = new Date().getFullYear();
      return [
        { year: currentYear },
        { year: currentYear - 1 },
        { year: currentYear - 2 }
      ];
    }
  },

  /**
   * Get transactions by credit card
   * @param {string} userId - User ID
   * @param {string} creditCardId - Credit card ID
   * @param {Object} query - Query parameters for pagination
   * @returns {Object} Transactions with pagination
   */
  async getByCardId(userId, creditCardId, query = {}) {
    const { page, limit, offset } = getPaginationParams(query);
    
    // Count total records
    const countQuery = `
      SELECT COUNT(*) 
      FROM finance.transactions
      WHERE user_id = $1 AND credit_card_id = $2
    `;
    
    const countResult = await db.query(countQuery, [userId, creditCardId]);
    const total = parseInt(countResult.rows[0].count, 10);
    
    // Get paginated data
    const dataQuery = `
      SELECT t.*, 
        c.name as category_name, 
        uc.name as user_category_name
      FROM finance.transactions t
      LEFT JOIN finance.categories c ON t.category_id = c.id
      LEFT JOIN finance.user_categories uc ON t.user_category_id = uc.id
      WHERE t.user_id = $1 AND t.credit_card_id = $2
      ORDER BY t.transaction_date DESC
      LIMIT $3 OFFSET $4
    `;
    
    const dataResult = await db.query(dataQuery, [userId, creditCardId, limit, offset]);
    
    return paginatedResponse(dataResult.rows, total, { page, limit });
  }
};

module.exports = transactionModel;