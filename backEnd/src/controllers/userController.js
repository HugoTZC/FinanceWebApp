const UserModel = require("../models/userModel")
const asyncHandler = require("../utils/asyncHandler")
const { AppError } = require("../middleware/errorHandler")

/**
 * Update user profile
 * @route PUT /api/users/profile
 * @access Private
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { full_name, preferred_currency, preferred_language, preferred_theme, avatar_url } = req.body

  const updatedUser = await UserModel.update(req.user.id, {
    full_name,
    preferred_currency,
    preferred_language,
    preferred_theme,
    avatar_url,
  })

  if (!updatedUser) {
    throw new AppError("User not found", 404)
  }

  res.status(200).json({
    success: true,
    data: updatedUser,
  })
})

/**
 * Change user password
 * @route PUT /api/users/password
 * @access Private
 */
const changePassword = asyncHandler(async (req, res) => {
  const { current_password, new_password } = req.body

  // Get user with password hash
  const user = await UserModel.findByEmail(req.user.email)

  if (!user) {
    throw new AppError("User not found", 404)
  }

  // Verify current password
  const isMatch = await UserModel.comparePassword(current_password, user.password_hash)
  if (!isMatch) {
    throw new AppError("Current password is incorrect", 401)
  }

  // Update password
  await UserModel.changePassword(req.user.id, new_password)

  res.status(200).json({
    success: true,
    message: "Password updated successfully",
  })
})

/**
 * Delete user account
 * @route DELETE /api/users
 * @access Private
 */
const deleteAccount = asyncHandler(async (req, res) => {
  // In a real app, you would implement account deletion logic here
  // This might include deleting all user data or marking the account as inactive

  res.status(200).json({
    success: true,
    message: "Account deleted successfully",
  })
})

module.exports = {
  updateProfile,
  changePassword,
  deleteAccount,
}

