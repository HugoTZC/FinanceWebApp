const jwt = require("jsonwebtoken")
const { jwtSecret, jwtExpiresIn } = require("../config/config")

/**
 * Generate a JWT token for a user
 * @param {Object} user - User object with id and email
 * @returns {String} - JWT token
 */
const generateToken = (user) => {
  return jwt.sign({ id: user.id, email: user.email }, jwtSecret, { expiresIn: jwtExpiresIn })
}

/**
 * Verify a JWT token
 * @param {String} token - JWT token to verify
 * @returns {Object} - Decoded token payload
 */
const verifyToken = (token) => {
  return jwt.verify(token, jwtSecret)
}

module.exports = {
  generateToken,
  verifyToken,
}

