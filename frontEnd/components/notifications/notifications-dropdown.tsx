"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Bell, CreditCard, PiggyBank, Calendar, Check, ArrowRight } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

// Sample notifications data - in a real app, this would come from your API
const notifications = [
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
]

export function NotificationsDropdown() {
  const [open, setOpen] = useState(false)
  const [notificationsList, setNotificationsList] = useState(notifications)

  const unreadCount = notificationsList.filter((n) => !n.read).length

  const markAsRead = (id: string) => {
    setNotificationsList((prev) =>
      prev.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)),
    )
  }

  const markAllAsRead = () => {
    setNotificationsList((prev) => prev.map((notification) => ({ ...notification, read: true })))
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "payment":
        return <Calendar className="h-4 w-4 text-blue-500" />
      case "savings":
        return <PiggyBank className="h-4 w-4 text-green-500" />
      case "credit":
        return <CreditCard className="h-4 w-4 text-purple-500" />
      default:
        return <Bell className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              {unreadCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-auto p-1 text-xs">
              Mark all as read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-80">
          <DropdownMenuGroup>
            {notificationsList.length > 0 ? (
              notificationsList.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={cn("flex flex-col items-start p-4 cursor-default", !notification.read && "bg-muted/50")}
                >
                  <div className="flex w-full">
                    <div className="mr-2 mt-0.5">{getNotificationIcon(notification.type)}</div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">{notification.title}</p>
                      <p className="text-xs text-muted-foreground">{notification.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(notification.date).toLocaleDateString()}
                      </p>
                    </div>
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => markAsRead(notification.id)}
                      >
                        <Check className="h-4 w-4" />
                        <span className="sr-only">Mark as read</span>
                      </Button>
                    )}
                  </div>
                </DropdownMenuItem>
              ))
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">No notifications</div>
            )}
          </DropdownMenuGroup>
        </ScrollArea>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer justify-center">
          <Button variant="ghost" className="w-full justify-center" size="sm">
            View all notifications
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

