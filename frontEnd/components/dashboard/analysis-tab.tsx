"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { InfoIcon, DollarSign, TrendingUp, Calendar, AlertCircle } from "lucide-react"
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

// Sample data - in a real app, this would come from your API
const financialData = {
  monthlySalary: 4000,
  weeklySalary: 1000,
  monthlyObligations: {
    total: 2850,
    breakdown: [
      { name: "Mortgage/Rent", amount: 1200 },
      { name: "Car Payment", amount: 350 },
      { name: "Student Loans", amount: 250 },
      { name: "Credit Cards", amount: 300 },
      { name: "Utilities", amount: 200 },
      { name: "Insurance", amount: 150 },
      { name: "Phone/Internet", amount: 150 },
      { name: "Groceries", amount: 250 },
    ],
  },
  weeklyTargets: {
    savingsNeeded: 712.5, // $2850 / 4 weeks
    discretionarySpending: 287.5, // $1000 - $712.50
    savingsPercentage: 71.25, // ($712.50 / $1000) * 100
  },
  projectedSavings: [
    { week: "Week 1", target: 712.5, actual: 700 },
    { week: "Week 2", target: 712.5, actual: 725 },
    { week: "Week 3", target: 712.5, actual: 690 },
    { week: "Week 4", target: 712.5, actual: 730 },
  ],
}

export function AnalysisTab() {
  const [timeframe, setTimeframe] = useState("weekly")

  const { monthlySalary, weeklySalary, monthlyObligations, weeklyTargets, projectedSavings } = financialData

  const totalSaved = projectedSavings.reduce((sum, week) => sum + week.actual, 0)
  const totalNeeded = monthlyObligations.total
  const savingsProgress = Math.min(Math.round((totalSaved / totalNeeded) * 100), 100)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Income</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${weeklySalary.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">${monthlySalary.toFixed(2)} monthly</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Savings Target</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${weeklyTargets.savingsNeeded.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {weeklyTargets.savingsPercentage.toFixed(1)}% of weekly income
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Discretionary Budget</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${weeklyTargets.discretionarySpending.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Available weekly after savings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Obligations</CardTitle>
            <InfoIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${monthlyObligations.total.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Total monthly payments due</p>
          </CardContent>
        </Card>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Financial Planning Insight</AlertTitle>
        <AlertDescription>
          To meet your monthly obligations of ${monthlyObligations.total.toFixed(2)}, you should save $
          {weeklyTargets.savingsNeeded.toFixed(2)} each week from your ${weeklySalary.toFixed(2)} weekly income.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Monthly Obligations Breakdown</CardTitle>
            <CardDescription>Your recurring monthly payments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {monthlyObligations.breakdown.map((item, index) => {
                const percentage = (item.amount / monthlyObligations.total) * 100
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">{item.name}</span>
                      <span className="text-sm font-medium">
                        ${item.amount.toFixed(2)} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Weekly Savings Progress</CardTitle>
            <CardDescription>Your progress toward this month's obligations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Total Saved</span>
                <span className="text-sm font-medium">
                  ${totalSaved.toFixed(2)} / ${totalNeeded.toFixed(2)}
                </span>
              </div>
              <Progress value={savingsProgress} className="h-2" />
              <div className="text-xs text-muted-foreground">{savingsProgress}% of monthly obligations covered</div>

              <div className="space-y-4 mt-6">
                {projectedSavings.map((week, index) => {
                  const percentage = (week.actual / week.target) * 100
                  const isComplete = percentage >= 100
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">{week.week}</span>
                        <span className="text-sm font-medium">
                          ${week.actual.toFixed(2)} / ${week.target.toFixed(2)}
                        </span>
                      </div>
                      <Progress
                        value={Math.min(percentage, 100)}
                        className={`h-2 ${isComplete ? "bg-green-500" : ""}`}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Savings vs. Target Analysis</CardTitle>
          <CardDescription>Comparing your actual savings to weekly targets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectedSavings}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="week" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
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
                <Bar dataKey="target" name="Target Savings" fill="#4ade80" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" name="Actual Savings" fill="#60a5fa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

