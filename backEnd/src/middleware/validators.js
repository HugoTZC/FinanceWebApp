const { body, param, query, validationResult } = require('express-validator');
const { TRANSACTION_TYPES, PAYMENT_METHODS, CATEGORY_GROUPS } = require('../utils/constants');
const { AppError } = require('../utils/helpers');

// Middleware to check validation results
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg);
    return next(new AppError(errorMessages[0], 400));
  }
  next();
};

// Auth validators
exports.registerValidator = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
  body('first_name').notEmpty().withMessage('First name is required'),
  body('last_name').notEmpty().withMessage('Last name is required')
];

exports.loginValidator = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

// Transaction validators
exports.createTransactionValidator = [
  body('title').notEmpty().withMessage('Title is required'),
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('transaction_date').isISO8601().withMessage('Invalid date format'),
  body('type').isIn(TRANSACTION_TYPES).withMessage('Invalid transaction type'),
  body('payment_method').isIn(PAYMENT_METHODS).withMessage('Invalid payment method')
];

// Category validators
exports.createCategoryValidator = [
  body('name').notEmpty().withMessage('Name is required'),
  body('type').isIn(TRANSACTION_TYPES).withMessage('Invalid category type'),
  body('category_group').isIn(CATEGORY_GROUPS).withMessage('Invalid category group')
];

// Budget validators
exports.createBudgetValidator = [
  body('year').isInt({ min: 2000, max: 2100 }).withMessage('Invalid year'),
  body('month').isInt({ min: 1, max: 12 }).withMessage('Invalid month'),
  body('categories').isArray().withMessage('Categories must be an array'),
  body('categories.*.category_id').optional().isUUID().withMessage('Invalid category ID'),
  body('categories.*.user_category_id').optional().isUUID().withMessage('Invalid user category ID'),
  body('categories.*.amount').isNumeric().withMessage('Amount must be a number')
];

// ID validator
exports.idValidator = [
  param('id').isUUID().withMessage('Invalid ID format')
];

// Pagination validator
exports.paginationValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];