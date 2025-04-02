const express = require("express")
const {
  getBudgets,
  getBudgetProgress,
  createOrUpdateBudget,
  deleteBudget,
  generateMonthlyBudgets,
} = require("../controllers/budgetController")
const { protect } = require("../middleware/auth")

const router = express.Router()

// All routes are protected
router.use(protect)

router.route("/").get(getBudgets).post(createOrUpdateBudget)

router.get("/progress", getBudgetProgress)
router.post("/generate", generateMonthlyBudgets)
router.delete("/:categoryId/:year/:month", deleteBudget)

module.exports = router

