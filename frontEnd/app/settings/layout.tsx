import type React from "react"
import type { Metadata } from "next"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Separator } from "@/components/ui/separator"
import { SidebarNav } from "@/components/settings/sidebar-nav"

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your account settings and preferences.",
}

interface SettingsLayoutProps {
  children: React.ReactNode
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DashboardHeader />
      <div className="container min-w-0 flex-1 space-y-4 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <div className="space-y-0.5">
          <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">Manage your account settings and set preferences.</p>
        </div>
        <Separator className="my-6" />
        <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:gap-12">
          <aside className="w-full min-w-0 lg:w-1/5 lg:flex-none">
            <SidebarNav />
          </aside>
          <div className="min-w-0 flex-1 lg:max-w-2xl">{children}</div>
        </div>
      </div>
    </div>
  )
}

