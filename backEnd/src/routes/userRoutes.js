const express = require("express")
const { updateProfile, changePassword, deleteAccount } = require("../controllers/userController")
const { protect } = require("../middleware/auth")

const router = express.Router()

// All routes are protected
router.use(protect)

router.put("/profile", updateProfile)
router.put("/password", changePassword)
router.delete("/", deleteAccount)

module.exports = router

