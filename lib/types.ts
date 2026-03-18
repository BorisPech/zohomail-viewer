export interface Email {
  messageId: string
  mid?: string
  subject: string
  fromAddress: string
  sender?: string
  toAddress?: string
  receivedTime: number
  sentDateInGMT?: number
  status: string
  summary?: string
  content?: string
  folderId?: string
  hasAttachment?: boolean
}

export interface Folder {
  id: string
  name: string
  unread: number
  total: number
}

export interface EmailsResponse {
  emails: Email[]
  folders: Folder[]
  accountEmail: string
  activeFolder: string
  activeFolderId: string
  total: number
  unread: number
  timestamp: number
  start: number
  error?: string
}

export interface MessageResponse {
  message: Email
  accountEmail: string
  error?: string
}
