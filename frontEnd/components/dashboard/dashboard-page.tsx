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
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { LayoutDashboard, ListFilter, PiggyBank, ReceiptText, Sparkles, WalletCards } from "lucide-react"

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
      <main className="min-w-0 flex-1 overflow-x-hidden bg-muted/30">
        <div className="mx-auto max-w-[1600px] space-y-5 p-3 sm:p-5 lg:p-8">
        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-2">
            <Badge variant="secondary" className="gap-1.5 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              <Sparkles className="h-3.5 w-3.5" />
              Resumen financiero
            </Badge>
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Tus finanzas, en claro</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">Consulta movimientos, presupuestos y crédito desde un solo lugar.</p>
            </div>
          </div>
          <AddTransactionDialog triggerClassName="h-11 w-full shrink-0 justify-center border-amber-400 bg-amber-400 px-5 text-sm font-semibold text-amber-950 shadow-sm hover:border-amber-300 hover:bg-amber-300 sm:w-auto" />
          </div>
        </div>

        <Tabs defaultValue="overview" value={activeTab} onValueChange={handleTabChange} className="min-w-0 space-y-5">
          <div className="overflow-x-auto pb-1">
          <TabsList className="inline-flex h-11 min-w-full justify-start gap-1 rounded-xl border bg-card p-1 shadow-sm md:grid md:grid-cols-6">
            <TabsTrigger className="min-w-[120px] gap-2 rounded-lg md:min-w-0" value="overview"><LayoutDashboard className="h-4 w-4" />Resumen</TabsTrigger>
            <TabsTrigger className="min-w-[140px] gap-2 rounded-lg md:min-w-0" value="transactions"><ReceiptText className="h-4 w-4" />Movimientos</TabsTrigger>
            <TabsTrigger className="min-w-[125px] gap-2 rounded-lg md:min-w-0" value="budget"><ListFilter className="h-4 w-4" />Presupuesto</TabsTrigger>
            <TabsTrigger className="min-w-[115px] gap-2 rounded-lg md:min-w-0" value="savings"><PiggyBank className="h-4 w-4" />Ahorros</TabsTrigger>
            <TabsTrigger className="min-w-[110px] gap-2 rounded-lg md:min-w-0" value="credit"><WalletCards className="h-4 w-4" />Crédito</TabsTrigger>
            <TabsTrigger className="min-w-[110px] gap-2 rounded-lg md:min-w-0" value="analysis"><Sparkles className="h-4 w-4" />Análisis</TabsTrigger>
          </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-4">
            {/* Dashboard Cards displaying financial data */}
            <DashboardCards />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="min-w-0 border-border/70 shadow-sm lg:col-span-4">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle>Flujo de efectivo</CardTitle>
                  <CardDescription>
                    Ingresos y gastos de los últimos seis meses.
                    {!selectedMonth && (
                      <span className="mt-1 block text-xs">Selecciona un mes para ver su detalle.</span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-2 pb-4 sm:pb-6 sm:pl-2 sm:pr-6">
                  <Overview onMonthSelect={handleMonthSelect} selectedMonth={selectedMonth} />
                </CardContent>
              </Card>
              <Card className="min-w-0 border-border/70 shadow-sm lg:col-span-3">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle>Gastos por categoría</CardTitle>
                  <CardDescription>
                    Distribución {selectedMonth ? `de ${selectedMonth}` : "del mes actual"}.
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
                  <CategoryBreakdown selectedMonth={selectedMonth} />
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="min-w-0 border-border/70 shadow-sm lg:col-span-4">
                <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-3">
                  <CardTitle>Movimientos recientes</CardTitle>
                  <CardDescription>Actividad más reciente de tus cuentas.</CardDescription>
                </CardHeader>
                <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
                  <RecentTransactions />
                </CardContent>
              </Card>
              <Card className="min-w-0 border-border/70 shadow-sm lg:col-span-3">
                <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-3">
                  <CardTitle>Avance del presupuesto</CardTitle>
                  <CardDescription>Seguimiento del presupuesto mensual.</CardDescription>
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
        <Separator className="opacity-60" />
        <p className="pb-2 text-center text-xs text-muted-foreground">FinApp · Información expresada en pesos mexicanos</p>
        </div>
      </main>
    </>
  )
}

