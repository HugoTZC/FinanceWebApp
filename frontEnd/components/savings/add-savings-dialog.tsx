"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { format, differenceInWeeks } from "date-fns"
import { CalendarIcon, Plus, PiggyBank, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { savingsAPI } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

export function AddSavingsDialog({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false)
  const [savingsType, setSavingsType] = useState("goal")
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  // Common fields
  const [name, setName] = useState("")
  const [targetAmount, setTargetAmount] = useState("")
  const [currentAmount, setCurrentAmount] = useState("")
  const [dueDate, setDueDate] = useState<Date>(new Date())

  // Weekly target calculation
  const [weeklyTarget, setWeeklyTarget] = useState("")

  // Recurring payment specific fields
  const [category, setCategory] = useState("")
  const [frequency, setFrequency] = useState("monthly")

  // Calculate weekly target when target amount or due date changes
  useEffect(() => {
    if (targetAmount && dueDate) {
      const targetAmountNum = Number.parseFloat(targetAmount)
      const currentAmountNum = currentAmount ? Number.parseFloat(currentAmount) : 0
      const amountNeeded = targetAmountNum - currentAmountNum

      if (amountNeeded > 0) {
        const today = new Date()
        const weeksUntilDue = Math.max(1, differenceInWeeks(dueDate, today))
        const calculatedWeeklyTarget = amountNeeded / weeksUntilDue
        setWeeklyTarget(calculatedWeeklyTarget.toFixed(2))
      } else {
        setWeeklyTarget("0.00")
      }
    }
  }, [targetAmount, currentAmount, dueDate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Validate form
    if (!name || !targetAmount || !dueDate) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    try {
      setIsLoading(true)

      // Check if user is authenticated before making the request
      const token = localStorage.getItem("token")
      if (!token) {
        console.error("Authentication error: No token found")
        toast({
          title: "Authentication Error",
          description: "You must be logged in to create a savings goal",
          variant: "destructive"
        })
        return
      }

      if (savingsType === "goal") {
        // Format data for savings goal API
        const goalData = {
          name,
          target_amount: Number.parseFloat(targetAmount),
          current_amount: currentAmount ? Number.parseFloat(currentAmount) : 0,
          start_date: new Date().toISOString().split('T')[0], // Make sure start date is included
          target_date: dueDate.toISOString().split('T')[0]
        }

        console.log('Sending savings goal data:', goalData);

        try {
          // Send data to the backend
          const response = await savingsAPI.createGoal(goalData);
          console.log('Savings goal creation response:', response);
          
          toast({
            title: "Success",
            description: "Savings goal has been created successfully",
          });
        } catch (error: any) {
          console.error('Error creating savings goal:', error);
          console.error('Error response details:', error.response?.data);
          console.error('Error status:', error.response?.status);
          console.error('Error headers:', error.response?.headers);
          throw error;
        }
      } else {
        // Format data for recurring payment API
        const paymentData = {
          name,
          amount: Number.parseFloat(targetAmount),
          current_amount: currentAmount ? Number.parseFloat(currentAmount) : 0,
          due_date: dueDate.toISOString().split('T')[0],
          frequency,
          category
        }

        console.log('Sending recurring payment data:', paymentData);

        try {
          // Send data to the backend
          const response = await savingsAPI.createRecurringPayment(paymentData);
          console.log('Recurring payment creation response:', response);
          
          toast({
            title: "Success",
            description: "Recurring payment has been created successfully",
          });
        } catch (error: any) {
          console.error('Error creating recurring payment:', error);
          console.error('Error response details:', error.response?.data);
          console.error('Error status:', error.response?.status);
          console.error('Error headers:', error.response?.headers);
          throw error;
        }
      }

      // Close the dialog after submission
      setOpen(false)

      // Reset the form
      resetForm()

      // Call the onSuccess callback if provided
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      console.error(`Failed to add ${savingsType === "goal" ? "savings goal" : "recurring payment"}:`, error);
      
      // Display more detailed error message if available
      let errorMessage = `Failed to create ${savingsType === "goal" ? "savings goal" : "recurring payment"}. Please try again.`;
      
      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = "Authentication error: You need to be logged in.";
        } else if (error.response.status === 500) {
          errorMessage = "Server error: Something went wrong on our end. Please try again or contact support.";
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  function resetForm() {
    setSavingsType("goal")
    setName("")
    setTargetAmount("")
    setCurrentAmount("")
    setDueDate(new Date())
    setWeeklyTarget("")
    setCategory("")
    setFrequency("monthly")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Add {savingsType === "goal" ? "Savings Goal" : "Recurring Payment"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Savings Goal or Recurring Payment</DialogTitle>
          <DialogDescription>Enter the details of your savings goal or recurring payment below.</DialogDescription>
        </DialogHeader>

        <Tabs value={savingsType} onValueChange={setSavingsType}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="goal" className="flex items-center">
              <PiggyBank className="mr-2 h-4 w-4" />
              Savings Goal
            </TabsTrigger>
            <TabsTrigger value="recurring" className="flex items-center">
              <Calendar className="mr-2 h-4 w-4" />
              Recurring Payment
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name / Title</Label>
            <Input
              id="name"
              placeholder={savingsType === "goal" ? "Emergency Fund" : "Mortgage Payment"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targetAmount">{savingsType === "goal" ? "Target Amount" : "Payment Amount"}</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
                <Input
                  id="targetAmount"
                  placeholder="0.00"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className="pl-7"
                  type="number"
                  step="0.01"
                  required
                />
              </div>
            </div>

            {savingsType === "goal" && (
              <div className="space-y-2">
                <Label htmlFor="currentAmount">Current Amount Saved</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
                  <Input
                    id="currentAmount"
                    placeholder="0.00"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    className="pl-7"
                    type="number"
                    step="0.01"
                  />
                </div>
              </div>
            )}

            {savingsType === "recurring" && (
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger id="frequency">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">{savingsType === "goal" ? "Target Date" : "Next Due Date"}</Label>
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
                <CalendarComponent
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
            <p className="text-xs text-muted-foreground">
              {savingsType === "goal"
                ? "This is the date by which you want to reach your savings goal."
                : "This payment will recur on this day each month."}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="weeklyTarget">Weekly {savingsType === "goal" ? "Savings" : "Payment"} Target</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
              <Input
                id="weeklyTarget"
                placeholder="0.00"
                value={weeklyTarget}
                className="pl-7"
                type="number"
                step="0.01"
                readOnly
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {savingsType === "goal"
                ? "This is the amount you need to save weekly to reach your goal by the target date."
                : "This is the amount you need to save weekly to meet this payment by the due date."}
            </p>
          </div>

          {savingsType === "recurring" && (
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="housing">Housing</SelectItem>
                  <SelectItem value="transportation">Transportation</SelectItem>
                  <SelectItem value="utilities">Utilities</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="debt">Debt</SelectItem>
                  <SelectItem value="subscription">Subscription</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
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

