const AnalysisModel = require("../models/analysisModel")
const asyncHandler = require("../utils/asyncHandler")

/**
 * Get budget analysis
 * @route GET /api/analysis/budget
 * @access Private
 */
const getBudgetAnalysis = asyncHandler(async (req, res) => {
  const { year, month } = req.query

  const analysis = await AnalysisModel.getBudgetAnalysis(
    req.user.id,
    year ? Number.parseInt(year) : null,
    month ? Number.parseInt(month) : null,
  )

  res.status(200).json({
    success: true,
    data: analysis,
  })
})

/**
 * Get weekly analysis
 * @route GET /api/analysis/weekly
 * @access Private
 */
const getWeeklyAnalysis = asyncHandler(async (req, res) => {
  const { weeks_back } = req.query

  const analysis = await AnalysisModel.getWeeklyAnalysis(req.user.id, weeks_back ? Number.parseInt(weeks_back) : 4)

  res.status(200).json({
    success: true,
    data: analysis,
  })
})

/**
 * Get upcoming due dates
 * @route GET /api/analysis/due-dates
 * @access Private
 */
const getUpcomingDueDates = asyncHandler(async (req, res) => {
  const { days } = req.query

  const dueDates = await AnalysisModel.getUpcomingDueDates(req.user.id, days ? Number.parseInt(days) : 7)

  res.status(200).json({
    success: true,
    count: dueDates.length,
    data: dueDates,
  })
})

/**
 * Get monthly obligations
 * @route GET /api/analysis/obligations
 * @access Private
 */
const getMonthlyObligations = asyncHandler(async (req, res) => {
  const obligations = await AnalysisModel.getMonthlyObligations(req.user.id)

  res.status(200).json({
    success: true,
    data: obligations,
  })
})

/**
 * Get monthly income and expenses
 * @route GET /api/analysis/monthly
 * @access Private
 */
const getMonthlyIncomeAndExpenses = asyncHandler(async (req, res) => {
  const { months } = req.query

  const data = await AnalysisModel.getMonthlyIncomeAndExpenses(req.user.id, months ? Number.parseInt(months) : 6)

  res.status(200).json({
    success: true,
    data,
  })
})

module.exports = {
  getBudgetAnalysis,
  getWeeklyAnalysis,
  getUpcomingDueDates,
  getMonthlyObligations,
  getMonthlyIncomeAndExpenses,
}

