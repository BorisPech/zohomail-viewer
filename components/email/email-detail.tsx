"use client"

import { cn } from "@/lib/utils"
import type { Email } from "@/lib/types"
import { X, Reply, Forward, Archive, Trash2, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EmailDetailProps {
  email: Email | null
  onClose: () => void
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

function getSenderEmail(address: string) {
  if (!address) return ""
  const match = address.match(/<(.+?)>/)
  return match ? match[1] : address
}

function formatFullDate(ms: number) {
  if (!ms) return ""
  return new Date(+ms).toLocaleString([], {
    dateStyle: "full",
    timeStyle: "short",
  })
}

function decodeHtml(html: string) {
  if (typeof document === "undefined") return html || ""
  const textarea = document.createElement("textarea")
  textarea.innerHTML = html || ""
  return textarea.value
}

export function EmailDetail({ email, onClose }: EmailDetailProps) {
  if (!email) return null

  const senderName = getSenderName(email.fromAddress || email.sender || "")
  const senderEmail = getSenderEmail(email.fromAddress || email.sender || "")
  const color = getColor(senderName)
  const initials = getInitials(senderName)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-0 z-50 flex flex-col bg-background sm:inset-y-0 sm:left-auto sm:right-0 sm:w-full sm:max-w-2xl sm:border-l sm:border-border lg:max-w-3xl animate-slide-in">
        {/* Header */}
        <div className="flex h-14 flex-shrink-0 items-center gap-2 border-b border-border px-3 sm:h-16 sm:gap-3 sm:px-5">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-9 w-9 flex-shrink-0"
          >
            <ChevronLeft className="h-5 w-5 sm:hidden" />
            <X className="hidden h-4 w-4 sm:block" />
          </Button>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold leading-tight text-foreground sm:text-base">
              {decodeHtml(email.subject || "(No Subject)")}
            </h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground sm:text-xs">
              {formatFullDate(email.receivedTime || email.sentDateInGMT || 0)}
            </p>
          </div>
        </div>

        {/* Sender info */}
        <div className="flex items-center gap-3 border-b border-border bg-secondary/30 px-4 py-3 sm:px-5 sm:py-4">
          <div
            className={cn(
              "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-xs font-bold sm:h-12 sm:w-12 sm:text-sm",
              color.bg,
              color.text
            )}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold sm:text-base">{senderName}</p>
            <p className="text-xs text-muted-foreground">{senderEmail}</p>
            {email.toAddress && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                To: {email.toAddress}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-1.5 overflow-x-auto border-b border-border px-3 py-2 sm:gap-2 sm:px-4 sm:py-3">
          <Button variant="outline" size="sm" className="h-8 gap-1.5 whitespace-nowrap text-xs sm:h-9 sm:gap-2 sm:text-sm">
            <Reply className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Reply
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 whitespace-nowrap text-xs sm:h-9 sm:gap-2 sm:text-sm">
            <Forward className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Forward
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 whitespace-nowrap text-xs sm:h-9 sm:gap-2 sm:text-sm">
            <Archive className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Archive
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 whitespace-nowrap text-xs text-destructive hover:bg-destructive/10 hover:text-destructive sm:h-9 sm:gap-2 sm:text-sm">
            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Delete
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="prose prose-sm prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 sm:text-base sm:leading-7">
            {email.content
              ? decodeHtml(email.content.replace(/<[^>]*>/g, ""))
              : email.summary || "No content available."}
          </div>
        </div>
      </div>
    </>
  )
}
