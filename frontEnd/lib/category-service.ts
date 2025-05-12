import api from "./api"

export interface Category {
  id: string
  name: string
  type: "income" | "expense"
  category_group: "essential" | "discretionary" | "income"
  icon?: string
  color?: string
  source: "default" | "user"
}

export const categoryService = {
  getAllCategories: async (): Promise<Category[]> => {
    const response = await api.get("/categories")
    return response.data.data.categories
  },

  getDefaultCategories: async (): Promise<Category[]> => {
    const response = await api.get("/categories/default")
    return response.data.data.categories.map((cat: any) => ({ ...cat, source: "default" }))
  },

  getUserCategories: async (): Promise<Category[]> => {
    const response = await api.get("/categories/user")
    return response.data.data.categories.map((cat: any) => ({ ...cat, source: "user" }))
  },

  createUserCategory: async (categoryData: Omit<Category, "id" | "source">): Promise<Category> => {
    const response = await api.post("/categories", categoryData)
    return { ...response.data.data.category, source: "user" }
  },

  updateUserCategory: async (id: string, categoryData: Partial<Omit<Category, "id" | "source">>): Promise<Category> => {
    const response = await api.patch(`/categories/user/${id}`, categoryData)
    return { ...response.data.data.category, source: "user" }
  },

  deleteUserCategory: async (id: string): Promise<void> => {
    await api.delete(`/categories/user/${id}`)
  }
}