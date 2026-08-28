"use client"

import Link from "next/link"
import Image from "next/image"
import { CreditCard, Home, LineChart, PiggyBank, Receipt, BarChart2 } from "lucide-react"

interface MobileNavProps {
  onNavClick: () => void
}

export function MobileNav({ onNavClick }: MobileNavProps) {
  return (
    <div className="flex flex-col space-y-3 p-4">
      <Link href="/#overview" className="mb-4 flex items-center space-x-3 rounded-lg px-2 py-2" onClick={onNavClick}>
        <Image src="/finappLogo.png" alt="FinApp" width={32} height={32} className="h-8 w-8" />
        <span className="font-bold">FinApp</span>
      </Link>

      <div className="space-y-1">
        <Link
          href="/#overview"
          onClick={onNavClick}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
        >
          <Home className="h-5 w-5" />
          <span>Dashboard</span>
        </Link>
        <Link
          href="/#transactions"
          onClick={onNavClick}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
        >
          <Receipt className="h-5 w-5" />
          <span>Transactions</span>
        </Link>
        <Link
          href="/#budget"
          onClick={onNavClick}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
        >
          <LineChart className="h-5 w-5" />
          <span>Budget</span>
        </Link>
        <Link
          href="/#savings"
          onClick={onNavClick}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
        >
          <PiggyBank className="h-5 w-5" />
          <span>Savings</span>
        </Link>
        <Link
          href="/#credit"
          onClick={onNavClick}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
        >
          <CreditCard className="h-5 w-5" />
          <span>Credit</span>
        </Link>
        <Link
          href="/#analysis"
          onClick={onNavClick}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
        >
          <BarChart2 className="h-5 w-5" />
          <span>Analysis</span>
        </Link>
      </div>
    </div>
  )
}

