"use client"

import { cn } from "@/lib/utils"
import { Bell, X, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Email } from "@/lib/types"

interface NotificationToastProps {
  messages: Email[]
  isVisible: boolean
  onDismiss: () => void
  onLoadNew: () => void
}

export function NotificationToast({
  messages,
  isVisible,
  onDismiss,
  onLoadNew,
}: NotificationToastProps) {
  if (!isVisible || messages.length === 0) {
    return null
  }

  const firstMessage = messages[0]
  const sender = firstMessage.sender || firstMessage.fromAddress || "Unknown"
  const senderName = sender.includes("<")
    ? sender.split("<")[0].trim()
    : sender.split("@")[0]

  return (
    <div
      className={cn(
        "fixed inset-x-0 top-14 z-40 mx-auto max-w-md gap-3 rounded-lg border border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5 p-4 backdrop-blur-sm transition-all duration-300 sm:top-16 sm:mx-4 sm:max-w-sm",
        isVisible
          ? "translate-y-2 opacity-100"
          : "-translate-y-full opacity-0 pointer-events-none"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/20">
          <Bell className="h-5 w-5 text-primary" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {messages.length === 1 ? "New Message" : `${messages.length} New Messages`}
          </p>
          <p className="mt-1 text-xs text-muted-foreground truncate">
            {messages.length === 1 ? (
              <>
                <span className="font-medium text-foreground">{senderName}</span>
                {": "}
                {firstMessage.subject || "(No Subject)"}
              </>
            ) : (
              <>
                Latest from <span className="font-medium text-foreground">{senderName}</span>
              </>
            )}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-shrink-0 gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={onDismiss}
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={onLoadNew}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-primary/20 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/30 active:scale-[0.98]"
      >
        Load Messages
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
