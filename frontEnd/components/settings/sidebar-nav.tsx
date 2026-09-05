"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const items = [
  {
    title: "Profile",
    href: "/settings/profile",
  },
  {
    title: "Account",
    href: "/settings",
  },
  {
    title: "Categories",
    href: "/settings/categories",
  },
  {
    title: "Appearance",
    href: "/settings/appearance",
  },
  {
    title: "Notifications",
    href: "/settings/notifications",
  },
  {
    title: "Danger Zone",
    href: "/settings/danger-zone",
  },
]

export function SidebarNav() {
  const pathname = usePathname()
  const router = useRouter()
  const currentItem = items.find((item) => item.href === pathname) ?? items[0]

  return (
    <>
      <nav aria-label="Settings sections" className="lg:hidden">
        <Select value={currentItem.href} onValueChange={(href) => router.push(href)}>
          <SelectTrigger className="h-11 w-full bg-background">
            <SelectValue aria-label={`Current section: ${currentItem.title}`} />
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => (
              <SelectItem key={item.href} value={item.href}>
                {item.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </nav>

      <nav aria-label="Settings sections" className="hidden flex-col space-y-1 lg:flex">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              buttonVariants({ variant: "ghost" }),
              pathname === item.href ? "bg-muted hover:bg-muted" : "hover:bg-transparent hover:underline",
              "justify-start",
            )}
          >
            {item.title}
          </Link>
        ))}
      </nav>
    </>
  )
}

