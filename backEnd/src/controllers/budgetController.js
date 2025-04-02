const BudgetModel = require("../models/budgetModel")
const asyncHandler = require("../utils/asyncHandler")
const { AppError } = require("../middleware/errorHandler")

/**
 * Get all budgets
 * @route GET /api/budgets
 * @access Private
 */
const getBudgets = asyncHandler(async (req, res) => {
  const { year, month } = req.query

  const budgets = await BudgetModel.getAll(
    req.user.id,
    year ? Number.parseInt(year) : null,
    month ? Number.parseInt(month) : null,
  )

  res.status(200).json({
    success: true,
    count: budgets.length,
    data: budgets,
  })
})

/**
 * Get budget progress
 * @route GET /api/budgets/progress
 * @access Private
 */
const getBudgetProgress = asyncHandler(async (req, res) => {
  const { year, month } = req.query

  if (!year || !month) {
    throw new AppError("Year and month are required", 400)
  }

  const progress = await BudgetModel.getBudgetProgress(req.user.id, Number.parseInt(year), Number.parseInt(month))

  res.status(200).json({
    success: true,
    data: progress,
  })
})

/**
 * Create or update a budget
 * @route POST /api/budgets
 * @access Private
 */
const createOrUpdateBudget = asyncHandler(async (req, res) => {
  const { category_id, amount, year, month } = req.body

  if (!category_id || !amount || !year || !month) {
    throw new AppError("Category ID, amount, year, and month are required", 400)
  }

  const budget = await BudgetModel.createOrUpdate({
    user_id: req.user.id,
    category_id,
    amount,
    year: Number.parseInt(year),
    month: Number.parseInt(month),
  })

  res.status(201).json({
    success: true,
    data: budget,
  })
})

/**
 * Delete a budget
 * @route DELETE /api/budgets/:categoryId/:year/:month
 * @access Private
 */
const deleteBudget = asyncHandler(async (req, res) => {
  const { categoryId, year, month } = req.params

  const success = await BudgetModel.delete(req.user.id, categoryId, Number.parseInt(year), Number.parseInt(month))

  if (!success) {
    throw new AppError("Budget not found", 404)
  }

  res.status(200).json({
    success: true,
    message: "Budget deleted successfully",
  })
})

/**
 * Generate monthly budgets
 * @route POST /api/budgets/generate
 * @access Private
 */
const generateMonthlyBudgets = asyncHandler(async (req, res) => {
  await BudgetModel.generateMonthlyBudgets()

  res.status(200).json({
    success: true,
    message: "Monthly budgets generated successfully",
  })
})

module.exports = {
  getBudgets,
  getBudgetProgress,
  createOrUpdateBudget,
  deleteBudget,
  generateMonthlyBudgets,
}

