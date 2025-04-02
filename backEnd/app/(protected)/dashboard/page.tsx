"use client"

import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function DashboardPage() {
  const { user, logout } = useAuth()

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Button onClick={logout}>Logout</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Welcome, {user?.full_name}!</CardTitle>
          <CardDescription>This is your personal finance dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Your account details:</p>
          <ul className="list-disc pl-5 mt-2">
            <li>Email: {user?.email}</li>
            <li>Preferred Currency: {user?.preferred_currency || "USD"}</li>
            <li>Preferred Language: {user?.preferred_language || "en"}</li>
            <li>Preferred Theme: {user?.preferred_theme || "system"}</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

