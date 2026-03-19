"use client";

import { useState, useMemo } from "react";
import {
  Inbox,
  Send,
  FileEdit,
  AlertTriangle,
  Trash2,
  Archive,
  Bell,
  Newspaper,
  Star,
  Folder,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Folder as FolderType } from "@/lib/types";

const FOLDER_ICONS: Record<string, React.ElementType> = {
  inbox: Inbox,
  sent: Send,
  drafts: FileEdit,
  spam: AlertTriangle,
  trash: Trash2,
  archive: Archive,
  notification: Bell,
  newsletter: Newspaper,
  starred: Star,
};

const FOLDER_ORDER = [
  "Inbox",
  "Sent",
  "Drafts",
  "Spam",
  "Trash",
  "Templates",
  "Snoozed",
  "Outbox",
  "Notification",
  "Newsletter",
  "Archive",
];

interface SidebarProps {
  folders: FolderType[];
  activeFolder: string;
  accountEmail?: string;
  onFolderChange: (folder: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({
  folders,
  activeFolder,
  accountEmail,
  onFolderChange,
  isOpen,
  onClose,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const sortedFolders = useMemo(() => {
    const map = new Map(folders.map((f) => [f.name, f]));
    const sorted: FolderType[] = [];

    FOLDER_ORDER.forEach((name) => {
      const folder = map.get(name);
      if (folder) sorted.push(folder);
    });

    folders.forEach((f) => {
      if (!FOLDER_ORDER.includes(f.name)) sorted.push(f);
    });

    if (searchQuery) {
      return sorted.filter((f) =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return sorted;
  }, [folders, searchQuery]);

  const handleFolderClick = (folderName: string) => {
    onFolderChange(folderName);
    onClose();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 top-14 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "bg-card border-r border-border flex flex-col overflow-hidden transition-transform duration-300",
          "fixed top-14 left-0 bottom-0 w-64 z-50 lg:relative lg:top-0 lg:z-auto lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Search */}
        <div className="p-3 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background border-border"
            />
          </div>
        </div>

        {/* Folders */}
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">
            Folders
          </div>
          <div className="space-y-0.5">
            {sortedFolders.map((folder) => {
              const IconComponent =
                FOLDER_ICONS[folder.name.toLowerCase()] || Folder;
              const isActive = folder.name === activeFolder;

              return (
                <button
                  key={folder.id}
                  onClick={() => handleFolderClick(folder.name)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors text-left",
                    isActive
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  <IconComponent className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">{folder.name}</span>
                  {folder.unread > 0 && (
                    <span
                      className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
                        isActive
                          ? "bg-blue-600 text-white"
                          : "bg-blue-600 text-white"
                      )}
                    >
                      {folder.unread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border shrink-0">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Account
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {accountEmail || "-"}
          </div>
        </div>
      </aside>
    </>
  );
}
