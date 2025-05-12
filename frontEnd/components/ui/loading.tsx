"use client"

import Image from "next/image"

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="flex flex-col items-center space-y-4">
        <div className="rounded-full bg-primary p-3 animate-[flip_1s_linear_infinite]">
          <Image
            src="/finappYellow.png"
            alt="FinanceTracker Logo"
            width={32}
            height={32}
            className="h-8 w-8"
          />
        </div>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}