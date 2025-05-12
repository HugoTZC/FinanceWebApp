"use client"

import { useState } from "react"
import { HexColorPicker } from "react-colorful"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ColorPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialColor: string
  onColorChange: (color: string) => void
  title?: string
}

export function ColorPickerDialog({
  open,
  onOpenChange,
  initialColor,
  onColorChange,
  title = "Choose Color",
}: ColorPickerDialogProps) {
  const [color, setColor] = useState(initialColor)

  const handleSave = () => {
    onColorChange(color)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <HexColorPicker color={color} onChange={setColor} />
          <div className="mt-4 flex items-center gap-4">
            <div className="flex-1">
              <div
                className="h-10 w-full rounded-md border"
                style={{ backgroundColor: color }}
              />
            </div>
            <div className="font-mono uppercase">{color}</div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}