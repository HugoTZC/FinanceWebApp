"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Category, CategoryGroup } from "@/types/categories"
import { CategoryEditDialog } from "./category-edit-dialog"
import { ColorPickerDialog } from "./color-picker-dialog"

interface CategoryListProps {
  categories: Category[]
  onAddCategory: (category: Omit<Category, "id">) => void
  onUpdateCategory: (id: string, category: Partial<Category>) => void
  onDeleteCategory: (id: string) => void
}

export function CategoryList({
  categories,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
}: CategoryListProps) {
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<"expense" | "income">("expense")

  const expenseCategories = categories.filter((c) => c.type === "expense")
  const incomeCategories = categories.filter((c) => c.type === "income")

  const groupCategories = (cats: Category[]) => {
    const groups: Record<CategoryGroup, Category[]> = {
      essential: [],
      discretionary: [],
      income: [],
    }
    cats.forEach((cat) => {
      groups[cat.category_group].push(cat)
    })
    return groups
  }

  const groupedExpenses = groupCategories(expenseCategories)
  const groupedIncome = groupCategories(incomeCategories)

  return (
    <>
      <Tabs defaultValue="expense" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger
            value="expense"
            onClick={() => setSelectedType("expense")}
          >
            Expenses
          </TabsTrigger>
          <TabsTrigger value="income" onClick={() => setSelectedType("income")}>
            Income
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expense">
          <div className="space-y-6">
            {Object.entries(groupedExpenses).map(
              ([group, cats]) =>
                cats.length > 0 && (
                  <Card key={group}>
                    <CardHeader>
                      <CardTitle className="capitalize">{group}</CardTitle>
                      <CardDescription>
                        Manage your {group} expense categories
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {cats.map((category) => (
                          <div
                            key={category.id}
                            className="flex items-center justify-between space-x-4 rounded-lg border p-4"
                          >
                            <div className="flex items-center space-x-4">
                              <div
                                className="h-8 w-8 rounded-full"
                                style={{ backgroundColor: category.color }}
                              />
                              <div>{category.name}</div>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingCategory(category)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-600"
                                onClick={() => onDeleteCategory(category.id)}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )
            )}
          </div>
        </TabsContent>

        <TabsContent value="income">
          <div className="space-y-6">
            {Object.entries(groupedIncome).map(
              ([group, cats]) =>
                cats.length > 0 && (
                  <Card key={group}>
                    <CardHeader>
                      <CardTitle className="capitalize">{group}</CardTitle>
                      <CardDescription>
                        Manage your {group} income categories
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {cats.map((category) => (
                          <div
                            key={category.id}
                            className="flex items-center justify-between space-x-4 rounded-lg border p-4"
                          >
                            <div className="flex items-center space-x-4">
                              <div
                                className="h-8 w-8 rounded-full"
                                style={{ backgroundColor: category.color }}
                              />
                              <div>{category.name}</div>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingCategory(category)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-600"
                                onClick={() => onDeleteCategory(category.id)}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )
            )}
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-6">
        <Button onClick={() => setIsAddDialogOpen(true)}>
          Add New {selectedType === "expense" ? "Expense" : "Income"} Category
        </Button>
      </div>

      <CategoryEditDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSave={onAddCategory}
        type={selectedType}
      />

      {editingCategory && (
        <CategoryEditDialog
          open={!!editingCategory}
          onOpenChange={(open) => !open && setEditingCategory(null)}
          initialCategory={editingCategory}
          onSave={(data) => onUpdateCategory(editingCategory.id, data)}
        />
      )}

      <ColorPickerDialog
        open={isColorPickerOpen}
        onOpenChange={setIsColorPickerOpen}
        initialColor="#000000"
        onColorChange={() => {}}
        title="Choose Category Color"
      />
    </>
  )
}