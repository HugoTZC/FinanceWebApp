const express = require("express")
const { register, login, getProfile, logout } = require("../controllers/authController")
const { protect } = require("../middleware/auth")
const { userValidationRules, validate } = require("../middleware/validator")

const router = express.Router()

// Public routes
router.post("/register", userValidationRules, validate, register)
router.post("/login", login)

// Protected routes
router.get("/profile", protect, getProfile)
router.post("/logout", protect, logout)

module.exports = router

