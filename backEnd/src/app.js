const express = require("express")
const cors = require("cors")
const helmet = require("helmet")
const morgan = require("morgan")
const { errorHandler } = require("./middleware/errorHandler")

// Import routes
const authRoutes = require("./routes/authRoutes")
const userRoutes = require("./routes/userRoutes")
const transactionRoutes = require("./routes/transactionRoutes")
const categoryRoutes = require("./routes/categoryRoutes")
const budgetRoutes = require("./routes/budgetRoutes")
const savingsRoutes = require("./routes/savingsRoutes")
const creditRoutes = require("./routes/creditRoutes")
const analysisRoutes = require("./routes/analysisRoutes")

const app = express()

// Middleware
app.use(helmet())
app.use(cors())
app.use(morgan("dev"))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/users", userRoutes)
app.use("/api/transactions", transactionRoutes)
app.use("/api/categories", categoryRoutes)
app.use("/api/budgets", budgetRoutes)
app.use("/api/savings", savingsRoutes)
app.use("/api/credit", creditRoutes)
app.use("/api/analysis", analysisRoutes)

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Server is running" })
})

// Error handling middleware
app.use(errorHandler)

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" })
})

module.exports = app

