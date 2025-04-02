const SavingsModel = require("../models/savingsModel")
const asyncHandler = require("../utils/asyncHandler")
const { AppError } = require("../middleware/errorHandler")

/**
 * Get all savings goals
 * @route GET /api/savings/goals
 * @access Private
 */
const getSavingsGoals = asyncHandler(async (req, res) => {
  const goals = await SavingsModel.getAll(req.user.id)

  res.status(200).json({
    success: true,
    count: goals.length,
    data: goals,
  })
})

/**
 * Get a savings goal by ID
 * @route GET /api/savings/goals/:id
 * @access Private
 */
const getSavingsGoal = asyncHandler(async (req, res) => {
  const goal = await SavingsModel.getById(req.params.id, req.user.id)

  if (!goal) {
    throw new AppError("Savings goal not found", 404)
  }

  res.status(200).json({
    success: true,
    data: goal,
  })
})

/**
 * Create a new savings goal
 * @route POST /api/savings/goals
 * @access Private
 */
const createSavingsGoal = asyncHandler(async (req, res) => {
  const { name, target_amount, current_amount, due_date, due_date_day, monthly_contribution } = req.body

  const goal = await SavingsModel.create({
    user_id: req.user.id,
    name,
    target_amount,
    current_amount,
    due_date,
    due_date_day,
    monthly_contribution,
  })

  res.status(201).json({
    success: true,
    data: goal,
  })
})

/**
 * Update a savings goal
 * @route PUT /api/savings/goals/:id
 * @access Private
 */
const updateSavingsGoal = asyncHandler(async (req, res) => {
  const { name, target_amount, current_amount, due_date, due_date_day, monthly_contribution, is_completed } = req.body

  const goal = await SavingsModel.update(req.params.id, req.user.id, {
    name,
    target_amount,
    current_amount,
    due_date,
    due_date_day,
    monthly_contribution,
    is_completed,
  })

  if (!goal) {
    throw new AppError("Savings goal not found", 404)
  }

  res.status(200).json({
    success: true,
    data: goal,
  })
})

/**
 * Delete a savings goal
 * @route DELETE /api/savings/goals/:id
 * @access Private
 */
const deleteSavingsGoal = asyncHandler(async (req, res) => {
  const success = await SavingsModel.delete(req.params.id, req.user.id)

  if (!success) {
    throw new AppError("Savings goal not found", 404)
  }

  res.status(200).json({
    success: true,
    message: "Savings goal deleted successfully",
  })
})

/**
 * Get savings goal progress
 * @route GET /api/savings/progress
 * @access Private
 */
const getSavingsProgress = asyncHandler(async (req, res) => {
  const progress = await SavingsModel.getSavingsProgress(req.user.id)

  res.status(200).json({
    success: true,
    data: progress,
  })
})

/**
 * Get transactions for a savings goal
 * @route GET /api/savings/goals/:id/transactions
 * @access Private
 */
const getSavingsGoalTransactions = asyncHandler(async (req, res) => {
  const transactions = await SavingsModel.getTransactions(req.params.id, req.user.id)

  res.status(200).json({
    success: true,
    count: transactions.length,
    data: transactions,
  })
})

module.exports = {
  getSavingsGoals,
  getSavingsGoal,
  createSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
  getSavingsProgress,
  getSavingsGoalTransactions,
}

