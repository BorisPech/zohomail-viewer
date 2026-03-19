"use client";

import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import { Header } from "@/components/mail/header";
import { Sidebar } from "@/components/mail/sidebar";
import { StatsBar } from "@/components/mail/stats-bar";
import { EmailList } from "@/components/mail/email-list";
import { EmailDetail } from "@/components/mail/email-detail";
import { Toolbar } from "@/components/mail/toolbar";
import { useEmailStore } from "@/lib/email-store";
import type { Email, Folder } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function MailPage() {
  const [selectedFolder, setSelectedFolder] = useState<Folder>("inbox");
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { emails, setEmails, lastSync, setLastSync } = useEmailStore();

  const { data, error, isLoading, mutate } = useSWR(
    `/api/emails?folder=${selectedFolder}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  useEffect(() => {
    if (data?.emails) {
      setEmails(data.emails);
      setLastSync(Date.now());
    }
  }, [data, setEmails, setLastSync]);

  const handleRefresh = useCallback(() => {
    mutate();
  }, [mutate]);

  const handleMarkAsRead = useCallback(
    async (email: Email) => {
      if (email.flagid?.includes("UNREAD")) {
        try {
          await fetch("/api/markread", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messageId: email.messageId }),
          });
          mutate();
        } catch (err) {
          console.error("Failed to mark as read:", err);
        }
      }
    },
    [mutate]
  );

  const handleSelectEmail = useCallback(
    (email: Email) => {
      setSelectedEmail(email);
      handleMarkAsRead(email);
    },
    [handleMarkAsRead]
  );

  const filteredEmails = emails.filter((email) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      email.subject?.toLowerCase().includes(query) ||
      email.fromAddress?.toLowerCase().includes(query) ||
      email.sender?.toLowerCase().includes(query)
    );
  });

  const folders: { id: Folder; name: string; count?: number }[] = [
    { id: "inbox", name: "Inbox" },
    { id: "sent", name: "Sent" },
    { id: "drafts", name: "Drafts" },
    { id: "archive", name: "Archive" },
    { id: "spam", name: "Spam" },
    { id: "trash", name: "Trash" },
  ];

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          folders={folders}
          selectedFolder={selectedFolder}
          onSelectFolder={(folder) => {
            setSelectedFolder(folder);
            setSelectedEmail(null);
          }}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <StatsBar total={emails.length} lastSync={lastSync} />

          <Toolbar
            emailCount={filteredEmails.length}
            onRefresh={handleRefresh}
            isLoading={isLoading}
          />

          <div className="flex-1 overflow-hidden">
            <EmailList
              emails={filteredEmails}
              selectedEmail={selectedEmail}
              onSelectEmail={handleSelectEmail}
              isLoading={isLoading}
              error={error}
            />
          </div>
        </main>

        <EmailDetail
          email={selectedEmail}
          onClose={() => setSelectedEmail(null)}
        />
      </div>
    </div>
  );
}
