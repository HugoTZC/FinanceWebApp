"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Plus, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { budgetAPI, categoriesAPI } from "@/lib/api"

interface AddBudgetDialogProps {
  onBudgetAdded?: () => void
}

export function AddBudgetDialog({ onBudgetAdded }: AddBudgetDialogProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [categoryType, setCategoryType] = useState("all")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [budgetAmount, setBudgetAmount] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // For API integration
  const [apiCategories, setApiCategories] = useState<any[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(false)

  // Fetch categories from API
  useEffect(() => {
    async function fetchCategories() {
      try {
        setIsLoadingCategories(true)
        // Get both system and user categories
        const [systemCategoriesResponse, userCategoriesResponse] = await Promise.all([
          categoriesAPI.getAll(),
          categoriesAPI.getUserCategories()
        ])

        const systemCategories = systemCategoriesResponse.data.data.categories || []
        const userCategories = userCategoriesResponse.data.data.categories || []
        
        // Combine and format categories
        const allCategories = [
          ...systemCategories.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            type: cat.type,
            category_group: cat.category_group,
            is_user_category: false
          })),
          ...userCategories.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            type: cat.type,
            category_group: cat.category_group,
            is_user_category: true
          }))
        ]
        
        setApiCategories(allCategories)
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

    if (open) {
      fetchCategories()
    }
  }, [open, toast])

  // Filter categories based on selected type
  const filteredCategories =
    categoryType === "all" ? apiCategories : apiCategories.filter((category) => category.category_group?.toLowerCase() === categoryType)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Validate form
    if (!selectedCategory || !budgetAmount) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    const amount = Number.parseFloat(budgetAmount)
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid budget amount",
        variant: "destructive",
      })
      return
    }

    // Find the selected category in our list to determine if it's a system or user category
    const selectedCategoryData = apiCategories.find(cat => cat.id === selectedCategory)
    if (!selectedCategoryData) {
      toast({
        title: "Error",
        description: "Selected category not found",
        variant: "destructive",
      })
      return
    }

    // El año actual debe ser válido según la validación del backend
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-based
    
    // Crear objeto de presupuesto enviando solo el campo necesario según el tipo de categoría
    const budgetData = {
      year: currentYear,
      month: currentMonth,
      categories: [{
        // Solo incluimos uno de los campos según el tipo de categoría, dejando el otro sin definir
        ...(selectedCategoryData.is_user_category 
          ? { user_category_id: selectedCategory } 
          : { category_id: selectedCategory }),
        amount: amount // Asegurarse de que sea número, no string
      }]
    };

    console.log("Sending budget data:", JSON.stringify(budgetData, null, 2));

    try {
      setIsLoading(true);
      
      // Modo de depuración más detallada
      try {
        const response = await budgetAPI.createOrUpdateBudget(budgetData);
        console.log("Budget API response:", response);
        
        toast({
          title: "Success",
          description: "Budget has been updated successfully.",
        });
        
        // Close the dialog after submission
        setOpen(false);
        
        // Reset the form
        resetForm();
        
        // Notify parent component
        if (onBudgetAdded) {
          onBudgetAdded();
        }
      } catch (error: any) {
        // Mostrar información detallada del error
        console.error("Failed to update budget:", error);
        console.error("Error response data:", error.response?.data);
        console.error("Error status:", error.response?.status);
        console.error("Error details:", error.response?.data?.message || "Unknown error");
        
        toast({
          title: "Error",
          description: `Failed to update budget: ${error.response?.data?.message || error.message || "Unknown error"}`,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    setCategoryType("all")
    setSelectedCategory("")
    setBudgetAmount("")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Add Budget Category
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Budget Category</DialogTitle>
          <DialogDescription>Set a budget for a specific category of expenses.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Category Type</Label>
            <RadioGroup value={categoryType} onValueChange={setCategoryType} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="cursor-pointer">
                  All
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="essential" id="essential" />
                <Label htmlFor="essential" className="cursor-pointer">
                  Essential
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="discretionary" id="discretionary" />
                <Label htmlFor="discretionary" className="cursor-pointer">
                  Discretionary
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {isLoadingCategories ? (
                  <SelectItem value="loading" disabled>Loading categories...</SelectItem>
                ) : filteredCategories.length > 0 ? (
                  <>
                    <SelectItem value="system-header" disabled className="font-semibold">
                      System Categories
                    </SelectItem>
                    {filteredCategories.filter(cat => !cat.is_user_category).map((category, index) => (
                      <SelectItem key={`system-${category.id}-${index}`} value={category.id}>
                        {category.name} ({category.category_group?.toLowerCase()})
                      </SelectItem>
                    ))}
                    
                    <SelectItem value="user-header" disabled className="font-semibold">
                      Custom Categories
                    </SelectItem>
                    {filteredCategories.filter(cat => cat.is_user_category).map((category, index) => (
                      <SelectItem key={`user-${category.id}-${index}`} value={category.id}>
                        {category.name} ({category.category_group?.toLowerCase()})
                      </SelectItem>
                    ))}
                  </>
                ) : (
                  <SelectItem value="no-categories" disabled>No categories found</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="budgetAmount">Budget Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
              <Input
                id="budgetAmount"
                placeholder="0.00"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                className="pl-7"
                type="number"
                step="0.01"
                min="0"
              />
            </div>
            <p className="text-xs text-muted-foreground">Set a monthly budget for this category.</p>
          </div>

          <div className="flex items-center space-x-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-md">
            <AlertTriangle className="h-4 w-4" />
            <p>You'll receive a notification when you reach 85% of this budget.</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Budget"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

