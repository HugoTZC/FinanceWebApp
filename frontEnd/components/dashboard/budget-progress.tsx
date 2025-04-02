"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus } from "lucide-react"

interface BudgetCategory {
  id: string
  name: string
  budgeted: number
  spent: number
  color: string
}

const budgetCategories: BudgetCategory[] = [
  {
    id: "b1",
    name: "Housing",
    budgeted: 2000,
    spent: 1800,
    color: "bg-green-500",
  },
  {
    id: "b2",
    name: "Food",
    budgeted: 1000,
    spent: 800,
    color: "bg-blue-500",
  },
  {
    id: "b3",
    name: "Transportation",
    budgeted: 800,
    spent: 600,
    color: "bg-red-500",
  },
  {
    id: "b4",
    name: "Entertainment",
    budgeted: 500,
    spent: 400,
    color: "bg-yellow-500",
  },
  {
    id: "b5",
    name: "Utilities",
    budgeted: 400,
    spent: 350,
    color: "bg-purple-500",
  },
  {
    id: "b6",
    name: "Shopping",
    budgeted: 600,
    spent: 250,
    color: "bg-orange-500",
  },
  {
    id: "b7",
    name: "Healthcare",
    budgeted: 300,
    spent: 150,
    color: "bg-teal-500",
  },
  {
    id: "b8",
    name: "Education",
    budgeted: 400,
    spent: 200,
    color: "bg-indigo-500",
  },
]

interface BudgetProgressProps {
  showAll?: boolean
}

export function BudgetProgress({ showAll = false }: BudgetProgressProps) {
  const [activeTab, setActiveTab] = useState("all")

  const displayCategories = showAll ? budgetCategories : budgetCategories.slice(0, 4)

  const totalBudgeted = budgetCategories.reduce((sum, category) => sum + category.budgeted, 0)
  const totalSpent = budgetCategories.reduce((sum, category) => sum + category.spent, 0)
  const percentSpent = Math.round((totalSpent / totalBudgeted) * 100)

  return (
    <div className="space-y-4">
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
          const percentSpent = Math.round((category.spent / category.budgeted) * 100)
          return (
            <div key={category.id} className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">{category.name}</span>
                <span className="text-sm font-medium">
                  ${category.spent.toFixed(2)} / ${category.budgeted.toFixed(2)}
                </span>
              </div>
              <Progress value={percentSpent} className={`h-2 ${category.color}`} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{percentSpent}% spent</span>
                <span>${(category.budgeted - category.spent).toFixed(2)} left</span>
              </div>
            </div>
          )
        })}
      </div>

      {showAll && (
        <Button variant="outline" className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Add Budget Category
        </Button>
      )}
    </div>
  )
}

