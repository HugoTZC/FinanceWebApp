"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"
import { authAPI } from "@/lib/api"
import axios from "axios"

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isLoading) return

    try {
      setIsLoading(true)
      const response = await authAPI.login(email, password)
      
      if (response?.status === "success") {
        // Check specifically for both token and refreshToken
        if (!response.token || !response.refreshToken) {
          throw new Error("Missing authentication tokens")
        }
        
        // Store both tokens
        localStorage.setItem("token", response.token)
        localStorage.setItem("refreshToken", response.refreshToken)

        toast({
          title: "¡Éxito!",
          description: "Sesión iniciada correctamente",
        })
        router.push("/")
      } else {
        throw new Error("Authentication failed")
      }
    } catch (error: any) {
      console.error("Login error:", error)
      
      // Diferenciar entre tipos de errores
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          // Error de tiempo de espera agotado
          toast({
            title: "Tiempo de espera agotado",
            description: "El servidor está tardando demasiado en responder. Por favor, intenta de nuevo más tarde.",
            variant: "destructive",
          })
        } else if (!error.response) {
          // Error de red o servidor no disponible
          toast({
            title: "Error de conexión",
            description: "No se pudo conectar al servidor. El servidor podría estar en mantenimiento o sin conexión. Por favor, intenta de nuevo más tarde.",
            variant: "destructive",
          })
        } else if (error.response.status === 401 || error.response.status === 400) {
          // Error de credenciales inválidas
          toast({
            title: "Error de inicio de sesión",
            description: "Credenciales incorrectas. Por favor, verifica tu correo y contraseña.",
            variant: "destructive",
          })
        } else if (error.response.status >= 500) {
          // Error del servidor
          toast({
            title: "Error del servidor",
            description: "El servidor está experimentando problemas. Por favor, intenta de nuevo más tarde.",
            variant: "destructive",
          })
        } else {
          // Otro tipo de error con respuesta
          toast({
            title: "Error de inicio de sesión",
            description: error.response?.data?.message || "Ocurrió un error inesperado. Por favor, intenta de nuevo.",
            variant: "destructive",
          })
        }
      } else {
        // Error general no relacionado con Axios
        toast({
          title: "Error de inicio de sesión",
          description: "Ocurrió un error durante el inicio de sesión. Por favor, intenta de nuevo.",
          variant: "destructive",
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="rounded-full bg-primary p-2 relative w-14 h-14 flex items-center justify-center">
              <div className="animate-logo-spin w-10 h-10 relative">
                <Image
                  src="/finappYellow.png"
                  alt="FinanceTracker Logo"
                  fill
                  className="absolute"
                />
              </div>
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Finapp</CardTitle>
          <CardDescription className="text-center">Ingresa tus credenciales para acceder a tu cuenta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="nombre@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Iniciando sesión..." : "Iniciar sesión"}
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <div className="text-sm text-muted-foreground text-center w-full">
            ¿No tienes una cuenta?{" "}
            <Link href="/auth/register" className="text-primary hover:underline">
              Regístrate
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}

