export interface ZohoEmail {
  messageId: string
  mid?: string
  subject: string
  fromAddress: string
  toAddress: string
  sender?: string
  summary: string
  receivedTime: string
  sentDateInGMT?: string
  status: '0' | '1'
  folderId: string
  hasAttachment: string
  size: string
  htmlBody?: string
  content?: string
  body?: string
}

export interface ZohoFolder {
  id: string
  name: string
  unread: number
  total: number
}

export interface EmailsResponse {
  emails: ZohoEmail[]
  folders: ZohoFolder[]
  accountEmail: string
  activeFolder: string
  activeFolderId: string
  total: number
  unread: number
  timestamp: number
  start: number
  error?: string
}

export interface CountsResponse {
  folders: Array<{ id: string; name: string; unread: number }>
  activeUnread: number
  activeTotal: number
  msgIds: Array<{ id: string; ts: string }>
  timestamp: number
  error?: string
}

export interface MessageResponse {
  message: ZohoEmail
  accountEmail: string
  error?: string
}
