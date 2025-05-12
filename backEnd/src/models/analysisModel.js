const { pool } = require("../config/database")

/**
 * Analysis model for database operations
 */
const AnalysisModel = {
  /**
   * Get budget analysis for a user
   * @param {String} userId - User ID
   * @param {Number} year - Year (optional)
   * @param {Number} month - Month (optional)
   * @returns {Promise<Object>} - Budget analysis data
   */
  async getBudgetAnalysis(userId, year = null, month = null) {
    const currentDate = new Date()
    const currentYear = year || currentDate.getFullYear()
    const currentMonth = month || currentDate.getMonth() + 1

    const query = `
      SELECT * FROM dbo.get_budget_analysis($1, $2, $3)
    `

    const result = await pool.query(query, [userId, currentYear, currentMonth])
    return result.rows[0]
  },

  /**
   * Get weekly analysis for a user
   * @param {String} userId - User ID
   * @param {Number} weeksBack - Number of weeks to analyze
   * @returns {Promise<Array>} - Weekly analysis data
   */
  async getWeeklyAnalysis(userId, weeksBack = 4) {
    const query = `
      SELECT * FROM dbo.get_weekly_analysis($1, $2)
    `

    const result = await pool.query(query, [userId, weeksBack])
    return result.rows
  },

  /**
   * Get upcoming due dates for a user
   * @param {String} userId - User ID
   * @param {Number} days - Number of days to look ahead
   * @returns {Promise<Array>} - Upcoming due dates
   */
  async getUpcomingDueDates(userId, days = 7) {
    const query = `
      SELECT * FROM dbo.get_upcoming_due_dates($1, $2)
      ORDER BY days_until_due
    `

    const result = await pool.query(query, [userId, days])
    return result.rows
  },

  /**
   * Get monthly obligations for a user
   * @param {String} userId - User ID
   * @returns {Promise<Object>} - Monthly obligations data
   */
  async getMonthlyObligations(userId) {
    const query = `
      SELECT 
        COALESCE(SUM(rp.amount), 0) AS recurring_payments_total,
        COALESCE(SUM(cc.min_payment), 0) AS credit_cards_total,
        COALESCE(SUM(l.monthly_payment), 0) AS loans_total,
        (
          COALESCE(SUM(rp.amount), 0) + 
          COALESCE(SUM(cc.min_payment), 0) + 
          COALESCE(SUM(l.monthly_payment), 0)
        ) AS total
      FROM dbo.users u
      LEFT JOIN dbo.recurring_payments rp ON u.id = rp.user_id
      LEFT JOIN dbo.credit_cards cc ON u.id = cc.user_id
      LEFT JOIN dbo.loans l ON u.id = l.user_id
      WHERE u.id = $1
    `

    const result = await pool.query(query, [userId])
    return result.rows[0]
  },

  /**
   * Get monthly income and expenses for a user
   * @param {String} userId - User ID
   * @param {Number} months - Number of months to analyze
   * @returns {Promise<Array>} - Monthly income and expenses data
   */
  async getMonthlyIncomeAndExpenses(userId, months = 6) {
    const query = `
      WITH months AS (
        SELECT 
          generate_series(
            date_trunc('month', current_date - interval '${months - 1} months'),
            date_trunc('month', current_date),
            interval '1 month'
          ) AS month_start
      )
      SELECT 
        to_char(m.month_start, 'Mon') AS month,
        EXTRACT(YEAR FROM dbo.m.month_start) AS year,
        COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) AS expenses
      FROM dbo.months m
      LEFT JOIN dbo.transactions t ON 
        t.user_id = $1 AND
        date_trunc('month', t.transaction_date) = m.month_start
      GROUP BY m.month_start
      ORDER BY m.month_start
    `

    const result = await pool.query(query, [userId])
    return result.rows
  },
}

module.exports = AnalysisModel

