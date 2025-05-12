import { Separator } from "@/components/ui/separator"
import { NotificationsHistory } from "@/components/settings/notifications-history"

export default function SettingsNotificationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Notifications</h3>
        <p className="text-sm text-muted-foreground">
          View your notification history and manage notification preferences.
        </p>
      </div>
      <Separator />
      <NotificationsHistory />
    </div>
  )
}

