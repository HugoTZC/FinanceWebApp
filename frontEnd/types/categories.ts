export type CategoryGroup = "essential" | "discretionary" | "income"
export type CategoryType = "income" | "expense"

export interface Category {
  id: string
  name: string
  color: string
  type: CategoryType
  category_group: CategoryGroup
  icon?: string
  description?: string
}

export interface CategoryFormData {
  name: string
  color: string
  type: CategoryType
  category_group: CategoryGroup
  icon?: string
  description?: string
}