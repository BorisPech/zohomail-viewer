// src/app/api/emails/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAccessToken, zohoFetch, extractPrimaryEmail, checkEnvVars } from '@/lib/zoho-auth'
import type { ZohoFolder } from '@/types'

const PRIORITY = ['Notification','Newsletter','Inbox','Archive','Sent','Spam','Trash','Drafts']

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: cors })
}

export async function GET(req: NextRequest) {
  const err = checkEnvVars()
  if (err) return NextResponse.json({ error: err }, { status: 500, headers: cors })

  try {
    const p     = req.nextUrl.searchParams
    const token = await getAccessToken()

    // Account
    const accData = await zohoFetch('https://mail.zoho.com/api/accounts', token)
    const acc     = (accData?.data ?? [])[0] as Record<string,unknown>
    if (!acc) return NextResponse.json({ error: 'No account', raw: accData }, { status: 400, headers: cors })
    const accountId    = String(acc.accountId || acc.id || '')
    const accountEmail = extractPrimaryEmail(acc.emailAddress || acc.primaryEmailAddress)
    if (!accountId) return NextResponse.json({ error: 'No accountId' }, { status: 400, headers: cors })

    // Single message
    const msgId = p.get('msgId')
    if (msgId) {
      const d = await zohoFetch(`https://mail.zoho.com/api/accounts/${accountId}/messages/${msgId}`, token)
      return NextResponse.json({ message: d?.data ?? d, accountEmail }, { headers: cors })
    }

    // Fast counts poll
    if (p.get('counts') === '1') {
      const fData    = await zohoFetch(`https://mail.zoho.com/api/accounts/${accountId}/folders`, token)
      const rawF     = (fData?.data ?? []) as Record<string,unknown>[]
      const activeId = p.get('activeId') || ''
      let activeUnread = 0, activeTotal = 0
      let msgIds: { id: string; ts: string }[] = []

      if (activeId) {
        const md   = await zohoFetch(
          `https://mail.zoho.com/api/accounts/${accountId}/messages/view?folderId=${activeId}&limit=200&sortorder=false`, token
        )
        const msgs = Array.isArray(md?.data) ? md.data as Record<string,unknown>[] : []
        activeUnread = msgs.filter(m => m.status === '0').length
        activeTotal  = msgs.length
        msgIds = msgs.map(m => ({ id: String(m.messageId || m.mid || ''), ts: String(m.receivedTime || m.sentDateInGMT || '') }))
      }

      return NextResponse.json({
        folders: rawF.map(f => ({ id: String(f.folderId||f.id||''), name: String(f.folderName||f.name||''), unread: parseInt(String(f.unreadCount||0)) })),
        activeUnread, activeTotal, msgIds, timestamp: Date.now(),
      }, { headers: cors })
    }

    // Debug
    if (p.get('debug') === '1') {
      const fData = await zohoFetch(`https://mail.zoho.com/api/accounts/${accountId}/folders`, token)
      const rawF  = (fData?.data ?? []) as Record<string,unknown>[]
      const tests: Record<string,unknown> = {}
      for (const f of rawF.slice(0,3)) {
        const fid  = String(f.folderId||f.id||'')
        const name = String(f.folderName||f.name||'')
        const r    = await zohoFetch(`https://mail.zoho.com/api/accounts/${accountId}/messages/view?folderId=${fid}&limit=2`, token)
        tests[name] = { folderId: fid, fetched: (r?.data??[]).length, status: r?.status }
      }
      return NextResponse.json({ accountId, accountEmail, tests }, { headers: cors })
    }

    // Folders
    const fData      = await zohoFetch(`https://mail.zoho.com/api/accounts/${accountId}/folders`, token)
    const rawFolders = (fData?.data ?? []) as Record<string,unknown>[]
    const folders: ZohoFolder[] = rawFolders.map(f => ({
      id:     String(f.folderId||f.id||''),
      name:   String(f.folderName||f.name||''),
      unread: parseInt(String(f.unreadCount||0)),
      total:  parseInt(String(f.messageCount||0)),
    }))

    // Target folder
    const reqFolder = p.get('folder') || ''
    const start     = parseInt(p.get('start') || '0')
    let target: ZohoFolder | undefined = reqFolder
      ? folders.find(f => f.name.toLowerCase() === reqFolder.toLowerCase())
      : undefined

    if (!target) {
      for (const name of PRIORITY) {
        const f = folders.find(x => x.name === name)
        if (f) { target = f; break }
      }
      if (!target) target = folders[0]
    }
    if (!target) return NextResponse.json({ error: 'No folder', folders }, { status: 400, headers: cors })

    // Fetch emails — CONFIRMED: ?folderId= format works
    const md     = await zohoFetch(
      `https://mail.zoho.com/api/accounts/${accountId}/messages/view?folderId=${target.id}&limit=200&start=${start}&sortorder=false`, token
    )
    const emails     = Array.isArray(md?.data) ? md.data : []
    const realUnread = (emails as Record<string,unknown>[]).filter(m => m.status === '0').length

    return NextResponse.json({
      emails,
      folders: folders.map(f => f.id === target!.id ? { ...f, unread: realUnread } : f),
      accountEmail,
      activeFolder:   target.name,
      activeFolderId: target.id,
      total:          emails.length,
      unread:         realUnread,
      timestamp:      Date.now(),
      start,
    }, { headers: cors })

  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500, headers: cors })
  }
}
