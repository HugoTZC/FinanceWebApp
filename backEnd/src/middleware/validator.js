const { validationResult, body } = require("express-validator")
const { AppError } = require("./errorHandler")

/**
 * Middleware to validate request data
 */
const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }
  next()
}

// Common validation rules
const userValidationRules = [
  body("email").isEmail().withMessage("Please provide a valid email"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
  body("full_name").notEmpty().withMessage("Full name is required"),
]

const transactionValidationRules = [
  body("title").notEmpty().withMessage("Title is required"),
  body("amount").isNumeric().withMessage("Amount must be a number"),
  body("transaction_date").isDate().withMessage("Valid date is required"),
  body("type").isIn(["income", "expense"]).withMessage("Type must be income or expense"),
]

module.exports = {
  validate,
  userValidationRules,
  transactionValidationRules,
}

