"use client"

import { useState, useEffect } from "react"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

interface BudgetAlertProps {
  onDismiss?: () => void
}

export function BudgetAlert({ onDismiss }: BudgetAlertProps) {
  const [alerts, setAlerts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Fetch budget alerts
  useEffect(() => {
    async function fetchBudgetAlerts() {
      try {
        setIsLoading(true)

        // For now, use mock data
        // In a real app, you would fetch from API
        /*
        const response = await budgetAPI.getBudgetAlerts()
        setAlerts(response.data)
        */

        // Mock data
        setAlerts([
          { id: "a1", category: "Housing", percentSpent: 90 },
          { id: "a2", category: "Entertainment", percentSpent: 85 },
        ])
      } catch (error) {
        console.error("Failed to fetch budget alerts:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBudgetAlerts()
  }, [])

  if (isLoading || alerts.length === 0) {
    return null
  }

  return (
    <Alert variant="warning" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Budget Alert</AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <p>
          {alerts.length === 1
            ? `You've used ${alerts[0].percentSpent}% of your ${alerts[0].category} budget.`
            : `You're approaching the budget limit for ${alerts.length} categories.`}
        </p>
        {alerts.length > 1 && (
          <ul className="list-disc list-inside text-sm">
            {alerts.map((alert) => (
              <li key={alert.id}>
                {alert.category}: {alert.percentSpent}% used
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-end mt-2">
          <Button variant="outline" size="sm" onClick={onDismiss} className="text-xs">
            Dismiss
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}

