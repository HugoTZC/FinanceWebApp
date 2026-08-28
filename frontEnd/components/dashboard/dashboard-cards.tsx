"use client"

import { useEffect, useState, type ReactNode } from "react"
import { AlertCircle, ArrowDownRight, ArrowUpRight, TrendingDown, TrendingUp, WalletCards } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { dashboardAPI } from "@/lib/api"
import { cn } from "@/lib/utils"

interface DashboardOverview {
  currentMonth: { year: number; month: number; income: number; expenses: number; balance: number }
  lastMonth: { year: number; month: number; income: number; expenses: number; balance: number }
  difference: { income: number; expenses: number; balance: number }
}

interface MetricCardProps {
  title: string
  value: number
  difference: number
  icon: ReactNode
  inverse?: boolean
  featured?: boolean
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 }).format(value)

function MetricCard({ title, value, difference, icon, inverse = false, featured = false }: MetricCardProps) {
  const improved = inverse ? difference < 0 : difference > 0
  const unchanged = difference === 0
  const TrendIcon = improved ? ArrowUpRight : ArrowDownRight

  return (
    <Card className={cn("relative min-w-0 overflow-hidden border-border/70 shadow-sm", featured && "border-amber-400/60 bg-amber-50/60 dark:bg-amber-950/10")}>
      {featured ? <div className="absolute inset-y-0 left-0 w-1 bg-amber-400" /> : null}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2 sm:p-5 sm:pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <span className={cn("rounded-lg border bg-background p-2 text-muted-foreground", featured && "border-amber-300 text-amber-700 dark:text-amber-300")}>{icon}</span>
      </CardHeader>
      <CardContent className="p-4 pt-1 sm:p-5 sm:pt-1">
        <p className="truncate text-2xl font-bold tracking-tight sm:text-3xl">{formatCurrency(value)}</p>
        <div className="mt-3 flex items-center gap-2">
          <Badge variant="secondary" className={cn("gap-1 font-medium", unchanged ? "text-muted-foreground" : improved ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300")}>
            {!unchanged ? <TrendIcon className="h-3.5 w-3.5" /> : null}
            {formatCurrency(Math.abs(difference))}
          </Badge>
          <span className="text-xs text-muted-foreground">vs. mes anterior</span>
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardCards() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchDashboardOverview() {
      try {
        setIsLoading(true)
        const response = await dashboardAPI.getOverview()
        setOverview(response.data.data)
        setError(null)
      } catch (err) {
        console.error("Failed to fetch dashboard overview:", err)
        setError("No fue posible cargar el resumen financiero.")
      } finally {
        setIsLoading(false)
      }
    }
    fetchDashboardOverview()
  }, [])

  if (isLoading) {
    return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((item) => <Card key={item} className="border-border/70 shadow-sm"><CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2"><Skeleton className="h-4 w-28" /></CardHeader><CardContent className="space-y-3 p-4 pt-1 sm:p-5 sm:pt-1"><Skeleton className="h-9 w-44" /><Skeleton className="h-6 w-36" /></CardContent></Card>)}</div>
  }

  if (error || !overview) {
    return <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Resumen no disponible</AlertTitle><AlertDescription>{error ?? "No hay información financiera para mostrar."}</AlertDescription></Alert>
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <MetricCard title="Balance disponible" value={overview.currentMonth.balance} difference={overview.difference.balance} icon={<WalletCards className="h-5 w-5" />} featured />
      <MetricCard title="Ingresos del mes" value={overview.currentMonth.income} difference={overview.difference.income} icon={<TrendingUp className="h-5 w-5" />} />
      <MetricCard title="Gastos del mes" value={overview.currentMonth.expenses} difference={overview.difference.expenses} icon={<TrendingDown className="h-5 w-5" />} inverse />
    </div>
  )
}
