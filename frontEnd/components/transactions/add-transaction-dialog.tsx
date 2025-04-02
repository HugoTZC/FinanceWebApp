"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { CalendarIcon, Plus, CreditCardIcon, Wallet } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"

// Sample credit cards data - in a real app, this would come from your API
const creditCards = [
  { id: "cc1", name: "Chase Sapphire", lastFour: "4567" },
  { id: "cc2", name: "American Express", lastFour: "7890" },
  { id: "cc3", name: "Discover", lastFour: "1234" },
]

const categories = [
  { label: "Housing", value: "housing" },
  { label: "Food", value: "food" },
  { label: "Transportation", value: "transportation" },
  { label: "Entertainment", value: "entertainment" },
  { label: "Utilities", value: "utilities" },
  { label: "Shopping", value: "shopping" },
  { label: "Healthcare", value: "healthcare" },
  { label: "Education", value: "education" },
  { label: "Personal", value: "personal" },
  { label: "Salary", value: "salary" },
  { label: "Investment", value: "investment" },
  { label: "Gift", value: "gift" },
  { label: "Other Income", value: "other-income" },
  { label: "Other Expense", value: "other-expense" },
]

// Add this sample data for savings accounts after the categories array
const savingsAccounts = [
  { id: "s1", name: "Emergency Fund", target: 10000, current: 5000, dueDate: "2023-12-31", type: "goal" },
  { id: "s2", name: "Vacation", target: 3000, current: 1500, dueDate: "2023-08-15", type: "goal" },
  { id: "s3", name: "New Car", target: 20000, current: 8000, dueDate: "2024-06-30", type: "goal" },
  { id: "s4", name: "Home Down Payment", target: 50000, current: 15000, dueDate: "2025-01-15", type: "goal" },
]

// Add recurring payments data
const recurringPayments = [
  { id: "r1", name: "Mortgage", amount: 1500, current: 500, dueDate: "2023-07-01", type: "recurring" },
  { id: "r2", name: "Car Payment", amount: 350, current: 150, dueDate: "2023-07-15", type: "recurring" },
  { id: "r3", name: "Student Loan", amount: 250, current: 100, dueDate: "2023-07-21", type: "recurring" },
  { id: "r4", name: "Internet", amount: 80, current: 0, dueDate: "2023-07-05", type: "recurring" },
  { id: "r5", name: "Phone Bill", amount: 65, current: 30, dueDate: "2023-07-10", type: "recurring" },
]

// Combine savings accounts and recurring payments for the dropdown
const allSavingsOptions = [...savingsAccounts, ...recurringPayments]

export function AddTransactionDialog() {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState<Date>(new Date())
  const [title, setTitle] = useState("")
  const [amount, setAmount] = useState("")
  const [type, setType] = useState("expense")
  const [category, setCategory] = useState("")
  const [comment, setComment] = useState("")
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [selectedCard, setSelectedCard] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Add this state for savings account assignment after the other state declarations
  const [assignToSavings, setAssignToSavings] = useState(false)
  const [selectedSavingsAccount, setSelectedSavingsAccount] = useState("")

  // State for API data
  // const [apiCreditCards, setApiCreditCards] = useState<any[]>([]);
  // const [apiCategories, setApiCategories] = useState<any[]>([]);

  // Reset payment method when transaction type changes
  useEffect(() => {
    if (type === "income") {
      setPaymentMethod("cash")
      setSelectedCard("")
    }
  }, [type])

  // Add this after the useEffect hook that resets payment method
  // Reset savings assignment when transaction type changes or payment method changes
  useEffect(() => {
    if (type !== "expense" || paymentMethod !== "cash") {
      setAssignToSavings(false)
      setSelectedSavingsAccount("")
    }
  }, [type, paymentMethod])

  // Fetch credit cards from API
  // useEffect(() => {
  //   async function fetchCreditCards() {
  //     try {
  //       const response = await creditAPI.getCards();
  //       setApiCreditCards(response.data);
  //     } catch (error) {
  //       console.error("Failed to fetch credit cards:", error);
  //     }
  //   }
  //
  //   fetchCreditCards();
  // }, []);

  // Fetch categories from API
  // useEffect(() => {
  //   async function fetchCategories() {
  //     try {
  //       const response = await budgetAPI.getCategories();
  //       setApiCategories(response.data);
  //     } catch (error) {
  //       console.error("Failed to fetch categories:", error);
  //     }
  //   }
  //
  //   fetchCategories();
  // }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Validate form
    if (!title || !amount || !category || !date) {
      alert("Please fill in all required fields")
      return
    }

    if (type === "expense" && paymentMethod === "credit-card" && !selectedCard) {
      alert("Please select a credit card")
      return
    }

    // Create transaction object
    const transaction = {
      title,
      amount: Number.parseFloat(amount),
      type,
      category,
      date,
      comment,
      paymentMethod: type === "expense" ? paymentMethod : null,
      creditCardId: paymentMethod === "credit-card" ? selectedCard : null,
      // Add this to the transaction object inside handleSubmit
      assignToSavings: type === "expense" && paymentMethod === "cash" ? assignToSavings : false,
      savingsAccountId: assignToSavings ? selectedSavingsAccount : null,
    }

    // In a real app, you would send this data to your API
    console.log(transaction)

    // API integration (commented out until backend is ready)
    // try {
    //   setIsLoading(true);
    //   const response = await transactionsAPI.create(transaction);
    //
    //   // If it's a credit card transaction, update the card balance
    //   if (type === "expense" && paymentMethod === "credit-card" && selectedCard) {
    //     // Get the current card data
    //     const cardResponse = await creditAPI.getCardById(selectedCard);
    //     const card = cardResponse.data;
    //
    //     // Update the card balance
    //     await creditAPI.updateCard(selectedCard, {
    //       ...card,
    //       balance: card.balance + parseFloat(amount)
    //     });
    //   }
    //
    //   // Handle success
    //   console.log("Transaction created:", response.data);
    //
    //   // Close the dialog after submission
    //   setOpen(false);
    //
    //   // Reset the form
    //   resetForm();
    // } catch (error) {
    //   console.error("Failed to create transaction:", error);
    //   alert("Failed to create transaction. Please try again.");
    // } finally {
    //   setIsLoading(false);
    // }

    // For now, just close the dialog and reset the form
    setOpen(false)
    resetForm()
  }

  function resetForm() {
    setTitle("")
    setAmount("")
    setType("expense")
    setCategory("")
    setDate(new Date())
    setComment("")
    setPaymentMethod("cash")
    setSelectedCard("")
    // Add this to the resetForm function
    setAssignToSavings(false)
    setSelectedSavingsAccount("")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="ml-auto hidden md:flex">
          <Plus className="mr-2 h-4 w-4" />
          Add Transaction
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
          <DialogDescription>Enter the details of your transaction below.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
                <Input
                  id="amount"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-7"
                  type="number"
                  step="0.01"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Transaction title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {/* Use API categories when backend is ready */}
                {/* {apiCategories.length > 0 
                  ? apiCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))
                  : categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))
                } */}

                {/* For now, use mock categories */}
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type === "expense" && (
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cash" id="cash" />
                  <Label htmlFor="cash" className="flex items-center gap-1 cursor-pointer">
                    <Wallet className="h-4 w-4" />
                    Cash/Debit
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="credit-card" id="credit-card" />
                  <Label htmlFor="credit-card" className="flex items-center gap-1 cursor-pointer">
                    <CreditCardIcon className="h-4 w-4" />
                    Credit Card
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {type === "expense" && paymentMethod === "credit-card" && (
            <div className="space-y-2">
              <Label htmlFor="creditCard">Select Credit Card</Label>
              <Select value={selectedCard} onValueChange={setSelectedCard}>
                <SelectTrigger id="creditCard">
                  <SelectValue placeholder="Select credit card" />
                </SelectTrigger>
                <SelectContent>
                  {/* Use API credit cards when backend is ready */}
                  {/* {apiCreditCards.length > 0 
                    ? apiCreditCards.map((card) => (
                        <SelectItem key={card.id} value={card.id}>
                          {card.name} (*{card.lastFour})
                        </SelectItem>
                      ))
                    : creditCards.map((card) => (
                        <SelectItem key={card.id} value={card.id}>
                          {card.name} (*{card.lastFour})
                        </SelectItem>
                      ))
                  } */}

                  {/* For now, use mock credit cards */}
                  {creditCards.map((card) => (
                    <SelectItem key={card.id} value={card.id}>
                      {card.name} (*{card.lastFour})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Add this code after the payment method section in the form */}
          {type === "expense" && paymentMethod === "cash" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="assignToSavings" className="flex items-center gap-2">
                  Assign to Savings Goal or Recurring Payment
                  <span className="text-xs text-muted-foreground">
                    (Count towards a savings goal or recurring payment)
                  </span>
                </Label>
                <Switch id="assignToSavings" checked={assignToSavings} onCheckedChange={setAssignToSavings} />
              </div>

              {assignToSavings && (
                <div className="space-y-2">
                  <Label htmlFor="savingsAccount">Select Savings Goal or Recurring Payment</Label>
                  <Select value={selectedSavingsAccount} onValueChange={setSelectedSavingsAccount}>
                    <SelectTrigger id="savingsAccount">
                      <SelectValue placeholder="Select savings goal or recurring payment" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Replace empty string values with unique identifiers */}
                      <SelectItem value="savings-header" disabled className="font-semibold">
                        Savings Goals
                      </SelectItem>
                      {savingsAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} (${account.current.toFixed(2)}/${account.target.toFixed(2)})
                        </SelectItem>
                      ))}
                      <SelectItem value="recurring-header" disabled className="font-semibold">
                        Recurring Payments
                      </SelectItem>
                      {recurringPayments.map((payment) => (
                        <SelectItem key={payment.id} value={payment.id}>
                          {payment.name} (${payment.current.toFixed(2)}/${payment.amount.toFixed(2)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(date) => {
                    if (date) {
                      setDate(date)
                      setDatePickerOpen(false)
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Comment</Label>
            <Textarea
              id="comment"
              placeholder="Add any additional details about this transaction"
              className="resize-none"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Transaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

