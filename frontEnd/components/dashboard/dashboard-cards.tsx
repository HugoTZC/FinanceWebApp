"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { dashboardAPI } from "@/lib/api"
import { ArrowDown, ArrowUp } from "lucide-react"

interface DashboardOverview {
  currentMonth: {
    year: number
    month: number
    income: number
    expenses: number
    balance: number
  }
  lastMonth: {
    year: number
    month: number
    income: number
    expenses: number
    balance: number
  }
  difference: {
    income: number
    expenses: number
    balance: number
  }
}

export function DashboardCards() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchDashboardOverview() {
      try {
        setIsLoading(true)
        const response = await dashboardAPI.getOverview()
        setOverview(response.data.data)
        setError(null)
      } catch (err) {
        console.error("Failed to fetch dashboard overview:", err)
        setError("Failed to load financial data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardOverview()
  }, [])

  // Format numbers as currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value)
  }

  // Get difference display with arrow indicator
  const getDifferenceDisplay = (value: number, inverse = false) => {
    const isPositive = inverse ? value < 0 : value > 0
    const absValue = Math.abs(value)
    
    return (
      <p className={`text-xs flex items-center ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? 
          <ArrowUp className="mr-1 h-3 w-3" /> : 
          <ArrowDown className="mr-1 h-3 w-3" />
        }
        {formatCurrency(absValue)} from last month
      </p>
    )
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-5 w-24 bg-gray-200 animate-pulse rounded"></div>
              <div className="h-3 w-32 bg-gray-200 animate-pulse rounded mt-2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Error Loading Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">{error}</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {overview ? formatCurrency(overview.currentMonth.balance) : '$0.00'}
          </div>
          {overview && getDifferenceDisplay(overview.difference.balance)}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {overview ? formatCurrency(overview.currentMonth.income) : '$0.00'}
          </div>
          {overview && getDifferenceDisplay(overview.difference.income)}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Monthly Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {overview ? formatCurrency(overview.currentMonth.expenses) : '$0.00'}
          </div>
          {overview && getDifferenceDisplay(overview.difference.expenses, true)}
        </CardContent>
      </Card>
    </div>
  )
}