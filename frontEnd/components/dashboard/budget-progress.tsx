"use client"

import { useState, useEffect } from "react"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle } from "lucide-react"
import { AddBudgetDialog } from "@/components/budget/add-budget-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { budgetAPI } from "@/lib/api"

interface BudgetCategory {
  id: string
  name: string
  budgeted: number
  spent: number
  remaining: number
  color: string
  type: "essential" | "discretionary"
  category_group: string
}

interface BudgetProgressProps {
  showAll?: boolean
}

export function BudgetProgress({ showAll = false }: BudgetProgressProps) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("all")
  const [budgets, setBudgets] = useState<BudgetCategory[]>([])
  const [refreshKey, setRefreshKey] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [alerts, setAlerts] = useState<any[]>([])

  // Fetch budgets from API
  useEffect(() => {
    async function fetchBudgets() {
      try {
        setIsLoading(true)
        const currentDate = new Date()
        const currentYear = currentDate.getFullYear()
        const currentMonth = currentDate.getMonth() + 1 // JavaScript months are 0-based
        
        const response = await budgetAPI.getBudget(currentYear, currentMonth)
        
        // Transform API data to match our interface
        const transformedBudgets = response.data.data.budget.categories.map((cat: any) => ({
          id: cat.id,
          name: cat.category_name || cat.user_category_name,
          budgeted: parseFloat(cat.amount),
          spent: parseFloat(cat.spent || 0),
          remaining: parseFloat(cat.remaining || 0),
          color: cat.color || cat.user_category_color || "bg-gray-500",
          type: (cat.category_group || cat.user_category_group || "essential").toLowerCase(),
          category_group: cat.category_group || cat.user_category_group || "Essential"
        }))

        setBudgets(transformedBudgets)
      } catch (error) {
        console.error("Failed to fetch budgets:", error)
        toast({
          title: "Error",
          description: "Failed to load budget data",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    // Fetch budget alerts
    async function fetchAlerts() {
      try {
        const response = await budgetAPI.getBudgetAlerts()
        setAlerts(response.data.data.alerts)
      } catch (error) {
        console.error("Failed to fetch budget alerts:", error)
      }
    }

    fetchBudgets()
    fetchAlerts()
  }, [refreshKey, toast])

  // Handle alert dismissal
  const dismissAlert = async (alertId: string) => {
    try {
      await budgetAPI.dismissBudgetAlert(alertId)
      setAlerts(alerts.filter(alert => alert.id !== alertId))
    } catch (error) {
      console.error("Failed to dismiss alert:", error)
      toast({
        title: "Error",
        description: "Failed to dismiss alert",
        variant: "destructive",
      })
    }
  }

  const handleBudgetAdded = () => {
    // Refresh the budgets list
    setRefreshKey(prev => prev + 1)
  }

  const displayCategories = showAll
    ? activeTab === "all"
      ? budgets
      : budgets.filter(category => category.type === activeTab)
    : budgets.slice(0, 4)

  const totalBudgeted = budgets.reduce((sum, category) => sum + category.budgeted, 0)
  const totalSpent = budgets.reduce((sum, category) => sum + category.spent, 0)
  const percentSpent = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          {/* Show budget alerts */}
          {alerts.length > 0 && (
            <Alert className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <div>
                  <AlertTitle>Budget Alert</AlertTitle>
                  <AlertDescription>
                    {alerts.length === 1
                      ? `You're at ${alerts[0].threshold_percentage}% of your ${alerts[0].category_name} budget.`
                      : `You have budget alerts for ${alerts.length} categories.`}
                  </AlertDescription>
                </div>
              </div>
              {alerts.length === 1 && (
                <Button variant="ghost" size="sm" onClick={() => dismissAlert(alerts[0].id)}>
                  Dismiss
                </Button>
              )}
            </Alert>
          )}

          {showAll && (
            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="essential">Essential</TabsTrigger>
                <TabsTrigger value="discretionary">Discretionary</TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Total Budget</span>
              <span className="text-sm font-medium">
                ${totalSpent.toFixed(2)} / ${totalBudgeted.toFixed(2)}
              </span>
            </div>
            <Progress value={percentSpent} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{percentSpent}% spent</span>
              <span>{100 - percentSpent}% remaining</span>
            </div>
          </div>

          <div className="space-y-4">
            {displayCategories.map((category) => {
              const percentSpent = category.budgeted > 0 
                ? Math.round((category.spent / category.budgeted) * 100)
                : 0
              return (
                <div key={category.id} className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">{category.name}</span>
                    <span className="text-sm font-medium">
                      ${category.spent.toFixed(2)} / ${category.budgeted.toFixed(2)}
                    </span>
                  </div>
                  <Progress
                    value={percentSpent}
                    className={`h-2 ${category.color} ${percentSpent >= 85 ? "animate-pulse" : ""}`}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{percentSpent}% spent</span>
                    <span>${category.remaining.toFixed(2)} left</span>
                  </div>
                </div>
              )
            })}
          </div>

          {showAll && <AddBudgetDialog onBudgetAdded={handleBudgetAdded} />}
        </>
      )}
    </div>
  )
}

