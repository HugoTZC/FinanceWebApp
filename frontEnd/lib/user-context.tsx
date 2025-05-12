"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { userAPI } from "@/lib/api"

interface UserProfile {
  id: string
  email: string
  first_name: string
  last_name: string
  second_last_name?: string
  nickname?: string
  avatar_url?: string
}

interface UserContextType {
  user: UserProfile | null
  loading: boolean
  error: Error | null
  refreshUserProfile: () => Promise<void>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Function to fetch user profile
  const fetchUserProfile = async () => {
    try {
      setLoading(true)
      const response = await userAPI.getProfile()
      
      if (response?.data?.data?.user) {
        setUser(response.data.data.user)
      }
      setError(null)
    } catch (err) {
      console.error("Failed to fetch user profile:", err)
      setError(err instanceof Error ? err : new Error("Unknown error"))
    } finally {
      setLoading(false)
    }
  }

  // Fetch user profile on component mount
  useEffect(() => {
    // Only fetch if we're in the browser and there's a token
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token')
      if (token) {
        fetchUserProfile()
      } else {
        setLoading(false)
      }
    }
  }, [])

  // Refresh function to be called after profile updates
  const refreshUserProfile = async () => {
    await fetchUserProfile()
  }

  const value = {
    user,
    loading,
    error,
    refreshUserProfile
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}