// This file provides mock budget API responses for testing without a backend

// Mock delay to simulate API latency
const mockDelay = (ms = 500) => new Promise((resolve) => setTimeout(resolve, ms))

// Budget categories with types
const budgetCategories = [
  { id: "c1", name: "Housing", type: "essential" },
  { id: "c2", name: "Food", type: "essential" },
  { id: "c3", name: "Transportation", type: "essential" },
  { id: "c4", name: "Utilities", type: "essential" },
  { id: "c5", name: "Healthcare", type: "essential" },
  { id: "c6", name: "Entertainment", type: "discretionary" },
  { id: "c7", name: "Shopping", type: "discretionary" },
  { id: "c8", name: "Education", type: "essential" },
  { id: "c9", name: "Personal", type: "discretionary" },
]

// Budget data with spending
const budgetData = [
  {
    id: "b1",
    categoryId: "c1",
    name: "Housing",
    budgeted: 2000,
    spent: 1800,
    type: "essential",
  },
  {
    id: "b2",
    categoryId: "c2",
    name: "Food",
    budgeted: 1000,
    spent: 800,
    type: "essential",
  },
  {
    id: "b3",
    categoryId: "c3",
    name: "Transportation",
    budgeted: 800,
    spent: 600,
    type: "essential",
  },
  {
    id: "b4",
    categoryId: "c6",
    name: "Entertainment",
    budgeted: 500,
    spent: 425, // 85% of budget
    type: "discretionary",
  },
  {
    id: "b5",
    categoryId: "c4",
    name: "Utilities",
    budgeted: 400,
    spent: 350,
    type: "essential",
  },
  {
    id: "b6",
    categoryId: "c7",
    name: "Shopping",
    budgeted: 600,
    spent: 250,
    type: "discretionary",
  },
  {
    id: "b7",
    categoryId: "c5",
    name: "Healthcare",
    budgeted: 300,
    spent: 150,
    type: "essential",
  },
  {
    id: "b8",
    categoryId: "c8",
    name: "Education",
    budgeted: 400,
    spent: 200,
    type: "essential",
  },
]

// Budget alerts (categories at 85% or more of budget)
const budgetAlerts = budgetData
  .filter((budget) => {
    const percentSpent = Math.round((budget.spent / budget.budgeted) * 100)
    return percentSpent >= 85 && percentSpent < 100
  })
  .map((budget) => ({
    id: `alert-${budget.id}`,
    categoryId: budget.categoryId,
    category: budget.name,
    percentSpent: Math.round((budget.spent / budget.budgeted) * 100),
    budgeted: budget.budgeted,
    spent: budget.spent,
  }))

export const mockBudgetAPI = {
  // Get all budget categories
  getCategories: async () => {
    await mockDelay()
    return budgetCategories
  },

  // Get budget categories by type
  getCategoriesByType: async (type?: string) => {
    await mockDelay()
    if (!type || type === "all") {
      return budgetCategories
    }
    return budgetCategories.filter((category) => category.type === type)
  },

  // Get budget data
  getBudget: async (month?: string, year?: number) => {
    await mockDelay()
    return budgetData
  },

  // Update a budget
  updateBudget: async (categoryId: string, amount: number) => {
    await mockDelay()
    const category = budgetCategories.find((cat) => cat.id === categoryId)
    if (!category) {
      throw new Error("Category not found")
    }

    // Find if budget already exists
    const existingBudget = budgetData.find((budget) => budget.categoryId === categoryId)

    if (existingBudget) {
      // Update existing budget
      existingBudget.budgeted = amount
      return existingBudget
    } else {
      // Create new budget
      const newBudget = {
        id: `b${budgetData.length + 1}`,
        categoryId,
        name: category.name,
        budgeted: amount,
        spent: 0,
        type: category.type,
      }
      budgetData.push(newBudget)
      return newBudget
    }
  },

  // Get budget alerts
  getBudgetAlerts: async () => {
    await mockDelay()
    return budgetAlerts
  },

  // Dismiss a budget alert
  dismissBudgetAlert: async (alertId: string) => {
    await mockDelay()
    return { success: true }
  },

  // Get budget spending by category
  getBudgetSpending: async (categoryId: string, month?: string, year?: number) => {
    await mockDelay()
    const budget = budgetData.find((b) => b.categoryId === categoryId)
    if (!budget) {
      throw new Error("Budget not found")
    }

    // In a real app, you would filter by month and year
    return {
      categoryId,
      name: budget.name,
      budgeted: budget.budgeted,
      spent: budget.spent,
      transactions: [
        {
          id: "t1",
          date: "2023-06-15",
          description: "Transaction 1",
          amount: budget.spent * 0.4,
        },
        {
          id: "t2",
          date: "2023-06-20",
          description: "Transaction 2",
          amount: budget.spent * 0.6,
        },
      ],
    }
  },
}

