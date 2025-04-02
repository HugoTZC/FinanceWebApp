require("dotenv").config()
const app = require("./src/app")
const { pool } = require("./src/config/database")

const PORT = process.env.PORT || 5000

// Test database connection
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("Database connection error:", err.stack)
  } else {
    console.log("Database connected successfully")
  }
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

