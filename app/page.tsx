"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import useSWR from "swr"
import { Header } from "@/components/email/header"
import { Sidebar } from "@/components/email/sidebar"
import { EmailList } from "@/components/email/email-list"
import { EmailDetail } from "@/components/email/email-detail"
import { StatsBar } from "@/components/email/stats-bar"
import { LoadingScreen } from "@/components/email/loading-screen"
import type { Email, EmailsResponse } from "@/lib/types"

const POLL_INTERVAL = 30000 // 30 seconds

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function MailPage() {
  const [activeFolder, setActiveFolder] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [newEmailIds, setNewEmailIds] = useState<Set<string>>(new Set())
  const [pendingNewEmails, setPendingNewEmails] = useState<Email[]>([])
  const previousEmailsRef = useRef<Email[]>([])

  // Build API URL
  const apiUrl = activeFolder
    ? `/api/emails?folder=${encodeURIComponent(activeFolder)}&limit=200`
    : `/api/emails?limit=200`

  // Fetch emails with SWR
  const { data, error, isLoading, mutate, isValidating } = useSWR<EmailsResponse>(
    apiUrl,
    fetcher,
    {
      refreshInterval: POLL_INTERVAL,
      revalidateOnFocus: true,
      onSuccess: (newData) => {
        if (newData?.activeFolder && !activeFolder) {
          setActiveFolder(newData.activeFolder)
        }

        // Detect new emails
        if (previousEmailsRef.current.length > 0 && newData?.emails) {
          const existingIds = new Set(
            previousEmailsRef.current.map((e) => e.messageId || e.mid)
          )
          const brandNew = newData.emails.filter(
            (e) => !existingIds.has(e.messageId) && !existingIds.has(e.mid)
          )
          if (brandNew.length > 0) {
            setPendingNewEmails(brandNew)
            // Browser notification
            if (
              typeof window !== "undefined" &&
              Notification.permission === "granted"
            ) {
              const first = brandNew[0]
              new Notification("New Email", {
                body: first.subject || "You have a new message",
                icon: "/favicon.ico",
              })
            }
          }
        }
        if (newData?.emails) {
          previousEmailsRef.current = newData.emails
        }
      },
    }
  )

  // Request notification permission
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission()
      }
    }
  }, [])

  // Filter emails by search query
  const filteredEmails = (data?.emails || []).filter((email) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      email.subject?.toLowerCase().includes(q) ||
      email.fromAddress?.toLowerCase().includes(q) ||
      email.sender?.toLowerCase().includes(q) ||
      email.summary?.toLowerCase().includes(q)
    )
  })

  // Handle folder change
  const handleFolderClick = useCallback((folderName: string) => {
    setActiveFolder(folderName)
    setSelectedEmail(null)
    setSearchQuery("")
    setNewEmailIds(new Set())
    setPendingNewEmails([])
  }, [])

  // Handle refresh
  const handleRefresh = useCallback(() => {
    mutate()
  }, [mutate])

  // Load new emails
  const handleLoadNew = useCallback(() => {
    const newIds = new Set(
      pendingNewEmails.map((e) => e.messageId || e.mid || "")
    )
    setNewEmailIds(newIds)
    setPendingNewEmails([])
    mutate()

    // Clear highlight after animation
    setTimeout(() => {
      setNewEmailIds(new Set())
    }, 1000)
  }, [pendingNewEmails, mutate])

  // Handle email selection
  const handleSelectEmail = useCallback((email: Email) => {
    setSelectedEmail(email)
  }, [])

  // Close detail panel
  const handleCloseDetail = useCallback(() => {
    setSelectedEmail(null)
  }, [])

  // Check if email is new
  const isNewEmail = useCallback(
    (id: string) => newEmailIds.has(id),
    [newEmailIds]
  )

  // Loading state
  if (isLoading && !data) {
    return <LoadingScreen message="Loading mailbox..." />
  }

  // Error state
  if (error || data?.error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-destructive/10">
          <svg
            className="h-6 w-6 text-destructive"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div>
          <p className="font-semibold">Failed to load emails</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {data?.error || error?.message || "An error occurred"}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Header */}
      <Header
        syncing={isValidating}
        newCount={pendingNewEmails.length}
        onRefresh={handleRefresh}
        onLoadNew={handleLoadNew}
      />

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          folders={data?.folders || []}
          activeFolder={data?.activeFolder || activeFolder}
          onFolderClick={handleFolderClick}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          accountEmail={data?.accountEmail || ""}
        />

        {/* Email list area */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {/* Stats */}
          <StatsBar
            total={data?.total || 0}
            unread={data?.unread || 0}
            lastSync={data?.timestamp || null}
          />

          {/* Count bar */}
          <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
            <span className="text-xs text-muted-foreground">
              Showing{" "}
              <span className="font-semibold text-foreground">
                {filteredEmails.length}
              </span>{" "}
              messages
              {searchQuery && (
                <span className="text-muted-foreground">
                  {" "}
                  matching &quot;{searchQuery}&quot;
                </span>
              )}
            </span>
            <span className="text-xs text-muted-foreground">
              {data?.activeFolder || "Loading..."}
            </span>
          </div>

          {/* Email list */}
          <EmailList
            emails={filteredEmails}
            selectedId={selectedEmail?.messageId || selectedEmail?.mid || null}
            onSelectEmail={handleSelectEmail}
            isNew={isNewEmail}
          />
        </main>
      </div>

      {/* Email detail panel */}
      {selectedEmail && (
        <EmailDetail email={selectedEmail} onClose={handleCloseDetail} />
      )}
    </div>
  )
}
