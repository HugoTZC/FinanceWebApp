"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CreditCard, Folder as FolderIcon, LogOut, Menu, Settings, User } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { MobileNav } from "@/components/dashboard/mobile-nav"
import { AddTransactionDialog } from "@/components/transactions/add-transaction-dialog"
import { NotificationsDropdown } from "@/components/notifications/notifications-dropdown"
import { authAPI } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useUser } from "@/lib/user-context"

export function DashboardHeader() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useUser()
  
  // Estado para controlar si estamos en el cliente
  const [isMounted, setIsMounted] = useState(false)
  
  // Este efecto se ejecutará solo en el cliente después del montaje
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  // Si no está montado (en servidor), renderizamos un div vacío con la misma altura
  // para evitar saltos en el layout
  if (!isMounted) {
    return <div className="h-14 border-b"></div>
  }

  // Get initials for avatar fallback
  const getInitials = () => {
    if (!user) return "U";
    
    const firstInitial = user.first_name ? user.first_name.charAt(0) : '';
    const lastInitial = user.last_name ? user.last_name.charAt(0) : '';
    
    return (firstInitial + lastInitial).toUpperCase() || "U";
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout()
      // Router push to login page after successful logout
      router.push("/auth/login")
    } catch (error) {
      console.error("Logout error:", error)
      // If there's an error, still redirect to login but show an error message
      toast({
        title: "Error",
        description: "Failed to logout properly. Please try again.",
        variant: "destructive",
      })
      // Redirect to login page even if there's an error
      router.push("/auth/login")
    }
  }

  // Solo renderizamos el header completo en el cliente
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Image 
              src="/finappLogo.png" 
              alt="FinApp Logo" 
              width={24} 
              height={24} 
              className="h-6 w-6" 
            />
            <span className="hidden font-bold sm:inline-block">FinApp</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link href="/dashboard" className="transition-colors hover:text-foreground/80 text-foreground">
              Dashboard
            </Link>
            <Link href="/transactions" className="transition-colors hover:text-foreground/80 text-muted-foreground">
              Transactions
            </Link>
            <Link href="/budget" className="transition-colors hover:text-foreground/80 text-muted-foreground">
              Budget
            </Link>
            <Link href="/savings" className="transition-colors hover:text-foreground/80 text-muted-foreground">
              Savings
            </Link>
            <Link href="/credit" className="transition-colors hover:text-foreground/80 text-muted-foreground">
              Credit
            </Link>
          </nav>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="mr-2 md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="pr-0">
            <MobileNav onNavClick={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <Link href="/" className="mr-6 flex items-center space-x-2 md:hidden">
          <Image 
            src="/finappLogo.png" 
            alt="FinApp Logo" 
            width={24} 
            height={24} 
            className="h-6 w-6" 
          />
          <span className="font-bold">FinApp</span>
        </Link>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <NotificationsDropdown />
          <AddTransactionDialog />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage 
                    src={user?.avatar_url || "/placeholder-user.jpg"} 
                    alt={user?.nickname || user?.first_name || "User"} 
                  />
                  <AvatarFallback>{getInitials()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.nickname || `${user?.first_name || ''} ${user?.last_name || ''}`}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings/profile">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings/categories">
                  <FolderIcon className="mr-2 h-4 w-4" />
                  <span>Categories</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

