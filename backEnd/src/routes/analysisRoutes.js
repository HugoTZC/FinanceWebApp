const express = require("express")
const {
  getBudgetAnalysis,
  getWeeklyAnalysis,
  getUpcomingDueDates,
  getMonthlyObligations,
  getMonthlyIncomeAndExpenses,
} = require("../controllers/analysisController")
const { protect } = require("../middleware/auth")

const router = express.Router()

// All routes are protected
router.use(protect)

router.get("/budget", getBudgetAnalysis)
router.get("/weekly", getWeeklyAnalysis)
router.get("/due-dates", getUpcomingDueDates)
router.get("/obligations", getMonthlyObligations)
router.get("/monthly", getMonthlyIncomeAndExpenses)

module.exports = router

