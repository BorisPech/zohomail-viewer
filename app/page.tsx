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

const POLL_INTERVAL = 30000

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function MailPage() {
  const [activeFolder, setActiveFolder] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [newEmailIds, setNewEmailIds] = useState<Set<string>>(new Set())
  const [pendingNewEmails, setPendingNewEmails] = useState<Email[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const previousEmailsRef = useRef<Email[]>([])

  const apiUrl = activeFolder
    ? `/api/emails?folder=${encodeURIComponent(activeFolder)}&limit=200`
    : `/api/emails?limit=200`

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

        if (previousEmailsRef.current.length > 0 && newData?.emails) {
          const existingIds = new Set(
            previousEmailsRef.current.map((e) => e.messageId || e.mid)
          )
          const brandNew = newData.emails.filter(
            (e) => !existingIds.has(e.messageId) && !existingIds.has(e.mid)
          )
          if (brandNew.length > 0) {
            setPendingNewEmails(brandNew)
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

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission()
      }
    }
  }, [])

  // Close sidebar on mobile when selecting email
  useEffect(() => {
    if (selectedEmail) {
      setSidebarOpen(false)
    }
  }, [selectedEmail])

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

  const handleFolderClick = useCallback((folderName: string) => {
    setActiveFolder(folderName)
    setSelectedEmail(null)
    setSearchQuery("")
    setNewEmailIds(new Set())
    setPendingNewEmails([])
    setSidebarOpen(false)
  }, [])

  const handleRefresh = useCallback(() => {
    mutate()
  }, [mutate])

  const handleLoadNew = useCallback(() => {
    const newIds = new Set(
      pendingNewEmails.map((e) => e.messageId || e.mid || "")
    )
    setNewEmailIds(newIds)
    setPendingNewEmails([])
    mutate()
    setTimeout(() => {
      setNewEmailIds(new Set())
    }, 1000)
  }, [pendingNewEmails, mutate])

  const handleSelectEmail = useCallback((email: Email) => {
    setSelectedEmail(email)
  }, [])

  const handleCloseDetail = useCallback(() => {
    setSelectedEmail(null)
  }, [])

  const isNewEmail = useCallback(
    (id: string) => newEmailIds.has(id),
    [newEmailIds]
  )

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev)
  }, [])

  if (isLoading && !data) {
    return <LoadingScreen message="Loading mailbox..." />
  }

  if (error || data?.error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-destructive/10">
          <svg
            className="h-7 w-7 text-destructive"
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
          <p className="text-lg font-semibold">Failed to load emails</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {data?.error || error?.message || "An error occurred"}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="mt-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background">
      {/* Header */}
      <Header
        syncing={isValidating}
        newCount={pendingNewEmails.length}
        onRefresh={handleRefresh}
        onLoadNew={handleLoadNew}
        onToggleSidebar={toggleSidebar}
        sidebarOpen={sidebarOpen}
      />

      {/* Main content */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Sidebar overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <Sidebar
          folders={data?.folders || []}
          activeFolder={data?.activeFolder || activeFolder}
          onFolderClick={handleFolderClick}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          accountEmail={data?.accountEmail || ""}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Email list area */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {/* Stats */}
          <StatsBar
            total={data?.total || 0}
            unread={data?.unread || 0}
            lastSync={data?.timestamp || null}
            activeFolder={data?.activeFolder || "Loading..."}
          />

          {/* Count bar */}
          <div className="flex items-center justify-between border-b border-border bg-card/50 px-4 py-2.5 sm:px-5">
            <span className="text-xs text-muted-foreground">
              Showing{" "}
              <span className="font-semibold text-foreground">
                {filteredEmails.length}
              </span>{" "}
              messages
              {searchQuery && (
                <span className="hidden text-muted-foreground sm:inline">
                  {" "}
                  matching &quot;{searchQuery}&quot;
                </span>
              )}
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
      <EmailDetail email={selectedEmail} onClose={handleCloseDetail} />
    </div>
  )
}
