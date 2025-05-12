"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AddSavingsDialog } from "@/components/savings/add-savings-dialog"

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

// Update the savingsGoals array to include weekly targets
const savingsGoals: SavingsGoal[] = [
  {
    id: "s1",
    name: "Emergency Fund",
    target: 10000,
    current: 5000,
    dueDate: "2023-12-31",
    weeklyTarget: 192.31, // Calculated based on weeks until due date
  },
  {
    id: "s2",
    name: "Vacation",
    target: 3000,
    current: 1500,
    dueDate: "2023-08-15",
    weeklyTarget: 214.29, // Calculated based on weeks until due date
  },
  {
    id: "s3",
    name: "New Car",
    target: 20000,
    current: 8000,
    dueDate: "2024-06-30",
    weeklyTarget: 230.77, // Calculated based on weeks until due date
  },
  {
    id: "s4",
    name: "Home Down Payment",
    target: 50000,
    current: 15000,
    dueDate: "2025-01-15",
    weeklyTarget: 481.48, // Calculated based on weeks until due date
  },
]

// Update the recurringPayments array to match the savings goal structure
const recurringPayments: RecurringPayment[] = [
  {
    id: "r1",
    name: "Mortgage",
    amount: 1500,
    current: 500, // Example: already saved $500 towards this month's payment
    dueDate: "2023-07-01",
    frequency: "monthly",
    category: "Housing",
    weeklyTarget: 250, // Need to save $250/week to meet the payment
  },
  {
    id: "r2",
    name: "Car Payment",
    amount: 350,
    current: 150,
    dueDate: "2023-07-15",
    frequency: "monthly",
    category: "Transportation",
    weeklyTarget: 50,
  },
  {
    id: "r3",
    name: "Student Loan",
    amount: 250,
    current: 100,
    dueDate: "2023-07-21",
    frequency: "monthly",
    category: "Education",
    weeklyTarget: 37.5,
  },
  {
    id: "r4",
    name: "Internet",
    amount: 80,
    current: 0,
    dueDate: "2023-07-05",
    frequency: "monthly",
    category: "Utilities",
    weeklyTarget: 20,
  },
  {
    id: "r5",
    name: "Phone Bill",
    amount: 65,
    current: 30,
    dueDate: "2023-07-10",
    frequency: "monthly",
    category: "Utilities",
    weeklyTarget: 8.75,
  },
]

export function SavingsOverview() {
  const [activeTab, setActiveTab] = useState("goals")

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
          <div className="grid gap-4 md:grid-cols-2">{savingsGoals.map((goal) => renderSavingsCard(goal))}</div>

          <AddSavingsDialog />
        </TabsContent>

        <TabsContent value="recurring" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {recurringPayments.map((payment) => renderSavingsCard(payment, true))}
          </div>

          <AddSavingsDialog />
        </TabsContent>
      </Tabs>
    </div>
  )
}

