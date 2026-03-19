"use client";

import { useEffect } from "react";
import { X, Reply, Forward, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMessage, markAsRead } from "@/lib/email-store";
import type { Email } from "@/lib/types";
import {
  getAvatarColor,
  getInitials,
  getSenderName,
  getSenderEmail,
  formatFullDate,
  getEmailId,
  getEmailTime,
  stripHtml,
  decodeHtml,
} from "@/lib/email-utils";

interface EmailDetailProps {
  email: Email | null;
  folderId: string;
  onClose: () => void;
  onMarkRead: (emailId: string) => void;
}

export function EmailDetail({
  email,
  folderId,
  onClose,
  onMarkRead,
}: EmailDetailProps) {
  const emailId = email ? getEmailId(email) : null;
  const { data, isLoading } = useMessage(emailId);

  // Mark as read when opened
  useEffect(() => {
    if (email && email.status === "0" && folderId) {
      const id = getEmailId(email);
      markAsRead(id, folderId).then(() => {
        onMarkRead(id);
      });
    }
  }, [email, folderId, onMarkRead]);

  if (!email) return null;

  const senderAddress = email.sender || email.fromAddress || "";
  const senderName = getSenderName(senderAddress);
  const senderEmail = getSenderEmail(senderAddress);
  const avatarColor = getAvatarColor(senderName);
  const initials = getInitials(senderName);
  const date = formatFullDate(getEmailTime(email));
  const toAddress = email.toAddress || "";

  // Get body content
  const fullMessage = data?.message;
  let bodyContent = "";
  if (fullMessage) {
    if (fullMessage.htmlContent) {
      bodyContent = fullMessage.htmlContent;
    } else if (fullMessage.textContent) {
      bodyContent = fullMessage.textContent;
    } else if (fullMessage.content) {
      bodyContent = fullMessage.content;
    }
  }
  if (!bodyContent) {
    bodyContent = email.summary || "";
  }

  // Strip HTML for display (keeping it simple)
  const displayContent = stripHtml(decodeHtml(bodyContent));

  return (
    <div className="fixed top-14 right-0 w-full max-w-2xl h-[calc(100vh-56px)] bg-card border-l border-border flex flex-col z-40 animate-slide-in-right shadow-2xl">
      {/* Header */}
      <div className="flex items-start gap-3 p-5 border-b border-border shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold leading-tight mb-1 text-balance">
            {email.subject || "(No subject)"}
          </h2>
          <p className="text-xs text-muted-foreground">{date}</p>
        </div>
      </div>

      {/* Sender info */}
      <div className="flex items-center gap-3 p-5 border-b border-border bg-background shrink-0">
        <div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0",
            avatarColor.bg,
            avatarColor.text
          )}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold">{senderName || senderEmail}</div>
          <div className="text-xs text-muted-foreground truncate">
            {senderEmail}
          </div>
          {toAddress && (
            <div className="text-xs text-muted-foreground truncate">
              To: {toAddress}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 p-3 border-b border-border shrink-0">
        <Button variant="outline" size="sm" className="gap-1.5">
          <Reply className="h-3.5 w-3.5" />
          Reply
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Forward className="h-3.5 w-3.5" />
          Forward
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="h-3.5 w-3.5" />
          Download
        </Button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap break-words">
            {displayContent || "No content"}
          </div>
        )}
      </div>
    </div>
  );
}
