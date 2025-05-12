// This file provides mock API responses for testing without a backend

import { monthlyData } from "@/data/monthly-data"
import { transactions } from "@/data/transactions"
import { categories } from "@/data/categories"
import { getMonthName, getWeekNumber } from "./data-service"

// Mock delay to simulate API latency
const mockDelay = (ms = 500) => new Promise((resolve) => setTimeout(resolve, ms))

export const mockAPI = {
  // Dashboard API
  getDashboardOverview: async () => {
    await mockDelay()
    return {
      totalBalance: 12580.25,
      balanceChange: 1245.65,
      monthlyIncome: 8464.0,
      incomeChange: 464.0,
      monthlyExpenses: 5684.4,
      expensesChange: -235.25,
    }
  },

  getMonthlyData: async (year: number) => {
    await mockDelay()
    // Return the monthly data for the overview chart
    return [
      { month: "Jan", income: 7500, expenses: 5200 },
      { month: "Feb", income: 7800, expenses: 5400 },
      { month: "Mar", income: 8000, expenses: 5600 },
      { month: "Apr", income: 8200, expenses: 5800 },
      { month: "May", income: 8000, expenses: 5500 },
      { month: "Jun", income: 8464, expenses: 5684 },
    ]
  },

  getCategoryBreakdown: async (year: number, month?: string) => {
    await mockDelay()
    // If month is provided, return data for that month
    if (month && monthlyData[month as keyof typeof monthlyData]) {
      return monthlyData[month as keyof typeof monthlyData]
    }

    // Otherwise return default data
    return [
      { name: "Housing", value: 1800, color: "#4ade80" },
      { name: "Food", value: 800, color: "#60a5fa" },
      { name: "Transportation", value: 600, color: "#f87171" },
      { name: "Entertainment", value: 400, color: "#fbbf24" },
      { name: "Utilities", value: 350, color: "#a78bfa" },
      { name: "Other", value: 250, color: "#fb923c" },
    ]
  },

  // Transactions API
  getTransactions: async (filters?: any) => {
    await mockDelay()

    let filteredTransactions = [...transactions]

    if (filters) {
      // Apply filters
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase()
        filteredTransactions = filteredTransactions.filter((t) => t.description.toLowerCase().includes(searchTerm))
      }

      if (filters.category && filters.category !== "all") {
        filteredTransactions = filteredTransactions.filter(
          (t) => t.category.toLowerCase() === filters.category.toLowerCase(),
        )
      }

      if (filters.type && filters.type !== "all") {
        filteredTransactions = filteredTransactions.filter((t) => t.type === filters.type)
      }

      if (filters.year && filters.year !== "all") {
        const year = Number.parseInt(filters.year)
        filteredTransactions = filteredTransactions.filter((t) => new Date(t.date).getFullYear() === year)
      }

      if (filters.month && filters.month !== "all") {
        const month = Number.parseInt(filters.month)
        filteredTransactions = filteredTransactions.filter((t) => new Date(t.date).getMonth() + 1 === month)
      }

      if (filters.week && filters.week !== "all") {
        const week = Number.parseInt(filters.week)
        filteredTransactions = filteredTransactions.filter((t) => getWeekNumber(t.date) === week)
      }
    }

    return filteredTransactions
  },

  getCategories: async () => {
    await mockDelay()
    return categories
  },

  getYears: async () => {
    await mockDelay()
    // Extract unique years from transactions
    const years = [...new Set(transactions.map((t) => new Date(t.date).getFullYear().toString()))]
    return years.sort((a, b) => Number.parseInt(b) - Number.parseInt(a)) // Sort descending
  },

  getMonths: async () => {
    await mockDelay()
    // Return all months
    return Array.from({ length: 12 }, (_, i) => ({
      value: (i + 1).toString(),
      label: getMonthName(i + 1),
    }))
  },
}

