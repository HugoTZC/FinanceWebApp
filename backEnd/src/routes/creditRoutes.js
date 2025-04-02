const express = require("express")
const {
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
} = require("../controllers/creditController")
const { protect } = require("../middleware/auth")

const router = express.Router()

// All routes are protected
router.use(protect)

// Credit card routes
router.route("/cards").get(getCards).post(addCard)

router.route("/cards/:id").get(getCardById).put(updateCard).delete(deleteCard)

router.get("/cards/:id/spending", getCardSpending)
router.get("/cards/:id/spending/categories/:year/:month", getCardSpendingByCategory)
router.get("/cards/:id/spending/monthly/:year", getCardMonthlySpending)

// Loan routes
router.route("/loans").get(getLoans).post(addLoan)

router.route("/loans/:id").get(getLoanById).put(updateLoan).delete(deleteLoan)

module.exports = router

