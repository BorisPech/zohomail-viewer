"use client"

import { cn } from "@/lib/utils"
import type { Email } from "@/lib/types"

interface EmailListProps {
  emails: Email[]
  selectedId: string | null
  onSelectEmail: (email: Email) => void
  isNew?: (id: string) => boolean
}

const COLORS = [
  { bg: "bg-violet-500/15", text: "text-violet-400" },
  { bg: "bg-rose-500/15", text: "text-rose-400" },
  { bg: "bg-emerald-500/15", text: "text-emerald-400" },
  { bg: "bg-orange-500/15", text: "text-orange-400" },
  { bg: "bg-amber-500/15", text: "text-amber-400" },
  { bg: "bg-cyan-500/15", text: "text-cyan-400" },
  { bg: "bg-pink-500/15", text: "text-pink-400" },
  { bg: "bg-sky-500/15", text: "text-sky-400" },
]

function getColor(str: string) {
  let hash = 0
  for (const char of str || "") {
    hash = (hash * 31 + char.charCodeAt(0)) % COLORS.length
  }
  return COLORS[hash]
}

function getInitials(str: string) {
  return (str || "?")
    .split(/[\s@]+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?"
}

function getSenderName(address: string) {
  if (!address) return ""
  if (address.includes("<")) {
    return address.split("<")[0].trim().replace(/['"]/g, "")
  }
  return address.split("@")[0]
}

function formatTime(ms: number) {
  if (!ms) return ""
  const d = new Date(+ms)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }
  if (now.getTime() - d.getTime() < 7 * 86400000) {
    return d.toLocaleDateString([], { weekday: "short" })
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" })
}

function decodeHtml(html: string) {
  const textarea = document.createElement("textarea")
  textarea.innerHTML = html || ""
  return textarea.value
}

export function EmailList({ emails, selectedId, onSelectEmail, isNew }: EmailListProps) {
  if (emails.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-secondary">
          <svg
            className="h-6 w-6 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <p className="font-semibold">No emails found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          This folder is empty or no emails match your search.
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {emails.map((email) => {
        const id = email.messageId || email.mid || ""
        const isUnread = email.status === "0"
        const isSelected = selectedId === id
        const senderName = getSenderName(email.fromAddress || email.sender || "")
        const color = getColor(senderName)
        const initials = getInitials(senderName)
        const isNewEmail = isNew?.(id)

        return (
          <div
            key={id}
            onClick={() => onSelectEmail(email)}
            className={cn(
              "relative flex cursor-pointer gap-3 border-b border-border px-4 py-3 transition-colors",
              isSelected && "bg-secondary",
              isUnread && !isSelected && "bg-primary/[0.03]",
              !isSelected && !isUnread && "hover:bg-secondary/50",
              isNewEmail && "animate-highlight"
            )}
          >
            {/* Unread indicator */}
            {isUnread && (
              <div className="absolute left-0 top-0 h-full w-0.5 bg-primary" />
            )}

            {/* Avatar */}
            <div
              className={cn(
                "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-xs font-semibold",
                color.bg,
                color.text
              )}
            >
              {initials}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p
                  className={cn(
                    "truncate text-sm",
                    isUnread ? "font-semibold text-foreground" : "text-muted-foreground"
                  )}
                >
                  {senderName}
                </p>
                <span className="flex-shrink-0 text-[11px] text-muted-foreground">
                  {formatTime(email.receivedTime || email.sentDateInGMT || 0)}
                </span>
              </div>
              <p
                className={cn(
                  "mt-0.5 truncate text-sm",
                  isUnread ? "font-medium text-foreground" : "text-muted-foreground"
                )}
              >
                {decodeHtml(email.subject || "(No Subject)")}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {email.summary?.slice(0, 100) || ""}
              </p>
            </div>

            {/* Unread dot */}
            <div className="flex flex-col items-end gap-1 pt-1">
              {isUnread && (
                <div className="h-2 w-2 rounded-full bg-primary" />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
