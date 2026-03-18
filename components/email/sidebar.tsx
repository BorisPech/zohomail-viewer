"use client"

import { cn } from "@/lib/utils"
import type { Folder } from "@/lib/types"
import {
  Inbox,
  Send,
  FileEdit,
  AlertTriangle,
  Trash2,
  Archive,
  Bell,
  Newspaper,
  Clock,
  Star,
  FolderIcon,
  Search,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const FOLDER_ICONS: Record<string, React.ReactNode> = {
  inbox: <Inbox className="h-4 w-4" />,
  sent: <Send className="h-4 w-4" />,
  drafts: <FileEdit className="h-4 w-4" />,
  spam: <AlertTriangle className="h-4 w-4" />,
  trash: <Trash2 className="h-4 w-4" />,
  archive: <Archive className="h-4 w-4" />,
  notification: <Bell className="h-4 w-4" />,
  newsletter: <Newspaper className="h-4 w-4" />,
  snoozed: <Clock className="h-4 w-4" />,
  starred: <Star className="h-4 w-4" />,
  templates: <FileEdit className="h-4 w-4" />,
  outbox: <Send className="h-4 w-4" />,
}

interface SidebarProps {
  folders: Folder[]
  activeFolder: string
  onFolderClick: (folderName: string) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  accountEmail: string
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({
  folders,
  activeFolder,
  onFolderClick,
  searchQuery,
  onSearchChange,
  accountEmail,
  isOpen,
  onClose,
}: SidebarProps) {
  const getFolderIcon = (name: string) => {
    const key = name.toLowerCase()
    return FOLDER_ICONS[key] || <FolderIcon className="h-4 w-4" />
  }

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex h-full w-[280px] flex-col border-r border-border bg-card transition-transform duration-300 ease-out lg:static lg:z-auto lg:w-[260px] lg:translate-x-0 xl:w-[280px]",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      {/* Mobile header */}
      <div className="flex h-14 items-center justify-between border-b border-border px-4 lg:hidden">
        <span className="font-semibold">Menu</span>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="p-3 lg:pt-4">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/50 px-3 py-2.5 transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Folders */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Folders
        </p>
        <nav className="flex flex-col gap-0.5">
          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => onFolderClick(folder.name)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all active:scale-[0.98]",
                activeFolder.toLowerCase() === folder.name.toLowerCase()
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg",
                  activeFolder.toLowerCase() === folder.name.toLowerCase()
                    ? "bg-primary/15"
                    : "bg-secondary"
                )}
              >
                {getFolderIcon(folder.name)}
              </span>
              <span className="flex-1 truncate font-medium">{folder.name}</span>
              {folder.unread > 0 && (
                <span
                  className={cn(
                    "min-w-[22px] rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold",
                    activeFolder.toLowerCase() === folder.name.toLowerCase()
                      ? "bg-primary text-primary-foreground"
                      : "bg-destructive/15 text-destructive"
                  )}
                >
                  {folder.unread > 99 ? "99+" : folder.unread}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Footer */}
      <div className="border-t border-border p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Account
        </p>
        <p className="mt-1.5 truncate text-sm font-medium text-foreground/90">
          {accountEmail || "Not connected"}
        </p>
      </div>
    </aside>
  )
}
