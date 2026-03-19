"use client";

import { Mail, Clock } from "lucide-react";

interface StatsBarProps {
  total: number;
  unread: number;
  lastSync: number;
}

function timeAgo(ms: number): string {
  if (!ms) return "-";
  const seconds = Math.floor((Date.now() - ms) / 1000);
  if (seconds < 10) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

export function StatsBar({ total, unread, lastSync }: StatsBarProps) {
  return (
    <div className="hidden md:flex border-b border-border bg-card shrink-0">
      <div className="flex-1 flex items-center gap-3 px-5 py-3 border-r border-border">
        <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center">
          <Mail className="h-5 w-5 text-blue-400" />
        </div>
        <div>
          <div className="text-2xl font-bold tracking-tight">{total}</div>
          <div className="text-xs text-muted-foreground">Total Emails</div>
        </div>
      </div>
      <div className="flex-1 flex items-center gap-3 px-5 py-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center">
          <Clock className="h-5 w-5 text-emerald-400" />
        </div>
        <div>
          <div className="text-sm font-semibold">{timeAgo(lastSync)}</div>
          <div className="text-xs text-muted-foreground">Last Sync</div>
        </div>
      </div>
    </div>
  );
}
