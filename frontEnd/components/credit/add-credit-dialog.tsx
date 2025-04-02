"use client"

import type React from "react"

import { useState } from "react"
import { format } from "date-fns"
import { CalendarIcon, Plus, CreditCardIcon, Landmark } from "lucide-react"
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
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function AddCreditDialog() {
  const [open, setOpen] = useState(false)
  const [creditType, setCreditType] = useState("credit-card")
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

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

    // Validate form
    if (!name || !balance || !dueDate || !interestRate) {
      alert("Please fill in all required fields")
      return
    }

    // Create credit object based on type
    const creditData = {
      type: creditType,
      name,
      balance: Number.parseFloat(balance),
      dueDate,
      interestRate: Number.parseFloat(interestRate),
      ...(creditType === "credit-card"
        ? {
            lastFour: cardNumber,
            limit: creditLimit ? Number.parseFloat(creditLimit) : undefined,
            minPayment: minPayment ? Number.parseFloat(minPayment) : undefined,
          }
        : {
            bankNumber,
            originalAmount: originalAmount ? Number.parseFloat(originalAmount) : undefined,
            term,
            monthlyPayment: monthlyPayment ? Number.parseFloat(monthlyPayment) : undefined,
          }),
    }

    // In a real app, you would send this data to your API
    console.log(creditData)

    // API integration (commented out until backend is ready)
    // try {
    //   setIsLoading(true);
    //
    //   if (creditType === "credit-card") {
    //     await creditAPI.addCard(creditData);
    //   } else {
    //     await creditAPI.addLoan(creditData);
    //   }
    //
    //   // Handle success
    //   console.log(`${creditType === "credit-card" ? "Credit card" : "Loan"} added successfully`);
    //
    //   // Close the dialog after submission
    //   setOpen(false);
    //
    //   // Reset the form
    //   resetForm();
    // } catch (error) {
    //   console.error(`Failed to add ${creditType === "credit-card" ? "credit card" : "loan"}:`, error);
    //   alert(`Failed to add ${creditType === "credit-card" ? "credit card" : "loan"}. Please try again.`);
    // } finally {
    //   setIsLoading(false);
    // }

    // For now, just close the dialog and reset the form
    setOpen(false)
    resetForm()
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

