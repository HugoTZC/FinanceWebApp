"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { CreditCard, Calendar } from "lucide-react"

// Sample data - in a real app, this would come from your API
const creditCardSpending = {
  cc1: {
    // Chase Sapphire
    name: "Chase Sapphire",
    lastFour: "4567",
    monthlySpending: [
      { month: "Jan", amount: 450 },
      { month: "Feb", amount: 520 },
      { month: "Mar", amount: 380 },
      { month: "Apr", amount: 620 },
      { month: "May", amount: 540 },
      { month: "Jun", amount: 490 },
    ],
    currentMonth: {
      total: 490,
      categories: [
        { name: "Dining", amount: 180 },
        { name: "Travel", amount: 120 },
        { name: "Shopping", amount: 90 },
        { name: "Entertainment", amount: 60 },
        { name: "Other", amount: 40 },
      ],
      transactions: [
        { id: "t1", date: "2023-06-25", title: "Restaurant XYZ", amount: 85.4, category: "Dining" },
        { id: "t2", date: "2023-06-20", title: "Movie Tickets", amount: 32.5, category: "Entertainment" },
        { id: "t3", date: "2023-06-18", title: "Grocery Store", amount: 67.25, category: "Shopping" },
        { id: "t4", date: "2023-06-15", title: "Gas Station", amount: 45.8, category: "Travel" },
        { id: "t5", date: "2023-06-10", title: "Online Purchase", amount: 23.99, category: "Shopping" },
      ],
    },
  },
  cc2: {
    // American Express
    name: "American Express",
    lastFour: "7890",
    monthlySpending: [
      { month: "Jan", amount: 320 },
      { month: "Feb", amount: 380 },
      { month: "Mar", amount: 420 },
      { month: "Apr", amount: 350 },
      { month: "May", amount: 390 },
      { month: "Jun", amount: 410 },
    ],
    currentMonth: {
      total: 410,
      categories: [
        { name: "Dining", amount: 150 },
        { name: "Travel", amount: 80 },
        { name: "Shopping", amount: 120 },
        { name: "Entertainment", amount: 40 },
        { name: "Other", amount: 20 },
      ],
      transactions: [
        { id: "t6", date: "2023-06-22", title: "Coffee Shop", amount: 12.5, category: "Dining" },
        { id: "t7", date: "2023-06-19", title: "Department Store", amount: 89.99, category: "Shopping" },
        { id: "t8", date: "2023-06-15", title: "Rideshare", amount: 24.75, category: "Travel" },
        { id: "t9", date: "2023-06-12", title: "Restaurant ABC", amount: 67.8, category: "Dining" },
        { id: "t10", date: "2023-06-08", title: "Streaming Service", amount: 14.99, category: "Entertainment" },
      ],
    },
  },
  cc3: {
    // Discover
    name: "Discover",
    lastFour: "1234",
    monthlySpending: [
      { month: "Jan", amount: 280 },
      { month: "Feb", amount: 310 },
      { month: "Mar", amount: 290 },
      { month: "Apr", amount: 320 },
      { month: "May", amount: 270 },
      { month: "Jun", amount: 300 },
    ],
    currentMonth: {
      total: 300,
      categories: [
        { name: "Dining", amount: 90 },
        { name: "Travel", amount: 50 },
        { name: "Shopping", amount: 100 },
        { name: "Entertainment", amount: 30 },
        { name: "Other", amount: 30 },
      ],
      transactions: [
        { id: "t11", date: "2023-06-24", title: "Fast Food", amount: 15.75, category: "Dining" },
        { id: "t12", date: "2023-06-21", title: "Online Shopping", amount: 45.5, category: "Shopping" },
        { id: "t13", date: "2023-06-17", title: "Parking", amount: 12.0, category: "Travel" },
        { id: "t14", date: "2023-06-14", title: "Electronics Store", amount: 54.99, category: "Shopping" },
        { id: "t15", date: "2023-06-09", title: "Pizza Delivery", amount: 22.5, category: "Dining" },
      ],
    },
  },
}

export function CreditCardSpending() {
  const [selectedCard, setSelectedCard] = useState("cc1")
  const [selectedMonth, setSelectedMonth] = useState("Jun")
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  // State for API data
  // const [apiCreditCards, setApiCreditCards] = useState<any[]>([]);
  // const [monthlySpending, setMonthlySpending] = useState<any[]>([]);
  // const [categorySpending, setCategorySpending] = useState<any[]>([]);
  // const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  // const [isLoading, setIsLoading] = useState(false);

  const cardData = creditCardSpending[selectedCard as keyof typeof creditCardSpending]

  // Fetch credit cards from API
  // useEffect(() => {
  //   async function fetchCreditCards() {
  //     try {
  //       const response = await creditAPI.getCards();
  //       setApiCreditCards(response.data);
  //
  //       // Set the first card as selected if available
  //       if (response.data.length > 0 && !selectedCard) {
  //         setSelectedCard(response.data[0].id);
  //       }
  //     } catch (error) {
  //       console.error("Failed to fetch credit cards:", error);
  //     }
  //   }
  //
  //   fetchCreditCards();
  // }, []);

  // Fetch monthly spending data when card or year changes
  // useEffect(() => {
  //   async function fetchMonthlySpending() {
  //     if (!selectedCard) return;
  //
  //     try {
  //       setIsLoading(true);
  //       const response = await creditAPI.getCardMonthlySpending(selectedCard, selectedYear);
  //       setMonthlySpending(response.data);
  //     } catch (error) {
  //       console.error("Failed to fetch monthly spending:", error);
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   }
  //
  //   fetchMonthlySpending();
  // }, [selectedCard, selectedYear]);

  // Fetch category spending data when card, year, or month changes
  // useEffect(() => {
  //   async function fetchCategorySpending() {
  //     if (!selectedCard || !selectedMonth) return;
  //
  //     try {
  //       setIsLoading(true);
  //       const response = await creditAPI.getCardSpendingByCategory(
  //         selectedCard,
  //         selectedYear,
  //         selectedMonth
  //       );
  //       setCategorySpending(response.data.categories);
  //     } catch (error) {
  //       console.error("Failed to fetch category spending:", error);
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   }
  //
  //   fetchCategorySpending();
  // }, [selectedCard, selectedYear, selectedMonth]);

  // Fetch recent transactions when card, year, or month changes
  // useEffect(() => {
  //   async function fetchRecentTransactions() {
  //     if (!selectedCard) return;
  //
  //     try {
  //       setIsLoading(true);
  //       const response = await transactionsAPI.getByCardId(selectedCard, {
  //         year: selectedYear,
  //         month: selectedMonth,
  //         limit: 5,
  //         sort: 'date:desc'
  //       });
  //       setRecentTransactions(response.data);
  //     } catch (error) {
  //       console.error("Failed to fetch recent transactions:", error);
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   }
  //
  //   fetchRecentTransactions();
  // }, [selectedCard, selectedYear, selectedMonth]);

  return (
    <div className="space-y-4">
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
              {/* Use API credit cards when backend is ready */}
              {/* {apiCreditCards.length > 0 
                ? apiCreditCards.map((card) => (
                    <SelectItem key={card.id} value={card.id}>
                      {card.name} (*{card.lastFour})
                    </SelectItem>
                  ))
                : Object.entries(creditCardSpending).map(([id, card]) => (
                    <SelectItem key={id} value={id}>
                      {card.name} (*{card.lastFour})
                    </SelectItem>
                  ))
              } */}

              {/* For now, use mock data */}
              {Object.entries(creditCardSpending).map(([id, card]) => (
                <SelectItem key={id} value={id}>
                  {card.name} (*{card.lastFour})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(Number.parseInt(value))}>
            <SelectTrigger className="w-full sm:w-[100px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2023">2023</SelectItem>
              <SelectItem value="2022">2022</SelectItem>
              <SelectItem value="2021">2021</SelectItem>
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

      {/* {isLoading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : null} */}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Spending</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${cardData.monthlySpending.find((m) => m.month === selectedMonth)?.amount.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total spending on {cardData.name} for {selectedMonth}
            </p>
            <div className="h-[200px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cardData.monthlySpending}>
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Spending by Category</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Use API data when backend is ready */}
              {/* {categorySpending.length > 0 
                ? categorySpending.map((category, index) => {
                    const percentage = Math.round((category.amount / categorySpending.reduce((sum, cat) => sum + cat.amount, 0)) * 100);
                    return (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">{category.name}</span>
                          <span className="text-sm font-medium">
                            ${category.amount.toFixed(2)} ({percentage}%)
                          </span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })
                : cardData.currentMonth.categories.map((category, index) => {
                    // ... existing mock data rendering
                  })
              } */}

              {/* For now, use mock data */}
              {cardData.currentMonth.categories.map((category, index) => {
                const percentage = Math.round((category.amount / cardData.currentMonth.total) * 100)
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">{category.name}</span>
                      <span className="text-sm font-medium">
                        ${category.amount.toFixed(2)} ({percentage}%)
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Transactions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Use API data when backend is ready */}
              {/* {recentTransactions.length > 0 
                ? recentTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{transaction.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(transaction.date).toLocaleDateString()} • {transaction.category}
                        </p>
                      </div>
                      <p className="text-sm font-medium">${transaction.amount.toFixed(2)}</p>
                    </div>
                  ))
                : cardData.currentMonth.transactions.slice(0, 5).map((transaction) => {
                    // ... existing mock data rendering
                  })
              } */}

              {/* For now, use mock data */}
              {cardData.currentMonth.transactions.slice(0, 5).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{transaction.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(transaction.date).toLocaleDateString()} • {transaction.category}
                    </p>
                  </div>
                  <p className="text-sm font-medium">${transaction.amount.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

