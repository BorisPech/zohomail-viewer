"use client"

import { cn } from "@/lib/utils"
import type { Email } from "@/lib/types"
import { X, Reply, Forward, Download, MoreHorizontal } from "lucide-react"
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
    <div className="fixed inset-y-0 right-0 top-[56px] z-50 flex w-full max-w-2xl flex-col border-l border-border bg-card animate-slide-in">
      {/* Header */}
      <div className="flex items-start gap-3 border-b border-border p-4">
        <Button
          variant="outline"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold leading-tight text-foreground">
            {decodeHtml(email.subject || "(No Subject)")}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatFullDate(email.receivedTime || email.sentDateInGMT || 0)}
          </p>
        </div>
      </div>

      {/* Sender info */}
      <div className="flex items-center gap-3 border-b border-border bg-secondary/30 px-4 py-3">
        <div
          className={cn(
            "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold",
            color.bg,
            color.text
          )}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{senderName}</p>
          <p className="text-xs text-muted-foreground">{senderEmail}</p>
          {email.toAddress && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              To: {email.toAddress}
            </p>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {/* Actions */}
      <div className="flex gap-2 border-b border-border px-4 py-2">
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <Reply className="h-3.5 w-3.5" />
          Reply
        </Button>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <Forward className="h-3.5 w-3.5" />
          Forward
        </Button>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <Download className="h-3.5 w-3.5" />
          Download
        </Button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
          {email.content
            ? decodeHtml(email.content.replace(/<[^>]*>/g, ""))
            : email.summary || "No content available."}
        </div>
      </div>
    </div>
  )
}
