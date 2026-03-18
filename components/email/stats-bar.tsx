"use client"

import { Mail, Circle, Clock } from "lucide-react"

interface StatsBarProps {
  total: number
  unread: number
  lastSync: number | null
}

function timeAgo(ms: number | null) {
  if (!ms) return "-"
  const seconds = Math.floor((Date.now() - ms) / 1000)
  if (seconds < 10) return "Just now"
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  return `${Math.floor(seconds / 3600)}h ago`
}

export function StatsBar({ total, unread, lastSync }: StatsBarProps) {
  return (
    <div className="flex border-b border-border bg-card">
      <div className="flex flex-1 items-center gap-3 px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Mail className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xl font-bold leading-none tracking-tight">{total}</p>
          <p className="text-[11px] text-muted-foreground">Total</p>
        </div>
      </div>

      <div className="flex flex-1 items-center gap-3 border-l border-border px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
          <Circle className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xl font-bold leading-none tracking-tight">{unread}</p>
          <p className="text-[11px] text-muted-foreground">Unread</p>
        </div>
      </div>

      <div className="flex flex-1 items-center gap-3 border-l border-border px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
          <Clock className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-none tracking-tight pt-0.5">
            {timeAgo(lastSync)}
          </p>
          <p className="text-[11px] text-muted-foreground">Last sync</p>
        </div>
      </div>
    </div>
  )
}
