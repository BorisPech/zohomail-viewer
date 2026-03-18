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
} from "lucide-react"

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
}

interface SidebarProps {
  folders: Folder[]
  activeFolder: string
  onFolderClick: (folderName: string) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  accountEmail: string
}

export function Sidebar({
  folders,
  activeFolder,
  onFolderClick,
  searchQuery,
  onSearchChange,
  accountEmail,
}: SidebarProps) {
  const getFolderIcon = (name: string) => {
    const key = name.toLowerCase()
    return FOLDER_ICONS[key] || <FolderIcon className="h-4 w-4" />
  }

  return (
    <aside className="flex h-full w-[240px] flex-col border-r border-border bg-card">
      {/* Search */}
      <div className="p-3">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-2 transition-colors focus-within:border-primary">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Folders */}
      <div className="flex-1 overflow-y-auto px-2">
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Folders
        </p>
        <nav className="flex flex-col gap-0.5">
          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => onFolderClick(folder.name)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-all",
                activeFolder.toLowerCase() === folder.name.toLowerCase()
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent"
              )}
            >
              <span className="opacity-70">{getFolderIcon(folder.name)}</span>
              <span className="flex-1 truncate font-medium">{folder.name}</span>
              {folder.unread > 0 && (
                <span className="min-w-[20px] rounded-full bg-primary px-1.5 py-0.5 text-center text-[10px] font-bold text-primary-foreground">
                  {folder.unread}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Footer */}
      <div className="border-t border-border p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Account
        </p>
        <p className="mt-1 truncate text-xs text-foreground/80">
          {accountEmail || "Not connected"}
        </p>
      </div>
    </aside>
  )
}
