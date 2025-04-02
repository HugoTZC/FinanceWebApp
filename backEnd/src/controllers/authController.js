const UserModel = require("../models/userModel")
const { generateToken } = require("../utils/jwtUtils")
const asyncHandler = require("../utils/asyncHandler")
const { AppError } = require("../middleware/errorHandler")

/**
 * Register a new user
 * @route POST /api/auth/register
 * @access Public
 */
const register = asyncHandler(async (req, res) => {
  const { email, password, full_name } = req.body

  // Check if user already exists
  const existingUser = await UserModel.findByEmail(email)
  if (existingUser) {
    throw new AppError("User already exists with that email", 400)
  }

  // Create user
  const user = await UserModel.create({
    email,
    password,
    full_name,
  })

  // Generate token
  const token = generateToken(user)

  res.status(201).json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      token,
    },
  })
})

/**
 * Login user
 * @route POST /api/auth/login
 * @access Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body

  // Check if user exists
  const user = await UserModel.findByEmail(email)
  if (!user) {
    throw new AppError("Invalid credentials", 401)
  }

  // Check password
  const isMatch = await UserModel.comparePassword(password, user.password_hash)
  if (!isMatch) {
    throw new AppError("Invalid credentials", 401)
  }

  // Generate token
  const token = generateToken(user)

  res.status(200).json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      token,
    },
  })
})

/**
 * Get current user profile
 * @route GET /api/auth/profile
 * @access Private
 */
const getProfile = asyncHandler(async (req, res) => {
  const user = await UserModel.findById(req.user.id)

  if (!user) {
    throw new AppError("User not found", 404)
  }

  res.status(200).json({
    success: true,
    data: user,
  })
})

/**
 * Logout user (clear cookie on client side)
 * @route POST /api/auth/logout
 * @access Private
 */
const logout = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  })
})

module.exports = {
  register,
  login,
  getProfile,
  logout,
}

