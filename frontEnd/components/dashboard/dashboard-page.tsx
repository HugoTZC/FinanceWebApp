"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Overview } from "@/components/dashboard/overview"
import { RecentTransactions } from "@/components/dashboard/recent-transactions"
import { CategoryBreakdown } from "@/components/dashboard/category-breakdown"
import { CreditCards } from "@/components/dashboard/credit-cards"
import { SavingsOverview } from "@/components/dashboard/savings-overview"
import { BudgetProgress } from "@/components/dashboard/budget-progress"
import { AnalysisTab } from "@/components/dashboard/analysis-tab"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardCards } from "@/components/dashboard/dashboard-cards"

export function DashboardPage() {
  const [activeTab, setActiveTab] = useState("overview")
  const [selectedMonth, setSelectedMonth] = useState<string | undefined>(undefined)

  const handleMonthSelect = (month: string) => {
    setSelectedMonth(month === selectedMonth ? undefined : month)
  }

  return (
    <>
      <DashboardHeader />
      <main className="flex-1 p-4 md:p-6 space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's an overview of your finances.</p>
        </div>

        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-2 md:grid-cols-6 lg:grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="budget">Budget</TabsTrigger>
            <TabsTrigger value="savings">Savings</TabsTrigger>
            <TabsTrigger value="credit">Credit</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Dashboard Cards displaying financial data */}
            <DashboardCards />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="lg:col-span-4">
                <CardHeader>
                  <CardTitle>Overview</CardTitle>
                  <CardDescription>
                    Your income and expenses for the past 6 months.
                    {!selectedMonth && (
                      <span className="block text-xs mt-1">(Click on a month to see detailed breakdown)</span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                  <Overview onMonthSelect={handleMonthSelect} selectedMonth={selectedMonth} />
                </CardContent>
              </Card>
              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle>Category Breakdown</CardTitle>
                  <CardDescription>
                    Your spending by category {selectedMonth ? `for ${selectedMonth}` : "this month"}.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CategoryBreakdown selectedMonth={selectedMonth} />
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="lg:col-span-4">
                <CardHeader>
                  <CardTitle>Recent Transactions</CardTitle>
                  <CardDescription>Your most recent transactions.</CardDescription>
                </CardHeader>
                <CardContent>
                  <RecentTransactions />
                </CardContent>
              </Card>
              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle>Budget Progress</CardTitle>
                  <CardDescription>Your budget progress for this month.</CardDescription>
                </CardHeader>
                <CardContent>
                  <BudgetProgress />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Transactions</CardTitle>
                <CardDescription>Manage and view all your transactions.</CardDescription>
              </CardHeader>
              <CardContent>
                <RecentTransactions showAll />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="budget" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Budget Management</CardTitle>
                <CardDescription>Manage your monthly budget and categories.</CardDescription>
              </CardHeader>
              <CardContent>
                <BudgetProgress showAll />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="savings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Savings & Recurring Payments</CardTitle>
                <CardDescription>Manage your savings and recurring payments.</CardDescription>
              </CardHeader>
              <CardContent>
                <SavingsOverview />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="credit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Credit Management</CardTitle>
                <CardDescription>Manage your credit cards and loans.</CardDescription>
              </CardHeader>
              <CardContent>
                <CreditCards />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            <AnalysisTab />
          </TabsContent>
        </Tabs>
      </main>
    </>
  )
}

