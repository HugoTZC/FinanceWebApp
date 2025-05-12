// This service handles data transformations and formatting for the API responses

// Format currency values
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

// Format percentage values
export const formatPercentage = (value: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100)
}

// Format date values
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date)
}

// Get month name from month number
export const getMonthName = (monthNumber: number): string => {
  const date = new Date()
  date.setMonth(monthNumber - 1)
  return date.toLocaleString("en-US", { month: "short" })
}

// Get week number from date
export const getWeekNumber = (dateString: string): number => {
  const date = new Date(dateString)
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
  const dayOfMonth = date.getDate()
  return Math.ceil(dayOfMonth / 7)
}

// Transform transaction data from API to component format
export const transformTransactionData = (apiTransaction: any) => {
  // Map API transaction data to the format expected by the component
  return {
    id: apiTransaction.id,
    date: apiTransaction.date,
    description: apiTransaction.description,
    category: apiTransaction.category,
    amount: apiTransaction.amount,
    type: apiTransaction.type,
    // Add any other transformations needed
  }
}

// Transform overview data from API to component format
export const transformOverviewData = (apiOverviewData: any) => {
  // Map API overview data to the format expected by the component
  return apiOverviewData.map((item: any) => ({
    name: item.month,
    income: item.income,
    expenses: item.expenses,
  }))
}

// Transform category breakdown data from API to component format
export const transformCategoryData = (apiCategoryData: any) => {
  // Map API category data to the format expected by the component
  return apiCategoryData.map((item: any) => ({
    name: item.category,
    value: item.amount,
    color: getCategoryColor(item.category),
  }))
}

// Get color for category (maintain consistent colors)
export const getCategoryColor = (category: string): string => {
  const colorMap: Record<string, string> = {
    Housing: "#4ade80",
    Food: "#60a5fa",
    Transportation: "#f87171",
    Entertainment: "#fbbf24",
    Utilities: "#a78bfa",
    Shopping: "#fb923c",
    Healthcare: "#34d399",
    Education: "#818cf8",
    Personal: "#f472b6",
    Income: "#10b981",
    Investment: "#6366f1",
    Other: "#94a3b8",
  }

  return colorMap[category] || "#94a3b8" // Default color if category not found
}

