'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Sidebar      from '@/components/Sidebar'
import EmailRow     from '@/components/EmailRow'
import DetailDrawer from '@/components/DetailDrawer'
import { timeAgo, FOLDER_ORDER } from '@/lib/utils'
import type { ZohoEmail, ZohoFolder, EmailsResponse, CountsResponse, MessageResponse } from '@/types'

const POLL_MS = 15_000

export default function Page() {
  const [emails,         setEmails]         = useState<ZohoEmail[]>([])
  const [folders,        setFolders]        = useState<ZohoFolder[]>([])
  const [activeFolder,   setActiveFolder]   = useState('')
  const [activeFolderId, setActiveFolderId] = useState('')
  const [totalCount,     setTotalCount]     = useState(0)
  const [unreadCount,    setUnreadCount]    = useState(0)
  const [lastSync,       setLastSync]       = useState(0)
  const [query,          setQuery]          = useState('')
  const [loading,        setLoading]        = useState(true)
  const [loadMsg,        setLoadMsg]        = useState('Loading mailbox...')
  const [syncing,        setSyncing]        = useState(false)
  const [newCount,       setNewCount]       = useState(0)
  const [selected,       setSelected]       = useState<ZohoEmail | null>(null)
  const [bodyLoading,    setBodyLoading]    = useState(false)
  const [newIds,         setNewIds]         = useState(new Set<string>())
  const [toast,          setToast]          = useState<{ msg: string; err: boolean } | null>(null)

  const knownIds       = useRef(new Set<string>())
  const pollTimer      = useRef<ReturnType<typeof setInterval> | null>(null)
  const pending        = useRef(0)
  const activeFolderRef    = useRef('')
  const activeFolderIdRef  = useRef('')
  const emailsRef          = useRef<ZohoEmail[]>([])

  // Keep refs in sync
  useEffect(() => { activeFolderRef.current   = activeFolder   }, [activeFolder])
  useEffect(() => { activeFolderIdRef.current = activeFolderId }, [activeFolderId])
  useEffect(() => { emailsRef.current         = emails         }, [emails])

  const showToast = useCallback((msg: string, err = false) => {
    setToast({ msg, err })
    setTimeout(() => setToast(null), 4000)
  }, [])

  const load = useCallback(async (folder = '', silent = false) => {
    if (!silent) {
      setLoading(true)
      setLoadMsg(folder ? `Opening ${folder}...` : 'Loading mailbox...')
      setSelected(null)
      setNewCount(0)
      pending.current = 0
      setNewIds(new Set())
    }
    try {
      const url  = folder
        ? `/api/emails?folder=${encodeURIComponent(folder)}&limit=200`
        : '/api/emails?limit=200'
      const res  = await fetch(url)
      const data = await res.json() as EmailsResponse
      if (data.error) throw new Error(data.error)

      const mails = Array.isArray(data.emails) ? data.emails : []
      setEmails(mails)
      setFolders(Array.isArray(data.folders) ? data.folders : [])
      setActiveFolder(data.activeFolder || folder)
      setActiveFolderId(data.activeFolderId || '')
      setTotalCount(mails.length)
      setUnreadCount(mails.filter(m => m.status === '0').length)
      setLastSync(data.timestamp || Date.now())
      knownIds.current = new Set(mails.map(m => m.messageId || m.mid || ''))
      if (!silent) setQuery('')
      setLoading(false)
    } catch (e) {
      setLoading(false)
      showToast(e instanceof Error ? e.message : 'Failed to load', true)
    }
  }, [showToast])

  // Poll — uses refs to avoid stale closure without needing poll in deps
  const poll = useCallback(async () => {
    const folderId = activeFolderIdRef.current
    const folder   = activeFolderRef.current
    const curEmails = emailsRef.current

    setSyncing(true)
    try {
      const qs   = folderId ? `?counts=1&activeId=${encodeURIComponent(folderId)}` : '?counts=1'
      const res  = await fetch(`/api/emails${qs}`)
      const data = await res.json() as CountsResponse
      if (data.error) throw new Error(data.error)

      setLastSync(data.timestamp || Date.now())

      const incoming = Array.isArray(data.msgIds) ? data.msgIds : []
      const brandNew = incoming.filter(item => !knownIds.current.has(item.id))

      if (brandNew.length > 0) {
        pending.current += brandNew.length
        setNewCount(pending.current)
        setNewIds(prev => new Set([...prev, ...brandNew.map(b => b.id)]))

        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          const n = new Notification(
            `${brandNew.length} new email${brandNew.length > 1 ? 's' : ''} — Zoho Mail`,
            { body: `New messages in ${folder}` }
          )
          setTimeout(() => n.close(), 5000)
          n.onclick = () => { window.focus(); n.close() }
        }
      }

      setUnreadCount(data.activeUnread ?? curEmails.filter(m => m.status === '0').length)
      setTotalCount(data.activeTotal  ?? curEmails.length)

      if (Array.isArray(data.folders)) {
        setFolders(prev => prev.map(f => {
          const u = data.folders.find(x => x.id === f.id)
          return u ? { ...f, unread: u.unread } : f
        }))
      }
    } catch {
      // silent poll failure — no toast
    } finally {
      setSyncing(false)
    }
  }, []) // empty deps — uses refs

  // Start polling
  useEffect(() => {
    if (pollTimer.current) clearInterval(pollTimer.current)
    pollTimer.current = setInterval(poll, POLL_MS)
    return () => { if (pollTimer.current) clearInterval(pollTimer.current) }
  }, [poll])

  const openEmail = useCallback(async (email: ZohoEmail) => {
    const wasUnread = email.status === '0'
    const mid       = email.messageId || email.mid || ''

    setEmails(prev => prev.map(m =>
      (m.messageId || m.mid) === mid ? { ...m, status: '1' } : m
    ))
    if (wasUnread) setUnreadCount(p => Math.max(0, p - 1))
    setSelected({ ...email, status: '1' })
    setBodyLoading(true)
    if (mid) knownIds.current.add(mid)

    if (wasUnread && mid) {
      const fid = activeFolderIdRef.current || email.folderId || ''
      fetch(`/api/markread?msgId=${encodeURIComponent(mid)}&folderId=${encodeURIComponent(fid)}`, {
        method: 'POST',
      }).catch(() => {})
    }

    if (!mid) { setBodyLoading(false); return }

    try {
      const res  = await fetch(`/api/emails?msgId=${encodeURIComponent(mid)}`)
      const data = await res.json() as MessageResponse
      if (data.error) throw new Error(data.error)
      const msg  = data.message
      setSelected(prev => prev ? {
        ...prev,
        htmlBody: msg.htmlBody,
        content:  msg.content,
        body:     msg.body,
      } : null)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to load email', true)
    } finally {
      setBodyLoading(false)
    }
  }, [showToast])

  // Init
  useEffect(() => {
    load('')
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync time ticker
  useEffect(() => {
    const t = setInterval(() => setLastSync(p => p ? p : p), 30_000)
    return () => clearInterval(t)
  }, [])

  // Filtered list
  const filtered = query
    ? emails.filter(m => {
        const q    = query.toLowerCase()
        let subj   = m.subject || ''
        if (typeof document !== 'undefined') {
          const el = document.createElement('textarea')
          el.innerHTML = m.subject || ''
          subj = el.value
        }
        return (
          subj.toLowerCase().includes(q) ||
          (m.fromAddress || m.sender || '').toLowerCase().includes(q) ||
          (m.summary || '').toLowerCase().includes(q)
        )
      })
    : emails

  // Sorted folders for sidebar
  const folderMap: Record<string, ZohoFolder> = {}
  folders.forEach(f => { folderMap[f.name] = f })
  const sortedFolders: ZohoFolder[] = [
    ...FOLDER_ORDER.filter(n => folderMap[n]).map(n => folderMap[n]!),
    ...folders.filter(f => !FOLDER_ORDER.includes(f.name)),
  ]

  return (
    <div className="flex flex-col h-screen bg-zinc-950">

      {/* TOPBAR */}
      <header className="h-12 flex items-center gap-3 px-4 bg-zinc-900 border-b border-zinc-800 z-50 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-[26px] h-[26px] rounded-[6px] bg-indigo-500 flex items-center justify-center
            text-white text-[13px] font-bold
            shadow-[0_0_0_1px_rgba(99,102,241,.4),0_2px_8px_rgba(99,102,241,.2)] shrink-0">
            M
          </div>
          <span className="text-[14px] font-semibold tracking-tight">Zoho Mail</span>
        </div>

        <div className="flex-1" />

        {newCount > 0 && (
          <button
            onClick={() => { setNewCount(0); pending.current = 0; setNewIds(new Set()); load(activeFolder) }}
            className="flex items-center gap-2 px-3 py-1 rounded-full
              border border-indigo-500/35 bg-indigo-500/[0.12] text-indigo-300 text-[12px]
              cursor-pointer animate-pop hover:bg-indigo-500/20 transition-colors"
          >
            <span>✦</span>
            <span>{newCount} new message{newCount > 1 ? 's' : ''}</span>
          </button>
        )}

        <div className={`flex items-center gap-[5px] px-[10px] py-1 rounded-full border text-[11px] transition-all
          ${syncing
            ? 'border-indigo-500/25 bg-indigo-500/[0.07] text-indigo-400'
            : 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-400'}`}>
          <span className={`w-[5px] h-[5px] rounded-full ${
            syncing
              ? 'bg-indigo-400 animate-spin-slow'
              : 'bg-emerald-400 shadow-[0_0_0_2px_rgba(34,197,94,.2)] animate-breathe'
          }`} />
          <span>{syncing ? 'Syncing...' : 'Live'}</span>
        </div>

        <button
          onClick={() => load(activeFolder)}
          className="px-3 py-[6px] rounded-[10px] bg-zinc-800 border border-zinc-700
            text-zinc-400 text-[12px] hover:border-zinc-600 hover:text-zinc-200
            transition-colors cursor-pointer"
        >
          ↻
        </button>
      </header>

      {/* BODY */}
      <div className="flex-1 overflow-hidden" style={{ display: 'grid', gridTemplateColumns: '220px 1fr' }}>

        <Sidebar
          folders={sortedFolders}
          activeFolder={activeFolder}
          onSelect={name => { setNewCount(0); setNewIds(new Set()); load(name) }}
        />

        <main className="flex flex-col overflow-hidden bg-zinc-950">

          {/* Toolbar */}
          <div className="flex items-center gap-2 px-4 py-[10px] bg-zinc-900 border-b border-zinc-800 shrink-0">
            <div className="flex-1 flex items-center gap-2 bg-zinc-800 border border-zinc-700/60
              rounded-[10px] px-3 py-2 focus-within:border-indigo-500/60 transition-colors">
              <span className="text-zinc-600 text-[14px] shrink-0">⌕</span>
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search sender, subject or content..."
                className="flex-1 bg-transparent border-none outline-none text-[13px] text-zinc-200
                  placeholder:text-zinc-600"
              />
              {query && (
                <button onClick={() => setQuery('')}
                  className="text-zinc-600 hover:text-zinc-400 text-[11px] cursor-pointer">✕</button>
              )}
            </div>
            <button
              onClick={() => load(activeFolder)}
              className="flex items-center gap-1 px-3 py-[7px] rounded-[10px] bg-zinc-800
                border border-zinc-700/60 text-zinc-400 text-[12px] font-medium
                hover:border-zinc-600 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              ↻ Refresh
            </button>
          </div>

          {/* Stats */}
          <div className="flex border-b border-zinc-800 bg-zinc-900 shrink-0">
            {[
              { icon: '✉', bg: 'bg-indigo-500/10',  color: 'text-indigo-400',  val: String(totalCount),  lbl: 'Total',     sm: false },
              { icon: '◉', bg: 'bg-red-500/10',      color: 'text-red-400',     val: String(unreadCount), lbl: 'Unread',    sm: false },
              { icon: '⏱', bg: 'bg-emerald-500/10',  color: 'text-emerald-400', val: lastSync ? timeAgo(lastSync) : '—', lbl: 'Last sync', sm: true },
            ].map(({ icon, bg, color, val, lbl, sm }) => (
              <div key={lbl} className="flex-1 px-4 py-[10px] flex items-center gap-[10px] [&+&]:border-l [&+&]:border-zinc-800">
                <div className={`w-8 h-8 rounded-md ${bg} ${color} flex items-center justify-center text-[14px] shrink-0`}>
                  {icon}
                </div>
                <div>
                  <div className={`font-bold leading-none tracking-tight ${sm ? 'text-[12px] pt-1' : 'text-[20px]'}`}>
                    {val}
                  </div>
                  <div className="text-[11px] text-zinc-600 mt-[2px]">{lbl}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Count bar */}
          <div className="flex items-center justify-between px-4 py-[7px] border-b border-zinc-800 bg-zinc-900 shrink-0">
            <span className="text-[12px] text-zinc-500">
              Showing <span className="text-zinc-300 font-semibold">{filtered.length}</span> messages
            </span>
            {query && <span className="text-[11px] text-zinc-600">filtered from {emails.length}</span>}
          </div>

          {/* Email list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-zinc-700 border-t-indigo-500 animate-spin-slow" />
                <span className="text-[13px] text-zinc-500">{loadMsg}</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-center px-10">
                <div className="w-[52px] h-[52px] rounded-[14px] bg-zinc-800 border border-zinc-700
                  flex items-center justify-center text-[22px] mb-4">
                  {query ? '🔍' : '📭'}
                </div>
                <p className="text-[15px] font-semibold mb-2">{query ? 'No results' : 'Empty folder'}</p>
                <p className="text-[13px] text-zinc-600">{query ? 'Try different keywords' : 'No messages here'}</p>
              </div>
            ) : (
              filtered.map(email => {
                const id = email.messageId || email.mid || ''
                return (
                  <EmailRow
                    key={id}
                    email={email}
                    selected={!!(selected && (selected.messageId || selected.mid) === id)}
                    isNew={newIds.has(id)}
                    onClick={() => openEmail(email)}
                  />
                )
              })
            )}
          </div>

        </main>
      </div>

      {selected && (
        <DetailDrawer
          email={selected}
          loading={bodyLoading}
          onClose={() => setSelected(null)}
        />
      )}

      {toast && (
        <div className={`fixed bottom-[18px] right-[18px] z-[999] px-4 py-3 rounded-[10px]
          bg-zinc-800 border border-zinc-700 text-[12px] text-zinc-100
          shadow-[0_8px_24px_rgba(0,0,0,.4)] animate-fade-up
          border-l-[3px] ${toast.err ? 'border-l-red-500' : 'border-l-emerald-500'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
