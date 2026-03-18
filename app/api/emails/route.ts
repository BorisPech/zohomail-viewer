import { NextRequest, NextResponse } from "next/server"

const CLIENT_ID = process.env.ZOHO_CLIENT_ID
const CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET
const REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN

let _token: string | null = null
let _expiry = 0

async function getToken(): Promise<string> {
  if (_token && Date.now() < _expiry - 60_000) return _token

  const res = await fetch("https://accounts.zoho.com/oauth/v2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: CLIENT_ID || "",
      client_secret: CLIENT_SECRET || "",
      refresh_token: REFRESH_TOKEN || "",
    }),
  })

  const d = await res.json()
  if (!d.access_token) throw new Error("Token failed: " + JSON.stringify(d))

  _token = d.access_token as string
  _expiry = Date.now() + (d.expires_in || 3600) * 1000
  return _token as string
}

async function zFetch(url: string, token: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  })
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    throw new Error("Parse error: " + text.slice(0, 200))
  }
}

interface EmailAddress {
  isPrimary?: boolean
  mailId?: string
  emailAddress?: string
}

function primaryEmail(f: string | EmailAddress[] | null): string {
  if (!f) return ""
  if (typeof f === "string") return f
  if (Array.isArray(f)) {
    const p = f.find((x) => x.isPrimary) || f[0]
    return p?.mailId || p?.emailAddress || ""
  }
  return ""
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    return NextResponse.json({ error: "Missing env vars" }, { status: 500 })
  }

  try {
    const token = await getToken()

    // Account
    const accData = await zFetch("https://mail.zoho.com/api/accounts", token)
    const acc = (accData?.data || [])[0]
    if (!acc) {
      return NextResponse.json({ error: "No account", raw: accData }, { status: 400 })
    }

    const accountId = acc.accountId || acc.id
    const accountEmail = primaryEmail(acc.emailAddress || acc.primaryEmailAddress)
    if (!accountId) {
      return NextResponse.json({ error: "No accountId" }, { status: 400 })
    }

    // Single message
    const msgId = searchParams.get("msgId")
    if (msgId) {
      const d = await zFetch(
        `https://mail.zoho.com/api/accounts/${accountId}/messages/${msgId}`,
        token
      )
      return NextResponse.json({ message: d?.data || d, accountEmail })
    }

    // Folders
    const fData = await zFetch(
      `https://mail.zoho.com/api/accounts/${accountId}/folders`,
      token
    )
    const rawFolders = fData?.data || []
    const folders = rawFolders.map((f: Record<string, unknown>) => ({
      id: f.folderId || f.id || "",
      name: f.folderName || f.name || "",
      unread: parseInt(String(f.unreadCount || 0)),
      total: parseInt(String(f.messageCount || 0)),
    }))

    // Resolve folder
    const reqFolder = searchParams.get("folder") || ""
    const start = parseInt(searchParams.get("start") || "0")
    const PRIORITY = [
      "Notification",
      "Newsletter",
      "Inbox",
      "Archive",
      "Sent",
      "Spam",
      "Trash",
      "Drafts",
    ]

    let target = reqFolder
      ? folders.find(
          (f: { name: string }) => f.name.toLowerCase() === reqFolder.toLowerCase()
        )
      : null

    if (!target) {
      for (const name of PRIORITY) {
        const f = folders.find((x: { name: string }) => x.name === name)
        if (f) {
          target = f
          break
        }
      }
      if (!target) target = folders[0]
    }

    if (!target) {
      return NextResponse.json({ error: "No folder", folders }, { status: 400 })
    }

    // Fetch emails
    const msgData = await zFetch(
      `https://mail.zoho.com/api/accounts/${accountId}/messages/view?folderId=${target.id}&limit=200&start=${start}&sortorder=false`,
      token
    )
    const emails = Array.isArray(msgData?.data) ? msgData.data : []

    // Calculate real unread count
    const realUnread = emails.filter((m: { status: string }) => m.status === "0").length

    // Update folder unread counts
    const updatedFolders = folders.map((f: { id: string; unread: number }) => {
      if (f.id === target.id) return { ...f, unread: realUnread }
      return f
    })

    return NextResponse.json({
      emails,
      folders: updatedFolders,
      accountEmail,
      activeFolder: target.name,
      activeFolderId: target.id,
      total: emails.length,
      unread: realUnread,
      timestamp: Date.now(),
      start,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
