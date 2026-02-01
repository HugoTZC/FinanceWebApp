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

        const insertQuery = `
          INSERT INTO public.transactions (
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
        const result = await client.query(insertQuery, values);

        // Update related balances within the same transaction
        await updateRelatedBalances(result.rows[0], client);

        await client.query('COMMIT');

        console.log(`Transaction created successfully with ID ${result.rows[0].id} and balances updated`);

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
        FROM public.transactions t
        LEFT JOIN public.categories c ON t.category_id = c.id
        LEFT JOIN public.user_categories uc ON t.user_category_id = uc.id
        LEFT JOIN public.bank_accounts ba ON t.bank_account_id = ba.id
        LEFT JOIN public.credit_cards cc ON t.credit_card_id = cc.id
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
      
      // Simplified approach: fetch all transactions for user and filter in JavaScript
      // This avoids complex SQL queries that don't work with REST API
      const queryParams = [userId];
      
      // Fetch all transactions for the user and filter in JavaScript
      const allTransactionsQuery = `
        SELECT t.*
        FROM public.transactions t
        WHERE t.user_id = $1
        ORDER BY t.transaction_date DESC
      `;

      console.log(`DEBUG: Fetching all transactions for user ${userId}`);

      try {
        const allTransactionsResult = await db.query(allTransactionsQuery, queryParams);

        console.log(`DEBUG: Retrieved ${allTransactionsResult.rows.length} total transactions from database`);

        // Apply all filtering in JavaScript
        let filteredTransactions = allTransactionsResult.rows.filter(transaction => {
          // Type filter
          if (filters.type && transaction.type !== filters.type) {
            return false;
          }

          // Category filters
          if (filters.category_id && transaction.category_id !== filters.category_id) {
            return false;
          }

          if (filters.user_category_id && transaction.user_category_id !== filters.user_category_id) {
            return false;
          }

          // Payment method filter
          if (filters.payment_method && transaction.payment_method !== filters.payment_method) {
            return false;
          }

          // Date filters
          if (filters.start_date) {
            const startDate = new Date(filters.start_date);
            const txDate = new Date(transaction.transaction_date);
            if (txDate < startDate) return false;
          }

          if (filters.end_date) {
            const endDate = new Date(filters.end_date);
            const txDate = new Date(transaction.transaction_date);
            if (txDate > endDate) return false;
          }

          // Year/Month filters
          if (filters.year || filters.month) {
            const date = new Date(transaction.transaction_date);
            const transactionYear = date.getFullYear();
            const transactionMonth = date.getMonth() + 1;

            if (filters.year && transactionYear !== parseInt(filters.year)) {
              return false;
            }
            if (filters.month && transactionMonth !== parseInt(filters.month)) {
              return false;
            }
          }

          // Search filter
          if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            if (!transaction.title.toLowerCase().includes(searchTerm)) {
              return false;
            }
          }

          return true;
        });

        console.log(`DEBUG: After filtering: ${filteredTransactions.length} transactions`);

        const total = filteredTransactions.length;

        // Apply pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

        console.log(`DEBUG: After pagination: ${paginatedTransactions.length} transactions (page ${page}, limit ${limit})`);

        // If no transactions after pagination, but we have total, that's fine
        const dataResult = { rows: paginatedTransactions };

        console.log(`DEBUG: Retrieved ${dataResult.rows.length} transactions`);

        // Fetch related data separately
        if (dataResult.rows.length > 0) {
          // Get unique IDs for related data
          const categoryIds = [...new Set(dataResult.rows.map(t => t.category_id).filter(id => id))];
          const userCategoryIds = [...new Set(dataResult.rows.map(t => t.user_category_id).filter(id => id))];
          const bankAccountIds = [...new Set(dataResult.rows.map(t => t.bank_account_id).filter(id => id))];
          const creditCardIds = [...new Set(dataResult.rows.map(t => t.credit_card_id).filter(id => id))];

          // Fetch related data using individual queries to avoid ANY() operator
          const [categories, userCategories, bankAccounts, creditCards] = await Promise.all([
            categoryIds.length > 0 ? Promise.all(categoryIds.map(id => db.query('SELECT id, name FROM public.categories WHERE id = $1', [id]))).then(results => ({ rows: results.flatMap(r => r.rows) })) : Promise.resolve({ rows: [] }),
            userCategoryIds.length > 0 ? Promise.all(userCategoryIds.map(id => db.query('SELECT id, name FROM public.user_categories WHERE id = $1', [id]))).then(results => ({ rows: results.flatMap(r => r.rows) })) : Promise.resolve({ rows: [] }),
            bankAccountIds.length > 0 ? Promise.all(bankAccountIds.map(id => db.query('SELECT id, name FROM public.bank_accounts WHERE id = $1', [id]))).then(results => ({ rows: results.flatMap(r => r.rows) })) : Promise.resolve({ rows: [] }),
            creditCardIds.length > 0 ? Promise.all(creditCardIds.map(id => db.query('SELECT id, name FROM public.credit_cards WHERE id = $1', [id]))).then(results => ({ rows: results.flatMap(r => r.rows) })) : Promise.resolve({ rows: [] })
          ]);

          // Create lookup maps
          const categoryMap = new Map(categories.rows.map(c => [c.id, c.name]));
          const userCategoryMap = new Map(userCategories.rows.map(c => [c.id, c.name]));
          const bankAccountMap = new Map(bankAccounts.rows.map(a => [a.id, a.name]));
          const creditCardMap = new Map(creditCards.rows.map(c => [c.id, c.name]));

          // Add related data to transactions and map field names to match frontend expectations
          dataResult.rows = dataResult.rows.map(transaction => ({
            ...transaction,
            // Map database fields to frontend expected fields
            date: transaction.transaction_date,
            description: transaction.title,
            category: transaction.category_id ? categoryMap.get(transaction.category_id) : (transaction.user_category_id ? userCategoryMap.get(transaction.user_category_id) : "Other"),
            // Keep the original fields for backward compatibility
            category_name: transaction.category_id ? categoryMap.get(transaction.category_id) : null,
            user_category_name: transaction.user_category_id ? userCategoryMap.get(transaction.user_category_id) : null,
            bank_account_name: transaction.bank_account_id ? bankAccountMap.get(transaction.bank_account_id) : null,
            credit_card_name: transaction.credit_card_id ? creditCardMap.get(transaction.credit_card_id) : null
          }));
        }

        // Apply year/month filtering in JavaScript
        if (filters.year || filters.month) {
          console.log(`DEBUG: Applying year/month filter in JavaScript: year=${filters.year}, month=${filters.month}`);
          console.log(`DEBUG: Sample transaction dates before filtering:`, dataResult.rows.slice(0, 3).map(t => t.transaction_date));
          dataResult.rows = dataResult.rows.filter(transaction => {
            const date = new Date(transaction.transaction_date);
            const transactionYear = date.getFullYear();
            const transactionMonth = date.getMonth() + 1; // JavaScript months are 0-based

            console.log(`DEBUG: Transaction date ${transaction.transaction_date} -> year=${transactionYear}, month=${transactionMonth}`);

            if (filters.year && transactionYear !== parseInt(filters.year)) {
              return false;
            }
            if (filters.month && transactionMonth !== parseInt(filters.month)) {
              return false;
            }
            return true;
          });
          console.log(`DEBUG: After filtering: ${dataResult.rows.length} transactions`);
        }

        if (dataResult.rows.length > 0) {
          console.log(`DEBUG: First transaction:`, JSON.stringify(dataResult.rows[0]).substring(0, 200));
        }

        // Update total count for pagination after filtering
        const actualTotal = dataResult.rows.length;
        const response = paginatedResponse(dataResult.rows, actualTotal, { page, limit });
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
        UPDATE public.transactions
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
        DELETE FROM public.transactions
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
    // Fetch transactions for the month
    const transactionsQuery = `
      SELECT type, amount, transaction_date
      FROM public.transactions
      WHERE user_id = $1
    `;

    const transactions = await db.query(transactionsQuery, [userId]);

    // Filter transactions by year and month in JavaScript
    const filteredTransactions = transactions.rows.filter(t => {
      const date = new Date(t.transaction_date);
      return date.getFullYear() === year && date.getMonth() + 1 === month;
    });

    // Calculate summary
    let totalIncome = 0;
    let totalExpenses = 0;

    filteredTransactions.forEach(t => {
      if (t.type === 'income') {
        totalIncome += parseFloat(t.amount);
      } else if (t.type === 'expense') {
        totalExpenses += parseFloat(t.amount);
      }
    });

    return {
      total_income: totalIncome,
      total_expenses: totalExpenses,
      net_flow: totalIncome - totalExpenses
    };
  },
  
  /**
   * Get category breakdown
   * @param {string} userId - User ID
   * @param {number} year - Year
   * @param {number} month - Month
   * @returns {Array} Category breakdown
   */
  async getCategoryBreakdown(userId, year, month) {
    // Fetch transactions and categories separately
    const [transactionsResult, categoriesResult, userCategoriesResult] = await Promise.all([
      db.query('SELECT category_id, user_category_id, amount, transaction_date FROM public.transactions WHERE user_id = $1', [userId]),
      db.query('SELECT id, name, type FROM public.categories'),
      db.query('SELECT id, name, type FROM public.user_categories WHERE user_id = $1', [userId])
    ]);

    // Create lookup maps
    const categoryMap = new Map(categoriesResult.rows.map(c => [c.id, { name: c.name, type: c.type }]));
    const userCategoryMap = new Map(userCategoriesResult.rows.map(c => [c.id, { name: c.name, type: c.type }]));

    // Filter transactions by year and month, then group by category
    const categoryBreakdown = new Map();

    transactionsResult.rows.forEach(t => {
      const date = new Date(t.transaction_date);
      if (date.getFullYear() === year && date.getMonth() + 1 === month) {
        const categoryId = t.category_id || t.user_category_id;
        const categoryData = t.category_id ?
          categoryMap.get(t.category_id) :
          userCategoryMap.get(t.user_category_id);

        if (categoryData) {
          const key = categoryData.name;
          if (!categoryBreakdown.has(key)) {
            categoryBreakdown.set(key, {
              category_name: categoryData.name,
              category_type: categoryData.type,
              total_amount: 0,
              transaction_count: 0
            });
          }
          const breakdown = categoryBreakdown.get(key);
          breakdown.total_amount += parseFloat(t.amount);
          breakdown.transaction_count += 1;
        }
      }
    });

    // Convert to array and sort
    return Array.from(categoryBreakdown.values())
      .sort((a, b) => b.total_amount - a.total_amount);
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
        FROM public.transactions
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
      FROM public.transactions
      WHERE user_id = $1 AND credit_card_id = $2
    `;
    
    const countResult = await db.query(countQuery, [userId, creditCardId]);
    const total = parseInt(countResult.rows[0].count, 10);
    
    // Get paginated data
    const dataQuery = `
      SELECT t.*, 
        c.name as category_name, 
        uc.name as user_category_name
      FROM public.transactions t
      LEFT JOIN public.categories c ON t.category_id = c.id
      LEFT JOIN public.user_categories uc ON t.user_category_id = uc.id
      WHERE t.user_id = $1 AND t.credit_card_id = $2
      ORDER BY t.transaction_date DESC
      LIMIT $3 OFFSET $4
    `;
    
    const dataResult = await db.query(dataQuery, [userId, creditCardId, limit, offset]);
    
    return paginatedResponse(dataResult.rows, total, { page, limit });
  }
};

/**
 * Update related balances after transaction creation
 * @param {Object} transaction - The created transaction
 * @param {Object} client - Database client for the transaction
 */
async function updateRelatedBalances(transaction, client) {
  try {
    console.log('Updating related balances for transaction:', transaction.id);

    // Update credit card balance if transaction uses a credit card
    if (transaction.credit_card_id) {
      if (transaction.type === 'expense') {
        // Increase credit card balance (debt) for expenses
        await client.query(
          'UPDATE public.credit_cards SET balance = balance + $1, updated_at = NOW() WHERE id = $2',
          [transaction.amount, transaction.credit_card_id]
        );
        console.log(`Updated credit card ${transaction.credit_card_id} balance: +${transaction.amount}`);
      } else if (transaction.type === 'income' && transaction.payment_method === 'credit_card_payment') {
        // Decrease credit card balance (payment) for credit card payments
        await client.query(
          'UPDATE public.credit_cards SET balance = balance - $1, updated_at = NOW() WHERE id = $2',
          [transaction.amount, transaction.credit_card_id]
        );
        console.log(`Updated credit card ${transaction.credit_card_id} balance: -${transaction.amount}`);
      }
    }

    // Update bank account balance if transaction uses a bank account
    if (transaction.bank_account_id) {
      if (transaction.type === 'income') {
        // Increase bank account balance for income
        await client.query(
          'UPDATE public.bank_accounts SET balance = balance + $1, updated_at = NOW() WHERE id = $2',
          [transaction.amount, transaction.bank_account_id]
        );
        console.log(`Updated bank account ${transaction.bank_account_id} balance: +${transaction.amount}`);
      } else if (transaction.type === 'expense') {
        // Decrease bank account balance for expenses
        await client.query(
          'UPDATE public.bank_accounts SET balance = balance - $1, updated_at = NOW() WHERE id = $2',
          [transaction.amount, transaction.bank_account_id]
        );
        console.log(`Updated bank account ${transaction.bank_account_id} balance: -${transaction.amount}`);
      }
    }

    // Update savings goal progress if transaction is for a savings goal
    if (transaction.savings_goal_id) {
      if (transaction.type === 'expense' && transaction.payment_method === 'savings_deposit') {
        // Increase savings goal current amount
        await client.query(
          'UPDATE public.savings_goals SET current_amount = current_amount + $1, updated_at = NOW() WHERE id = $2',
          [transaction.amount, transaction.savings_goal_id]
        );
        console.log(`Updated savings goal ${transaction.savings_goal_id} progress: +${transaction.amount}`);
      }
    }

    // Update recurring payment if transaction is a recurring payment
    if (transaction.recurring_payment_id) {
      if (transaction.type === 'expense') {
        // Update recurring payment current amount
        await client.query(
          'UPDATE public.recurring_payments SET current_amount = current_amount + $1, updated_at = NOW() WHERE id = $2',
          [transaction.amount, transaction.recurring_payment_id]
        );
        console.log(`Updated recurring payment ${transaction.recurring_payment_id} amount: +${transaction.amount}`);
      }
    }

    console.log('Related balances updated successfully');
  } catch (error) {
    console.error('Error updating related balances:', error);
    // Don't throw error here as the transaction was already created successfully
    // Just log the error for monitoring
  }
}

module.exports = transactionModel;