const express = require("express")
const {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategorySpending,
} = require("../controllers/categoryController")
const { protect } = require("../middleware/auth")

const router = express.Router()

// All routes are protected
router.use(protect)

router.route("/").get(getCategories).post(createCategory)

router.route("/:id").get(getCategory).put(updateCategory).delete(deleteCategory)

router.get("/spending", getCategorySpending)

module.exports = router

