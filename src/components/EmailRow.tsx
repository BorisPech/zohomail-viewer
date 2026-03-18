'use client'
import { avatarColor, initials, senderName, decodeHtml, formatTimeShort } from '@/lib/utils'
import type { ZohoEmail } from '@/types'

interface Props {
  email:    ZohoEmail
  selected: boolean
  isNew:    boolean
  onClick:  () => void
}

export default function EmailRow({ email, selected, isNew, onClick }: Props) {
  const from          = email.fromAddress || email.sender || ''
  const name          = senderName(from)
  const { bg, fg }    = avatarColor(from)
  const unread        = email.status === '0'
  const subject       = decodeHtml(email.subject || '(No Subject)')
  const time          = formatTimeShort(email.receivedTime || email.sentDateInGMT)

  return (
    <div
      onClick={onClick}
      className={`
        grid cursor-pointer relative transition-colors duration-100
        border-b border-zinc-800/70
        ${selected            ? 'bg-zinc-800'                : ''}
        ${unread && !selected ? 'bg-indigo-500/[0.04]'       : ''}
        ${isNew               ? 'animate-new-glow'           : ''}
        ${!selected           ? 'hover:bg-zinc-900'          : ''}
      `}
      style={{ gridTemplateColumns: '48px 1fr 64px', gap: '10px', padding: '12px 16px', alignItems: 'start' }}
    >
      {/* Unread bar */}
      {unread && <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-indigo-500 rounded-r-sm" />}

      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-[10px] flex items-center justify-center text-[13px] font-semibold shrink-0"
        style={{ background: bg, color: fg }}
      >
        {initials(name || from)}
      </div>

      {/* Content */}
      <div className="min-w-0">
        <p className={`text-[13px] mb-[3px] truncate ${unread ? 'font-semibold text-zinc-100' : 'font-normal text-zinc-400'}`}>
          {name || from || 'Unknown'}
        </p>
        <p className={`text-[12px] mb-[3px] truncate ${unread ? 'text-zinc-200 font-medium' : 'text-zinc-600'}`}>
          {subject}
        </p>
        <p className="text-[11.5px] text-zinc-600 truncate">{email.summary || ''}</p>
      </div>

      {/* Meta */}
      <div className="flex flex-col items-end gap-[5px] pt-px">
        <span className="text-[11px] text-zinc-600 whitespace-nowrap">{time}</span>
        {unread && <span className="w-[7px] h-[7px] rounded-full bg-indigo-500" />}
      </div>
    </div>
  )
}
