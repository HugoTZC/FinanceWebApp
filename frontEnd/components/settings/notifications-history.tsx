"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Bell, CreditCard, PiggyBank, Calendar, Check, Trash2, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

// Sample notifications data - in a real app, this would come from your API
const allNotifications = [
  {
    id: "b1",
    title: "Housing Budget Alert",
    description: "You've used 90% of your Housing budget for this month.",
    date: "2023-06-28",
    type: "budget",
    read: false,
  },
  {
    id: "b2",
    title: "Entertainment Budget Alert",
    description: "You've used 85% of your Entertainment budget for this month.",
    date: "2023-06-27",
    type: "budget",
    read: false,
  },
  {
    id: "n1",
    title: "Mortgage Payment Due Soon",
    description: "Your mortgage payment of $1,500 is due in 3 days.",
    date: "2023-07-01",
    type: "payment",
    read: false,
  },
  {
    id: "n2",
    title: "Vacation Savings Goal",
    description: "You're 50% of the way to your vacation savings goal!",
    date: "2023-06-28",
    type: "savings",
    read: false,
  },
  {
    id: "n3",
    title: "Credit Card Payment",
    description: "Your credit card payment of $350 is due tomorrow.",
    date: "2023-06-29",
    type: "credit",
    read: false,
  },
  {
    id: "n4",
    title: "Emergency Fund Goal Reached",
    description: "Congratulations! You've reached your emergency fund goal of $10,000.",
    date: "2023-06-25",
    type: "savings",
    read: true,
  },
  {
    id: "n5",
    title: "Internet Bill Due",
    description: "Your internet bill of $80 is due in 5 days.",
    date: "2023-07-05",
    type: "payment",
    read: true,
  },
  {
    id: "n6",
    title: "New Feature Available",
    description: "Check out our new budget tracking features!",
    date: "2023-06-20",
    type: "system",
    read: true,
  },
  {
    id: "n7",
    title: "Account Security",
    description: "We've added new security features to protect your account.",
    date: "2023-06-15",
    type: "system",
    read: true,
  },
]

// Add more historical notifications
const historicalNotifications = [
  {
    id: "h1",
    title: "Rent Payment",
    description: "Your rent payment of $1,500 has been processed.",
    date: "2023-05-01",
    type: "payment",
    read: true,
  },
  {
    id: "h2",
    title: "Credit Card Statement",
    description: "Your credit card statement is now available.",
    date: "2023-05-15",
    type: "credit",
    read: true,
  },
  {
    id: "h3",
    title: "Budget Update",
    description: "Your monthly budget has been updated.",
    date: "2023-05-10",
    type: "budget",
    read: true,
  },
]

// Combine all notifications
const combinedNotifications = [...allNotifications, ...historicalNotifications]

export function NotificationsHistory() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("all")
  const [notifications, setNotifications] = useState(combinedNotifications)

  // For API integration
  // const [isLoading, setIsLoading] = useState(false)

  // Fetch notifications from API
  /*
  useEffect(() => {
    async function fetchNotifications() {
      try {
        setIsLoading(true)
        const response = await api.get("/notifications/history")
        setNotifications(response.data)
      } catch (error) {
        console.error("Failed to fetch notifications:", error)
        toast({
          title: "Error",
          description: "Failed to load notifications. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchNotifications()
  }, [toast])
  */

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)),
    )

    // API integration
    /*
    try {
      await api.put(`/notifications/${id}/read`)
    } catch (error) {
      console.error("Failed to mark notification as read:", error)
      toast({
        title: "Error",
        description: "Failed to update notification. Please try again.",
        variant: "destructive",
      })
    }
    */

    toast({
      title: "Notification updated",
      description: "Notification marked as read.",
    })
  }

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id))

    // API integration
    /*
    try {
      await api.delete(`/notifications/${id}`)
    } catch (error) {
      console.error("Failed to delete notification:", error)
      toast({
        title: "Error",
        description: "Failed to delete notification. Please try again.",
        variant: "destructive",
      })
    }
    */

    toast({
      title: "Notification deleted",
      description: "Notification has been removed.",
    })
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })))

    // API integration
    /*
    try {
      await api.put("/notifications/read-all")
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error)
      toast({
        title: "Error",
        description: "Failed to update notifications. Please try again.",
        variant: "destructive",
      })
    }
    */

    toast({
      title: "Notifications updated",
      description: "All notifications marked as read.",
    })
  }

  const deleteAllRead = () => {
    setNotifications((prev) => prev.filter((notification) => !notification.read))

    // API integration
    /*
    try {
      await api.delete("/notifications/read")
    } catch (error) {
      console.error("Failed to delete read notifications:", error)
      toast({
        title: "Error",
        description: "Failed to delete notifications. Please try again.",
        variant: "destructive",
      })
    }
    */

    toast({
      title: "Notifications deleted",
      description: "All read notifications have been removed.",
    })
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "payment":
        return <Calendar className="h-5 w-5 text-blue-500" />
      case "savings":
        return <PiggyBank className="h-5 w-5 text-green-500" />
      case "credit":
        return <CreditCard className="h-5 w-5 text-purple-500" />
      case "budget":
        return <AlertCircle className="h-5 w-5 text-amber-500" />
      default:
        return <Bell className="h-5 w-5 text-gray-500" />
    }
  }

  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case "payment":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            Payment
          </Badge>
        )
      case "savings":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
            Savings
          </Badge>
        )
      case "credit":
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
            Credit
          </Badge>
        )
      case "budget":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            Budget
          </Badge>
        )
      case "system":
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            System
          </Badge>
        )
      default:
        return <Badge variant="outline">Other</Badge>
    }
  }

  // Filter notifications based on active tab
  const filteredNotifications =
    activeTab === "all"
      ? notifications
      : activeTab === "unread"
        ? notifications.filter((n) => !n.read)
        : notifications.filter((n) => n.type === activeTab)

  // Group notifications by date
  const groupedNotifications = filteredNotifications.reduce(
    (groups, notification) => {
      const date = new Date(notification.date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })

      if (!groups[date]) {
        groups[date] = []
      }

      groups[date].push(notification)
      return groups
    },
    {} as Record<string, typeof notifications>,
  )

  // Sort dates in descending order (newest first)
  const sortedDates = Object.keys(groupedNotifications).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h3 className="text-lg font-medium">Notification History</h3>
          <p className="text-sm text-muted-foreground">
            You have {unreadCount} unread {unreadCount === 1 ? "notification" : "notifications"}.
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={markAllAsRead} disabled={unreadCount === 0}>
            <Check className="mr-2 h-4 w-4" />
            Mark all as read
          </Button>
          <Button variant="outline" size="sm" onClick={deleteAllRead}>
            <Trash2 className="mr-2 h-4 w-4" />
            Clear read
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-6">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="payment">Payments</TabsTrigger>
          <TabsTrigger value="savings">Savings</TabsTrigger>
          <TabsTrigger value="credit">Credit</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-4">
          {/* Add loading indicator */}
          {/* {isLoading && (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )} */}

          {sortedDates.length > 0 ? (
            sortedDates.map((date) => (
              <div key={date} className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">{date}</h4>
                <div className="space-y-2">
                  {groupedNotifications[date].map((notification) => (
                    <Card
                      key={notification.id}
                      className={`border ${!notification.read ? "bg-muted/30 border-primary/20" : ""}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4">
                            <div className="mt-0.5">{getNotificationIcon(notification.type)}</div>
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <h4 className="font-medium">{notification.title}</h4>
                                {getNotificationTypeLabel(notification.type)}
                                {!notification.read && (
                                  <span className="inline-block h-2 w-2 rounded-full bg-primary"></span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{notification.description}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(notification.date).toLocaleTimeString("en-US", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => markAsRead(notification.id)}
                                title="Mark as read"
                              >
                                <Check className="h-4 w-4" />
                                <span className="sr-only">Mark as read</span>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteNotification(notification.id)}
                              title="Delete notification"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No notifications</h3>
              <p className="text-sm text-muted-foreground">
                {activeTab === "all"
                  ? "You don't have any notifications yet."
                  : activeTab === "unread"
                    ? "You don't have any unread notifications."
                    : `You don't have any ${activeTab} notifications.`}
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Separator className="my-6" />

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Notification Preferences</h3>
        <Card>
          <CardHeader>
            <CardTitle>Email Notifications</CardTitle>
            <CardDescription>Configure which notifications you receive via email.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="budget-email">Budget Alerts</Label>
                <p className="text-sm text-muted-foreground">Receive emails when you approach budget limits.</p>
              </div>
              <Switch id="budget-email" defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="payment-email">Payment Reminders</Label>
                <p className="text-sm text-muted-foreground">Receive emails about upcoming payments.</p>
              </div>
              <Switch id="payment-email" defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="savings-email">Savings Goals</Label>
                <p className="text-sm text-muted-foreground">Receive emails about your savings goals progress.</p>
              </div>
              <Switch id="savings-email" defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="credit-email">Credit Updates</Label>
                <p className="text-sm text-muted-foreground">Receive emails about credit card and loan updates.</p>
              </div>
              <Switch id="credit-email" defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Push Notifications</CardTitle>
            <CardDescription>Configure which notifications you receive on your devices.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="budget-push">Budget Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Receive push notifications when you approach budget limits.
                </p>
              </div>
              <Switch id="budget-push" defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="payment-push">Payment Reminders</Label>
                <p className="text-sm text-muted-foreground">Receive push notifications about upcoming payments.</p>
              </div>
              <Switch id="payment-push" defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="savings-push">Savings Goals</Label>
                <p className="text-sm text-muted-foreground">
                  Receive push notifications about your savings goals progress.
                </p>
              </div>
              <Switch id="savings-push" defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="credit-push">Credit Updates</Label>
                <p className="text-sm text-muted-foreground">
                  Receive push notifications about credit card and loan updates.
                </p>
              </div>
              <Switch id="credit-push" defaultChecked />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

