"use client"

import Link from "next/link"
import { DollarSign, CreditCard, Home, LineChart, PiggyBank, Receipt, Plus, BarChart2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MobileNavProps {
  onNavClick: () => void
}

export function MobileNav({ onNavClick }: MobileNavProps) {
  return (
    <div className="flex flex-col space-y-3 p-4">
      <Link href="/" className="flex items-center space-x-2 mb-6" onClick={onNavClick}>
        <DollarSign className="h-6 w-6" />
        <span className="font-bold">FinanceTracker</span>
      </Link>

      {/* Add Transaction Button for Mobile */}
      <div className="mb-4">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            // Find and click the hidden desktop dialog trigger
            const desktopTrigger = document.querySelector(".hidden.md\\:flex") as HTMLButtonElement
            if (desktopTrigger) {
              desktopTrigger.click()
            }
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Transaction
        </Button>
      </div>

      <div className="space-y-1">
        <Link
          href="/dashboard"
          onClick={onNavClick}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
        >
          <Home className="h-5 w-5" />
          <span>Dashboard</span>
        </Link>
        <Link
          href="/transactions"
          onClick={onNavClick}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
        >
          <Receipt className="h-5 w-5" />
          <span>Transactions</span>
        </Link>
        <Link
          href="/budget"
          onClick={onNavClick}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
        >
          <LineChart className="h-5 w-5" />
          <span>Budget</span>
        </Link>
        <Link
          href="/savings"
          onClick={onNavClick}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
        >
          <PiggyBank className="h-5 w-5" />
          <span>Savings</span>
        </Link>
        <Link
          href="/credit"
          onClick={onNavClick}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
        >
          <CreditCard className="h-5 w-5" />
          <span>Credit</span>
        </Link>
        <Link
          href="/analysis"
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

