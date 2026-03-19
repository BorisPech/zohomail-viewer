"use client";

import { MailX } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Email } from "@/lib/types";
import {
  getAvatarColor,
  getInitials,
  getSenderName,
  formatTime,
  isUnread,
  getEmailId,
  getEmailTime,
  stripHtml,
} from "@/lib/email-utils";

interface EmailListProps {
  emails: Email[];
  selectedId: string | null;
  searchQuery: string;
  onSelect: (email: Email) => void;
}

export function EmailList({
  emails,
  selectedId,
  searchQuery,
  onSelect,
}: EmailListProps) {
  const filteredEmails = searchQuery
    ? emails.filter((email) => {
        const query = searchQuery.toLowerCase();
        const sender = (email.sender || email.fromAddress || "").toLowerCase();
        const subject = (email.subject || "").toLowerCase();
        const summary = (email.summary || "").toLowerCase();
        return (
          sender.includes(query) ||
          subject.includes(query) ||
          summary.includes(query)
        );
      })
    : emails;

  if (filteredEmails.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
        <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mb-5">
          <MailX className="h-7 w-7 text-muted-foreground" />
        </div>
        <h3 className="text-base font-semibold mb-2">No emails found</h3>
        <p className="text-sm text-muted-foreground max-w-[280px]">
          {searchQuery
            ? "Try a different search term"
            : "This folder is empty"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {filteredEmails.map((email) => {
        const id = getEmailId(email);
        const senderAddress = email.sender || email.fromAddress || "";
        const senderName = getSenderName(senderAddress);
        const avatarColor = getAvatarColor(senderName);
        const initials = getInitials(senderName);
        const time = formatTime(getEmailTime(email));
        const unread = isUnread(email);
        const selected = id === selectedId;
        const summary = stripHtml(email.summary || "");

        return (
          <button
            key={id}
            onClick={() => onSelect(email)}
            className={cn(
              "w-full grid grid-cols-[44px_1fr_auto] gap-3 items-start p-4 text-left border-b border-border transition-colors relative",
              "hover:bg-accent/50",
              unread && "bg-blue-500/[0.03]",
              selected && "bg-accent"
            )}
          >
            {/* Unread indicator */}
            {unread && <div className="email-unread-indicator" />}

            {/* Avatar */}
            <div
              className={cn(
                "w-11 h-11 rounded-lg flex items-center justify-center text-sm font-semibold shrink-0",
                avatarColor.bg,
                avatarColor.text
              )}
            >
              {initials}
            </div>

            {/* Content */}
            <div className="min-w-0">
              <div
                className={cn(
                  "text-sm truncate mb-0.5",
                  unread
                    ? "font-semibold text-foreground"
                    : "font-medium text-muted-foreground"
                )}
              >
                {senderName || senderAddress || "Unknown"}
              </div>
              <div
                className={cn(
                  "text-[13px] truncate mb-0.5",
                  unread ? "text-foreground font-medium" : "text-muted-foreground"
                )}
              >
                {email.subject || "(No subject)"}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {summary}
              </div>
            </div>

            {/* Meta */}
            <div className="flex flex-col items-end gap-2 pt-0.5">
              <span className="text-xs text-muted-foreground">{time}</span>
              {unread && (
                <span className="w-2 h-2 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50" />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
