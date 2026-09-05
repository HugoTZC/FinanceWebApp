"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { CalendarIcon, Plus, CreditCardIcon, Wallet, Camera, X } from "lucide-react"
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
import { Slider } from "@/components/ui/slider"
import { creditAPI, transactionsAPI, categoriesAPI, savingsAPI } from "@/lib/api"
import type { CreditCardType, LoanType } from "@/types/credit"
import { toast } from "@/components/ui/use-toast"
import { notifyTransactionsChanged } from "@/hooks/use-transaction-refresh"

// Define interfaces for savings goals and recurring payments
interface SavingsGoal {
  id: string
  name: string
  target: number
  current: number
  dueDate: string
  type: "goal"
}

interface RecurringPayment {
  id: string
  name: string
  amount: number
  current: number
  dueDate: string
  type: "recurring"
}

interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  category_group: "essential" | "discretionary" | "income";
  icon: string;
  color: string;
  source: 'default' | 'user';
}

// Define interface for combined credit options (cards and loans)
interface CreditOptionType {
  id: string;
  name: string;
  balance: number;
  type: "card" | "loan";
  last_four?: string;
  bank_number?: string;
}

interface AddTransactionDialogProps {
  triggerClassName?: string
}

export function AddTransactionDialog({ triggerClassName }: AddTransactionDialogProps = {}) {
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
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [receipt, setReceipt] = useState<File | null>(null)
  const [isCredit, setIsCredit] = useState(false) // Add slider state for debit/credit option

  // Add this state for savings account assignment after the other state declarations
  const [assignToSavings, setAssignToSavings] = useState(false)
  const [selectedSavingsAccount, setSelectedSavingsAccount] = useState("")
  const [apiCreditCards, setApiCreditCards] = useState<CreditCardType[]>([])
  const [apiLoans, setApiLoans] = useState<LoanType[]>([])
  const [creditOptions, setCreditOptions] = useState<CreditOptionType[]>([])
  const [isLoadingCards, setIsLoadingCards] = useState(false)
  const [isLoadingLoans, setIsLoadingLoans] = useState(false)
  
  // Add state for API savings data
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([])
  const [recurringPayments, setRecurringPayments] = useState<RecurringPayment[]>([])
  const [isLoadingSavings, setIsLoadingSavings] = useState(false)

  // Handle transaction type changes
  useEffect(() => {
    if (type === "income") {
      setPaymentMethod("cash")
      setSelectedCard("")
      setIsCredit(false)
    } else if (type === "expense") {
      // Reset to cash payment method when switching to expense
      setPaymentMethod("cash")
      setSelectedCard("")
      setIsCredit(false)
    } else if (type === "credit-payment") {
      // Automatically configure for credit payment
      setPaymentMethod("credit-card")
      setCategory("")
      setIsCredit(false)
      // Fetch credit options if necessary
      if (creditOptions.length === 0 && !isLoadingCards) {
        fetchCreditOptions()
      }
    } else if (type === "savings-deposit") {
      // Automatically configure for savings deposit
      setPaymentMethod("cash")
      setCategory("deposit") // Assuming you have a "deposit" category ID
      setAssignToSavings(true)
      setIsCredit(false)
      // Fetch savings data if necessary
      if ((savingsGoals.length === 0 && recurringPayments.length === 0) && !isLoadingSavings) {
        fetchSavingsData()
      }
    }
  }, [type])

  // Reset savings assignment when transaction type changes or payment method changes
  useEffect(() => {
    if (type !== "expense" || paymentMethod !== "cash") {
      setAssignToSavings(false)
      setSelectedSavingsAccount("")
    }
  }, [type, paymentMethod])

  // Fetch credit cards from API
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

  // Fetch savings data (goals and recurring payments)
  async function fetchSavingsData() {
    try {
      setIsLoadingSavings(true)
      
      // Fetch both savings goals and recurring payments in parallel
      const [goalsResponse, paymentsResponse] = await Promise.all([
        savingsAPI.getGoals(),
        savingsAPI.getRecurringPayments()
      ]);
      
      // Process savings goals
      if (goalsResponse?.data?.data?.goals) {
        const transformedGoals = goalsResponse.data.data.goals.map((goal: any) => ({
          id: goal.id,
          name: goal.name,
          target: parseFloat(goal.target_amount),
          current: parseFloat(goal.current_amount),
          dueDate: goal.target_date,
          type: "goal" as const
        }));
        setSavingsGoals(transformedGoals);
      }
      
      // Process recurring payments
      if (paymentsResponse?.data?.data?.payments) {
        const transformedPayments = paymentsResponse.data.data.payments.map((payment: any) => ({
          id: payment.id,
          name: payment.name,
          amount: parseFloat(payment.amount),
          current: parseFloat(payment.current_amount),
          dueDate: payment.due_date,
          type: "recurring" as const
        }));
        setRecurringPayments(transformedPayments);
      }
    } catch (error) {
      console.error("Failed to fetch savings data:", error);
      toast({
        title: "Error",
        description: "Failed to load savings goals and recurring payments.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSavings(false);
    }
  }

  // Fetch all credit options (cards and loans) from API
  async function fetchCreditOptions() {
    try {
      setIsLoadingCards(true);
      
      // Fetch both credit cards and loans in parallel
      const [cardsResponse, loansResponse] = await Promise.all([
        creditAPI.getCards(),
        creditAPI.getLoans()
      ]);
      
      // Process credit cards
      let creditCardOptions: CreditOptionType[] = [];
      if (cardsResponse?.data?.data?.cards) {
        creditCardOptions = cardsResponse.data.data.cards.map((card: CreditCardType) => ({
          id: card.id,
          name: card.name,
          balance: card.balance,
          type: "card",
          last_four: card.last_four
        }));
        setApiCreditCards(cardsResponse.data.data.cards);
      }
      
      // Process loans
      let loanOptions: CreditOptionType[] = [];
      if (loansResponse?.data?.data?.loans) {
        loanOptions = loansResponse.data.data.loans.map((loan: LoanType) => ({
          id: loan.id,
          name: loan.name,
          balance: loan.balance,
          type: "loan",
          bank_number: loan.bank_number
        }));
        setApiLoans(loansResponse.data.data.loans);
      }
      
      // Combine both types of credit options
      setCreditOptions([...creditCardOptions, ...loanOptions]);
      
    } catch (error) {
      console.error("Failed to fetch credit options:", error);
      toast({
        title: "Error",
        description: "Failed to load credit options. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCards(false);
    }
  }

  // Call API fetch methods when component opens
  useEffect(() => {
    if (open) {
      if (type === "expense" && paymentMethod === "credit-card") {
        fetchCreditCards()
      }
      if (type === "expense" && paymentMethod === "cash" && assignToSavings) {
        fetchSavingsData()
      }
    }
  }, [open, type, paymentMethod, assignToSavings])

  // Fetch categories when type changes
  useEffect(() => {
    async function fetchCategories() {
      try {
        setIsLoadingCategories(true)
        // Map special transaction types to "expense" for API compatibility
        const categoryType = type === "credit-payment" || type === "savings-deposit" ? "expense" : type
        const response = await categoriesAPI.getByType(categoryType)
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
  
  // Fetch savings goals and recurring payments from API
  useEffect(() => {
    async function fetchSavingsData() {
      if (type !== "expense" || paymentMethod !== "cash") return;
      
      try {
        setIsLoadingSavings(true)
        
        // Fetch both savings goals and recurring payments in parallel
        const [goalsResponse, paymentsResponse] = await Promise.all([
          savingsAPI.getGoals(),
          savingsAPI.getRecurringPayments()
        ]);
        
        // Process savings goals
        if (goalsResponse?.data?.data?.goals) {
          const transformedGoals = goalsResponse.data.data.goals.map((goal: any) => ({
            id: goal.id,
            name: goal.name,
            target: parseFloat(goal.target_amount),
            current: parseFloat(goal.current_amount),
            dueDate: goal.target_date,
            type: "goal" as const
          }));
          setSavingsGoals(transformedGoals);
        }
        
        // Process recurring payments
        if (paymentsResponse?.data?.data?.payments) {
          const transformedPayments = paymentsResponse.data.data.payments.map((payment: any) => ({
            id: payment.id,
            name: payment.name,
            amount: parseFloat(payment.amount),
            current: parseFloat(payment.current_amount),
            dueDate: payment.due_date,
            type: "recurring" as const
          }));
          setRecurringPayments(transformedPayments);
        }
      } catch (error) {
        console.error("Failed to fetch savings data:", error);
        toast({
          title: "Error",
          description: "Failed to load savings goals and recurring payments.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingSavings(false);
      }
    }

    fetchSavingsData();
  }, [type, paymentMethod, open]);

  // Reset category when type changes
  useEffect(() => {
    setCategory("")
  }, [type])
  
  // Set title based on selected card/savings
  useEffect(() => {
    if (type === "credit-payment" && selectedCard) {
      const selectedCardObj = apiCreditCards.find(card => card.id === selectedCard)
      if (selectedCardObj) {
        setTitle(`${selectedCardObj.name} payment`)
      }
    } else if (type === "savings-deposit" && selectedSavingsAccount) {
      // Find if it's a goal or recurring payment
      const savingsGoal = savingsGoals.find(goal => goal.id === selectedSavingsAccount)
      const recurringPayment = recurringPayments.find(payment => payment.id === selectedSavingsAccount)
      
      if (savingsGoal) {
        setTitle(`${savingsGoal.name} deposit`)
      } else if (recurringPayment) {
        setTitle(`${recurringPayment.name} deposit`)
      }
    }
  }, [type, selectedCard, selectedSavingsAccount, apiCreditCards, savingsGoals, recurringPayments])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Validate form
    const requiresCategory = type === "income" || type === "expense"
    if (!title || !amount || (requiresCategory && !category) || !date) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    if (((type === "expense" && paymentMethod === "credit-card") || type === "credit-payment") && !selectedCard) {
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
      const isCreditPayment = type === "credit-payment"
      const transaction = {
        title,
        amount: Number.parseFloat(amount),
        type,
        category: requiresCategory ? category : undefined,
        transaction_date: format(date, "yyyy-MM-dd"),
        comment,
        payment_method: isCreditPayment ? "credit_card" : normalizedPaymentMethod,
        credit_card_id: paymentMethod === "credit-card" || isCreditPayment ? selectedCard : null,
        assign_to_savings: type === "expense" && paymentMethod === "cash" ? assignToSavings : false,
        savings_goal_id: assignToSavings && selectedSavingsAccount ? selectedSavingsAccount : null,
      }
      
      console.log("[TRANSACTION] Transaction data:", transaction)

      // Create the transaction
      const response = await transactionsAPI.create(transaction)
      console.log("[TRANSACTION] Transaction created:", response.data)
      const createdId = response.data?.data?.transaction?.id
      let receiptUploaded = true
      if (receipt && createdId) {
        try {
          await transactionsAPI.uploadReceipt(createdId, receipt)
        } catch (receiptError) {
          receiptUploaded = false
          console.error("Failed to upload receipt:", receiptError)
        }
      }
      notifyTransactionsChanged()

      toast({
        title: receiptUploaded ? "Success" : "Transaction saved",
        description: receiptUploaded
          ? "Transaction added successfully"
          : "The transaction was saved, but the receipt could not be uploaded.",
        variant: receiptUploaded ? "default" : "destructive",
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
    setReceipt(null)
    setShowNewCategory(false)
    setNewCategoryName("")
    // Add this to the resetForm function
    setAssignToSavings(false)
    setSelectedSavingsAccount("")
  }

  async function createCategoryFromTransaction() {
    const name = newCategoryName.trim()
    if (!name) return
    try {
      setIsCreatingCategory(true)
      const categoryType = type === "income" ? "income" : "expense"
      const response = await categoriesAPI.createUserCategory({
        name,
        type: categoryType,
        category_group: categoryType === "income" ? "income" : "discretionary",
        color: "#64748b",
      })
      const created = response.data?.data?.category
      if (created) {
        setCategories((current) => [...current, { ...created, source: "user" }])
        setCategory(created.id)
      }
      setNewCategoryName("")
      setShowNewCategory(false)
      toast({ title: "Category created", description: `${name} is ready to use.` })
    } catch (error) {
      console.error("Failed to create category:", error)
      toast({ title: "Error", description: "Could not create the category.", variant: "destructive" })
    } finally {
      setIsCreatingCategory(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={cn("ml-auto", triggerClassName ?? "hidden md:flex")}>
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
                  <SelectItem value="credit-payment">Credit Payment</SelectItem>
                  <SelectItem value="savings-deposit">Saving's Deposit</SelectItem>
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

          {/* Credit/Debit toggle for regular expense transactions only */}
          {type === "expense" && (
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  type="button"
                  variant={!isCredit ? "default" : "outline"}
                  className={`relative transition-all duration-200 ${!isCredit ? "ring-2 ring-primary" : ""}`}
                  onClick={() => {
                    setIsCredit(false);
                    setPaymentMethod("cash");
                  }}
                >
                  <Wallet className="mr-2 h-4 w-4" />
                  Cash/Debit
                </Button>
                <Button 
                  type="button"
                  variant={isCredit ? "default" : "outline"}
                  className={`relative transition-all duration-200 ${isCredit ? "ring-2 ring-primary" : ""}`}
                  onClick={() => {
                    setIsCredit(true);
                    setPaymentMethod("credit-card");
                  }}
                >
                  <CreditCardIcon className="mr-2 h-4 w-4" />
                  Credit Card
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Transaction title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={type === "credit-payment" || type === "savings-deposit"}
            />
          </div>

          {/* Only show category selector for regular income/expense transactions */}
          {(type === "income" || type === "expense") && (
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={(value) => {
                if (value === "create-category") {
                  setShowNewCategory(true)
                  return
                }
                setCategory(value)
              }}>
                <SelectTrigger id="category">
                  <SelectValue placeholder={isLoadingCategories ? "Loading categories..." : "Select category"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="create-category" className="font-medium text-primary">
                    <span className="flex items-center"><Plus className="mr-2 h-4 w-4" />Create custom category</span>
                  </SelectItem>
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
              {showNewCategory && (
                <div className="flex gap-2 rounded-md border bg-muted/40 p-2">
                  <Input
                    autoFocus
                    value={newCategoryName}
                    onChange={(event) => setNewCategoryName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault()
                        void createCategoryFromTransaction()
                      }
                    }}
                    placeholder="New category name"
                    maxLength={255}
                  />
                  <Button type="button" size="sm" onClick={createCategoryFromTransaction} disabled={!newCategoryName.trim() || isCreatingCategory}>
                    {isCreatingCategory ? "Creating..." : "Create"}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Credit card selection */}
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
                      <SelectItem key={`card-${card.id}`} value={card.id}>
                        {card.name} (*{card.last_four}) - ${typeof card.balance === 'number' ? card.balance.toFixed(2) : Number(card.balance).toFixed(2)}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-cards" disabled>No credit cards found</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Special UI for Credit Payment */}
          {type === "credit-payment" && (
            <div className="space-y-2">
              <Label htmlFor="creditOption">Select Credit Card</Label>
              <Select value={selectedCard} onValueChange={setSelectedCard}>
                <SelectTrigger id="creditOption">
                  <SelectValue placeholder={isLoadingCards ? "Loading cards..." : "Select credit card"} />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingCards ? (
                    <SelectItem value="loading" disabled>Loading credits...</SelectItem>
                  ) : (
                    <>
                      {/* Credit Cards Section */}
                      {apiCreditCards.length > 0 && (
                        <>
                          <SelectItem value="cards-header" disabled className="font-semibold">
                            Credit Cards
                          </SelectItem>
                          {apiCreditCards.map((card) => (
                            <SelectItem key={`card-${card.id}`} value={card.id}>
                              {card.name} (*{card.last_four}) - ${typeof card.balance === 'number' ? card.balance.toFixed(2) : Number(card.balance).toFixed(2)}
                            </SelectItem>
                          ))}
                        </>
                      )}
                      
                      {apiCreditCards.length === 0 && (
                        <SelectItem value="no-credits" disabled>
                          No credit cards or loans found
                        </SelectItem>
                      )}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Special UI for Saving's Deposit */}
          {type === "savings-deposit" && (
            <div className="space-y-2">
              <Label htmlFor="savingsAccount">Select Saving/Recurring Payment</Label>
              <Select value={selectedSavingsAccount} onValueChange={setSelectedSavingsAccount}>
                <SelectTrigger id="savingsAccount">
                  <SelectValue placeholder={isLoadingSavings ? "Loading..." : "Select savings goal or recurring payment"} />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingSavings ? (
                    <SelectItem value="loading" disabled>Loading savings data...</SelectItem>
                  ) : (
                    <>
                      {savingsGoals.length > 0 && (
                        <>
                          <SelectItem value="savings-header" disabled className="font-semibold">
                            Savings Goals
                          </SelectItem>
                          {savingsGoals.map((goal) => (
                            <SelectItem key={goal.id} value={goal.id}>
                              {goal.name} (${goal.current.toFixed(2)}/${goal.target.toFixed(2)})
                            </SelectItem>
                          ))}
                        </>
                      )}
                      
                      {recurringPayments.length > 0 && (
                        <>
                          <SelectItem value="recurring-header" disabled className="font-semibold">
                            Recurring Payments
                          </SelectItem>
                          {recurringPayments.map((payment) => (
                            <SelectItem key={payment.id} value={payment.id}>
                              {payment.name} (${payment.current.toFixed(2)}/${payment.amount.toFixed(2)})
                            </SelectItem>
                          ))}
                        </>
                      )}
                      
                      {savingsGoals.length === 0 && recurringPayments.length === 0 && (
                        <SelectItem value="no-savings" disabled>
                          No savings goals or recurring payments found
                        </SelectItem>
                      )}
                    </>
                  )}
                </SelectContent>
              </Select>
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

          <div className="space-y-2">
            <Label htmlFor="receipt">Receipt photo (optional)</Label>
            {receipt ? (
              <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{receipt.name}</p>
                  <p className="text-xs text-muted-foreground">{(receipt.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => setReceipt(null)} aria-label="Remove receipt">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label htmlFor="receipt" className="flex min-h-20 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed px-4 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground">
                <Camera className="h-5 w-5" />
                Take a photo or choose from gallery
              </label>
            )}
            <Input
              id="receipt"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null
                if (file && file.size > 10 * 1024 * 1024) {
                  toast({ title: "Receipt too large", description: "Choose an image of 10 MB or less.", variant: "destructive" })
                  event.target.value = ""
                  return
                }
                setReceipt(file)
              }}
            />
            <p className="text-xs text-muted-foreground">Stored privately and available only from your authenticated account.</p>
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

