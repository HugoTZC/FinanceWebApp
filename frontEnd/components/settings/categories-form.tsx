"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { categoriesAPI } from "@/lib/api"
import { Edit2, Plus, Trash2, Search, CircleDot, LucideIcon } from "lucide-react"
import * as LucideIcons from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

interface Category {
  id: string
  name: string
  type: "income" | "expense"
  category_group: "essential" | "discretionary" | "income"
  icon?: string
  color?: string
  source: "default" | "user"
}

// Get all Lucide icons and prepare them for the picker
const iconList = Object.entries(LucideIcons)
  .filter(([name, icon]) => {
    return name !== "default" && 
           !name.includes("Service") && 
           typeof icon === "function" &&
           name !== "createLucideIcon"
  })
  .map(([name, Icon]) => ({
    name: name.replace(/([A-Z])/g, ' $1').trim(), // Convert camelCase to words
    Icon: Icon as LucideIcon,
    value: name
  }))

const DEFAULT_CATEGORY_ICONS = [
  "Wallet",
  "CreditCard",
  "DollarSign",
  "ShoppingCart",
  "Home",
  "Car",
  "Utensils",
  "Bus",
  "Plane",
  "Heart",
  "ShoppingBag",
  "Gift",
  "Coffee",
  "Gamepad2",
  "GraduationCap",
  "Building2",
  "Briefcase",
  "Baby",
  "Dumbbell",
  "Wifi",
  "Bug"
]

export function CategoriesForm() {
  const { toast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"default" | "custom">("default")
  const [editCategory, setEditCategory] = useState<Category | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false)
  const [iconSearch, setIconSearch] = useState("")

  const [formData, setFormData] = useState({
    name: "",
    type: "expense",
    category_group: "essential",
    color: "#4ade80",
    icon: "CircleDot"
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      setIsLoading(true)
      const response = await categoriesAPI.getAll()
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
      setIsLoading(false)
    }
  }

  const handleEditCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editCategory) return

    try {
      // For default categories, only update color
      if (editCategory.source === "default") {
        await categoriesAPI.updateDefaultCategory(editCategory.id, { color: formData.color })
      } else {
        // For user categories, update all fields
        await categoriesAPI.updateUserCategory(editCategory.id, formData)
      }
      
      toast({
        title: "Success",
        description: "Category updated successfully.",
      })
      
      setIsEditDialogOpen(false)
      fetchCategories()
    } catch (error) {
      console.error("Failed to update category:", error)
      toast({
        title: "Error",
        description: "Failed to update category. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await categoriesAPI.createUserCategory(formData)
      toast({
        title: "Success",
        description: "Category created successfully.",
      })
      setIsAddDialogOpen(false)
      fetchCategories()
    } catch (error) {
      console.error("Failed to create category:", error)
      toast({
        title: "Error",
        description: "Failed to create category. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteCategory = async (category: Category) => {
    if (!confirm("Are you sure you want to delete this category?")) return

    try {
      await categoriesAPI.deleteUserCategory(category.id)
      toast({
        title: "Success",
        description: "Category deleted successfully.",
      })
      fetchCategories()
    } catch (error) {
      console.error("Failed to delete category:", error)
      toast({
        title: "Error",
        description: "Failed to delete category. Please try again.",
        variant: "destructive",
      })
    }
  }

  const openEditDialog = (category: Category) => {
    setEditCategory(category)
    setFormData({
      name: category.name,
      type: category.type,
      category_group: category.category_group,
      color: category.color || "#4ade80",
      icon: category.icon || "CircleDot"
    })
    setIsEditDialogOpen(true)
  }

  const openAddDialog = () => {
    setFormData({
      name: "",
      type: "expense",
      category_group: "essential",
      color: "#4ade80",
      icon: "CircleDot"
    })
    setIsAddDialogOpen(true)
  }

  const filteredIcons = iconList.filter(icon => 
    icon.name.toLowerCase().includes(iconSearch.toLowerCase())
  )

  const getIconComponent = (iconName: string): LucideIcon => {
    if (!iconName) return CircleDot;
    
    // For database names (lowercase), convert to camelCase
    const camelCaseName = iconName.replace(/(^|-)([a-z])/g, (match, p1, p2) => p2.toUpperCase());
    
    // Try to get the icon first with the original name, then camelCase, then lowercase
    return (LucideIcons[iconName as keyof typeof LucideIcons] || 
            LucideIcons[camelCaseName as keyof typeof LucideIcons] ||
            CircleDot) as LucideIcon;
  }

  const IconPicker = () => (
    <Dialog open={isIconPickerOpen} onOpenChange={setIsIconPickerOpen}>
      <DialogContent className="max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Select an Icon</DialogTitle>
          <DialogDescription>
            Choose an icon for your category
          </DialogDescription>
        </DialogHeader>
        
        <Command>
          <CommandGroup>
            <div className="grid grid-cols-4 gap-4 p-4">
              {DEFAULT_CATEGORY_ICONS.map((iconName) => {
                const IconComponent = getIconComponent(iconName);
                return (
                  <CommandItem
                    key={iconName}
                    value={iconName}
                    onSelect={(selectedValue) => {
                      setFormData({ ...formData, icon: selectedValue })
                      setIsIconPickerOpen(false)
                    }}
                    className="flex items-center justify-center p-3 cursor-pointer hover:bg-accent rounded-md aspect-square"
                  >
                    <IconComponent 
                      className="h-8 w-8"
                      style={{ color: formData.color }}
                    />
                  </CommandItem>
                )
              })}
            </div>
          </CommandGroup>
        </Command>
      </DialogContent>
    </Dialog>
  )

  const renderDefaultCategoryForm = (onSubmit: (e: React.FormEvent) => Promise<void>) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={formData.name}
          readOnly
          className="bg-muted"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Type</Label>
        <Input
          id="type"
          value={formData.type.charAt(0).toUpperCase() + formData.type.slice(1)}
          readOnly
          className="bg-muted"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category_group">Group</Label>
        <Input
          id="category_group"
          value={formData.category_group.charAt(0).toUpperCase() + formData.category_group.slice(1)}
          readOnly
          className="bg-muted"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="color">Color</Label>
        <div className="flex gap-2">
          <Input
            id="color"
            type="color"
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            className="w-24"
          />
          <Input
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            placeholder="#000000"
            className="flex-1"
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
          Cancel
        </Button>
        <Button type="submit">Save changes</Button>
      </DialogFooter>
    </form>
  )

  const renderCustomCategoryForm = (onSubmit: (e: React.FormEvent) => Promise<void>, title: string) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Category name"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Type</Label>
        <Select
          value={formData.type}
          onValueChange={(value) => setFormData({ ...formData, type: value as "income" | "expense" })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="category_group">Group</Label>
        <Select
          value={formData.category_group}
          onValueChange={(value) =>
            setFormData({
              ...formData,
              category_group: value as "essential" | "discretionary" | "income",
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select group" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="essential">Essential</SelectItem>
            <SelectItem value="discretionary">Discretionary</SelectItem>
            <SelectItem value="income">Income</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="icon">Icon</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="w-24 h-24"
            onClick={() => setIsIconPickerOpen(true)}
          >
            {formData.icon && LucideIcons[formData.icon as keyof typeof LucideIcons] ? (
              (() => {
                const IconComponent = getIconComponent(formData.icon)
                return <IconComponent className="w-8 h-8" style={{ color: formData.color }} />
              })()
            ) : (
              <Plus className="w-8 h-8" />
            )}
          </Button>
          <div className="flex-1 space-y-2">
            <Input
              value={formData.icon}
              readOnly
              onClick={() => setIsIconPickerOpen(true)}
              className="cursor-pointer"
            />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setIsIconPickerOpen(true)}
            >
              <Search className="mr-2 h-4 w-4" />
              Browse Icons
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="color">Color</Label>
        <div className="flex gap-2">
          <Input
            id="color"
            type="color"
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            className="w-24"
          />
          <Input
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            placeholder="#000000"
            className="flex-1"
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => {
          setIsEditDialogOpen(false)
          setIsAddDialogOpen(false)
        }}>
          Cancel
        </Button>
        <Button type="submit">{title}</Button>
      </DialogFooter>
    </form>
  )

  const renderCategoryCard = (category: Category) => {
    // Use getIconComponent with the icon name directly from the database
    const IconComponent = category.icon ? getIconComponent(category.icon) : CircleDot;

    return (
      <Card key={category.id} className="relative">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <IconComponent className="h-5 w-5" style={{ color: category.color || "#4ade80" }} />
            {category.name}
          </CardTitle>
          <CardDescription>
            {category.type.charAt(0).toUpperCase() + category.type.slice(1)} •{" "}
            {category.category_group.charAt(0).toUpperCase() + category.category_group.slice(1)}
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => openEditDialog(category)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          {category.source === "user" && (
            <Button
              variant="destructive"
              size="icon"
              onClick={() => handleDeleteCategory(category)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </CardFooter>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="default" value={activeTab} onValueChange={(value) => setActiveTab(value as "default" | "custom")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="default">Default Categories</TabsTrigger>
          <TabsTrigger value="custom">Custom Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="default" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categories
              .filter((cat) => cat.source === "default")
              .map(renderCategoryCard)}
          </div>
        </TabsContent>

        <TabsContent value="custom" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categories
              .filter((cat) => cat.source === "user")
              .map(renderCategoryCard)}
          </div>

          <Button onClick={openAddDialog} className="w-full">
            <Plus className="mr-2 h-4 w-4" /> Add Custom Category
          </Button>
        </TabsContent>
      </Tabs>

      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              {editCategory?.source === "default" 
                ? "You can only modify the color of default categories."
                : "Make changes to the category. Click save when you're done."}
            </DialogDescription>
          </DialogHeader>
          {editCategory?.source === "default"
            ? renderDefaultCategoryForm(handleEditCategory)
            : renderCustomCategoryForm(handleEditCategory, "Save changes")}
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Category</DialogTitle>
            <DialogDescription>
              Create a new custom category. Fill in the details below.
            </DialogDescription>
          </DialogHeader>
          {renderCustomCategoryForm(handleAddCategory, "Create category")}
        </DialogContent>
      </Dialog>

      {/* Icon Picker Dialog */}
      <IconPicker />
    </div>
  )
}