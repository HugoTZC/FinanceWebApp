import { Separator } from "@/components/ui/separator"
import { DangerZoneForm } from "@/components/settings/danger-zone-form"

export default function SettingsDangerZonePage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Danger Zone</h3>
        <p className="text-sm text-muted-foreground">
          These actions are destructive and cannot be reversed. Please proceed with caution.
        </p>
      </div>
      <Separator />
      <DangerZoneForm />
    </div>
  )
}

