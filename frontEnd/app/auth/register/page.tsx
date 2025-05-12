"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign } from "lucide-react"
import { authAPI } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import axios from "axios"

export default function RegisterPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    nickname: "",
    first_name: "",
    last_name: "",
    second_last_name: "",
    email: "",
    password: "",
    password_confirm: ""
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading) return

    if (formData.password !== formData.password_confirm) {
      toast({
        title: "Error",
        description: "Las contraseñas no coinciden",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)
      const response = await authAPI.register(
        formData.email,
        formData.password,
        formData.password_confirm,
        formData.first_name,
        formData.last_name,
        formData.second_last_name,
        formData.nickname
      )

      if (response.data?.status === "success") {
        toast({
          title: "¡Éxito!",
          description: "¡Registro completado! Por favor inicia sesión.",
        })
        router.push("/auth/login")
      } else {
        throw new Error("Registro fallido")
      }
    } catch (error: any) {
      console.error("Registration error:", error)
      
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
        } else if (error.response.status === 400) {
          // Error de validación
          toast({
            title: "Error en el formulario",
            description: error.response.data?.message || "Por favor, verifica la información ingresada e inténtalo de nuevo.",
            variant: "destructive",
          })
        } else if (error.response.status === 409) {
          // Conflicto (ej: email ya registrado)
          toast({
            title: "Usuario ya existe",
            description: "Este correo electrónico ya está registrado. Por favor, utiliza otro o inicia sesión.",
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
            title: "Error de registro",
            description: error.response?.data?.message || "Ocurrió un error inesperado. Por favor, intenta de nuevo.",
            variant: "destructive",
          })
        }
      } else {
        // Error general no relacionado con Axios
        toast({
          title: "Error de registro",
          description: "Ocurrió un error durante el registro. Por favor, intenta de nuevo.",
          variant: "destructive",
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="rounded-full bg-primary p-2">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Crear una cuenta</CardTitle>
          <CardDescription className="text-center">
            Ingresa tus datos para crear tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Nombre</Label>
                <Input
                  id="first_name"
                  name="first_name"
                  placeholder="Juan"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Apellido</Label>
                <Input
                  id="last_name"
                  name="last_name"
                  placeholder="Pérez"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="second_last_name">Segundo Apellido</Label>
                <Input
                  id="second_last_name"
                  name="second_last_name"
                  placeholder="Gómez"
                  value={formData.second_last_name}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nickname">Apodo</Label>
                <Input
                  id="nickname"
                  name="nickname"
                  placeholder="juanpg"
                  value={formData.nickname}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="nombre@ejemplo.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password_confirm">Confirmar Contraseña</Label>
                <Input
                  id="password_confirm"
                  name="password_confirm"
                  type="password"
                  value={formData.password_confirm}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creando cuenta..." : "Crear cuenta"}
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <div className="text-sm text-muted-foreground text-center w-full">
            ¿Ya tienes una cuenta?{" "}
            <Link href="/auth/login" className="text-primary hover:underline">
              Iniciar sesión
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}

