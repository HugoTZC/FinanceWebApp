const express = require("express")
const {
  getSavingsGoals,
  getSavingsGoal,
  createSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
  getSavingsProgress,
  getSavingsGoalTransactions,
} = require("../controllers/savingsController")
const { protect } = require("../middleware/auth")

const router = express.Router()

// All routes are protected
router.use(protect)

router.route("/goals").get(getSavingsGoals).post(createSavingsGoal)

router.route("/goals/:id").get(getSavingsGoal).put(updateSavingsGoal).delete(deleteSavingsGoal)

router.get("/goals/:id/transactions", getSavingsGoalTransactions)
router.get("/progress", getSavingsProgress)

module.exports = router

