"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AddSavingsDialog } from "@/components/savings/add-savings-dialog"
import { savingsAPI } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { differenceInWeeks } from "date-fns"

// Update the SavingsGoal interface to include weekly calculation
interface SavingsGoal {
  id: string
  name: string
  target: number
  current: number
  dueDate: string
  weeklyTarget?: number
}

// Update the RecurringPayment interface to match the savings goal structure
interface RecurringPayment {
  id: string
  name: string
  amount: number // This is the target amount
  current: number // This is how much has been saved so far
  dueDate: string
  frequency: "monthly" | "weekly" | "yearly"
  category: string
  weeklyTarget?: number
}

export function SavingsOverview() {
  const [activeTab, setActiveTab] = useState("goals")
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([])
  const [recurringPayments, setRecurringPayments] = useState<RecurringPayment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const { toast } = useToast()

  // Fetch both savings goals and recurring payments from the backend
  useEffect(() => {
    fetchSavingsData()
  }, [refreshTrigger]) // Add refreshTrigger to dependencies

  // This function will be used to refresh data after adding a new goal or payment
  const fetchSavingsData = async () => {
    setIsLoading(true)
    try {
      // Fetch savings goals
      const goalsResponse = await savingsAPI.getGoals()
      if (goalsResponse?.data?.data?.goals) {
        // Transform the data to match our frontend types
        const transformedGoals = goalsResponse.data.data.goals.map((goal: any) => {
          // Calculate weekly target
          const targetDate = new Date(goal.target_date)
          const today = new Date()
          const weeksUntilDue = Math.max(1, differenceInWeeks(targetDate, today))
          const amountNeeded = parseFloat(goal.target_amount) - parseFloat(goal.current_amount)
          const weeklyTarget = amountNeeded > 0 ? amountNeeded / weeksUntilDue : 0

          return {
            id: goal.id,
            name: goal.name,
            target: parseFloat(goal.target_amount),
            current: parseFloat(goal.current_amount),
            dueDate: goal.target_date,
            weeklyTarget: weeklyTarget
          }
        })
        setSavingsGoals(transformedGoals)
      }

      // Fetch recurring payments
      const paymentsResponse = await savingsAPI.getRecurringPayments()
      if (paymentsResponse?.data?.data?.payments) {
        // Transform the data to match our frontend types
        const transformedPayments = paymentsResponse.data.data.payments.map((payment: any) => {
          // Calculate weekly target
          const dueDate = new Date(payment.due_date)
          const today = new Date()
          const weeksUntilDue = Math.max(1, differenceInWeeks(dueDate, today))
          const amountNeeded = parseFloat(payment.amount) - parseFloat(payment.current_amount)
          const weeklyTarget = amountNeeded > 0 ? amountNeeded / weeksUntilDue : 0

          return {
            id: payment.id,
            name: payment.name,
            amount: parseFloat(payment.amount),
            current: parseFloat(payment.current_amount),
            dueDate: payment.due_date,
            frequency: payment.frequency,
            category: payment.category,
            weeklyTarget: weeklyTarget
          }
        })
        setRecurringPayments(transformedPayments)
      }
    } catch (error) {
      console.error("Failed to fetch savings data:", error)
      toast({
        title: "Failed to load",
        description: "Could not load savings data. Please try again later.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Function to refresh data after a new item has been added
  const handleRefresh = () => {
    // Increment refresh trigger to force useEffect to run again
    setRefreshTrigger(prev => prev + 1)
  }

  // Function to render a savings card (used for both goals and recurring payments)
  const renderSavingsCard = (item: SavingsGoal | RecurringPayment, isRecurring = false) => {
    const target = isRecurring ? (item as RecurringPayment).amount : (item as SavingsGoal).target
    const percentComplete = Math.round((item.current / target) * 100)
    const dueDate = new Date(item.dueDate).toLocaleDateString()
    const category = isRecurring ? (item as RecurringPayment).category : null

    return (
      <Card key={item.id} className="border border-border dark:border-opacity-70">
        <CardHeader className="pb-2">
          <div className="flex justify-between">
            <CardTitle className="text-sm font-medium">{item.name}</CardTitle>
            <CardDescription>{dueDate}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm font-medium">
              ${item.current.toFixed(2)} / ${target.toFixed(2)}
            </span>
            <span className="text-sm font-medium">{percentComplete}%</span>
          </div>
          <Progress value={percentComplete} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              ${(target - item.current).toFixed(2)} more to {isRecurring ? "pay" : "reach goal"}
            </span>
            <span>Due: {dueDate}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Save ${item.weeklyTarget?.toFixed(2)} weekly to {isRecurring ? "meet payment" : "reach goal"} on time
          </div>
          {category && <div className="text-xs text-muted-foreground mt-1">Category: {category}</div>}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="goals" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="goals">Savings Goals</TabsTrigger>
          <TabsTrigger value="recurring">Recurring Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="goals" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-4">Loading savings goals...</div>
          ) : savingsGoals.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">{savingsGoals.map((goal) => renderSavingsCard(goal))}</div>
          ) : (
            <div className="text-center py-4">No savings goals found. Add one below!</div>
          )}

          <AddSavingsDialog onSuccess={handleRefresh} />
        </TabsContent>

        <TabsContent value="recurring" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-4">Loading recurring payments...</div>
          ) : recurringPayments.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {recurringPayments.map((payment) => renderSavingsCard(payment, true))}
            </div>
          ) : (
            <div className="text-center py-4">No recurring payments found. Add one below!</div>
          )}

          <AddSavingsDialog onSuccess={handleRefresh} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

