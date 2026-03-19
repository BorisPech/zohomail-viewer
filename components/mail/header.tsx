"use client";

import { Mail, RefreshCw, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HeaderProps {
  isSyncing: boolean;
  lastSync: number;
  newCount: number;
  onRefresh: () => void;
  onApplyNew: () => void;
  onToggleSidebar: () => void;
}

function timeAgo(ms: number): string {
  if (!ms) return "-";
  const seconds = Math.floor((Date.now() - ms) / 1000);
  if (seconds < 10) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

export function Header({
  isSyncing,
  lastSync,
  newCount,
  onRefresh,
  onApplyNew,
  onToggleSidebar,
}: HeaderProps) {
  return (
    <header className="h-14 flex items-center px-4 gap-3 bg-card border-b border-border shrink-0 relative z-50">
      {/* Mobile menu toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onToggleSidebar}
        aria-label="Toggle menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/25">
          <Mail className="h-4 w-4 text-white" />
        </div>
        <span className="text-base font-semibold tracking-tight hidden sm:inline">
          Zoho Mail
        </span>
      </div>

      <div className="flex-1" />

      {/* New messages banner */}
      {newCount > 0 && (
        <button
          onClick={onApplyNew}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-xs font-medium text-blue-400 hover:bg-blue-500/20 transition-colors animate-fade-in"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          {newCount} new message{newCount > 1 ? "s" : ""}
        </button>
      )}

      {/* Status pill */}
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors",
          isSyncing
            ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
        )}
      >
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full",
            isSyncing
              ? "bg-blue-400 animate-pulse"
              : "bg-emerald-400 animate-pulse-dot"
          )}
        />
        {isSyncing ? "Syncing..." : "Live"}
      </div>

      {/* Refresh button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onRefresh}
        disabled={isSyncing}
        className="text-muted-foreground hover:text-foreground"
        aria-label="Refresh"
      >
        <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
      </Button>
    </header>
  );
}
