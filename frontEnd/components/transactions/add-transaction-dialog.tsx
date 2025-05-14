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
import { Slider } from "@/components/ui/slider"
import { creditAPI, transactionsAPI, categoriesAPI, savingsAPI } from "@/lib/api"
import type { CreditCardType, LoanType } from "@/types/credit"
import { toast } from "@/components/ui/use-toast"

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
      setCategory("credit-payment") // Assuming you have a "credit-payment" category ID
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
        const categoryType = type === "card-payment" || type === "savings-deposit" ? "expense" : type
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
    if (type === "card-payment" && selectedCard) {
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
        savings_goal_id: assignToSavings && selectedSavingsAccount ? selectedSavingsAccount : null,
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
              disabled={type === "card-payment" || type === "savings-deposit"}
            />
          </div>

          {/* Only show category selector for regular income/expense transactions */}
          {(type === "income" || type === "expense") && (
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

          {/* Special UI for Card Payment */}
          {type === "card-payment" && (
            <div className="space-y-2">
              <Label htmlFor="creditCard">Select Card</Label>
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

          {/* Special UI for Credit Payment */}
          {type === "credit-payment" && (
            <div className="space-y-2">
              <Label htmlFor="creditOption">Select Credit</Label>
              <Select value={selectedCard} onValueChange={setSelectedCard}>
                <SelectTrigger id="creditOption">
                  <SelectValue placeholder={isLoadingCards ? "Loading credits..." : "Select credit card or loan"} />
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
                      
                      {/* Loans Section */}
                      {apiLoans.length > 0 && (
                        <>
                          <SelectItem value="loans-header" disabled className="font-semibold">
                            Loans
                          </SelectItem>
                          {apiLoans.map((loan) => (
                            <SelectItem key={`loan-${loan.id}`} value={loan.id}>
                              {loan.name} (#{loan.bank_number}) - ${typeof loan.balance === 'number' ? loan.balance.toFixed(2) : Number(loan.balance).toFixed(2)}
                            </SelectItem>
                          ))}
                        </>
                      )}
                      
                      {apiCreditCards.length === 0 && apiLoans.length === 0 && (
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

