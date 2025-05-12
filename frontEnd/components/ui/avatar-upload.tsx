"use client"

import React, { useState, useRef, ChangeEvent } from 'react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Camera, Trash2, Loader2 } from 'lucide-react'
import { userAPI } from '@/lib/api'
import { toast } from '@/components/ui/use-toast'

interface AvatarUploadProps {
  initialAvatarUrl?: string
  userName: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  onAvatarChange?: (newAvatarUrl: string) => void
}

export function AvatarUpload({ 
  initialAvatarUrl, 
  userName, 
  size = 'lg',
  onAvatarChange 
}: AvatarUploadProps) {
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl || '/placeholder-user.jpg')
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sizeClasses = {
    sm: 'h-10 w-10',
    md: 'h-16 w-16',
    lg: 'h-24 w-24',
    xl: 'h-32 w-32'
  }

  // Derive user initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  // Handle file selection
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Por favor, selecciona un archivo de imagen válido.",
        variant: "destructive",
      })
      return
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "La imagen es demasiado grande. El tamaño máximo es 5MB.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsUploading(true)

      // Create a temporary URL for immediate display
      const tempUrl = URL.createObjectURL(file)
      setAvatarUrl(tempUrl)

      // Upload to server
      const response = await userAPI.uploadAvatar(file)
      
      // Get the permanent URL from the server response
      const permanentUrl = response.data.data.user.avatar_url
      
      // Update state with the permanent URL
      setAvatarUrl(permanentUrl)
      
      // Notify parent component
      if (onAvatarChange) {
        onAvatarChange(permanentUrl)
      }
      
      toast({
        title: "Éxito",
        description: "Avatar actualizado correctamente",
      })
      
      // Clean up the temporary URL
      URL.revokeObjectURL(tempUrl)
    } catch (error) {
      console.error('Error uploading avatar:', error)
      // Revert to previous avatar
      setAvatarUrl(initialAvatarUrl || '/placeholder-user.jpg')
      
      toast({
        title: "Error",
        description: "No se pudo subir el avatar. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  // Trigger file input click
  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <Avatar className={`${sizeClasses[size]} border-2 border-primary`}>
          <AvatarImage 
            src={avatarUrl.startsWith('/') 
              ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${avatarUrl}` 
              : avatarUrl
            } 
            alt={userName} 
          />
          <AvatarFallback>{getInitials(userName)}</AvatarFallback>
        </Avatar>
        
        {isUploading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          </div>
        ) : (
          <Button 
            variant="secondary" 
            size="icon" 
            className="absolute bottom-0 right-0 rounded-full h-8 w-8 shadow-md"
            onClick={handleUploadClick}
          >
            <Camera className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}