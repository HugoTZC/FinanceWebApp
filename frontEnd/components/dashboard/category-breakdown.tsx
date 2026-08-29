"use client"

import { useState, useEffect } from "react"
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { dashboardAPI } from "@/lib/api"
import { useIsMobile } from "@/hooks/use-mobile"

// Sample data for each month - used as fallback
const monthlyData = {
  Jan: [
    { name: "Housing", value: 1700, color: "#4ade80" },
    { name: "Food", value: 750, color: "#60a5fa" },
    { name: "Transportation", value: 550, color: "#f87171" },
    { name: "Entertainment", value: 350, color: "#fbbf24" },
    { name: "Utilities", value: 320, color: "#a78bfa" },
    { name: "Other", value: 230, color: "#fb923c" },
  ],
  Feb: [
    { name: "Housing", value: 1750, color: "#4ade80" },
    { name: "Food", value: 780, color: "#60a5fa" },
    { name: "Transportation", value: 580, color: "#f87171" },
    { name: "Entertainment", value: 380, color: "#fbbf24" },
    { name: "Utilities", value: 330, color: "#a78bfa" },
    { name: "Other", value: 240, color: "#fb923c" },
  ],
  Mar: [
    { name: "Housing", value: 1800, color: "#4ade80" },
    { name: "Food", value: 800, color: "#60a5fa" },
    { name: "Transportation", value: 600, color: "#f87171" },
    { name: "Entertainment", value: 400, color: "#fbbf24" },
    { name: "Utilities", value: 350, color: "#a78bfa" },
    { name: "Other", value: 250, color: "#fb923c" },
  ],
  Apr: [
    { name: "Housing", value: 1800, color: "#4ade80" },
    { name: "Food", value: 820, color: "#60a5fa" },
    { name: "Transportation", value: 620, color: "#f87171" },
    { name: "Entertainment", value: 420, color: "#fbbf24" },
    { name: "Utilities", value: 360, color: "#a78bfa" },
    { name: "Other", value: 260, color: "#fb923c" },
  ],
  May: [
    { name: "Housing", value: 1800, color: "#4ade80" },
    { name: "Food", value: 790, color: "#60a5fa" },
    { name: "Transportation", value: 590, color: "#f87171" },
    { name: "Entertainment", value: 390, color: "#fbbf24" },
    { name: "Utilities", value: 340, color: "#a78bfa" },
    { name: "Other", value: 240, color: "#fb923c" },
  ],
  Jun: [
    { name: "Housing", value: 1800, color: "#4ade80" },
    { name: "Food", value: 800, color: "#60a5fa" },
    { name: "Transportation", value: 600, color: "#f87171" },
    { name: "Entertainment", value: 400, color: "#fbbf24" },
    { name: "Utilities", value: 350, color: "#a78bfa" },
    { name: "Other", value: 250, color: "#fb923c" },
  ],
}

// Default data (used when no month is selected)
const defaultData = [
  { name: "Housing", value: 1800, color: "#4ade80" },
  { name: "Food", value: 800, color: "#60a5fa" },
  { name: "Transportation", value: 600, color: "#f87171" },
  { name: "Entertainment", value: 400, color: "#fbbf24" },
  { name: "Utilities", value: 350, color: "#a78bfa" },
  { name: "Other", value: 250, color: "#fb923c" },
]

interface CategoryBreakdownProps {
  selectedMonth?: string
}

export function CategoryBreakdown({ selectedMonth }: CategoryBreakdownProps) {
  const isMobile = useIsMobile()
  const [apiData, setApiData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    async function fetchCategoryData() {
      try {
        setIsLoading(true)
        const currentYear = new Date().getFullYear()
        
        // If a month is selected, fetch data for that specific month
        if (selectedMonth) {
          // Convert month name to number
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
          const monthNumber = monthNames.indexOf(selectedMonth) + 1
          
          if (monthNumber > 0) {
            console.log("[CategoryBreakdown] Fetching for month:", selectedMonth, "(", monthNumber, ") year:", currentYear)
            const response = await dashboardAPI.getCategoryBreakdown(currentYear, monthNumber.toString())
            console.log("[CategoryBreakdown] API Response:", response)
            console.log("[CategoryBreakdown] response.data.data:", response?.data?.data)
            if (response?.data?.data) {
              console.log("[CategoryBreakdown] Setting API data:", response.data.data)
              setApiData(response.data.data)
            } else {
              console.log("[CategoryBreakdown] No data from API, will use fallback")
            }
          }
        } else {
          // Otherwise fetch data for the current month
          console.log("[CategoryBreakdown] Fetching for current month, year:", currentYear)
          const response = await dashboardAPI.getCategoryBreakdown(currentYear)
          console.log("[CategoryBreakdown] API Response:", response)
          console.log("[CategoryBreakdown] response.data.data:", response?.data?.data)
          if (response?.data?.data) {
            console.log("[CategoryBreakdown] Setting API data:", response.data.data)
            setApiData(response.data.data)
          } else {
            console.log("[CategoryBreakdown] No data from API, will use fallback")
          }
        }
      } catch (error) {
        console.error("[CategoryBreakdown] Failed to fetch category breakdown data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCategoryData()
  }, [selectedMonth])

  // Determine which data to use
  let data: any[]
  
  if (apiData.length > 0) {
    // Use API data if available
    data = apiData
  } else if (selectedMonth && monthlyData[selectedMonth as keyof typeof monthlyData]) {
    // Fall back to sample data for the selected month
    data = monthlyData[selectedMonth as keyof typeof monthlyData]
  } else {
    // Use default data as last resort
    data = defaultData
  }

  return (
    <div className="h-[350px] w-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {selectedMonth && (
        <div className="text-sm font-medium text-muted-foreground mb-2">
          Showing categories for: <span className="font-bold text-foreground">{selectedMonth}</span>
        </div>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            label={isMobile ? false : ({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [`$${value}`, ""]}
            labelStyle={{ color: "black" }}
            contentStyle={{
              backgroundColor: "white",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
            }}
          />
          <Legend iconSize={10} wrapperStyle={{ fontSize: isMobile ? 11 : 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

