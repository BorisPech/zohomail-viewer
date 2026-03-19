export interface Email {
  messageId?: string;
  mid?: string;
  subject?: string;
  sender?: string;
  fromAddress?: string;
  toAddress?: string;
  receivedTime?: string | number;
  sentDateInGMT?: string | number;
  status?: string; // '0' = unread, '1' = read
  summary?: string;
  content?: string;
  htmlContent?: string;
  textContent?: string;
  // Security flag: true if email contains sensitive Zoho account security info
  restricted_security_email?: boolean;
}

export interface Folder {
  id: string;
  name: string;
  unread: number;
  total?: number;
}

export interface EmailsResponse {
  emails: Email[];
  folders: Folder[];
  accountEmail?: string;
  activeFolder: string;
  activeFolderId: string;
  total: number;
  unread: number;
  timestamp: number;
  start?: number;
  error?: string;
}

export interface CountsResponse {
  folders: Array<{ id: string; name: string; unread: number }>;
  activeUnread: number;
  activeTotal: number;
  msgIds: Array<{ id: string; ts: string | number }>;
  timestamp: number;
  error?: string;
}

export interface MessageResponse {
  message: Email;
  accountEmail?: string;
  error?: string;
}
