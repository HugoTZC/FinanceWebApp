const CreditModel = require("../models/creditModel")
const asyncHandler = require("../utils/asyncHandler")
const { AppError } = require("../middleware/errorHandler")

/**
 * Get all credit cards
 * @route GET /api/credit/cards
 * @access Private
 */
const getCards = asyncHandler(async (req, res) => {
  const cards = await CreditModel.getCards(req.user.id)

  res.status(200).json({
    success: true,
    count: cards.length,
    data: cards,
  })
})

/**
 * Get a credit card by ID
 * @route GET /api/credit/cards/:id
 * @access Private
 */
const getCardById = asyncHandler(async (req, res) => {
  const card = await CreditModel.getCardById(req.params.id, req.user.id)

  if (!card) {
    throw new AppError("Credit card not found", 404)
  }

  res.status(200).json({
    success: true,
    data: card,
  })
})

/**
 * Add a new credit card
 * @route POST /api/credit/cards
 * @access Private
 */
const addCard = asyncHandler(async (req, res) => {
  const { name, last_four, balance, credit_limit, due_date, min_payment, interest_rate } = req.body

  const card = await CreditModel.addCard({
    user_id: req.user.id,
    name,
    last_four,
    balance,
    credit_limit,
    due_date,
    min_payment,
    interest_rate,
  })

  res.status(201).json({
    success: true,
    data: card,
  })
})

/**
 * Update a credit card
 * @route PUT /api/credit/cards/:id
 * @access Private
 */
const updateCard = asyncHandler(async (req, res) => {
  const { name, last_four, balance, credit_limit, due_date, min_payment, interest_rate } = req.body

  const card = await CreditModel.updateCard(req.params.id, req.user.id, {
    name,
    last_four,
    balance,
    credit_limit,
    due_date,
    min_payment,
    interest_rate,
  })

  if (!card) {
    throw new AppError("Credit card not found", 404)
  }

  res.status(200).json({
    success: true,
    data: card,
  })
})

/**
 * Delete a credit card
 * @route DELETE /api/credit/cards/:id
 * @access Private
 */
const deleteCard = asyncHandler(async (req, res) => {
  const success = await CreditModel.deleteCard(req.params.id, req.user.id)

  if (!success) {
    throw new AppError("Credit card not found", 404)
  }

  res.status(200).json({
    success: true,
    message: "Credit card deleted successfully",
  })
})

/**
 * Get all loans
 * @route GET /api/credit/loans
 * @access Private
 */
const getLoans = asyncHandler(async (req, res) => {
  const loans = await CreditModel.getLoans(req.user.id)

  res.status(200).json({
    success: true,
    count: loans.length,
    data: loans,
  })
})

/**
 * Get a loan by ID
 * @route GET /api/credit/loans/:id
 * @access Private
 */
const getLoanById = asyncHandler(async (req, res) => {
  const loan = await CreditModel.getLoanById(req.params.id, req.user.id)

  if (!loan) {
    throw new AppError("Loan not found", 404)
  }

  res.status(200).json({
    success: true,
    data: loan,
  })
})

/**
 * Add a new loan
 * @route POST /api/credit/loans
 * @access Private
 */
const addLoan = asyncHandler(async (req, res) => {
  const { name, bank_number, balance, original_amount, interest_rate, monthly_payment, due_date, term } = req.body

  const loan = await CreditModel.addLoan({
    user_id: req.user.id,
    name,
    bank_number,
    balance,
    original_amount,
    interest_rate,
    monthly_payment,
    due_date,
    term,
  })

  res.status(201).json({
    success: true,
    data: loan,
  })
})

/**
 * Update a loan
 * @route PUT /api/credit/loans/:id
 * @access Private
 */
const updateLoan = asyncHandler(async (req, res) => {
  const { name, bank_number, balance, original_amount, interest_rate, monthly_payment, due_date, term } = req.body

  const loan = await CreditModel.updateLoan(req.params.id, req.user.id, {
    name,
    bank_number,
    balance,
    original_amount,
    interest_rate,
    monthly_payment,
    due_date,
    term,
  })

  if (!loan) {
    throw new AppError("Loan not found", 404)
  }

  res.status(200).json({
    success: true,
    data: loan,
  })
})

/**
 * Delete a loan
 * @route DELETE /api/credit/loans/:id
 * @access Private
 */
const deleteLoan = asyncHandler(async (req, res) => {
  const success = await CreditModel.deleteLoan(req.params.id, req.user.id)

  if (!success) {
    throw new AppError("Loan not found", 404)
  }

  res.status(200).json({
    success: true,
    message: "Loan deleted successfully",
  })
})

/**
 * Get credit card spending
 * @route GET /api/credit/cards/:id/spending
 * @access Private
 */
const getCardSpending = asyncHandler(async (req, res) => {
  const { year, month } = req.query

  const spending = await CreditModel.getCardSpending(
    req.params.id,
    req.user.id,
    year ? Number.parseInt(year) : null,
    month ? Number.parseInt(month) : null,
  )

  res.status(200).json({
    success: true,
    data: spending,
  })
})

/**
 * Get credit card spending by category
 * @route GET /api/credit/cards/:id/spending/categories/:year/:month
 * @access Private
 */
const getCardSpendingByCategory = asyncHandler(async (req, res) => {
  const { id, year, month } = req.params

  const spending = await CreditModel.getCardSpendingByCategory(
    id,
    req.user.id,
    Number.parseInt(year),
    Number.parseInt(month),
  )

  res.status(200).json({
    success: true,
    data: spending,
  })
})

/**
 * Get credit card monthly spending
 * @route GET /api/credit/cards/:id/spending/monthly/:year
 * @access Private
 */
const getCardMonthlySpending = asyncHandler(async (req, res) => {
  const { id, year } = req.params

  const spending = await CreditModel.getCardMonthlySpending(id, req.user.id, Number.parseInt(year))

  res.status(200).json({
    success: true,
    data: spending,
  })
})

module.exports = {
  getCards,
  getCardById,
  addCard,
  updateCard,
  deleteCard,
  getLoans,
  getLoanById,
  addLoan,
  updateLoan,
  deleteLoan,
  getCardSpending,
  getCardSpendingByCategory,
  getCardMonthlySpending,
}

