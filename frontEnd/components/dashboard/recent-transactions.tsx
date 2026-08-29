"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, RefreshCcw, ArrowDownIcon, SearchIcon, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { transactionsAPI, categoriesAPI } from "@/lib/api"
import { TransactionDetailsDialog } from "@/components/transactions/transaction-details-dialog"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"

interface Transaction {
  id: string
  date: string
  description: string
  category: string
  amount: number
  type: "income" | "expense"
  icon?: React.ReactNode
}

interface RecentTransactionsProps {
  showAll?: boolean
}

interface FilterCategory { id: string; name: string }

interface TransactionFilterControlsProps {
  className?: string
  searchTerm: string
  setSearchTerm: (value: string) => void
  categoryFilter: string
  setCategoryFilter: (value: string) => void
  typeFilter: string
  setTypeFilter: (value: string) => void
  yearFilter: string
  setYearFilter: (value: string) => void
  monthFilter: string
  setMonthFilter: (value: string) => void
  weekFilter: string
  setWeekFilter: (value: string) => void
  categories: FilterCategory[]
  years: string[]
  onClear: () => void
}

function TransactionFilterControls({ className, searchTerm, setSearchTerm, categoryFilter, setCategoryFilter, typeFilter, setTypeFilter, yearFilter, setYearFilter, monthFilter, setMonthFilter, weekFilter, setWeekFilter, categories, years, onClear }: TransactionFilterControlsProps) {
  return (
    <div className={cn("space-y-3 md:flex md:space-x-2 md:space-y-0", className)}>
      <div className="relative flex-1">
        <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input type="search" placeholder="Buscar movimientos..." className="pl-8" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
      </div>
      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
        <SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Categoría" /></SelectTrigger>
        <SelectContent><SelectItem value="all">Todas las categorías</SelectItem>{categories.map((category, index) => <SelectItem key={`category-${category.id}-${index}`} value={category.name.toLowerCase()}>{category.name}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={typeFilter} onValueChange={setTypeFilter}>
        <SelectTrigger className="w-full md:w-[150px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
        <SelectContent><SelectItem value="all">Todos los tipos</SelectItem><SelectItem value="income">Ingreso</SelectItem><SelectItem value="expense">Gasto</SelectItem></SelectContent>
      </Select>
      <Select value={yearFilter} onValueChange={setYearFilter}>
        <SelectTrigger className="w-full md:w-[115px]"><SelectValue placeholder="Año" /></SelectTrigger>
        <SelectContent><SelectItem value="all">Todos</SelectItem>{years.map((year) => <SelectItem key={year} value={year}>{year}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={monthFilter} onValueChange={setMonthFilter}>
        <SelectTrigger className="w-full md:w-[130px]"><SelectValue placeholder="Mes" /></SelectTrigger>
        <SelectContent><SelectItem value="all">Todos los meses</SelectItem>{["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].map((month, index) => <SelectItem key={month} value={String(index + 1)}>{month}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={weekFilter} onValueChange={setWeekFilter}>
        <SelectTrigger className="w-full md:w-[120px]"><SelectValue placeholder="Semana" /></SelectTrigger>
        <SelectContent><SelectItem value="all">Todas</SelectItem>{[1, 2, 3, 4, 5].map((week) => <SelectItem key={week} value={String(week)}>Semana {week}</SelectItem>)}</SelectContent>
      </Select>
      <Button variant="outline" onClick={onClear} className="w-full md:w-auto">Limpiar</Button>
    </div>
  )
}

export function RecentTransactions({ showAll = false }: RecentTransactionsProps) {
  const isMobile = useIsMobile()
  // Controlar estado de hidratación
  const [isMounted, setIsMounted] = useState(false)
  
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [yearFilter, setYearFilter] = useState<string>("all")
  const [monthFilter, setMonthFilter] = useState<string>("all")
  const [weekFilter, setWeekFilter] = useState<string>("all")
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  
  const [apiTransactions, setApiTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [years, setYears] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  
  // Transaction details dialog state
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false)
  const [selectedTransactionId, setSelectedTransactionId] = useState<string>("")
  
  // Montar el componente solo en el cliente
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  // Fetch transactions when filters change - solo se ejecuta en el cliente
  useEffect(() => {
    if (!isMounted) return;
    
    async function fetchTransactions() {
      try {
        setIsLoading(true)
        setError(null)
        const filters = {
          year: yearFilter !== "all" ? yearFilter : undefined,
          month: monthFilter !== "all" ? monthFilter : undefined,
          week: weekFilter !== "all" ? weekFilter : undefined,
          category: categoryFilter !== "all" ? categoryFilter : undefined,
          type: typeFilter !== "all" ? typeFilter : undefined,
          search: searchTerm || undefined
        }
        
        console.log("[TRANSACTIONS] Fetching transactions with filters:", filters)
        console.log("[TRANSACTIONS] Current yearFilter state:", yearFilter)
        console.log("[TRANSACTIONS] years array:", years)
        
        // REMOVED: Previously hardcoded year=2025 filter that was hiding transactions from other years
        // The yearFilter="all" should correctly return all transactions without year restriction
        
        // Llamada directa a getAll con los filtros ajustados
        const response = await transactionsAPI.getAll(filters)
        console.log("[TRANSACTIONS] API Raw Response:", response)
        
        // Handle potential response structure variations
        let transactionsData = [];
        
        if (response.data?.data?.transactions) {
          transactionsData = response.data.data.transactions;
          console.log("[TRANSACTIONS] Found in response.data.data.transactions:", transactionsData.length)
        } else if (response.data?.transactions) {
          transactionsData = response.data.transactions;
          console.log("[TRANSACTIONS] Found in response.data.transactions:", transactionsData.length)
        } else if (response.data?.data) {
          // Intentar buscar directamente en data si tiene una estructura de array
          if (Array.isArray(response.data.data)) {
            transactionsData = response.data.data;
            console.log("[TRANSACTIONS] Found array in response.data.data:", transactionsData.length)
          }
        }
        
        console.log("[TRANSACTIONS] Response structure:", JSON.stringify(Object.keys(response.data)))
        if (response.data?.data) {
          console.log("[TRANSACTIONS] Data structure:", JSON.stringify(Object.keys(response.data.data)))
        }
        
        if (Array.isArray(transactionsData) && transactionsData.length > 0) {
          console.log("[TRANSACTIONS] Ejemplo de transacción:", transactionsData[0])
        } else {
          console.log("[TRANSACTIONS] No se encontraron transacciones o la respuesta no es un array")
          console.log("[TRANSACTIONS] Estructura completa:", JSON.stringify(response.data).substring(0, 500))
        }
        
        // Transform the API response to match our Transaction interface
        const transformedTransactions = Array.isArray(transactionsData) 
          ? transactionsData.map((t: any) => {
              console.log("[TRANSACTIONS] Procesando transacción:", t.id, t.title)
              return {
                id: t.id,
                date: t.transaction_date,
                description: t.title,
                category: t.category || t.category_name || "Other",
                amount: parseFloat(t.amount),
                type: t.type,
                // Add icons based on category or type
                icon: t.type === "income" 
                  ? <ArrowDownIcon className="h-4 w-4 text-green-500" />
                  : <ArrowDownIcon className="h-4 w-4 text-red-500" />
              }
            })
          : [];
        
        console.log("[TRANSACTIONS] Total de transacciones transformadas:", transformedTransactions.length)
        setApiTransactions(transformedTransactions)
      } catch (error) {
        console.error("[TRANSACTIONS] Error al obtener transacciones:", error)
        setError("No se pudieron cargar las transacciones. Intente nuevamente más tarde.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchTransactions()
  }, [isMounted, searchTerm, categoryFilter, typeFilter, yearFilter, monthFilter, weekFilter, years])

  // Fetch filter options on component mount - solo se ejecuta en el cliente
  useEffect(() => {
    if (!isMounted) return;
    
    async function fetchFilterOptions() {
      try {
        // Get years first since it's critical
        try {
          console.log("[TRANSACTIONS] Obteniendo años de transacciones")
          const yearsResponse = await transactionsAPI.getYears()
          console.log("[TRANSACTIONS] Respuesta de años:", yearsResponse.data)
          
          const yearsData = yearsResponse?.data?.data?.years || []
          if (yearsData.length > 0) {
            const yearsArray = yearsData.map((y: any) => y.year?.toString() || new Date().getFullYear().toString())
            console.log("[TRANSACTIONS] Años disponibles:", yearsArray)
            setYears(yearsArray)
          } else {
            console.log("[TRANSACTIONS] No se encontraron años, usando año actual")
            setYears([new Date().getFullYear().toString()])
          }
        } catch (error) {
          console.error("[TRANSACTIONS] Error al obtener años:", error)
          setYears([new Date().getFullYear().toString()])
        }
        
        // Get categories
        const categoriesPromises = [
          categoriesAPI.getAll().catch(() => ({ data: { data: { categories: [] } } })),
          categoriesAPI.getUserCategories().catch(() => ({ data: { data: { categories: [] } } }))
        ];
        
        const [systemCategoriesResponse, userCategoriesResponse] = await Promise.all(categoriesPromises);
        
        const systemCategories = systemCategoriesResponse?.data?.data?.categories || []
        const userCategories = userCategoriesResponse?.data?.data?.categories || []
        
        // Combine and format categories (deduplicate by ID since /categories returns both default + user)
        const categoryMap = new Map()
        
        systemCategories.forEach((cat: any) => {
          if (!categoryMap.has(cat.id)) {
            categoryMap.set(cat.id, {
              id: cat.id,
              name: cat.name,
              type: cat.type,
              source: 'system'
            })
          }
        })
        
        userCategories.forEach((cat: any) => {
          if (!categoryMap.has(cat.id)) {
            categoryMap.set(cat.id, {
              id: cat.id,
              name: cat.name,
              type: cat.type,
              source: 'user'
            })
          }
        })
        
        const allCategories = Array.from(categoryMap.values())
        
        if (allCategories.length > 0) {
          console.log("[TRANSACTIONS] Categorías cargadas:", allCategories.length)
          setCategories(allCategories)
        }
      } catch (error) {
        console.error("[TRANSACTIONS] Error al cargar opciones de filtro:", error)
      }
    }

    fetchFilterOptions()
  }, [isMounted])

  // Función para reintentar la carga de datos
  const handleRetry = () => {
    const filters = {
      year: yearFilter !== "all" ? yearFilter : undefined,
      month: monthFilter !== "all" ? monthFilter : undefined,
      week: weekFilter !== "all" ? weekFilter : undefined,
      category: categoryFilter !== "all" ? categoryFilter : undefined,
      type: typeFilter !== "all" ? typeFilter : undefined,
      search: searchTerm || undefined
    }
    
    setIsLoading(true);
    setError(null);
    
    transactionsAPI.getAll(filters)
      .then(response => {
        console.log("[TRANSACTIONS] Respuesta del reintento:", response)
        
        // Handle potential response structure variations
        let transactionsData = [];
        
        if (response.data?.data?.transactions) {
          transactionsData = response.data.data.transactions;
        } else if (response.data?.transactions) {
          transactionsData = response.data.transactions;
        }
        
        const transformedTransactions = Array.isArray(transactionsData) 
          ? transactionsData.map((t: any) => ({
              id: t.id,
              date: t.transaction_date,
              description: t.title,
              category: t.category || t.category_name || "Other",
              amount: parseFloat(t.amount),
              type: t.type,
              icon: t.type === "income" 
                ? <ArrowDownIcon className="h-4 w-4 text-green-500" />
                : <ArrowDownIcon className="h-4 w-4 text-red-500" />
            }))
          : [];
          
        setApiTransactions(transformedTransactions)
        console.log("[TRANSACTIONS] Transacciones cargadas en reintento:", transformedTransactions.length)
      })
      .catch(error => {
        console.error("[TRANSACTIONS] Error en reintento:", error)
        setError("No se pudieron cargar las transacciones. Intente nuevamente más tarde.")
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  // Si aún no estamos en el cliente, mostramos un placeholder
  if (!isMounted) {
    return (
      <div className="space-y-4">
        <div className="flex justify-center py-4">
          <div className="animate-pulse h-64 w-full bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  // Use API data only
  const displayTransactions = showAll 
    ? apiTransactions 
    : apiTransactions.slice(0, 5)

  // Use categories from API when available
  const categoriesList = categories.length > 0 ? categories : []
  
  // Function to handle transaction click to open the details dialog
  const handleTransactionClick = (transactionId: string) => {
    setSelectedTransactionId(transactionId)
    setIsTransactionDialogOpen(true)
  }
  
  // Function to refresh transactions after update or delete
  const handleTransactionUpdated = () => {
    // Refresh transaction list
    handleRetry()
  }

  const clearFilters = () => {
    setSearchTerm("")
    setCategoryFilter("all")
    setTypeFilter("all")
    setYearFilter("all")
    setMonthFilter("all")
    setWeekFilter("all")
  }

  const activeFilterCount = [categoryFilter, typeFilter, yearFilter, monthFilter, weekFilter].filter((value) => value !== "all").length + (searchTerm ? 1 : 0)

  const filterControlProps = {
    searchTerm, setSearchTerm, categoryFilter, setCategoryFilter, typeFilter, setTypeFilter,
    yearFilter, setYearFilter, monthFilter, setMonthFilter, weekFilter, setWeekFilter,
    categories: categoriesList, years, onClear: clearFilters,
  }

  // El resto del componente se mantiene igual...
  return (
    <div className="space-y-4">
      {showAll && (
        isMounted ? (isMobile ? (
          <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="w-full justify-between md:hidden">
                <span className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" />Filtros</span>
                {activeFilterCount > 0 ? <Badge className="rounded-full px-2">{activeFilterCount}</Badge> : null}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[88dvh] rounded-t-2xl">
              <SheetHeader className="text-left">
                <SheetTitle>Filtrar movimientos</SheetTitle>
                <SheetDescription>Reduce la lista por texto, categoría, tipo o periodo.</SheetDescription>
              </SheetHeader>
              <div className="max-h-[62dvh] overflow-y-auto py-5"><TransactionFilterControls {...filterControlProps} /></div>
              <SheetFooter><Button className="w-full" onClick={() => setMobileFiltersOpen(false)}>Ver resultados</Button></SheetFooter>
            </SheetContent>
          </Sheet>
        ) : (
          <TransactionFilterControls {...filterControlProps} />
        )) : null
      )}

      {error && (
        <Alert variant="destructive">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 mt-0.5" />
            <div className="flex-grow">
              <AlertTitle className="text-lg font-semibold">Error al cargar transacciones</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button size="sm" variant="outline" className="flex items-center" onClick={handleRetry}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Reintentar
            </Button>
          </div>
        </Alert>
      )}

      {isLoading && (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      <div className="space-y-2 md:hidden">
        {displayTransactions.length > 0 ? (
          displayTransactions.map((transaction) => (
            <button
              type="button"
              key={transaction.id}
              onClick={() => handleTransactionClick(transaction.id)}
              className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex min-w-0 items-center gap-2 font-medium">
                <span className="shrink-0">{transaction.icon}</span>
                <span className="truncate">{transaction.description}</span>
              </span>
              <span
                className={`whitespace-nowrap text-right font-semibold ${transaction.type === "income" ? "text-green-600" : "text-red-600"}`}
              >
                {transaction.type === "income" ? "+" : "-"}${transaction.amount.toFixed(2)}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(transaction.date).toLocaleDateString("es-MX")}
              </span>
              <Badge variant="outline" className="max-w-[10rem] justify-self-end truncate">
                {transaction.category}
              </Badge>
            </button>
          ))
        ) : (
          <div className="rounded-lg border px-4 py-8 text-center text-sm text-muted-foreground">
            No transactions found.
          </div>
        )}
      </div>

      <div className="hidden rounded-md border md:block">
        <Table className="min-w-[620px]">
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayTransactions.length > 0 ? (
              displayTransactions.map((transaction) => (
                <TableRow 
                  key={transaction.id} 
                  onClick={() => handleTransactionClick(transaction.id)}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell className="font-medium">{new Date(transaction.date).toLocaleDateString()}</TableCell>
                  <TableCell className="flex items-center gap-2">
                    {transaction.icon}
                    {transaction.description}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{transaction.category}</Badge>
                  </TableCell>
                  <TableCell
                    className={`text-right ${transaction.type === "income" ? "text-green-600" : "text-red-600"}`}
                  >
                    {transaction.type === "income" ? "+" : "-"}${transaction.amount.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No transactions found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {showAll && (
        <div className="flex items-center justify-center">
          <Button variant="outline">Load More</Button>
        </div>
      )}
      
      {/* Transaction Details Dialog */}
      <TransactionDetailsDialog
        isOpen={isTransactionDialogOpen}
        onClose={() => setIsTransactionDialogOpen(false)}
        transactionId={selectedTransactionId}
        onTransactionUpdated={handleTransactionUpdated}
      />
    </div>
  )
}

