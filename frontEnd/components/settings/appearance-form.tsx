"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useTheme } from "@/components/theme-provider"
import { Label } from "@/components/ui/label"

export function AppearanceForm() {
  const { toast } = useToast()
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const { theme, setTheme } = useTheme()

  // Instead of using react-hook-form, we'll use a simple state approach
  const [selectedTheme, setSelectedTheme] = useState<"light" | "dark" | "system">(
    (theme as "light" | "dark" | "system") || "system",
  )

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Apply the theme
    setTheme(selectedTheme)

    // Show success dialog
    setShowSuccessDialog(true)

    // Also show toast
    toast({
      title: "Appearance updated",
      description: "Your appearance settings have been updated.",
    })
  }

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-8">
        <div className="space-y-4">
          <div>
            <Label className="text-base">Theme</Label>
            <p className="text-sm text-muted-foreground">Select the theme for the dashboard.</p>
          </div>

          <RadioGroup
            value={selectedTheme}
            onValueChange={(value) => {
              setSelectedTheme(value as "light" | "dark" | "system")
              // Preview the theme as the user selects it
              setTheme(value as "light" | "dark" | "system")
            }}
            className="grid max-w-md grid-cols-3 gap-8 pt-2"
          >
            <div>
              <Label className={`[&:has([data-state=checked])>div]:border-primary cursor-pointer`}>
                <RadioGroupItem value="light" className="sr-only" />
                <div className="items-center rounded-md border-2 border-muted p-1 hover:border-accent">
                  <div className="space-y-2 rounded-sm bg-[#FFFFFF] p-2">
                    <div className="space-y-2 rounded-md bg-[#F8F9FA] p-2 shadow-sm">
                      <div className="h-2 w-[80px] rounded-lg bg-[#E4E6EB]" />
                      <div className="h-2 w-[100px] rounded-lg bg-[#E4E6EB]" />
                    </div>
                    <div className="flex items-center space-x-2 rounded-md bg-[#F8F9FA] p-2 shadow-sm">
                      <div className="h-4 w-4 rounded-full bg-[#E4E6EB]" />
                      <div className="h-2 w-[100px] rounded-lg bg-[#E4E6EB]" />
                    </div>
                    <div className="flex items-center space-x-2 rounded-md bg-[#F8F9FA] p-2 shadow-sm">
                      <div className="h-4 w-4 rounded-full bg-[#E4E6EB]" />
                      <div className="h-2 w-[100px] rounded-lg bg-[#E4E6EB]" />
                    </div>
                  </div>
                </div>
                <span className="block w-full p-2 text-center font-normal">Light</span>
              </Label>
            </div>

            <div>
              <Label className={`[&:has([data-state=checked])>div]:border-primary cursor-pointer`}>
                <RadioGroupItem value="dark" className="sr-only" />
                <div className="items-center rounded-md border-2 border-muted p-1 hover:border-accent">
                  <div className="space-y-2 rounded-sm bg-[#1A1B26] p-2">
                    <div className="space-y-2 rounded-md bg-[#24283B] p-2 shadow-sm">
                      <div className="h-2 w-[80px] rounded-lg bg-[#565F89]" />
                      <div className="h-2 w-[100px] rounded-lg bg-[#565F89]" />
                    </div>
                    <div className="flex items-center space-x-2 rounded-md bg-[#24283B] p-2 shadow-sm">
                      <div className="h-4 w-4 rounded-full bg-[#565F89]" />
                      <div className="h-2 w-[100px] rounded-lg bg-[#565F89]" />
                    </div>
                    <div className="flex items-center space-x-2 rounded-md bg-[#24283B] p-2 shadow-sm">
                      <div className="h-4 w-4 rounded-full bg-[#565F89]" />
                      <div className="h-2 w-[100px] rounded-lg bg-[#565F89]" />
                    </div>
                  </div>
                </div>
                <span className="block w-full p-2 text-center font-normal">Dark</span>
              </Label>
            </div>

            <div>
              <Label className={`[&:has([data-state=checked])>div]:border-primary cursor-pointer`}>
                <RadioGroupItem value="system" className="sr-only" />
                <div className="items-center rounded-md border-2 border-muted p-1 hover:border-accent">
                  <div className="space-y-2 rounded-sm bg-gradient-to-r from-[#FFFFFF] to-[#1F1F1F] p-2">
                    <div className="space-y-2 rounded-md bg-gradient-to-r from-[#F8F9FA] to-[#2B2B2B] p-2 shadow-sm">
                      <div className="h-2 w-[80px] rounded-lg bg-gradient-to-r from-[#E4E6EB] to-[#444444]" />
                      <div className="h-2 w-[100px] rounded-lg bg-gradient-to-r from-[#E4E6EB] to-[#444444]" />
                    </div>
                    <div className="flex items-center space-x-2 rounded-md bg-gradient-to-r from-[#F8F9FA] to-[#2B2B2B] p-2 shadow-sm">
                      <div className="h-4 w-4 rounded-full bg-gradient-to-r from-[#E4E6EB] to-[#444444]" />
                      <div className="h-2 w-[100px] rounded-lg bg-gradient-to-r from-[#E4E6EB] to-[#444444]" />
                    </div>
                    <div className="flex items-center space-x-2 rounded-md bg-gradient-to-r from-[#F8F9FA] to-[#2B2B2B] p-2 shadow-sm">
                      <div className="h-4 w-4 rounded-full bg-gradient-to-r from-[#E4E6EB] to-[#444444]" />
                      <div className="h-2 w-[100px] rounded-lg bg-gradient-to-r from-[#E4E6EB] to-[#444444]" />
                    </div>
                  </div>
                </div>
                <span className="block w-full p-2 text-center font-normal">System</span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <Button type="submit">Update preferences</Button>
      </form>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Settings Updated</DialogTitle>
            <DialogDescription>Your appearance settings have been updated successfully.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowSuccessDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

