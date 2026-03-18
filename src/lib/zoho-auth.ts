// src/lib/zoho-auth.ts
let _token: string | null = null
let _expiry = 0

export async function getAccessToken(): Promise<string> {
  if (_token && Date.now() < _expiry - 60_000) return _token
  const res = await fetch('https://accounts.zoho.com/oauth/v2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      client_id:     process.env.ZOHO_CLIENT_ID!,
      client_secret: process.env.ZOHO_CLIENT_SECRET!,
      refresh_token: process.env.ZOHO_REFRESH_TOKEN!,
    }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error('Token failed: ' + JSON.stringify(data))
  _token  = data.access_token as string
  _expiry = Date.now() + (data.expires_in || 3600) * 1000
  return _token
}

export async function zohoFetch(url: string, token: string) {
  const res  = await fetch(url, { headers: { Authorization: `Zoho-oauthtoken ${token}` } })
  const text = await res.text()
  try { return JSON.parse(text) }
  catch { throw new Error(`Parse error from ${url.split('?')[0]}: ${text.slice(0, 200)}`) }
}

export function extractPrimaryEmail(field: unknown): string {
  if (!field) return ''
  if (typeof field === 'string') return field
  if (Array.isArray(field)) {
    const p = (field as Record<string, unknown>[]).find(e => e.isPrimary) || field[0]
    return String(p?.mailId || p?.emailAddress || '')
  }
  return ''
}

export function checkEnvVars(): string | null {
  if (!process.env.ZOHO_CLIENT_ID)     return 'Missing ZOHO_CLIENT_ID'
  if (!process.env.ZOHO_CLIENT_SECRET) return 'Missing ZOHO_CLIENT_SECRET'
  if (!process.env.ZOHO_REFRESH_TOKEN) return 'Missing ZOHO_REFRESH_TOKEN'
  return null
}
