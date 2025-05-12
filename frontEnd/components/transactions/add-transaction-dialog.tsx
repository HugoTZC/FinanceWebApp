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
import { creditAPI, transactionsAPI, categoriesAPI } from "@/lib/api"
import type { CreditCardType } from "@/types/credit"
import { toast } from "@/components/ui/use-toast"

// Sample credit cards data - in a real app, this would come from your API
const creditCards = [
  { id: "cc1", name: "Chase Sapphire", lastFour: "4567" },
  { id: "cc2", name: "American Express", lastFour: "7890" },
  { id: "cc3", name: "Discover", lastFour: "1234" },
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

interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  category_group: "essential" | "discretionary" | "income";
  icon: string;
  color: string;
  source: 'default' | 'user';
}

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
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(false)

  // Add this state for savings account assignment after the other state declarations
  const [assignToSavings, setAssignToSavings] = useState(false)
  const [selectedSavingsAccount, setSelectedSavingsAccount] = useState("")
  const [apiCreditCards, setApiCreditCards] = useState<CreditCardType[]>([])
  const [isLoadingCards, setIsLoadingCards] = useState(false)

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
  useEffect(() => {
    async function fetchCreditCards() {
      try {
        setIsLoadingCards(true)
        const response = await creditAPI.getCards()
        if (response?.data?.data?.cards) {
          setApiCreditCards(response.data.data.cards)
        }
      } catch (error) {
        console.error("Failed to fetch credit cards:", error)
        toast({
          title: "Error",
          description: "Failed to load credit cards. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoadingCards(false)
      }
    }

    if (type === "expense" && paymentMethod === "credit-card") {
      fetchCreditCards()
    }
  }, [type, paymentMethod])

  // Fetch categories when type changes
  useEffect(() => {
    async function fetchCategories() {
      try {
        setIsLoadingCategories(true)
        const response = await categoriesAPI.getByType(type)
        if (response?.data?.data?.categories) {
          setCategories(response.data.data.categories)
        }
      } catch (error) {
        console.error("Failed to fetch categories:", error)
        toast({
          title: "Error",
          description: "Failed to load categories. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoadingCategories(false)
      }
    }

    fetchCategories()
  }, [type])

  // Reset category when type changes
  useEffect(() => {
    setCategory("")
  }, [type])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Validate form
    if (!title || !amount || !category || !date) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    if (type === "expense" && paymentMethod === "credit-card" && !selectedCard) {
      toast({
        title: "Error",
        description: "Please select a credit card",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)
      
      // Normalizar el método de pago para la API
      // La API espera 'credit_card' en lugar de 'credit-card'
      const normalizedPaymentMethod = paymentMethod === "credit-card" ? "credit_card" : paymentMethod;
      
      console.log("[TRANSACTION] Creating transaction with payment method:", normalizedPaymentMethod)
      
      // Create transaction object - use category name as received from the API
      const transaction = {
        title,
        amount: Number.parseFloat(amount),
        type,
        category,
        transaction_date: date.toISOString(),
        comment,
        payment_method: normalizedPaymentMethod,
        credit_card_id: paymentMethod === "credit-card" ? selectedCard : null,
        assign_to_savings: type === "expense" && paymentMethod === "cash" ? assignToSavings : false,
        savings_goal_id: assignToSavings ? selectedSavingsAccount : null,
      }
      
      console.log("[TRANSACTION] Transaction data:", transaction)

      // Create the transaction
      const response = await transactionsAPI.create(transaction)
      console.log("[TRANSACTION] Transaction created:", response.data)

      // Si es una transacción de tarjeta de crédito, actualizar el saldo de la tarjeta
      if (type === "expense" && paymentMethod === "credit-card" && selectedCard) {
        try {
          // Get the current card data
          const cardResponse = await creditAPI.getCardById(selectedCard)
          
          if (cardResponse?.data?.card) {
            const card = cardResponse.data.card
            
            console.log("[TRANSACTION] Updating credit card balance:", {
              oldBalance: card.balance,
              amount: Number.parseFloat(amount),
              newBalance: card.balance + Number.parseFloat(amount)
            })
            
            // Update the card balance
            await creditAPI.updateCard(selectedCard, {
              ...card,
              balance: card.balance + Number.parseFloat(amount),
            })
            
            console.log("[TRANSACTION] Credit card balance updated successfully")
          } else {
            console.error("[TRANSACTION] Could not get credit card data:", cardResponse)
          }
        } catch (cardError) {
          console.error("[TRANSACTION] Error updating credit card balance:", cardError)
          // No fallamos toda la operación si solo falla la actualización de la tarjeta
          // porque la transacción ya fue creada exitosamente
          toast({
            title: "Warning",
            description: "Transaction created, but credit card balance could not be updated",
            variant: "default",
          })
        }
      }

      toast({
        title: "Success",
        description: "Transaction added successfully",
      })

      // Close the dialog after submission
      setOpen(false)

      // Reset the form
      resetForm()
    } catch (error: any) {
      console.error("Failed to create transaction:", error)
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create transaction",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
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
                <SelectValue placeholder={isLoadingCategories ? "Loading categories..." : "Select category"} />
              </SelectTrigger>
              <SelectContent>
                {isLoadingCategories ? (
                  <SelectItem value="loading" disabled>Loading categories...</SelectItem>
                ) : categories.length > 0 ? (
                  <>
                    <SelectItem value="system-header" disabled className="font-semibold">
                      System Categories
                    </SelectItem>
                    {categories.filter(cat => cat.source === 'default').map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                    
                    <SelectItem value="user-header" disabled className="font-semibold">
                      Custom Categories
                    </SelectItem>
                    {categories.filter(cat => cat.source === 'user').map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </>
                ) : (
                  <SelectItem value="no-categories" disabled>No categories found</SelectItem>
                )}
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
                  <SelectValue placeholder={isLoadingCards ? "Loading cards..." : "Select credit card"} />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingCards ? (
                    <SelectItem value="loading" disabled>Loading credit cards...</SelectItem>
                  ) : apiCreditCards.length > 0 ? (
                    apiCreditCards.map((card) => (
                      <SelectItem key={card.id} value={card.id}>
                        {card.name} (*{card.last_four})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-cards" disabled>No credit cards found</SelectItem>
                  )}
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

