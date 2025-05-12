"use client"
import { useEffect, useState } from "react"
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { dashboardAPI } from "@/lib/api"

// Sample data as fallback
const sampleData = [
  {
    name: "Jan",
    income: 7500,
    expenses: 5200,
  },
  {
    name: "Feb",
    income: 7800,
    expenses: 5400,
  },
  {
    name: "Mar",
    income: 8000,
    expenses: 5600,
  },
  {
    name: "Apr",
    income: 8200,
    expenses: 5800,
  },
  {
    name: "May",
    income: 8000,
    expenses: 5500,
  },
  {
    name: "Jun",
    income: 8464,
    expenses: 5684,
  },
]

interface OverviewProps {
  onMonthSelect?: (month: string) => void
  selectedMonth?: string
}

export function Overview({ onMonthSelect, selectedMonth }: OverviewProps) {
  const [apiData, setApiData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    async function fetchOverviewData() {
      try {
        setIsLoading(true)
        const currentYear = new Date().getFullYear()
        const response = await dashboardAPI.getMonthlyData(currentYear)
        
        if (response?.data?.data) {
          setApiData(response.data.data)
        }
      } catch (error) {
        console.error("Failed to fetch overview data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchOverviewData()
  }, [])

  // Function to handle bar click
  const handleBarClick = (data: any) => {
    if (onMonthSelect) {
      onMonthSelect(data.name)
    }
  }

  // Use API data when available, fall back to sample data if needed
  const chartData = apiData.length > 0 ? apiData : sampleData

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {selectedMonth && (
        <div className="absolute top-0 right-0 text-sm font-medium text-muted-foreground">
          Showing data for: <span className="font-bold text-foreground">{selectedMonth}</span>
        </div>
      )}
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip
            formatter={(value) => [`$${value}`, ""]}
            labelStyle={{ color: "black" }}
            contentStyle={{
              backgroundColor: "white",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
            }}
          />
          <Legend />
          <Bar
            dataKey="income"
            name="Income"
            fill="#4ade80"
            radius={[4, 4, 0, 0]}
            onClick={handleBarClick}
            cursor="pointer"
            className={selectedMonth ? "opacity-80 hover:opacity-100" : ""}
          />
          <Bar
            dataKey="expenses"
            name="Expenses"
            fill="#f87171"
            radius={[4, 4, 0, 0]}
            onClick={handleBarClick}
            cursor="pointer"
            className={selectedMonth ? "opacity-80 hover:opacity-100" : ""}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

