"use client"

import { Mail } from "lucide-react"

interface LoadingScreenProps {
  message?: string
}

export function LoadingScreen({ message = "Loading..." }: LoadingScreenProps) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-background p-6">
      <div className="relative">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-2xl shadow-primary/30">
          <Mail className="h-9 w-9 text-primary-foreground" />
        </div>
        <div className="absolute -bottom-1 -right-1 h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold tracking-tight">{message}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Connecting to your mailbox
        </p>
      </div>
    </div>
  )
}
