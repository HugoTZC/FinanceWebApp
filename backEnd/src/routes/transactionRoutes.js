const express = require("express")
const {
  getTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getMonthlySummary,
  getTransactionsByCardId,
} = require("../controllers/transactionController")
const { protect } = require("../middleware/auth")
const { transactionValidationRules, validate } = require("../middleware/validator")

const router = express.Router()

// All routes are protected
router.use(protect)

router.route("/").get(getTransactions).post(transactionValidationRules, validate, createTransaction)

router.route("/:id").get(getTransaction).put(updateTransaction).delete(deleteTransaction)

router.get("/summary", getMonthlySummary)
router.get("/card/:cardId", getTransactionsByCardId)

module.exports = router

