"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, RefreshCcw, ArrowDownIcon, SearchIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { transactionsAPI, categoriesAPI } from "@/lib/api"
import { TransactionDetailsDialog } from "@/components/transactions/transaction-details-dialog"

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

export function RecentTransactions({ showAll = false }: RecentTransactionsProps) {
  // Controlar estado de hidratación
  const [isMounted, setIsMounted] = useState(false)
  
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [yearFilter, setYearFilter] = useState<string>("all")
  const [monthFilter, setMonthFilter] = useState<string>("all")
  const [weekFilter, setWeekFilter] = useState<string>("all")
  
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
        
        // Usar el año 2025 explícitamente para probar, ya que sabemos que hay datos para ese año
        if (yearFilter === "all" && years.includes("2025")) {
          console.log("[TRANSACTIONS] Setting explicit year filter to 2025 for testing")
          filters.year = "2025"
        }
        
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
                category: t.category_name || "Other",
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
        
        // Combine and format categories
        const allCategories = [
          ...systemCategories.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            type: cat.type,
            source: 'system'
          })),
          ...userCategories.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            type: cat.type,
            source: 'user'
          }))
        ]
        
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
              category: t.category_name || "Other",
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

  // El resto del componente se mantiene igual...
  return (
    <div className="space-y-4">
      {showAll && (
        <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search transactions..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categoriesList.map((category, index) => (
                <SelectItem key={`category-${category.id}-${index}`} value={category.name.toLowerCase()}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
            </SelectContent>
          </Select>

          {/* New date filters */}
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-full md:w-[120px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {years.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="w-full md:w-[120px]">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              <SelectItem value="1">January</SelectItem>
              <SelectItem value="2">February</SelectItem>
              <SelectItem value="3">March</SelectItem>
              <SelectItem value="4">April</SelectItem>
              <SelectItem value="5">May</SelectItem>
              <SelectItem value="6">June</SelectItem>
              <SelectItem value="7">July</SelectItem>
              <SelectItem value="8">August</SelectItem>
              <SelectItem value="9">September</SelectItem>
              <SelectItem value="10">October</SelectItem>
              <SelectItem value="11">November</SelectItem>
              <SelectItem value="12">December</SelectItem>
            </SelectContent>
          </Select>

          <Select value={weekFilter} onValueChange={setWeekFilter}>
            <SelectTrigger className="w-full md:w-[120px]">
              <SelectValue placeholder="Week" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Weeks</SelectItem>
              <SelectItem value="1">Week 1</SelectItem>
              <SelectItem value="2">Week 2</SelectItem>
              <SelectItem value="3">Week 3</SelectItem>
              <SelectItem value="4">Week 4</SelectItem>
              <SelectItem value="5">Week 5</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm("")
              setCategoryFilter("all")
              setTypeFilter("all")
              setYearFilter("all")
              setMonthFilter("all")
              setWeekFilter("all")
            }}
            className="w-full md:w-auto"
          >
            Clear Filters
          </Button>
        </div>
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

      <div className="rounded-md border">
        <Table>
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

