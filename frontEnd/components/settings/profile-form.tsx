"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { AvatarUpload } from "@/components/ui/avatar-upload"
import { userAPI } from "@/lib/api"
import { useUser } from "@/lib/user-context"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export function ProfileForm() {
  const { toast } = useToast()
  const { user, refreshUserProfile } = useUser()
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Form state
  const [nickname, setNickname] = useState("")
  const [name, setName] = useState("")
  const [lastName1, setLastName1] = useState("")
  const [lastName2, setLastName2] = useState("")
  const [email, setEmail] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Set initial values from user context data
  useEffect(() => {
    if (user) {
      setNickname(user.nickname || "")
      setName(user.first_name || "")
      setLastName1(user.last_name || "")
      setLastName2(user.second_last_name || "")
      setEmail(user.email || "")
      setAvatarUrl(user.avatar_url || "")
      setIsLoading(false)
    } else {
      // Fallback to API if user context is not available
      fetchUserProfile()
    }
  }, [user])

  // Fetch user profile when context data is not available
  const fetchUserProfile = async () => {
    try {
      setIsLoading(true)
      const response = await userAPI.getProfile()
      const userData = response.data.data.user
      
      if (userData) {
        setNickname(userData.nickname || "")
        setName(userData.first_name || "")
        setLastName1(userData.last_name || "")
        setLastName2(userData.second_last_name || "")
        setEmail(userData.email || "")
        setAvatarUrl(userData.avatar_url || "")
      }
    } catch (error) {
      console.error("Error fetching user profile:", error)
      toast({
        title: "Error",
        description: "No se pudo cargar la información del perfil",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Validate form
    if (!nickname || !name || !lastName1 || !email) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos.",
        variant: "destructive",
      })
      setIsSubmitting(false)
      return
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({
        title: "Error",
        description: "Por favor ingresa un correo electrónico válido.",
        variant: "destructive",
      })
      setIsSubmitting(false)
      return
    }

    try {
      await userAPI.updateProfile({
        nickname,
        first_name: name,
        last_name: lastName1,
        second_last_name: lastName2,
      })

      // Refresh the user context to update profile info across the app
      await refreshUserProfile()

      toast({
        title: "Perfil actualizado",
        description: "Tu perfil ha sido actualizado exitosamente.",
      })
    } catch (error) {
      console.error("Error updating profile:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el perfil. Por favor intenta de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAvatarChange = async (newAvatarUrl: string) => {
    setAvatarUrl(newAvatarUrl)
    
    // If avatar was updated successfully, refresh the user context
    // This ensures the avatar is updated in the header and anywhere else it's used
    try {
      await refreshUserProfile()
    } catch (error) {
      console.error("Error refreshing user profile after avatar update:", error)
    }
  }

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos de contraseña.",
        variant: "destructive",
      })
      return
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "La nueva contraseña y la confirmación no coinciden.",
        variant: "destructive",
      })
      return
    }

    setIsChangingPassword(true)

    try {
      // Aquí iría la llamada a la API para cambiar la contraseña
      // await authAPI.changePassword({ currentPassword, newPassword })

      setIsPasswordDialogOpen(false)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")

      toast({
        title: "Contraseña actualizada",
        description: "Tu contraseña ha sido cambiada exitosamente.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cambiar la contraseña. Verifica tu contraseña actual.",
        variant: "destructive",
      })
    } finally {
      setIsChangingPassword(false)
    }
  }

  if (isLoading) {
    return <div className="flex justify-center py-8">Cargando información del perfil...</div>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-2">
        <Label>Foto de Perfil</Label>
        <div className="flex items-center gap-4">
          <AvatarUpload 
            initialAvatarUrl={avatarUrl} 
            userName={`${name} ${lastName1}`.trim()} 
            onAvatarChange={handleAvatarChange}
          />
          <div>
            <p className="text-sm font-medium">Sube una nueva foto</p>
            <p className="text-xs text-muted-foreground">JPG, PNG o GIF. Máximo 5MB.</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="nickname">Apodo</Label>
        <Input id="nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="johndoe" />
        <p className="text-sm text-muted-foreground">
          Este es tu nombre para mostrar. Puede ser tu nombre real o un pseudónimo.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Juan" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName1">Apellido</Label>
          <Input id="lastName1" value={lastName1} onChange={(e) => setLastName1(e.target.value)} placeholder="Pérez" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="lastName2">Segundo Apellido (Opcional)</Label>
        <Input id="lastName2" value={lastName2} onChange={(e) => setLastName2(e.target.value)} placeholder="García" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Correo Electrónico</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="juan.perez@example.com"
          disabled  // El email no se puede cambiar
        />
        <p className="text-sm text-muted-foreground">Nunca compartiremos tu correo con terceros.</p>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-medium mb-2">Contraseña</h4>
        <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" type="button">
              Cambiar Contraseña
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cambiar Contraseña</DialogTitle>
              <DialogDescription>
                Ingresa tu contraseña actual y una nueva contraseña para actualizar tus credenciales.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Contraseña Actual</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">Nueva Contraseña</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar Nueva Contraseña</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handlePasswordChange} disabled={isChangingPassword}>
                {isChangingPassword ? "Actualizando..." : "Actualizar Contraseña"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Actualizando..." : "Actualizar perfil"}
      </Button>
    </form>
  )
}

