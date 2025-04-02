"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import { authAPI } from "@/lib/api"

interface User {
  id: string
  email: string
  full_name: string
  preferred_currency?: string
  preferred_language?: string
  preferred_theme?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  const isAuthenticated = !!user

  useEffect(() => {
    // Check if user is logged in
    const checkAuth = async () => {
      const token = localStorage.getItem("token")

      if (!token) {
        setIsLoading(false)
        return
      }

      try {
        const response = await authAPI.getProfile()
        setUser(response.data.data)
      } catch (error) {
        console.error("Auth check error:", error)
        localStorage.removeItem("token")
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  // Redirect unauthenticated users away from protected routes
  useEffect(() => {
    if (!isLoading) {
      const isAuthRoute = pathname?.startsWith("/auth")

      if (!isAuthenticated && !isAuthRoute && pathname !== "/") {
        router.push("/auth/login")
      }

      if (isAuthenticated && isAuthRoute) {
        router.push("/dashboard")
      }
    }
  }, [isAuthenticated, isLoading, pathname, router])

  const login = async (email: string, password: string) => {
    const response = await authAPI.login(email, password)
    localStorage.setItem("token", response.data.data.token)
    setUser(response.data.data)
  }

  const register = async (name: string, email: string, password: string) => {
    const response = await authAPI.register(name, email, password)
    localStorage.setItem("token", response.data.data.token)
    setUser(response.data.data)
  }

  const logout = () => {
    localStorage.removeItem("token")
    setUser(null)
    router.push("/auth/login")
  }

  const value = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

