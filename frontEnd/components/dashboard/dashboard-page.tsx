"use client"

import { useEffect, useState } from "react"
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
import { AddTransactionDialog } from "@/components/transactions/add-transaction-dialog"

const dashboardTabs = new Set(["overview", "transactions", "budget", "savings", "credit", "analysis"])

export function DashboardPage() {
  const [activeTab, setActiveTab] = useState("overview")
  const [selectedMonth, setSelectedMonth] = useState<string | undefined>(undefined)

  const handleMonthSelect = (month: string) => {
    setSelectedMonth(month === selectedMonth ? undefined : month)
  }

  useEffect(() => {
    const syncTabFromHash = () => {
      const requestedTab = window.location.hash.slice(1)
      setActiveTab(dashboardTabs.has(requestedTab) ? requestedTab : "overview")
    }

    syncTabFromHash()
    window.addEventListener("hashchange", syncTabFromHash)
    return () => window.removeEventListener("hashchange", syncTabFromHash)
  }, [])

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    window.history.replaceState(null, "", `#${tab}`)
  }

  return (
    <>
      <DashboardHeader />
      <main className="min-w-0 flex-1 space-y-4 overflow-x-hidden p-3 sm:p-4 md:space-y-6 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="hidden min-w-0 space-y-1 sm:block">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Dashboard</h1>
            <p className="text-sm text-muted-foreground sm:text-base">Welcome back! Here's an overview of your finances.</p>
          </div>
          <AddTransactionDialog triggerClassName="h-12 w-full justify-center border-amber-400 bg-amber-400 text-base font-semibold text-amber-950 shadow-sm hover:border-amber-300 hover:bg-amber-300 sm:w-auto md:hidden" />
        </div>

        <Tabs defaultValue="overview" value={activeTab} onValueChange={handleTabChange} className="min-w-0 space-y-4">
          <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto p-1 md:grid md:grid-cols-6 md:overflow-visible">
            <TabsTrigger className="min-w-[96px] flex-none md:min-w-0" value="overview">Overview</TabsTrigger>
            <TabsTrigger className="min-w-[112px] flex-none md:min-w-0" value="transactions">Transactions</TabsTrigger>
            <TabsTrigger className="min-w-[96px] flex-none md:min-w-0" value="budget">Budget</TabsTrigger>
            <TabsTrigger className="min-w-[96px] flex-none md:min-w-0" value="savings">Savings</TabsTrigger>
            <TabsTrigger className="min-w-[88px] flex-none md:min-w-0" value="credit">Credit</TabsTrigger>
            <TabsTrigger className="min-w-[96px] flex-none md:min-w-0" value="analysis">Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Dashboard Cards displaying financial data */}
            <DashboardCards />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="min-w-0 lg:col-span-4">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle>Overview</CardTitle>
                  <CardDescription>
                    Your income and expenses for the past 6 months.
                    {!selectedMonth && (
                      <span className="block text-xs mt-1">(Click on a month to see detailed breakdown)</span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-2 pb-4 sm:pb-6 sm:pl-2 sm:pr-6">
                  <Overview onMonthSelect={handleMonthSelect} selectedMonth={selectedMonth} />
                </CardContent>
              </Card>
              <Card className="min-w-0 lg:col-span-3">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle>Category Breakdown</CardTitle>
                  <CardDescription>
                    Your spending by category {selectedMonth ? `for ${selectedMonth}` : "this month"}.
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
                  <CategoryBreakdown selectedMonth={selectedMonth} />
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="min-w-0 lg:col-span-4">
                <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-3">
                  <CardTitle>Recent Transactions</CardTitle>
                  <CardDescription>Your most recent transactions.</CardDescription>
                </CardHeader>
                <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
                  <RecentTransactions />
                </CardContent>
              </Card>
              <Card className="min-w-0 lg:col-span-3">
                <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-3">
                  <CardTitle>Budget Progress</CardTitle>
                  <CardDescription>Your budget progress for this month.</CardDescription>
                </CardHeader>
                <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
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

