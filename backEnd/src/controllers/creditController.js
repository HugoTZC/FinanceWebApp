const creditModel = require('../models/creditModel');
const { AppError } = require('../utils/helpers');
const logger = require('../utils/logger');

/**
 * Create credit card
 * @route POST /api/credit/cards
 */
exports.addCard = async (req, res, next) => {
  try {
    logger.info('🎯 Adding new credit card - Request received');
    logger.debug('Request user:', req.user);
    logger.debug('Request body:', req.body);

    const userId = req.user.id;
    logger.info(`👤 User ID: ${userId}`);
    
    const { 
      name, last_four, card_type, balance, 
      credit_limit, interest_rate, due_date, min_payment 
    } = req.body;
    
    logger.info('📝 Creating credit card with data:', {
      name,
      last_four,
      card_type,
      balance,
      credit_limit,
      interest_rate,
      due_date,
      min_payment
    });
    
    // Create credit card
    const card = await creditModel.createCreditCard({
      user_id: userId,
      name,
      last_four,
      card_type,
      balance,
      credit_limit,
      interest_rate,
      due_date,
      min_payment
    });
    
    logger.info('✅ Credit card created successfully:', card);
    
    res.status(201).json({
      status: 'success',
      data: {
        card
      }
    });
  } catch (error) {
    logger.error('❌ Error adding credit card:', error);
    next(error);
  }
};

/**
 * Get all credit cards
 * @route GET /api/credit/cards
 */
exports.getCards = async (req, res, next) => {
  try {
    const userId = req.user.id;
    logger.info('🔍 Retrieving credit cards for user:', userId);
    
    // Get credit cards
    const cards = await creditModel.getCreditCards(userId);
    logger.info('📊 Retrieved cards:', JSON.stringify(cards, null, 2));
    
    res.status(200).json({
      status: 'success',
      data: {
        cards
      }
    });
  } catch (error) {
    logger.error('❌ Error retrieving credit cards:', error);
    next(error);
  }
};

/**
 * Get credit card by ID
 * @route GET /api/credit/cards/:id
 */
exports.getCardById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    // Get credit card
    const card = await creditModel.getCreditCardById(id, userId);
    
    if (!card) {
      return next(new AppError('Credit card not found', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        card
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update credit card
 * @route PATCH /api/credit/cards/:id
 */
exports.updateCard = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { 
      name, last_four, card_type, balance, 
      credit_limit, interest_rate, due_date, min_payment 
    } = req.body;
    
    // Update credit card
    const card = await creditModel.updateCreditCard(id, userId, {
      name,
      last_four,
      card_type,
      balance,
      credit_limit,
      interest_rate,
      due_date,
      min_payment
    });
    
    if (!card) {
      return next(new AppError('Credit card not found', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        card
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete credit card
 * @route DELETE /api/credit/cards/:id
 */
exports.deleteCard = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    // Delete credit card
    const success = await creditModel.deleteCreditCard(id, userId);
    
    if (!success) {
      return next(new AppError('Credit card not found', 404));
    }
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create loan
 * @route POST /api/credit/loans
 */
exports.addLoan = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { 
      name, loan_type, bank_number, original_amount,
      balance, interest_rate, term, monthly_payment, 
      due_date, start_date, end_date
    } = req.body;
    
    // Create loan
    const loan = await creditModel.createLoan({
      user_id: userId,
      name,
      loan_type,
      bank_number,
      original_amount,
      balance,
      interest_rate,
      term,
      monthly_payment,
      due_date,
      start_date,
      end_date
    });
    
    res.status(201).json({
      status: 'success',
      data: {
        loan
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all loans
 * @route GET /api/credit/loans
 */
exports.getLoans = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get loans
    const loans = await creditModel.getLoans(userId);
    
    res.status(200).json({
      status: 'success',
      data: {
        loans
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get loan by ID
 * @route GET /api/credit/loans/:id
 */
exports.getLoanById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    // Get loan
    const loan = await creditModel.getLoanById(id, userId);
    
    if (!loan) {
      return next(new AppError('Loan not found', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        loan
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update loan
 * @route PATCH /api/credit/loans/:id
 */
exports.updateLoan = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { 
      name, loan_type, bank_number, original_amount,
      balance, interest_rate, term, monthly_payment, 
      due_date, start_date, end_date
    } = req.body;
    
    // Update loan
    const loan = await creditModel.updateLoan(id, userId, {
      name,
      loan_type,
      bank_number,
      original_amount,
      balance,
      interest_rate,
      term,
      monthly_payment,
      due_date,
      start_date,
      end_date
    });
    
    if (!loan) {
      return next(new AppError('Loan not found', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        loan
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete loan
 * @route DELETE /api/credit/loans/:id
 */
exports.deleteLoan = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    // Delete loan
    const success = await creditModel.deleteLoan(id, userId);
    
    if (!success) {
      return next(new AppError('Loan not found', 404));
    }
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get credit card spending by category
 * @route GET /api/credit/cards/:id/spending/categories/:year/:month
 */
exports.getCardSpending = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id, year, month } = req.params;
    
    // Get card spending by category
    const categories = await creditModel.getCardSpending(id, userId, year, month);
    
    res.status(200).json({
      status: 'success',
      data: {
        categories
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get credit card spending by category
 * @route GET /api/credit/cards/:id/spending/categories/:year/:month
 */
exports.getCardSpendingByCategory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id, year, month } = req.params;
    
    // Get card spending by category
    const categories = await creditModel.getCardSpendingByCategory(id, userId, year, month);
    
    res.status(200).json({
      status: 'success',
      data: {
        categories
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get credit card monthly spending
 * @route GET /api/credit/cards/:id/spending/monthly/:year
 */
exports.getCardMonthlySpending = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id, year } = req.params;
    
    // Get card monthly spending
    const spending = await creditModel.getCardMonthlySpending(id, userId, year);
    
    res.status(200).json({
      status: 'success',
      data: {
        spending
      }
    });
  } catch (error) {
    next(error);
  }
};