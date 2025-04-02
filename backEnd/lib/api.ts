import axios from "axios"

// Create an axios instance with the base URL pointing to our Node.js backend
const api = axios.create({
  // Use environment variable for the API URL in production
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
})

// Add a request interceptor to add the auth token to every request
api.interceptors.request.use(
  (config) => {
    // Use localStorage in browser environment only
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token")
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// Add a response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // Handle 401 Unauthorized errors (token expired)
    if (error.response && error.response.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token")
      window.location.href = "/auth/login"
    }
    return Promise.reject(error)
  },
)

// Auth API
export const authAPI = {
  login: (email: string, password: string) => {
    return api.post("/auth/login", { email, password })
  },
  register: (name: string, email: string, password: string) => {
    return api.post("/auth/register", { name, email, password })
  },
  logout: () => {
    return api.post("/auth/logout")
  },
  getProfile: () => {
    return api.get("/auth/profile")
  },
}

// Transactions API
export const transactionsAPI = {
  getAll: (params?: any) => {
    return api.get("/transactions", { params })
  },
  getById: (id: string) => {
    return api.get(`/transactions/${id}`)
  },
  create: (data: any) => {
    return api.post("/transactions", data)
  },
  update: (id: string, data: any) => {
    return api.put(`/transactions/${id}`, data)
  },
  delete: (id: string) => {
    return api.delete(`/transactions/${id}`)
  },
  // New methods for credit card transactions
  getByCardId: (cardId: string, params?: any) => {
    return api.get(`/transactions/card/${cardId}`, { params })
  },
  getMonthlySummary: (year?: number, month?: number) => {
    return api.get(`/transactions/summary`, { params: { year, month } })
  },
}

// Budget API
export const budgetAPI = {
  getCategories: () => {
    return api.get("/categories")
  },
  getCategorySpending: (year: number, month: number) => {
    return api.get("/categories/spending", { params: { year, month } })
  },
  getBudgets: (year?: number, month?: number) => {
    return api.get("/budgets", { params: { year, month } })
  },
  getBudgetProgress: (year: number, month: number) => {
    return api.get("/budgets/progress", { params: { year, month } })
  },
  createOrUpdateBudget: (categoryId: string, amount: number, year: number, month: number) => {
    return api.post("/budgets", { category_id: categoryId, amount, year, month })
  },
  deleteBudget: (categoryId: string, year: number, month: number) => {
    return api.delete(`/budgets/${categoryId}/${year}/${month}`)
  },
  generateMonthlyBudgets: () => {
    return api.post("/budgets/generate")
  },
}

// Savings API
export const savingsAPI = {
  getGoals: () => {
    return api.get("/savings/goals")
  },
  getGoalById: (id: string) => {
    return api.get(`/savings/goals/${id}`)
  },
  createGoal: (data: any) => {
    return api.post("/savings/goals", data)
  },
  updateGoal: (id: string, data: any) => {
    return api.put(`/savings/goals/${id}`, data)
  },
  deleteGoal: (id: string) => {
    return api.delete(`/savings/goals/${id}`)
  },
  getSavingsProgress: () => {
    return api.get("/savings/progress")
  },
  getGoalTransactions: (id: string) => {
    return api.get(`/savings/goals/${id}/transactions`)
  },
}

// Credit API
export const creditAPI = {
  // Credit Cards
  getCards: () => {
    return api.get("/credit/cards")
  },
  getCardById: (id: string) => {
    return api.get(`/credit/cards/${id}`)
  },
  addCard: (data: any) => {
    return api.post("/credit/cards", data)
  },
  updateCard: (id: string, data: any) => {
    return api.put(`/credit/cards/${id}`, data)
  },
  deleteCard: (id: string) => {
    return api.delete(`/credit/cards/${id}`)
  },

  // Loans
  getLoans: () => {
    return api.get("/credit/loans")
  },
  getLoanById: (id: string) => {
    return api.get(`/credit/loans/${id}`)
  },
  addLoan: (data: any) => {
    return api.post("/credit/loans", data)
  },
  updateLoan: (id: string, data: any) => {
    return api.put(`/credit/loans/${id}`, data)
  },
  deleteLoan: (id: string) => {
    return api.delete(`/credit/loans/${id}`)
  },

  // Credit Card Spending
  getCardSpending: (cardId: string, year?: number, month?: string) => {
    return api.get(`/credit/cards/${cardId}/spending`, { params: { year, month } })
  },
  getCardSpendingByCategory: (cardId: string, year: number, month: string) => {
    return api.get(`/credit/cards/${cardId}/spending/categories/${year}/${month}`)
  },
  getCardMonthlySpending: (cardId: string, year: number) => {
    return api.get(`/credit/cards/${cardId}/spending/monthly/${year}`)
  },
}

// Analysis API
export const analysisAPI = {
  getBudgetAnalysis: (year?: number, month?: number) => {
    return api.get("/analysis/budget", { params: { year, month } })
  },
  getWeeklyAnalysis: (weeksBack?: number) => {
    return api.get("/analysis/weekly", { params: { weeks_back: weeksBack } })
  },
  getUpcomingDueDates: (days?: number) => {
    return api.get("/analysis/due-dates", { params: { days } })
  },
  getMonthlyObligations: () => {
    return api.get("/analysis/obligations")
  },
  getMonthlyIncomeAndExpenses: (months?: number) => {
    return api.get("/analysis/monthly", { params: { months } })
  },
}

// Categories API
export const categoriesAPI = {
  getAll: (type?: string) => {
    return api.get("/categories", { params: { type } })
  },
  getById: (id: string) => {
    return api.get(`/categories/${id}`)
  },
  create: (data: any) => {
    return api.post("/categories", data)
  },
  update: (id: string, data: any) => {
    return api.put(`/categories/${id}`, data)
  },
  delete: (id: string) => {
    return api.delete(`/categories/${id}`)
  },
}

export default api

