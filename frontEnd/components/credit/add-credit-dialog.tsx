"use client"

import type React from "react"
import { useState } from "react"
import { format } from "date-fns"
import { CalendarIcon, Plus, CreditCardIcon, Landmark } from "lucide-react"
import { cn } from "@/lib/utils"
import { creditAPI } from "@/lib/api"
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
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"

export interface AddCreditDialogProps {
  onSuccess?: () => void;
}

export function AddCreditDialog({ onSuccess }: AddCreditDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [creditType, setCreditType] = useState("credit-card")
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Common fields
  const [name, setName] = useState("")
  const [balance, setBalance] = useState("")
  const [dueDate, setDueDate] = useState<Date>(new Date())
  const [interestRate, setInterestRate] = useState("")

  // Credit card specific fields
  const [cardNumber, setCardNumber] = useState("")
  const [creditLimit, setCreditLimit] = useState("")
  const [minPayment, setMinPayment] = useState("")

  // Loan specific fields
  const [bankNumber, setBankNumber] = useState("")
  const [originalAmount, setOriginalAmount] = useState("")
  const [term, setTerm] = useState("")
  const [monthlyPayment, setMonthlyPayment] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (creditType === "credit-card") {
        await creditAPI.addCard({
          name,
          last_four: cardNumber,
          balance: Number.parseFloat(balance),
          credit_limit: Number.parseFloat(creditLimit),
          interest_rate: Number.parseFloat(interestRate),
          due_date: dueDate.toISOString(),
          min_payment: minPayment ? Number.parseFloat(minPayment) : undefined,
        })
      } else {
        // Loan information with required start_date value
        await creditAPI.addLoan({
          name,
          balance: Number.parseFloat(balance),
          due_date: dueDate.toISOString(),
          interest_rate: Number.parseFloat(interestRate),
          bank_number: bankNumber,
          original_amount: Number.parseFloat(originalAmount),
          term,
          monthly_payment: Number.parseFloat(monthlyPayment),
          loan_type: "personal", // Default to personal loan
          start_date: new Date().toISOString(), // Añadimos la fecha de inicio actual
        })
      }

      // Show success message
      toast({
        title: "Success",
        description: `${creditType === "credit-card" ? "Credit card" : "Loan"} added successfully!`,
        variant: "default",
      })

      // Reset form and close dialog
      resetForm()
      setOpen(false)

      // Reload cards list
      onSuccess?.()
    } catch (error) {
      console.error("Failed to add credit card/loan:", error)
      toast({
        title: "Error",
        description: "Failed to add credit card/loan. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  function resetForm() {
    setCreditType("credit-card")
    setName("")
    setBalance("")
    setDueDate(new Date())
    setInterestRate("")
    setCardNumber("")
    setCreditLimit("")
    setMinPayment("")
    setBankNumber("")
    setOriginalAmount("")
    setTerm("")
    setMonthlyPayment("")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Add Credit Card / Loan
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Credit Card or Loan</DialogTitle>
          <DialogDescription>Enter the details of your credit card or loan below.</DialogDescription>
        </DialogHeader>

        <Tabs value={creditType} onValueChange={setCreditType}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="credit-card" className="flex items-center">
              <CreditCardIcon className="mr-2 h-4 w-4" />
              Credit Card
            </TabsTrigger>
            <TabsTrigger value="loan" className="flex items-center">
              <Landmark className="mr-2 h-4 w-4" />
              Loan
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name / Title</Label>
            <Input
              id="name"
              placeholder={creditType === "credit-card" ? "Chase Sapphire" : "Auto Loan"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="balance">Current Balance</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
                <Input
                  id="balance"
                  placeholder="0.00"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  className="pl-7"
                  type="number"
                  step="0.01"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="interestRate">Interest Rate (%)</Label>
              <div className="relative">
                <Input
                  id="interestRate"
                  placeholder="0.00"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  type="number"
                  step="0.01"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2">%</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date</Label>
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="dueDate"
                  variant={"outline"}
                  className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={(date) => {
                    if (date) {
                      setDueDate(date)
                      setDatePickerOpen(false)
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {creditType === "credit-card" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="cardNumber">Card Number (last 4 digits)</Label>
                <Input
                  id="cardNumber"
                  placeholder="1234"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  maxLength={4}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="creditLimit">Credit Limit</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
                    <Input
                      id="creditLimit"
                      placeholder="0.00"
                      value={creditLimit}
                      onChange={(e) => setCreditLimit(e.target.value)}
                      className="pl-7"
                      type="number"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minPayment">Minimum Payment</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
                    <Input
                      id="minPayment"
                      placeholder="0.00"
                      value={minPayment}
                      onChange={(e) => setMinPayment(e.target.value)}
                      className="pl-7"
                      type="number"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="bankNumber">Bank/Loan Number</Label>
                <Input
                  id="bankNumber"
                  placeholder="123456789"
                  value={bankNumber}
                  onChange={(e) => setBankNumber(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="originalAmount">Original Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
                    <Input
                      id="originalAmount"
                      placeholder="0.00"
                      value={originalAmount}
                      onChange={(e) => setOriginalAmount(e.target.value)}
                      className="pl-7"
                      type="number"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="term">Term</Label>
                  <Input id="term" placeholder="5 years" value={term} onChange={(e) => setTerm(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="monthlyPayment">Monthly Payment</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
                  <Input
                    id="monthlyPayment"
                    placeholder="0.00"
                    value={monthlyPayment}
                    onChange={(e) => setMonthlyPayment(e.target.value)}
                    className="pl-7"
                    type="number"
                    step="0.01"
                    required
                  />
                </div>
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

