// src/lib/utils.ts
const COLORS = [
  { bg: 'rgba(99,102,241,.15)',  fg: '#818cf8' },
  { bg: 'rgba(239,68,68,.15)',   fg: '#f87171' },
  { bg: 'rgba(34,197,94,.15)',   fg: '#4ade80' },
  { bg: 'rgba(249,115,22,.15)',  fg: '#fb923c' },
  { bg: 'rgba(234,179,8,.15)',   fg: '#facc15' },
  { bg: 'rgba(168,85,247,.15)',  fg: '#c084fc' },
  { bg: 'rgba(20,184,166,.15)',  fg: '#2dd4bf' },
  { bg: 'rgba(236,72,153,.15)',  fg: '#f472b6' },
]

export function avatarColor(str: string) {
  let h = 0
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) % COLORS.length
  return COLORS[h]
}

export function initials(str: string): string {
  return (str || '?').split(/[\s@]+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
}

export function senderName(addr: string): string {
  if (!addr) return ''
  if (addr.includes('<')) return addr.split('<')[0].trim().replace(/['"]/g, '')
  return addr.split('@')[0]
}

export function decodeHtml(str: string): string {
  if (typeof document === 'undefined') return str
  const el = document.createElement('textarea')
  el.innerHTML = str
  return el.value
}

export function formatTimeShort(ms: string | number | undefined): string {
  if (!ms) return ''
  const d = new Date(Number(ms)), now = new Date()
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (now.getTime() - d.getTime() < 7 * 864e5)
    return d.toLocaleDateString([], { weekday: 'short' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export function formatTimeLong(ms: string | number | undefined): string {
  if (!ms) return ''
  return new Date(Number(ms)).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })
}

export function timeAgo(ms: number): string {
  const s = Math.floor((Date.now() - ms) / 1000)
  if (s < 10)   return 'Just now'
  if (s < 60)   return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

export const FOLDER_ICONS: Record<string, string> = {
  inbox: '✉', sent: '↗', drafts: '✏', spam: '⚑', trash: '⊗',
  archive: '◫', notification: '◉', newsletter: '◈',
  templates: '◻', snoozed: '⏰', outbox: '↺', starred: '★',
}

export const FOLDER_ORDER = [
  'Inbox','Sent','Drafts','Spam','Trash','Templates',
  'Snoozed','Outbox','Notification','Newsletter','Archive',
]
