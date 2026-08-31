"use client"

import { useEffect, useState } from "react"
import { Bell, BellOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

type PermissionState = NotificationPermission | "unsupported"

export function BrowserNotificationPermission() {
  const { toast } = useToast()
  const [permission, setPermission] = useState<PermissionState>("default")

  useEffect(() => {
    setPermission("Notification" in window ? Notification.permission : "unsupported")
  }, [])

  const requestPermission = async () => {
    if (!("Notification" in window)) return
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result === "granted") {
      new Notification("FinanceWebApp", { body: "Browser notifications are now enabled." })
      toast({ title: "Notifications enabled", description: "This browser can now display FinanceWebApp alerts." })
    } else if (result === "denied") {
      toast({ title: "Permission blocked", description: "You can re-enable notifications from your browser site settings.", variant: "destructive" })
    }
  }

  const enabled = permission === "granted"
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {enabled ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
          Browser Notifications
        </CardTitle>
        <CardDescription>
          Allow this browser to show financial reminders. You remain in control through your browser settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {permission === "granted" && "Permission granted."}
          {permission === "denied" && "Permission is blocked in this browser."}
          {permission === "default" && "Permission has not been requested yet."}
          {permission === "unsupported" && "This browser does not support notifications."}
        </p>
        <Button onClick={requestPermission} disabled={permission === "granted" || permission === "unsupported"}>
          {enabled ? "Enabled" : "Enable notifications"}
        </Button>
      </CardContent>
    </Card>
  )
}
