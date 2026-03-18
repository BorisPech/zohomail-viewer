"use client"

import { cn } from "@/lib/utils"
import { RefreshCw, Mail, Sparkles, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface HeaderProps {
  syncing: boolean
  newCount: number
  onRefresh: () => void
  onLoadNew: () => void
  onToggleSidebar: () => void
  sidebarOpen: boolean
}

export function Header({
  syncing,
  newCount,
  onRefresh,
  onLoadNew,
  onToggleSidebar,
  sidebarOpen,
}: HeaderProps) {
  return (
    <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-border bg-card px-3 sm:h-16 sm:px-5">
      {/* Left side */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="h-9 w-9 lg:hidden"
        >
          {sidebarOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>

        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25 sm:h-10 sm:w-10">
            <Mail className="h-4 w-4 text-primary-foreground sm:h-5 sm:w-5" />
          </div>
          <div className="hidden sm:block">
            <span className="text-base font-bold tracking-tight">Zoho Mail</span>
            <p className="text-[10px] text-muted-foreground">Professional Email Client</p>
          </div>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* New mail alert */}
        {newCount > 0 && (
          <Button
            onClick={onLoadNew}
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 border-primary/30 bg-primary/10 px-2 text-xs text-primary hover:bg-primary/20 sm:px-3"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">{newCount} new</span>
            <span className="xs:hidden">{newCount}</span>
          </Button>
        )}

        {/* Sync status */}
        <div
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] sm:px-2.5 sm:text-xs",
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
          <span className="hidden sm:inline">{syncing ? "Syncing..." : "Live"}</span>
        </div>

        {/* Refresh button */}
        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          disabled={syncing}
          className="h-8 w-8 sm:h-9 sm:w-9"
        >
          <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
        </Button>
      </div>
    </header>
  )
}
