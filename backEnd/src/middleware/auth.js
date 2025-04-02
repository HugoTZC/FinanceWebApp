const { verifyToken } = require("../utils/jwtUtils")

/**
 * Middleware to protect routes that require authentication
 */
const protect = (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized, no token" })
    }

    // Verify token
    const token = authHeader.split(" ")[1]
    const decoded = verifyToken(token)

    // Add user from payload to request
    req.user = { id: decoded.id, email: decoded.email }
    next()
  } catch (error) {
    return res.status(401).json({ message: "Not authorized, token failed" })
  }
}

module.exports = { protect }

