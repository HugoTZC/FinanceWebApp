import axios from "axios";

// Mock data for development fallbacks
const MOCK_DATA = {
  transactions: [
    {
      id: "mock-tx-1",
      transaction_date: new Date().toISOString(),
      title: "Sample Transaction",
      category_name: "General",
      amount: 100.00,
      type: "expense"
    },
    {
      id: "mock-tx-2",
      transaction_date: new Date().toISOString(),
      title: "Sample Income",
      category_name: "Salary",
      amount: 1500.00,
      type: "income"
    },
    {
      id: "mock-tx-3",
      transaction_date: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      title: "Groceries",
      category_name: "Food",
      amount: 75.50,
      type: "expense"
    },
    {
      id: "mock-tx-4",
      transaction_date: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
      title: "Phone Bill",
      category_name: "Utilities",
      amount: 45.99,
      type: "expense"
    },
    {
      id: "mock-tx-5",
      transaction_date: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
      title: "Freelance Work",
      category_name: "Side Income",
      amount: 350.00,
      type: "income"
    }
  ],
  years: [
    { year: new Date().getFullYear() },
    { year: new Date().getFullYear() - 1 },
    { year: new Date().getFullYear() - 2 }
  ],
  categories: [
    { id: "mock-cat-1", name: "Groceries", type: "expense", source: "system" },
    { id: "mock-cat-2", name: "Salary", type: "income", source: "system" },
    { id: "mock-cat-3", name: "Dining", type: "expense", source: "system" },
    { id: "mock-cat-4", name: "Transportation", type: "expense", source: "system" },
    { id: "mock-cat-5", name: "Utilities", type: "expense", source: "system" },
    { id: "mock-cat-6", name: "Entertainment", type: "expense", source: "system" },
    { id: "mock-cat-7", name: "Side Income", type: "income", source: "system" }
  ]
};

// Development mode flag
const IS_DEV = process.env.NODE_ENV === "development";
// Use mock data flag - can be toggled for testing
const USE_MOCK_DATA = IS_DEV && false; // Changed to false to use real API data

// Custom API error with fallback data
class ApiErrorWithFallback extends Error {
  fallbackData: any;
  
  constructor(message: string, fallbackData: any) {
    super(message);
    this.name = "ApiErrorWithFallback";
    this.fallbackData = fallbackData;
  }
}

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (error?: unknown) => void;
}> = [];

const processQueue = (error: unknown = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
  timeout: 10000, // Add timeout to prevent long-hanging requests
});

// Helper function to create a mock response
const createMockResponse = (data: any, originalRequest: any) => {
  return {
    data: {
      status: 'success',
      data
    },
    status: 200,
    statusText: 'OK (MOCK)',
    headers: {},
    config: originalRequest
  };
};

// Request interceptor for API calls
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    
    // Ensure Authorization header is set if token exists in localStorage
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
      console.log("[API] Setting Authorization header from localStorage token");
    } else {
      // When using cookies (withCredentials: true), ensure the cookie is properly sent
      // No need to manually set the Authorization header as the cookie will be sent automatically
      console.log("[API] No token in localStorage, relying on cookies for authentication");
    }
    
    // For debugging authentication issues
    console.log("[API] Request headers:", JSON.stringify(config.headers));
    console.log("[API] withCredentials:", config.withCredentials);
    
    // If we're using mock data in development, intercept specific endpoints
    if (USE_MOCK_DATA && config.url) {
      // Log intercepted request
      console.log(`[DEV] Intercepting request to: ${config.url}`);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for API calls
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If no response or network error, but using mock data in dev mode
    if (USE_MOCK_DATA && (!error.response || error.code === 'ECONNABORTED') && originalRequest.url) {
      console.warn(`[DEV] Network error for ${originalRequest.url}, using mock data`);
      
      // Provide mock data based on the endpoint
      if (originalRequest.url.includes('/transactions')) {
        return createMockResponse({ 
          transactions: MOCK_DATA.transactions,
          pagination: {
            total: MOCK_DATA.transactions.length,
            page: 1,
            limit: 10,
            pages: 1
          }
        }, originalRequest);
      } else if (originalRequest.url.includes('/categories')) {
        return createMockResponse({ categories: MOCK_DATA.categories }, originalRequest);
      } else if (originalRequest.url.includes('/years')) {
        return createMockResponse({ years: MOCK_DATA.years }, originalRequest);
      }
    }
    
    // Check if the error contains fallback data
    if (error instanceof ApiErrorWithFallback) {
      // Return a mock successful response with fallback data
      return createMockResponse(error.fallbackData, originalRequest);
    }
    
    // If error is 401 and we haven't tried refreshing yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Wait for the other refresh request to complete
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return api(originalRequest);
          })
          .catch((err) => {
            // If in development mode, provide mock data instead of rejecting
            if (USE_MOCK_DATA && (originalRequest.url?.includes('/transactions') || originalRequest.url?.includes('/years'))) {
              console.warn('[DEV] Using mock data for failed request', originalRequest.url);
              
              // Determine which mock data to use based on the endpoint
              let mockData = {};
              if (originalRequest.url?.includes('/years')) {
                mockData = { years: MOCK_DATA.years };
              } else {
                mockData = { 
                  transactions: MOCK_DATA.transactions,
                  pagination: {
                    total: MOCK_DATA.transactions.length,
                    page: 1,
                    limit: 10,
                    pages: 1
                  }
                };
              }
              
              throw new ApiErrorWithFallback('Using mock data due to auth error', mockData);
            }
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Get refresh token from localStorage
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) {
          throw new Error("No refresh token available");
        }

        // Try to refresh the token
        const response = await api.post("/auth/refresh-token", null, {
          headers: {
            Authorization: `Bearer ${refreshToken}`
          }
        });
        
        if (response.data?.token) {
          const { token, refreshToken: newRefreshToken } = response.data;
          
          // Update tokens in localStorage
          localStorage.setItem("token", token);
          if (newRefreshToken) {
            localStorage.setItem("refreshToken", newRefreshToken);
          }
          
          // Update Authorization headers
          api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
          originalRequest.headers["Authorization"] = `Bearer ${token}`;
          
          processQueue();
          return api(originalRequest);
        }
      } catch (error) {
        processQueue(error);
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        if (window.location.pathname !== "/auth/login") {
          // Don't redirect in development mode
          if (!USE_MOCK_DATA) {
            window.location.href = "/auth/login";
          }
        }
        
        // In development mode, if this is a transaction-related request, return mock data
        if (USE_MOCK_DATA && (originalRequest.url?.includes('/transactions') || originalRequest.url?.includes('/years'))) {
          console.warn('[DEV] Using mock data for failed request', originalRequest.url);
          
          // Determine which mock data to use based on the endpoint
          let mockData = {};
          if (originalRequest.url?.includes('/years')) {
            mockData = { years: MOCK_DATA.years };
          } else {
            mockData = { 
              transactions: MOCK_DATA.transactions,
              pagination: {
                total: MOCK_DATA.transactions.length,
                page: 1,
                limit: 10,
                pages: 1
              }
            };
          }
          
          throw new ApiErrorWithFallback('Using mock data due to auth error', mockData);
        }
        
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }
    
    // In development mode, if this is a server error on any known endpoint, return mock data
    if (USE_MOCK_DATA && error.response?.status >= 500) {
      console.warn(`[DEV] Server error (${error.response.status}) for ${originalRequest.url}, using mock data`);
      
      // Determine which mock data to use based on the endpoint
      if (originalRequest.url?.includes('/transactions')) {
        return createMockResponse({ 
          transactions: MOCK_DATA.transactions,
          pagination: {
            total: MOCK_DATA.transactions.length,
            page: 1,
            limit: 10,
            pages: 1
          }
        }, originalRequest);
      } else if (originalRequest.url?.includes('/categories')) {
        return createMockResponse({ categories: MOCK_DATA.categories }, originalRequest);
      } else if (originalRequest.url?.includes('/years')) {
        return createMockResponse({ years: MOCK_DATA.years }, originalRequest);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    try {
      const response = await api.post("/auth/login", { email, password });
      
      // Only set tokens if we get a successful response with both tokens
      if (response.data?.status === "success" && response.data?.token && response.data?.refreshToken) {
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("refreshToken", response.data.refreshToken);
        api.defaults.headers.common["Authorization"] = `Bearer ${response.data.token}`;
      }
      return response.data;
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  },
  
  register: (email: string, password: string, password_confirm: string, first_name: string, last_name: string, second_last_name: string, nickname: string) => {
    return api.post("/auth/register", { 
      email, 
      password, 
      password_confirm, 
      first_name, 
      last_name, 
      second_last_name, 
      nickname 
    });
  },
  
  logout: async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      delete api.defaults.headers.common["Authorization"];
    }
  },
  
  getProfile: () => {
    return api.get("/auth/me");
  },
};

// Transactions API
export const transactionsAPI = {
  getAll: (params?: any) => {
    return api.get("/transactions", { params });
  },
  getById: (id: string) => {
    return api.get(`/transactions/${id}`);
  },
  create: (data: any) => {
    return api.post("/transactions", data);
  },
  update: (id: string, data: any) => {
    return api.put(`/transactions/${id}`, data);
  },
  delete: (id: string) => {
    return api.delete(`/transactions/${id}`);
  },
  // Card transactions
  getByCardId: (cardId: string, params?: any) => {
    return api.get(`/transactions/card/${cardId}`, { params });
  },
  getMonthlyByCardId: (cardId: string, year: number, month: number) => {
    return api.get(`/transactions/card/${cardId}/monthly/${year}/${month}`);
  },
  // Filtered transactions and analytics
  getFiltered: (filters: { 
    year?: string; 
    month?: string; 
    week?: string; 
    category?: string; 
    type?: string; 
    search?: string 
  }) => {
    return api.get("/transactions", { params: filters });
  },
  getMonthlyOverview: (year: number) => {
    return api.get(`/transactions/summary/${year}`);
  },
  getCategoryBreakdown: (year: number, month: string) => {
    return api.get(`/transactions/categories/${year}/${month}`);
  },
  getCategories: () => {
    return api.get("/categories");
  },
  getYears: () => {
    return api.get("/transactions/years");
  },
}

// Budget API
interface BudgetData {
  year: number;
  month: number;
  categories: Array<{
    category_id?: string;
    user_category_id?: string;
    amount: number;
  }>;
}

export const budgetAPI = {
  createOrUpdateBudget: (data: BudgetData) => {
    return api.post("/budgets", data)
  },
  getBudget: (year: number, month: number) => {
    return api.get(`/budgets/${year}/${month}`)
  },
  deleteBudgetCategory: (id: string) => {
    return api.delete(`/budgets/categories/${id}`)
  },
  getBudgetAlerts: () => {
    return api.get("/budgets/alerts")
  },
  dismissBudgetAlert: (alertId: string) => {
    return api.patch(`/budgets/alerts/${alertId}`)
  },
  getBudgetSpending: (categoryId: string, month?: string, year?: number) => {
    return api.get(`/budgets/categories/${categoryId}/spending`, { params: { month, year } })
  }
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
  // Recurring Payments
  getRecurringPayments: () => {
    return api.get("/savings/recurring")
  },
  createRecurringPayment: (data: any) => {
    return api.post("/savings/recurring", data)
  },
  updateRecurringPayment: (id: string, data: any) => {
    return api.patch(`/savings/recurring/${id}`, data)
  },
  deleteRecurringPayment: (id: string) => {
    return api.delete(`/savings/recurring/${id}`)
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

// Categories API
export const categoriesAPI = {
  getAll: () => {
    return api.get("/categories")
  },
  getByType: (type: string) => {
    return api.get(`/categories/type/${type}`)
  },
  // User categories
  getUserCategories: () => {
    return api.get("/categories/user")
  },
  createUserCategory: (data: any) => {
    return api.post("/categories/user", data)
  },
  updateUserCategory: (id: string, data: any) => {
    return api.patch(`/categories/user/${id}`, data)
  },
  deleteUserCategory: (id: string) => {
    return api.delete(`/categories/user/${id}`)
  },
  // Default categories
  updateDefaultCategory: (id: string, data: any) => {
    return api.patch(`/categories/${id}`, data)
  }
}

// User API
export const userAPI = {
  getProfile: () => {
    return api.get("/users/profile")
  },
  updateProfile: (data: any) => {
    return api.patch("/users/profile", data)
  },
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    
    return api.post("/users/avatar", formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },
  getSettings: () => {
    return api.get("/users/settings")
  },
  updateSettings: (data: any) => {
    return api.patch("/users/settings", data)
  },
  getNotificationPreferences: () => {
    return api.get("/users/notification-preferences")
  },
  updateNotificationPreferences: (data: any) => {
    return api.patch("/users/notification-preferences", data)
  },
  deleteAccount: () => {
    return api.delete("/users")
  }
}

// Add or update the dashboardAPI object
export const dashboardAPI = {
  getOverview: () => {
    return api.get("/dashboard/overview")
  },
  getMonthlyData: (year: number) => {
    return api.get(`/dashboard/monthly/${year}`)
  },
  getCategoryBreakdown: (year: number, month?: string) => {
    return api.get(`/dashboard/categories/${year}${month ? `/${month}` : ""}`)
  },
  getRecentTransactions: (limit = 5) => {
    return api.get(`/dashboard/transactions/recent`, { params: { limit } })
  },
}

export default api

