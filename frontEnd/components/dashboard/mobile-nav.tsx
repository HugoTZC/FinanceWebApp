"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { BarChart2, CreditCard, Home, LineChart, PiggyBank, Receipt } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface MobileNavProps { onNavClick: () => void }

const navigationItems = [
  { value: "overview", label: "Resumen", href: "/#overview", icon: Home },
  { value: "transactions", label: "Movimientos", href: "/#transactions", icon: Receipt },
  { value: "budget", label: "Presupuesto", href: "/#budget", icon: LineChart },
  { value: "savings", label: "Ahorros", href: "/#savings", icon: PiggyBank },
  { value: "credit", label: "Crédito", href: "/#credit", icon: CreditCard },
  { value: "analysis", label: "Análisis", href: "/#analysis", icon: BarChart2 },
]

export function MobileNav({ onNavClick }: MobileNavProps) {
  const pathname = usePathname()
  const [activeSection, setActiveSection] = useState("overview")

  useEffect(() => {
    const syncActiveSection = () => setActiveSection(window.location.hash.slice(1) || "overview")
    syncActiveSection()
    window.addEventListener("hashchange", syncActiveSection)
    return () => window.removeEventListener("hashchange", syncActiveSection)
  }, [])

  return (
    <nav aria-label="Navegación principal" className="flex h-full flex-col p-4">
      <Link href="/#overview" className="flex items-center gap-3 rounded-xl px-2 py-3" onClick={onNavClick}>
        <span className="rounded-lg bg-amber-400 p-1.5">
          <Image src="/finappLogo.png" alt="" width={28} height={28} className="h-7 w-7" />
        </span>
        <span>
          <span className="block font-bold">FinApp</span>
          <span className="block text-xs text-muted-foreground">Centro financiero</span>
        </span>
      </Link>
      <Separator className="my-3" />
      <div className="mb-2 flex items-center justify-between px-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Secciones</span>
        <Badge variant="secondary" className="text-[10px]">Menú</Badge>
      </div>
      <div className="space-y-1">
        {navigationItems.map((item) => {
          const Icon = item.icon
          const active = pathname === "/" && activeSection === item.value
          return (
            <Link
              key={item.value}
              href={item.href}
              onClick={onNavClick}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                active ? "bg-amber-400 text-amber-950 shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
              {active ? <span className="ml-auto h-2 w-2 rounded-full bg-amber-950" /> : null}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
