"use client"

import type React from "react"

import { useState } from "react"
import { ArrowDownIcon, CarIcon, CoffeeIcon, HomeIcon, SearchIcon, ShoppingBagIcon, WifiIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface Transaction {
  id: string
  date: string
  description: string
  category: string
  amount: number
  type: "income" | "expense"
  icon: React.ReactNode
}

const transactions: Transaction[] = [
  {
    id: "t1",
    date: "2023-06-20",
    description: "Salary Deposit",
    category: "Income",
    amount: 2116.0,
    type: "income",
    icon: <ArrowDownIcon className="h-4 w-4 text-green-500" />,
  },
  {
    id: "t2",
    date: "2023-06-19",
    description: "Grocery Store",
    category: "Food",
    amount: 56.34,
    type: "expense",
    icon: <ShoppingBagIcon className="h-4 w-4 text-blue-500" />,
  },
  {
    id: "t3",
    date: "2023-06-18",
    description: "Monthly Rent",
    category: "Housing",
    amount: 1200.0,
    type: "expense",
    icon: <HomeIcon className="h-4 w-4 text-purple-500" />,
  },
  {
    id: "t4",
    date: "2023-06-17",
    description: "Coffee Shop",
    category: "Food",
    amount: 4.5,
    type: "expense",
    icon: <CoffeeIcon className="h-4 w-4 text-yellow-500" />,
  },
  {
    id: "t5",
    date: "2023-06-16",
    description: "Gas Station",
    category: "Transportation",
    amount: 45.76,
    type: "expense",
    icon: <CarIcon className="h-4 w-4 text-red-500" />,
  },
  {
    id: "t6",
    date: "2023-06-15",
    description: "Internet Bill",
    category: "Utilities",
    amount: 79.99,
    type: "expense",
    icon: <WifiIcon className="h-4 w-4 text-indigo-500" />,
  },
  {
    id: "t7",
    date: "2023-06-14",
    description: "Freelance Payment",
    category: "Income",
    amount: 350.0,
    type: "income",
    icon: <ArrowDownIcon className="h-4 w-4 text-green-500" />,
  },
  {
    id: "t8",
    date: "2023-06-13",
    description: "Online Shopping",
    category: "Shopping",
    amount: 124.32,
    type: "expense",
    icon: <ShoppingBagIcon className="h-4 w-4 text-blue-500" />,
  },
]

interface RecentTransactionsProps {
  showAll?: boolean
}

export function RecentTransactions({ showAll = false }: RecentTransactionsProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory =
      categoryFilter === "all" || transaction.category.toLowerCase() === categoryFilter.toLowerCase()
    const matchesType = typeFilter === "all" || transaction.type === typeFilter

    return matchesSearch && matchesCategory && matchesType
  })

  const displayTransactions = showAll ? filteredTransactions : filteredTransactions.slice(0, 5)

  const categories = Array.from(new Set(transactions.map((t) => t.category)))

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
              {categories.map((category) => (
                <SelectItem key={category} value={category.toLowerCase()}>
                  {category}
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
                <TableRow key={transaction.id}>
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
    </div>
  )
}

