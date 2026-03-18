'use client'
import { useRef, useEffect } from 'react'
import { avatarColor, initials, senderName, decodeHtml, formatTimeLong } from '@/lib/utils'
import type { ZohoEmail } from '@/types'

interface Props {
  email:   ZohoEmail
  loading: boolean
  onClose: () => void
}

export default function DetailDrawer({ email, loading, onClose }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const fr = iframeRef.current
    if (!fr || !email.htmlBody) return
    fr.onload = () => {
      try {
        const h = fr.contentDocument?.body.scrollHeight
        if (h) fr.style.height = h + 40 + 'px'
      } catch { /* cross-origin */ }
    }
  }, [email.htmlBody])

  const from   = email.fromAddress || email.sender || ''
  const name   = senderName(from)
  const { bg, fg } = avatarColor(from)
  const subject = decodeHtml(email.subject || '(No Subject)')
  const date    = formatTimeLong(email.receivedTime || email.sentDateInGMT)

  return (
    <div className="fixed inset-y-0 right-0 top-12 w-[48vw] max-w-[720px] bg-zinc-900
      border-l border-zinc-700/60 flex flex-col z-50 animate-slide-right
      max-sm:w-full max-sm:max-w-none">

      {/* Header */}
      <div className="flex items-start gap-3 px-4 py-[14px] border-b border-zinc-800 shrink-0">
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-md border border-zinc-700 bg-zinc-800
            text-zinc-400 flex items-center justify-center text-sm shrink-0
            hover:border-red-500/50 hover:text-red-400 transition-colors cursor-pointer"
        >
          ✕
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-[15px] font-semibold text-zinc-100 leading-snug mb-[3px] break-words">
            {subject}
          </h2>
          <p className="text-[11px] text-zinc-600">{date}</p>
        </div>
      </div>

      {/* Sender */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800 bg-zinc-800/50 shrink-0">
        <div
          className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[12px] font-bold shrink-0"
          style={{ background: bg, color: fg }}
        >
          {initials(name || from)}
        </div>
        <div>
          <p className="text-[13px] font-semibold text-zinc-100 mb-[2px]">{name || from}</p>
          <p className="text-[11px] text-zinc-500">{from}</p>
          {email.toAddress && (
            <p className="text-[11px] text-zinc-600 mt-[2px]">To: {decodeHtml(email.toAddress)}</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-4 py-2 border-b border-zinc-800 shrink-0">
        {['↩ Reply', '→ Forward', '⬇ Download'].map(label => (
          <button key={label}
            className="px-3 py-[5px] rounded-md border border-zinc-700 bg-zinc-800
              text-zinc-400 text-[12px] font-medium
              hover:border-zinc-600 hover:text-zinc-200 transition-colors cursor-pointer">
            {label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5">
        {loading ? (
          <div className="space-y-2 pt-1">
            {[90, 75, 83, 0, 55, 78].map((w, i) => (
              w === 0
                ? <div key={i} className="h-4" />
                : <div key={i} className="skeleton h-[10px]" style={{ width: `${w}%` }} />
            ))}
          </div>
        ) : email.htmlBody ? (
          <iframe
            ref={iframeRef}
            srcDoc={email.htmlBody}
            className="w-full border-none min-h-[400px] bg-white rounded-lg"
            sandbox="allow-same-origin"
            title="Email content"
          />
        ) : (
          <p className="text-[13px] leading-relaxed text-zinc-300 whitespace-pre-wrap break-words">
            {email.content || email.body || email.summary || '(Empty)'}
          </p>
        )}
      </div>
    </div>
  )
}
