"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { CalendarIcon, Trash2, AlertCircle } from "lucide-react"
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
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { CreditCard as CreditCardIcon, Wallet } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "@/components/ui/use-toast"
import { transactionsAPI, categoriesAPI, creditAPI } from "@/lib/api"
import type { CreditCardType } from "@/types/credit"

interface Category {
  id: string
  name: string
  type: "income" | "expense"
  category_group?: string
  icon?: string
  color?: string
  source: 'default' | 'user'
}

interface TransactionDetailsProps {
  isOpen: boolean
  onClose: () => void
  transactionId: string
  onTransactionUpdated?: () => void
}

export function TransactionDetailsDialog({ isOpen, onClose, transactionId, onTransactionUpdated }: TransactionDetailsProps) {
  // Transaction state
  const [transaction, setTransaction] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  
  // Form fields
  const [title, setTitle] = useState("")
  const [amount, setAmount] = useState("")
  const [type, setType] = useState<"income" | "expense">("expense")
  const [category, setCategory] = useState("")
  const [date, setDate] = useState<Date>(new Date())
  const [comment, setComment] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [selectedCard, setSelectedCard] = useState("")
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  
  // Delete confirmation dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Available options for selects
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(false)
  const [apiCreditCards, setApiCreditCards] = useState<CreditCardType[]>([])
  const [isLoadingCards, setIsLoadingCards] = useState(false)
  
  // Get transaction details when component mounts or transactionId changes
  useEffect(() => {
    if (isOpen && transactionId) {
      fetchTransactionDetails()
    }
  }, [isOpen, transactionId])
  
  // Fetch categories when type changes
  useEffect(() => {
    if (isOpen && type) {
      fetchCategories()
    }
  }, [isOpen, type])
  
  // Fetch credit cards when needed
  useEffect(() => {
    if (isOpen && type === "expense" && paymentMethod === "credit-card") {
      fetchCreditCards()
    }
  }, [isOpen, type, paymentMethod])
  
  // Reset payment method when transaction type changes
  useEffect(() => {
    if (type === "income") {
      setPaymentMethod("cash")
      setSelectedCard("")
    }
  }, [type])
  
  async function fetchTransactionDetails() {
    try {
      setIsLoading(true)
      setError("")
      
      const response = await transactionsAPI.getById(transactionId)
      const transactionData = response.data?.data?.transaction
      
      if (transactionData) {
        setTransaction(transactionData)
        // Set form fields
        setTitle(transactionData.title || "")
        setAmount(transactionData.amount?.toString() || "")
        setType(transactionData.type || "expense")
        
        // Handle category selection - use either category_id or user_category_id
        const catId = transactionData.category_id || transactionData.user_category_id
        setCategory(catId || "")
        
        // Set date
        if (transactionData.transaction_date) {
          setDate(new Date(transactionData.transaction_date))
        }
        
        // Set comment
        setComment(transactionData.comment || "")
        
        // Set payment method
        const method = transactionData.payment_method || "cash"
        setPaymentMethod(method === "credit_card" ? "credit-card" : method)
        
        // Set selected card if available
        if (transactionData.credit_card_id) {
          setSelectedCard(transactionData.credit_card_id)
        }
      } else {
        setError("Could not retrieve transaction details")
      }
    } catch (err) {
      console.error("Error fetching transaction:", err)
      setError("Failed to load transaction details")
    } finally {
      setIsLoading(false)
    }
  }
  
  async function fetchCategories() {
    try {
      setIsLoadingCategories(true)
      const response = await categoriesAPI.getByType(type)
      if (response?.data?.data?.categories) {
        setCategories(response.data.data.categories)
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err)
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive",
      })
    } finally {
      setIsLoadingCategories(false)
    }
  }
  
  async function fetchCreditCards() {
    try {
      setIsLoadingCards(true)
      const response = await creditAPI.getCards()
      if (response?.data?.data?.cards) {
        setApiCreditCards(response.data.data.cards)
      }
    } catch (err) {
      console.error("Failed to fetch credit cards:", err)
      toast({
        title: "Error",
        description: "Failed to load credit cards",
        variant: "destructive",
      })
    } finally {
      setIsLoadingCards(false)
    }
  }
  
  async function handleSave() {
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
      setIsSaving(true)
      
      // Normalize payment method for the API
      const normalizedPaymentMethod = paymentMethod === "credit-card" ? "credit_card" : paymentMethod
      
      // Create updated transaction object
      const updatedTransaction = {
        title,
        amount: Number.parseFloat(amount),
        type,
        category_id: category,
        transaction_date: date.toISOString(),
        comment,
        payment_method: normalizedPaymentMethod,
        credit_card_id: paymentMethod === "credit-card" ? selectedCard : null,
      }
      
      // Update the transaction
      await transactionsAPI.update(transactionId, updatedTransaction)
      
      toast({
        title: "Success",
        description: "Transaction updated successfully",
      })
      
      // Notify parent component that transaction was updated
      if (onTransactionUpdated) {
        onTransactionUpdated()
      }
      
      // Close the dialog
      onClose()
    } catch (err) {
      console.error("Failed to update transaction:", err)
      toast({
        title: "Error",
        description: "Failed to update transaction",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }
  
  async function handleDelete() {
    try {
      setIsDeleting(true)
      
      // Delete the transaction
      await transactionsAPI.delete(transactionId)
      
      toast({
        title: "Success",
        description: "Transaction deleted successfully",
      })
      
      // Notify parent component that transaction was deleted
      if (onTransactionUpdated) {
        onTransactionUpdated()
      }
      
      // Close both dialogs
      setIsDeleteDialogOpen(false)
      onClose()
    } catch (err) {
      console.error("Failed to delete transaction:", err)
      toast({
        title: "Error",
        description: "Failed to delete transaction",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }
  
  if (!isOpen) return null
  
  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription>View or edit transaction details</DialogDescription>
          </DialogHeader>
          
          {isLoading ? (
            <div className="flex justify-center p-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="rounded-md bg-destructive/15 p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-destructive mr-2" />
                <div className="ml-1">
                  <p className="text-sm font-medium text-destructive">{error}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select value={type} onValueChange={(v) => setType(v as "income" | "expense")}>
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
            </div>
          )}
          
          <DialogFooter className="pt-4 flex justify-between">
            <Button 
              type="button" 
              variant="destructive" 
              onClick={() => setIsDeleteDialogOpen(true)}
              disabled={isLoading || isSaving}
              className="mr-auto"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
            <div className="space-x-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading || isSaving}>
                Cancel
              </Button>
              <Button 
                type="button" 
                onClick={handleSave}
                disabled={isLoading || isSaving}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the transaction from your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}