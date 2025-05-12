import { Separator } from "@/components/ui/separator"
import { CategoriesForm } from "@/components/settings/categories-form"

export default function SettingsCategoriesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Categories</h3>
        <p className="text-sm text-muted-foreground">
          Manage your transaction categories. Create custom categories or modify existing ones.
        </p>
      </div>
      <Separator />
      <CategoriesForm />
    </div>
  )
}