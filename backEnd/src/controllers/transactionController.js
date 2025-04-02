const TransactionModel = require("../models/transactionModel")
const asyncHandler = require("../utils/asyncHandler")
const { AppError } = require("../middleware/errorHandler")

/**
 * Get all transactions
 * @route GET /api/transactions
 * @access Private
 */
const getTransactions = asyncHandler(async (req, res) => {
  const { type, category_id, start_date, end_date, payment_method, credit_card_id, savings_goal_id, limit, offset } =
    req.query

  const transactions = await TransactionModel.getAll(req.user.id, {
    type,
    category_id,
    start_date,
    end_date,
    payment_method,
    credit_card_id,
    savings_goal_id,
    limit: limit ? Number.parseInt(limit) : null,
    offset: offset ? Number.parseInt(offset) : null,
  })

  res.status(200).json({
    success: true,
    count: transactions.length,
    data: transactions,
  })
})

/**
 * Get a transaction by ID
 * @route GET /api/transactions/:id
 * @access Private
 */
const getTransaction = asyncHandler(async (req, res) => {
  const transaction = await TransactionModel.getById(req.params.id, req.user.id)

  if (!transaction) {
    throw new AppError("Transaction not found", 404)
  }

  res.status(200).json({
    success: true,
    data: transaction,
  })
})

/**
 * Create a new transaction
 * @route POST /api/transactions
 * @access Private
 */
const createTransaction = asyncHandler(async (req, res) => {
  const {
    title,
    amount,
    transaction_date,
    type,
    category_id,
    payment_method,
    credit_card_id,
    savings_goal_id,
    recurring_payment_id,
    comment,
  } = req.body

  const transaction = await TransactionModel.create({
    user_id: req.user.id,
    title,
    amount,
    transaction_date,
    type,
    category_id,
    payment_method,
    credit_card_id,
    savings_goal_id,
    recurring_payment_id,
    comment,
  })

  res.status(201).json({
    success: true,
    data: transaction,
  })
})

/**
 * Update a transaction
 * @route PUT /api/transactions/:id
 * @access Private
 */
const updateTransaction = asyncHandler(async (req, res) => {
  const {
    title,
    amount,
    transaction_date,
    type,
    category_id,
    payment_method,
    credit_card_id,
    savings_goal_id,
    recurring_payment_id,
    comment,
  } = req.body

  const transaction = await TransactionModel.update(req.params.id, req.user.id, {
    title,
    amount,
    transaction_date,
    type,
    category_id,
    payment_method,
    credit_card_id,
    savings_goal_id,
    recurring_payment_id,
    comment,
  })

  if (!transaction) {
    throw new AppError("Transaction not found", 404)
  }

  res.status(200).json({
    success: true,
    data: transaction,
  })
})

/**
 * Delete a transaction
 * @route DELETE /api/transactions/:id
 * @access Private
 */
const deleteTransaction = asyncHandler(async (req, res) => {
  const success = await TransactionModel.delete(req.params.id, req.user.id)

  if (!success) {
    throw new AppError("Transaction not found", 404)
  }

  res.status(200).json({
    success: true,
    message: "Transaction deleted successfully",
  })
})

/**
 * Get monthly summary
 * @route GET /api/transactions/summary
 * @access Private
 */
const getMonthlySummary = asyncHandler(async (req, res) => {
  const { year, month } = req.query

  const summary = await TransactionModel.getMonthlySummary(
    req.user.id,
    year ? Number.parseInt(year) : null,
    month ? Number.parseInt(month) : null,
  )

  res.status(200).json({
    success: true,
    data: summary,
  })
})

/**
 * Get transactions by credit card ID
 * @route GET /api/transactions/card/:cardId
 * @access Private
 */
const getTransactionsByCardId = asyncHandler(async (req, res) => {
  const { year, month, limit, sort } = req.query

  const transactions = await TransactionModel.getByCardId(req.params.cardId, req.user.id, {
    year: year ? Number.parseInt(year) : null,
    month: month ? Number.parseInt(month) : null,
    limit: limit ? Number.parseInt(limit) : null,
    sort,
  })

  res.status(200).json({
    success: true,
    count: transactions.length,
    data: transactions,
  })
})

module.exports = {
  getTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getMonthlySummary,
  getTransactionsByCardId,
}

