"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { CreditCard, Calendar } from "lucide-react"
import { creditAPI } from "@/lib/api"
import type { CreditCardType, MonthlySpending, CategorySpending, CreditTransaction } from "../../types/credit"
import { TransactionDetailsDialog } from "@/components/transactions/transaction-details-dialog"

export function CreditCardSpending() {
  // Usamos useState con valor inicial null y asignamos el valor en useEffect
  const [selectedCard, setSelectedCard] = useState<string>("")
  const [selectedMonth, setSelectedMonth] = useState<string>("May") // Usar un valor estático en lugar de calcularlo
  const [selectedYear, setSelectedYear] = useState<number>(2025) // Usar un valor estático para el año actual
  
  // State for API data
  const [creditCards, setCreditCards] = useState<CreditCardType[]>([])
  const [monthlySpending, setMonthlySpending] = useState<MonthlySpending[]>([])
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>([])
  const [recentTransactions, setRecentTransactions] = useState<CreditTransaction[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Transaction details dialog state
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false)
  const [selectedTransactionId, setSelectedTransactionId] = useState<string>("")

  // Fetch credit cards from API
  useEffect(() => {
    async function fetchCreditCards() {
      try {
        setIsLoading(true)
        const response = await creditAPI.getCards()
        
        // Log de la estructura completa de la respuesta para depuración
        console.log("Credit API response:", JSON.stringify(response))
        
        // Verificar diferentes estructuras de respuesta posibles
        let cards = []
        if (response?.data?.data?.cards) {
          // Estructura: response.data.data.cards (común en respuestas API RESTful)
          cards = response.data.data.cards
          console.log("Found cards in response.data.data.cards:", cards)
        } else if (response?.data?.cards) {
          // Estructura alternativa: response.data.cards
          cards = response.data.cards
          console.log("Found cards in response.data.cards:", cards)
        } else if (Array.isArray(response?.data)) {
          // A veces la API devuelve directamente un array
          cards = response.data
          console.log("Response.data is directly an array:", cards)
        }
        
        if (cards && cards.length > 0) {
          setCreditCards(cards)
          
          // Set the first card as selected if available
          if (!selectedCard) {
            setSelectedCard(cards[0].id)
          }
        } else {
          console.error("Credit cards data is undefined or in unexpected format")
          console.error("Full response:", response)
          setCreditCards([]) // Inicializar como array vacío en caso de error
        }
      } catch (error) {
        console.error("Failed to fetch credit cards:", error)
        setCreditCards([]) // Inicializar como array vacío en caso de error
      } finally {
        setIsLoading(false)
      }
    }

    fetchCreditCards()
  }, [])

  // Fetch monthly spending data when card or year changes
  useEffect(() => {
    async function fetchMonthlySpending() {
      if (!selectedCard) return

      try {
        setIsLoading(true)
        const response = await creditAPI.getCardMonthlySpending(selectedCard, selectedYear)
        if (response?.data?.spending) {
          setMonthlySpending(response.data.spending)
        } else {
          console.error("Monthly spending data is undefined or in unexpected format")
          setMonthlySpending([])
        }
      } catch (error) {
        console.error("Failed to fetch monthly spending:", error)
        setMonthlySpending([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchMonthlySpending()
  }, [selectedCard, selectedYear])

  // Fetch category spending data when card, year, or month changes
  useEffect(() => {
    async function fetchCategorySpending() {
      if (!selectedCard || !selectedMonth) return

      try {
        setIsLoading(true)
        const response = await creditAPI.getCardSpendingByCategory(
          selectedCard,
          selectedYear,
          selectedMonth
        )
        if (response?.data?.categories) {
          setCategorySpending(response.data.categories)
        } else {
          console.error("Category spending data is undefined or in unexpected format")
          setCategorySpending([])
        }
      } catch (error) {
        console.error("Failed to fetch category spending:", error)
        setCategorySpending([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchCategorySpending()
  }, [selectedCard, selectedYear, selectedMonth])

  // Fetch recent transactions when card, year, or month changes
  useEffect(() => {
    async function fetchRecentTransactions() {
      if (!selectedCard) return

      try {
        setIsLoading(true)
        const transactions = await creditAPI.getCardSpending(selectedCard, selectedYear, selectedMonth)
        if (transactions?.data?.transactions) {
          setRecentTransactions(transactions.data.transactions)
        } else {
          console.error("Transactions data is undefined or in unexpected format")
          setRecentTransactions([])
        }
      } catch (error) {
        console.error("Failed to fetch recent transactions:", error)
        setRecentTransactions([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchRecentTransactions()
  }, [selectedCard, selectedYear, selectedMonth])

  // Function to handle transaction click to open the details dialog
  const handleTransactionClick = (transactionId: string) => {
    setSelectedTransactionId(transactionId)
    setIsTransactionDialogOpen(true)
  }

  // Function to refresh transactions after update or delete
  const handleTransactionUpdated = () => {
    // Refresh data for the current card, year and month
    if (selectedCard) {
      // Fetch all data again to update the UI
      async function refreshData() {
        try {
          setIsLoading(true)
          
          // Refresh transactions data
          const transactions = await creditAPI.getCardSpending(selectedCard, selectedYear, selectedMonth)
          if (transactions?.data?.transactions) {
            setRecentTransactions(transactions.data.transactions)
          }
          
          // Refresh category spending
          const catResponse = await creditAPI.getCardSpendingByCategory(
            selectedCard,
            selectedYear,
            selectedMonth
          )
          if (catResponse?.data?.categories) {
            setCategorySpending(catResponse.data.categories)
          }
          
          // Refresh monthly spending
          const monthlyResponse = await creditAPI.getCardMonthlySpending(selectedCard, selectedYear)
          if (monthlyResponse?.data?.spending) {
            setMonthlySpending(monthlyResponse.data.spending)
          }
        } catch (error) {
          console.error("Failed to refresh data after transaction update:", error)
        } finally {
          setIsLoading(false)
        }
      }
      
      refreshData()
    }
  }

  // Calculate total spending for the selected month - con protección para array vacío
  const totalMonthlySpending = categorySpending?.length > 0 
    ? categorySpending.reduce((sum, cat) => sum + cat.amount, 0) 
    : 0

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-medium">Credit Card Spending Analysis</h3>
          <p className="text-sm text-muted-foreground">
            Track your credit card spending patterns and adjust your payments accordingly.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={selectedCard} onValueChange={setSelectedCard}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Select card" />
            </SelectTrigger>
            <SelectContent>
              {creditCards.map((card) => (
                <SelectItem key={card.id} value={card.id}>
                  {card.name} (*{card.last_four})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(Number.parseInt(value))}>
            <SelectTrigger className="w-full sm:w-[100px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2023">2023</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-full sm:w-[120px]">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Jan">January</SelectItem>
              <SelectItem value="Feb">February</SelectItem>
              <SelectItem value="Mar">March</SelectItem>
              <SelectItem value="Apr">April</SelectItem>
              <SelectItem value="May">May</SelectItem>
              <SelectItem value="Jun">June</SelectItem>
              <SelectItem value="Jul">July</SelectItem>
              <SelectItem value="Aug">August</SelectItem>
              <SelectItem value="Sep">September</SelectItem>
              <SelectItem value="Oct">October</SelectItem>
              <SelectItem value="Nov">November</SelectItem>
              <SelectItem value="Dec">December</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border border-border dark:border-opacity-70">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Spending</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${monthlySpending.find((m) => m.month === selectedMonth)?.amount.toFixed(2) || "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">
              Total spending for {selectedMonth} {selectedYear}
            </p>
            <div className="h-[200px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlySpending}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip
                    formatter={(value) => [`$${value}`, "Amount"]}
                    labelStyle={{ color: "black" }}
                    contentStyle={{
                      backgroundColor: "white",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                    }}
                  />
                  <Bar dataKey="amount" name="Spending" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border dark:border-opacity-70">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Spending by Category</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categorySpending && categorySpending.length > 0 ? (
                categorySpending.map((category) => {
                  const percentage = Math.round((category.amount / totalMonthlySpending) * 100)
                  return (
                    <div key={category.category_name} className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">{category.category_name}</span>
                        <span className="text-sm font-medium">
                          ${category.amount.toFixed(2)} ({percentage}%)
                        </span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  )
                })
              ) : (
                <div className="py-2 text-center text-sm text-muted-foreground">
                  No spending data available for this period.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-1 border border-border dark:border-opacity-70">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Transactions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTransactions && recentTransactions.length > 0 ? (
                recentTransactions.slice(0, 5).map((transaction) => (
                  <div 
                    key={transaction.id} 
                    className="flex items-center justify-between cursor-pointer hover:bg-muted/50 p-2 rounded-md"
                    onClick={() => handleTransactionClick(transaction.id)}
                  >
                    <div>
                      <p className="text-sm font-medium">{transaction.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(transaction.transaction_date).toLocaleDateString()} •{" "}
                        {transaction.category_name}
                      </p>
                    </div>
                    <p className="text-sm font-medium">${transaction.amount.toFixed(2)}</p>
                  </div>
                ))
              ) : (
                <div className="py-2 text-center text-sm text-muted-foreground">
                  No transactions found for this period.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
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

