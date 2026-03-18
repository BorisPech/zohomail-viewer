// src/app/api/markread/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAccessToken, zohoFetch, checkEnvVars } from '@/lib/zoho-auth'

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST,OPTIONS' } })
}

export async function POST(req: NextRequest) {
  const p        = req.nextUrl.searchParams
  const msgId    = p.get('msgId')
  const folderId = p.get('folderId')

  if (!msgId || !folderId) return NextResponse.json({ error: 'msgId and folderId required' }, { status: 400 })

  const envErr = checkEnvVars()
  if (envErr) return NextResponse.json({ error: envErr }, { status: 500 })

  try {
    const token   = await getAccessToken()
    const accData = await zohoFetch('https://mail.zoho.com/api/accounts', token)
    const acc     = (accData?.data ?? [])[0] as Record<string,unknown>
    if (!acc) return NextResponse.json({ error: 'No account' }, { status: 400 })
    const accountId = String(acc.accountId || acc.id || '')

    const res = await fetch(`https://mail.zoho.com/api/accounts/${accountId}/updatemessage`, {
      method: 'PUT',
      headers: { Authorization: `Zoho-oauthtoken ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'markAsRead', messageId: [msgId], folderId }),
    })
    const result = await res.json()
    return NextResponse.json({ ok: true, result })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}
