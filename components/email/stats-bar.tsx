"use client"

import { Mail, Circle, FolderOpen } from "lucide-react"

interface StatsBarProps {
  total: number
  unread: number
  lastSync: number | null
  activeFolder: string
}

export function StatsBar({ total, unread, activeFolder }: StatsBarProps) {
  return (
    <div className="flex border-b border-border bg-card">
      {/* Total */}
      <div className="flex flex-1 items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary sm:h-9 sm:w-9">
          <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </div>
        <div>
          <p className="text-lg font-bold leading-none tracking-tight sm:text-xl">{total}</p>
          <p className="text-[10px] text-muted-foreground sm:text-[11px]">Total</p>
        </div>
      </div>

      {/* Unread */}
      <div className="flex flex-1 items-center gap-2 border-l border-border px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive sm:h-9 sm:w-9">
          <Circle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </div>
        <div>
          <p className="text-lg font-bold leading-none tracking-tight sm:text-xl">{unread}</p>
          <p className="text-[10px] text-muted-foreground sm:text-[11px]">Unread</p>
        </div>
      </div>

      {/* Active folder - hidden on mobile, visible on larger screens */}
      <div className="hidden flex-1 items-center gap-3 border-l border-border px-4 py-3 sm:flex">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
          <FolderOpen className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-none tracking-tight capitalize">
            {activeFolder}
          </p>
          <p className="text-[11px] text-muted-foreground">Current folder</p>
        </div>
      </div>
    </div>
  )
}
