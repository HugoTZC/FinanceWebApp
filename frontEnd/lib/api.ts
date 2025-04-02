import axios from "axios"

// Create an axios instance with the base URL pointing to our Node.js backend
const api = axios.create({
  // Use relative URL for same-origin requests or specify the full URL for different origins
  // baseURL: "https://10.95.45.30/api/v1", // Old external API
  baseURL: "/api", // For Next.js API routes
  // baseURL: "http://localhost:3000/api", // For separate Node.js backend on same server
  headers: {
    "Content-Type": "application/json",
  },
})

// Add a request interceptor to add the auth token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
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
    if (error.response && error.response.status === 401) {
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
  getMonthlyByCardId: (cardId: string, year: number, month: number) => {
    return api.get(`/transactions/card/${cardId}/monthly/${year}/${month}`)
  },
}

// Budget API
export const budgetAPI = {
  getCategories: () => {
    return api.get("/budget/categories")
  },
  getBudget: (month?: string, year?: number) => {
    return api.get("/budget", { params: { month, year } })
  },
  updateBudget: (categoryId: string, amount: number) => {
    return api.put(`/budget/categories/${categoryId}`, { amount })
  },
}

// Savings API
export const savingsAPI = {
  getGoals: () => {
    return api.get("/savings/goals")
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

export default api

