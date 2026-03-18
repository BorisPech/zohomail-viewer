"use client"

import { cn } from "@/lib/utils"
import { RefreshCw, Mail, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

interface HeaderProps {
  syncing: boolean
  newCount: number
  onRefresh: () => void
  onLoadNew: () => void
}

export function Header({ syncing, newCount, onRefresh, onLoadNew }: HeaderProps) {
  return (
    <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-border bg-card px-4">
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-lg shadow-primary/25">
          <Mail className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-sm font-semibold tracking-tight">Zoho Mail</span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* New mail alert */}
        {newCount > 0 && (
          <Button
            onClick={onLoadNew}
            variant="outline"
            size="sm"
            className="gap-1.5 border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {newCount} new {newCount === 1 ? "message" : "messages"}
          </Button>
        )}

        {/* Sync status */}
        <div
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
            syncing
              ? "border-primary/20 bg-primary/5 text-primary"
              : "border-emerald-500/20 bg-emerald-500/5 text-emerald-500"
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              syncing ? "animate-spin bg-primary" : "animate-pulse-dot bg-emerald-500"
            )}
          />
          <span>{syncing ? "Syncing..." : "Live"}</span>
        </div>

        {/* Refresh button */}
        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          disabled={syncing}
          className="h-8 w-8"
        >
          <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
        </Button>
      </div>
    </header>
  )
}
