const transactionModel = require('../models/transactionModel');
const categoryModel = require('../models/categoryModel');
const creditModel = require('../models/creditModel');
const { AppError } = require('../utils/helpers');

/**
 * Create a new transaction
 * @route POST /api/transactions
 */
exports.createTransaction = async (req, res, next) => {
  console.log('📥 [createTransaction] Request received:', {
    method: req.method,
    path: req.path,
    headers: {
      ...req.headers,
      authorization: req.headers.authorization ? 'Bearer [TOKEN_HIDDEN]' : undefined
    },
    timestamp: new Date().toISOString()
  });

  console.log('📋 [createTransaction] Request body:', JSON.stringify(req.body, null, 2));
  
  try {
    // Verificación explícita de autenticación con más detalles de log
    if (!req.user) {
      console.error('❌ [createTransaction] No user found in request - req.user is undefined');
      console.error('❌ Request cookies:', JSON.stringify(req.cookies || {}));
      console.error('❌ Request headers:', JSON.stringify({
        ...req.headers,
        authorization: req.headers.authorization ? 'Bearer [TOKEN_HIDDEN]' : undefined
      }));
      return next(new AppError('Authentication required', 401));
    }

    const userId = req.user.id;
    console.log(`👤 [createTransaction] Processing for user ID: ${userId} (${req.user.email})`);
    
    const {
      title,
      amount,
      transaction_date,
      type,
      category, // ID de la categoría
      payment_method,
      bank_account_id,
      credit_card_id,
      comment,
      savings_goal_id,
      recurring_payment_id
    } = req.body;

    try {
      const normalizedPaymentMethod = payment_method?.replace('-', '_') || 'cash';
      const isCreditCardPayment = type === 'expense' && normalizedPaymentMethod === 'credit_card_payment';

      console.log(`🔍 [createTransaction] Looking up category by ID: "${category || 'none'}"`);
      
      // Buscar la categoría directamente por su ID
      // Primero intentamos buscar en las categorías predeterminadas
      let categorySource = 'default'; // Track which table the category came from
      let matchingCategory = category ? await categoryModel.findById(category) : null;
      
      // Si no se encuentra en las categorías predeterminadas, podría ser una categoría personalizada
      if (category && !matchingCategory) {
        console.log(`🔍 [createTransaction] Category not found in default categories, checking user categories`);
        categorySource = 'user';
        matchingCategory = await categoryModel.findUserCategoryById(category, userId);
      }
      
      console.log(`🔍 [createTransaction] DEBUG: Category source = "${categorySource}", found = ${matchingCategory ? 'yes' : 'no'}`);
      
      if (!matchingCategory && !isCreditCardPayment) {
        console.warn(`⚠️ [createTransaction] Invalid category ID requested: "${category}"`);
        return next(new AppError('Invalid category ID', 400));
      }
      
      if (matchingCategory) {
        console.log(`✓ [createTransaction] Matched category: ${matchingCategory.name} (ID: ${matchingCategory.id}) from ${categorySource} categories`);
      } else {
        console.log('✓ [createTransaction] Credit card payment does not require a category');
      }
      
      // Configuración de método de pago y cuentas según el tipo de transacción
      // y considerando la restricción de verificación de la base de datos
      let actualPaymentMethod, actualBankAccountId = null, actualCreditCardId = null;
      let actualCategoryId = null, actualUserCategoryId = null;
      
      // Set the appropriate category field based on source
      if (matchingCategory && categorySource === 'default') {
        actualCategoryId = matchingCategory.id;
        console.log(`🔍 [createTransaction] DEBUG: Using category_id=${actualCategoryId} for default category`);
      } else if (matchingCategory) {
        actualUserCategoryId = matchingCategory.id;
        console.log(`🔍 [createTransaction] DEBUG: Using user_category_id=${actualUserCategoryId} for user category`);
      }
      
      if (isCreditCardPayment) {
        if (!credit_card_id) {
          return next(new AppError('Credit card ID is required for a credit card payment', 400));
        }
        const card = await creditModel.getCreditCardById(credit_card_id, userId);
        if (!card) {
          return next(new AppError('Credit card not found', 404));
        }
        if (Number(amount) > Number(card.balance)) {
          return next(new AppError('Payment cannot exceed the current credit card balance', 400));
        }
        actualPaymentMethod = 'credit_card_payment';
        actualCreditCardId = credit_card_id;
      } else if (type === 'income') {
        actualPaymentMethod = 'cash';
      } else {
        // Para gastos, usamos el método de pago proporcionado o 'cash' por defecto
        // Normalizando el nombre del método de pago
        actualPaymentMethod = normalizedPaymentMethod;
        
        // Asignamos bank_account_id y credit_card_id según el método de pago
        // respetando la restricción de verificación
        if (actualPaymentMethod === 'bank_account') {
          // Si es pago con cuenta bancaria, debemos tener un bank_account_id
          if (!bank_account_id) {
            return next(new AppError('Bank account ID is required when payment method is bank_account', 400));
          }
          actualBankAccountId = bank_account_id;
        } else if (actualPaymentMethod === 'credit_card') {
          // Si es pago con tarjeta de crédito, debemos tener un credit_card_id
          if (!credit_card_id) {
            return next(new AppError('Credit card ID is required when payment method is credit_card', 400));
          }
          const card = await creditModel.getCreditCardById(credit_card_id, userId);
          if (!card) {
            return next(new AppError('Credit card not found', 404));
          }
          actualCreditCardId = credit_card_id;
        }
        // Si es 'cash', ambos IDs permanecen NULL
      }
      
      console.log(`💡 [createTransaction] Using payment method: ${actualPaymentMethod}, bank_account_id: ${actualBankAccountId || 'NULL'}, credit_card_id: ${actualCreditCardId || 'NULL'}`);
      
      // Crear transacción
      console.log(`💾 [createTransaction] Saving transaction to database...`);
      const transaction = await transactionModel.create({
        user_id: userId,
        title,
        amount,
        transaction_date,
        type,
        category_id: actualCategoryId,
        user_category_id: actualUserCategoryId,
        payment_method: actualPaymentMethod,
        bank_account_id: actualBankAccountId,
        credit_card_id: actualCreditCardId,
        comment,
        is_recurring: false, // Default value
        recurring_transaction_id: null, // Default value
        savings_goal_id,
        recurring_payment_id
      });
      
      console.log(`✅ [createTransaction] Transaction created successfully:`, {
        id: transaction.id,
        title: transaction.title,
        amount: transaction.amount,
        type: transaction.type
      });
      
      res.status(201).json({
        status: 'success',
        data: {
          transaction
        }
      });
    } catch (innerError) {
      console.error('❌ [createTransaction] Error in category lookup or transaction creation:', innerError);
      return next(innerError);
    }
  } catch (error) {
    console.error('❌ [createTransaction] Error creating transaction:', error);
    console.error('Stack trace:', error.stack);
    next(error);
  }
};

/**
 * Get all transactions
 * @route GET /api/transactions
 */
exports.getTransactions = async (req, res, next) => {
  console.log('📥 [getTransactions] Request received:', {
    method: req.method,
    path: req.path,
    query: req.query,
    timestamp: new Date().toISOString()
  });
  
  try {
    // Enhanced user authentication check
    const userId = req.user?.id;
    
    console.log('🔍 [getTransactions] DEBUG: req.user =', JSON.stringify(req.user, null, 2));
    console.log('🔍 [getTransactions] DEBUG: userId from token =', userId);
    console.log('🔍 [getTransactions] DEBUG: Authorization header =', req.headers.authorization ? 'Present' : 'Missing');
    
    // Log cookies for debugging
    console.log('🔍 [getTransactions] DEBUG: cookies =', JSON.stringify(req.cookies));
    
    if (!userId) {
      console.warn('⚠️ [getTransactions] Authentication missing - no user ID in request');
      // Return empty results instead of error when not authenticated
      return res.status(200).json({
        status: 'success',
        message: 'Not authenticated, returning empty results',
        data: {
          transactions: [],
          pagination: {
            total: 0,
            page: 1,
            limit: 10,
            pages: 0
          }
        }
      });
    }
    
    console.log(`👤 [getTransactions] Processing for user ID: ${userId}`);
    
    // Extract all query parameters
    const { 
      type, category_id, user_category_id, payment_method,
      start_date, end_date, search, page, limit,
      // New parameters
      year, month, week, category
    } = req.query;
    
    console.log(`🔍 [getTransactions] Query parameters:`, req.query);
    
    // Build filters - handling both legacy and new filter names
    const filters = {
      type,
      // Handle both category_id (legacy) and category (new)
      category_id: category_id || category,
      user_category_id,
      payment_method,
      start_date,
      end_date,
      search,
      // Add explicit support for year and month filters
      year,
      month,
      week
    };
    
    console.log(`🔍 [getTransactions] Processed filters:`, filters);
    
    // Get transactions with error handling
    try {
      console.log(`💾 [getTransactions] Fetching transactions from database...`);
      const transactions = await transactionModel.findAll(userId, filters, { page, limit });
      
      console.log(`✅ [getTransactions] Successfully retrieved ${transactions.data?.transactions?.length || 0} transactions`);
      console.log(`📊 [getTransactions] Pagination info:`, transactions.data?.pagination);
      
      return res.status(200).json({
        status: 'success',
        ...transactions
      });
    } catch (dbError) {
      console.error('❌ [getTransactions] Database error:', dbError);
      console.error('Stack trace:', dbError.stack);
      // Return empty results instead of error
      return res.status(200).json({
        status: 'success',
        message: 'Database error occurred, using fallback empty results',
        data: {
          transactions: [],
          pagination: {
            total: 0,
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 10,
            pages: 0
          }
        }
      });
    }
  } catch (error) {
    console.error('❌ [getTransactions] Unexpected error in controller:', error);
    console.error('Stack trace:', error.stack);
    return res.status(200).json({
      status: 'success',
      message: 'An unexpected error occurred, using fallback empty results',
      data: {
        transactions: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 10,
          pages: 0
        }
      }
    });
  }
};

/**
 * Get transaction by ID
 * @route GET /api/transactions/:id
 */
exports.getTransaction = async (req, res, next) => {
  console.log('📥 [getTransaction] Request received:', {
    method: req.method,
    path: req.path,
    params: req.params,
    timestamp: new Date().toISOString()
  });
  
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    console.log(`👤 [getTransaction] Fetching transaction ID: ${id} for user ID: ${userId}`);
    
    // Get transaction
    console.log(`💾 [getTransaction] Querying database for transaction...`);
    const transaction = await transactionModel.findById(id, userId);
    
    if (!transaction) {
      console.warn(`⚠️ [getTransaction] Transaction not found: ${id}`);
      return next(new AppError('Transaction not found', 404));
    }
    
    console.log(`✅ [getTransaction] Transaction retrieved successfully:`, {
      id: transaction.id,
      title: transaction.title,
      amount: transaction.amount,
      type: transaction.type
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        transaction
      }
    });
  } catch (error) {
    console.error('❌ [getTransaction] Error retrieving transaction:', error);
    console.error('Stack trace:', error.stack);
    next(error);
  }
};

/**
 * Update transaction
 * @route PATCH /api/transactions/:id
 */
exports.updateTransaction = async (req, res, next) => {
  console.log('📥 [updateTransaction] Request received:', {
    method: req.method,
    path: req.path,
    params: req.params,
    timestamp: new Date().toISOString()
  });
  
  console.log('📋 [updateTransaction] Request body:', JSON.stringify(req.body, null, 2));
  
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    console.log(`👤 [updateTransaction] Updating transaction ID: ${id} for user ID: ${userId}`);
    
    const {
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
      savings_goal_id,
      recurring_payment_id
    } = req.body;
    
    console.log(`💾 [updateTransaction] Updating transaction in database...`);
    
    // Update transaction
    const transaction = await transactionModel.update(id, userId, {
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
      savings_goal_id,
      recurring_payment_id
    });
    
    if (!transaction) {
      console.warn(`⚠️ [updateTransaction] Transaction not found: ${id}`);
      return next(new AppError('Transaction not found', 404));
    }
    
    console.log(`✅ [updateTransaction] Transaction updated successfully:`, {
      id: transaction.id,
      title: transaction.title,
      amount: transaction.amount,
      type: transaction.type
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        transaction
      }
    });
  } catch (error) {
    console.error('❌ [updateTransaction] Error updating transaction:', error);
    console.error('Stack trace:', error.stack);
    next(error);
  }
};

/**
 * Delete transaction
 * @route DELETE /api/transactions/:id
 */
exports.deleteTransaction = async (req, res, next) => {
  console.log('📥 [deleteTransaction] Request received:', {
    method: req.method,
    path: req.path,
    params: req.params,
    timestamp: new Date().toISOString()
  });
  
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    console.log(`👤 [deleteTransaction] Deleting transaction ID: ${id} for user ID: ${userId}`);
    
    // Delete transaction
    console.log(`💾 [deleteTransaction] Removing transaction from database...`);
    const success = await transactionModel.delete(id, userId);
    
    if (!success) {
      console.warn(`⚠️ [deleteTransaction] Transaction not found: ${id}`);
      return next(new AppError('Transaction not found', 404));
    }
    
    console.log(`✅ [deleteTransaction] Transaction deleted successfully: ${id}`);
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    console.error('❌ [deleteTransaction] Error deleting transaction:', error);
    console.error('Stack trace:', error.stack);
    next(error);
  }
};

/**
 * Get monthly summary
 * @route GET /api/transactions/summary/:year/:month
 */
exports.getMonthlySummary = async (req, res, next) => {
  console.log('📥 [getMonthlySummary] Request received:', {
    method: req.method,
    path: req.path,
    params: req.params,
    timestamp: new Date().toISOString()
  });
  
  try {
    const userId = req.user.id;
    const { year, month } = req.params;
    
    console.log(`👤 [getMonthlySummary] Getting summary for user ID: ${userId}, year: ${year}, month: ${month}`);
    
    // Get monthly summary
    console.log(`💾 [getMonthlySummary] Fetching monthly summary data...`);
    const summary = await transactionModel.getMonthlySummary(userId, year, month);
    
    console.log(`✅ [getMonthlySummary] Summary retrieved successfully:`, {
      income: summary?.totalIncome,
      expenses: summary?.totalExpenses,
      balance: summary?.balance
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        summary
      }
    });
  } catch (error) {
    console.error('❌ [getMonthlySummary] Error getting monthly summary:', error);
    console.error('Stack trace:', error.stack);
    next(error);
  }
};

/**
 * Get category breakdown
 * @route GET /api/transactions/categories/:year/:month
 */
exports.getCategoryBreakdown = async (req, res, next) => {
  console.log('📥 [getCategoryBreakdown] Request received:', {
    method: req.method,
    path: req.path,
    params: req.params,
    timestamp: new Date().toISOString()
  });
  
  try {
    const userId = req.user.id;
    const { year, month } = req.params;
    
    console.log(`👤 [getCategoryBreakdown] Getting category breakdown for user ID: ${userId}, year: ${year}, month: ${month}`);
    
    // Get category breakdown
    console.log(`💾 [getCategoryBreakdown] Fetching category breakdown data...`);
    const categories = await transactionModel.getCategoryBreakdown(userId, year, month);
    
    console.log(`✅ [getCategoryBreakdown] Category breakdown retrieved successfully with ${categories?.length || 0} categories`);
    
    res.status(200).json({
      status: 'success',
      data: {
        categories
      }
    });
  } catch (error) {
    console.error('❌ [getCategoryBreakdown] Error getting category breakdown:', error);
    console.error('Stack trace:', error.stack);
    next(error);
  }
};

/**
 * Get transactions by credit card
 * @route GET /api/transactions/card/:cardId
 */
exports.getTransactionsByCard = async (req, res, next) => {
  console.log('📥 [getTransactionsByCard] Request received:', {
    method: req.method,
    path: req.path,
    params: req.params,
    query: req.query,
    timestamp: new Date().toISOString()
  });
  
  try {
    const userId = req.user.id;
    const { cardId } = req.params;
    const { page, limit } = req.query;
    
    console.log(`👤 [getTransactionsByCard] Getting transactions for user ID: ${userId}, card ID: ${cardId}`);
    console.log(`📊 [getTransactionsByCard] Pagination: page=${page || 1}, limit=${limit || 10}`);
    
    // Get transactions
    console.log(`💾 [getTransactionsByCard] Fetching card transactions from database...`);
    const transactions = await transactionModel.getByCardId(userId, cardId, { page, limit });
    
    console.log(`✅ [getTransactionsByCard] Successfully retrieved ${transactions.data?.transactions?.length || 0} transactions`);
    
    res.status(200).json({
      status: 'success',
      ...transactions
    });
  } catch (error) {
    console.error('❌ [getTransactionsByCard] Error getting card transactions:', error);
    console.error('Stack trace:', error.stack);
    next(error);
  }
};

/**
 * Get years for which transactions exist
 * @route GET /api/transactions/years
 */
exports.getTransactionYears = async (req, res, next) => {
  console.log('📥 [getTransactionYears] Request received:', {
    method: req.method,
    path: req.path,
    timestamp: new Date().toISOString()
  });
  
  try {
    // Enhanced user authentication check
    const userId = req.user?.id;
    
    if (!userId) {
      console.warn('⚠️ [getTransactionYears] Authentication missing - no user ID in request');
      // Return default years instead of error when not authenticated
      const currentYear = new Date().getFullYear();
      return res.status(200).json({
        status: 'success',
        message: 'Not authenticated, returning default years',
        data: {
          years: [
            { year: currentYear },
            { year: currentYear - 1 },
            { year: currentYear - 2 }
          ]
        }
      });
    }
    
    console.log(`👤 [getTransactionYears] Getting transaction years for user ID: ${userId}`);
    
    // Get transaction years
    console.log(`💾 [getTransactionYears] Fetching years data from database...`);
    const years = await transactionModel.getTransactionYears(userId);
    
    console.log(`✅ [getTransactionYears] Transaction years retrieved:`, years);
    
    return res.status(200).json({
      status: 'success',
      data: {
        years
      }
    });
  } catch (error) {
    console.error('❌ [getTransactionYears] Error in getTransactionYears controller:', error);
    console.error('Stack trace:', error.stack);
    
    // Return default years when an error occurs
    const currentYear = new Date().getFullYear();
    return res.status(200).json({
      status: 'success',
      data: {
        years: [
          { year: currentYear },
          { year: currentYear - 1 },
          { year: currentYear - 2 }
        ]
      },
      message: 'Using fallback years due to an error'
    });
  }
};
