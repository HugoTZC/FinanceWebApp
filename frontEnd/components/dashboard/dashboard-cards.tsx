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
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 pb-1 sm:p-5 sm:pb-2">
        <CardTitle className="line-clamp-2 text-[11px] font-medium leading-tight text-muted-foreground sm:text-sm">{title}</CardTitle>
        <span className={cn("hidden rounded-lg border bg-background p-2 text-muted-foreground sm:inline-flex", featured && "border-amber-300 text-amber-700 dark:text-amber-300")}>{icon}</span>
      </CardHeader>
      <CardContent className="p-2 pt-1 sm:p-5 sm:pt-1">
        <p className="truncate text-sm font-bold tracking-tight min-[430px]:text-base sm:text-3xl">{formatCurrency(value)}</p>
        <div className="mt-2 flex min-w-0 flex-col gap-1 sm:mt-3 sm:flex-row sm:items-center sm:gap-2">
          <Badge variant="secondary" className={cn("gap-1 font-medium", unchanged ? "text-muted-foreground" : improved ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300")}>
            {!unchanged ? <TrendIcon className="h-3.5 w-3.5" /> : null}
            <span className="truncate">{formatCurrency(Math.abs(difference))}</span>
          </Badge>
          <span className="hidden text-xs text-muted-foreground sm:inline">vs. mes anterior</span>
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
    return <div className="grid grid-cols-3 gap-2 sm:gap-3">{[0, 1, 2].map((item) => <Card key={item} className="min-w-0 border-border/70 shadow-sm"><CardHeader className="p-2 pb-1 sm:p-5 sm:pb-2"><Skeleton className="h-4 w-full max-w-28" /></CardHeader><CardContent className="space-y-2 p-2 pt-1 sm:space-y-3 sm:p-5 sm:pt-1"><Skeleton className="h-6 w-full max-w-44 sm:h-9" /><Skeleton className="h-5 w-full max-w-36 sm:h-6" /></CardContent></Card>)}</div>
  }

  if (error || !overview) {
    return <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Resumen no disponible</AlertTitle><AlertDescription>{error ?? "No hay información financiera para mostrar."}</AlertDescription></Alert>
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      <MetricCard title="Balance disponible" value={overview.currentMonth.balance} difference={overview.difference.balance} icon={<WalletCards className="h-5 w-5" />} featured />
      <MetricCard title="Ingresos del mes" value={overview.currentMonth.income} difference={overview.difference.income} icon={<TrendingUp className="h-5 w-5" />} />
      <MetricCard title="Gastos del mes" value={overview.currentMonth.expenses} difference={overview.difference.expenses} icon={<TrendingDown className="h-5 w-5" />} inverse />
    </div>
  )
}
