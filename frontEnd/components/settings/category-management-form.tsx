"use client"

import { useEffect, useState } from "react"
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Loader2, Pencil } from "lucide-react"
import { categoryService, type Category } from "@/lib/category-service"

export function CategoryManagementForm() {
  const { toast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [newCategory, setNewCategory] = useState({
    name: "",
    type: "expense" as const,
    category_group: "essential" as const,
    icon: "",
    color: "#000000"
  })

  useEffect(() => {
    async function fetchCategories() {
      try {
        setIsLoading(true)
        const allCategories = await categoryService.getAllCategories()
        setCategories(allCategories)
      } catch (error) {
        console.error("Failed to fetch categories:", error)
        toast({
          title: "Error",
          description: "Failed to load categories. Please try again later.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchCategories()
  }, [toast])

  const handleAddCategory = async () => {
    // Validate form
    if (!newCategory.name) {
      toast({
        title: "Error",
        description: "Please enter a category name.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)
      const createdCategory = await categoryService.createUserCategory(newCategory)
      setCategories([...categories, createdCategory])
      setShowAddDialog(false)
      setNewCategory({
        name: "",
        type: "expense",
        category_group: "essential",
        icon: "",
        color: "#000000"
      })

      toast({
        title: "Category added",
        description: "Your new category has been created successfully.",
      })
    } catch (error) {
      console.error("Failed to create category:", error)
      toast({
        title: "Error",
        description: "Failed to create category. Please try again later.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditCategory = async () => {
    if (!selectedCategory) return

    try {
      setIsSubmitting(true)
      const updatedCategory = await categoryService.updateUserCategory(selectedCategory.id, {
        name: selectedCategory.name,
        type: selectedCategory.type,
        category_group: selectedCategory.category_group,
        color: selectedCategory.color,
        icon: selectedCategory.icon
      })

      setCategories(categories.map(cat => 
        cat.id === updatedCategory.id ? updatedCategory : cat
      ))
      setShowEditDialog(false)
      setSelectedCategory(null)

      toast({
        title: "Category updated",
        description: "The category has been updated successfully.",
      })
    } catch (error) {
      console.error("Failed to update category:", error)
      toast({
        title: "Error",
        description: "Failed to update category. Please try again later.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await categoryService.deleteUserCategory(categoryId)
      setCategories(categories.filter(cat => cat.id !== categoryId))
      toast({
        title: "Category deleted",
        description: "The category has been deleted successfully.",
      })
    } catch (error) {
      console.error("Failed to delete category:", error)
      toast({
        title: "Error",
        description: "Failed to delete category. Please try again later.",
        variant: "destructive",
      })
    }
  }

  const handleStartEdit = (category: Category) => {
    setSelectedCategory(category)
    setShowEditDialog(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="system" className="space-y-4">
        <TabsList>
          <TabsTrigger value="system">System Categories</TabsTrigger>
          <TabsTrigger value="custom">Custom Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="system">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {categories
              .filter(cat => cat.source === "default")
              .map(category => (
                <Card key={category.id} className="relative overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between space-x-4">
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold">{category.name}</h4>
                        <p className="text-sm text-muted-foreground capitalize">
                          {category.type} • {category.category_group}
                        </p>
                      </div>
                      <div
                        className="h-4 w-4 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="custom">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Category
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Category</DialogTitle>
                    <DialogDescription>
                      Create a new custom category for your transactions.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        placeholder="Enter category name"
                        value={newCategory.name}
                        onChange={(e) =>
                          setNewCategory({ ...newCategory, name: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type">Type</Label>
                      <Select
                        value={newCategory.type}
                        onValueChange={(value) =>
                          setNewCategory({ ...newCategory, type: value as "expense" })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Type</SelectLabel>
                            <SelectItem value="expense">Expense</SelectItem>
                            <SelectItem value="income">Income</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="group">Category Group</Label>
                      <Select
                        value={newCategory.category_group}
                        onValueChange={(value) =>
                          setNewCategory({ ...newCategory, category_group: value as "essential" })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select group" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Group</SelectLabel>
                            <SelectItem value="essential">Essential</SelectItem>
                            <SelectItem value="discretionary">Discretionary</SelectItem>
                            <SelectItem value="income">Income</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="color">Color</Label>
                      <Input
                        id="color"
                        type="color"
                        value={newCategory.color}
                        onChange={(e) =>
                          setNewCategory({ ...newCategory, color: e.target.value })
                        }
                        className="h-10 px-3 py-2"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddCategory} disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        "Add Category"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {categories
                .filter(cat => cat.source === "user")
                .map(category => (
                  <Card key={category.id} className="relative overflow-hidden group">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between space-x-4">
                        <div className="space-y-1">
                          <h4 className="text-sm font-semibold">{category.name}</h4>
                          <p className="text-sm text-muted-foreground capitalize">
                            {category.type} • {category.category_group}
                          </p>
                        </div>
                        <div
                          className="h-4 w-4 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                      </div>
                      <div className="absolute top-2 right-2 flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleStartEdit(category)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteCategory(category.id)}
                        >
                          ×
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Modify the category details below.
            </DialogDescription>
          </DialogHeader>
          {selectedCategory && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  placeholder="Enter category name"
                  value={selectedCategory.name}
                  onChange={(e) =>
                    setSelectedCategory({ ...selectedCategory, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-type">Type</Label>
                <Select
                  value={selectedCategory.type}
                  onValueChange={(value) =>
                    setSelectedCategory({ ...selectedCategory, type: value as "expense" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Type</SelectLabel>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-group">Category Group</Label>
                <Select
                  value={selectedCategory.category_group}
                  onValueChange={(value) =>
                    setSelectedCategory({ ...selectedCategory, category_group: value as "essential" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Group</SelectLabel>
                      <SelectItem value="essential">Essential</SelectItem>
                      <SelectItem value="discretionary">Discretionary</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-color">Color</Label>
                <Input
                  id="edit-color"
                  type="color"
                  value={selectedCategory.color}
                  onChange={(e) =>
                    setSelectedCategory({ ...selectedCategory, color: e.target.value })
                  }
                  className="h-10 px-3 py-2"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditCategory} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}