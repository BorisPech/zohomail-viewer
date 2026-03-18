/**
 * api/emails.js — ZohoMail Viewer API (Final v7)
 * Vercel Serverless Function
 *
 * Handles:
 *  - Token refresh with in-memory caching (avoids rate limits)
 *  - Folder listing with unread + total counts
 *  - Email listing per folder (server-side, 200/page)
 *  - Single message detail fetch
 *
 * Env vars required (Vercel → Settings → Environment Variables):
 *  ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN
 */

const CLIENT_ID     = process.env.ZOHO_CLIENT_ID;
const CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN;

// ── Token cache (survives multiple requests on same serverless instance) ──
let _token  = null;
let _expiry = 0;

async function getAccessToken() {
  const now = Date.now();
  if (_token && now < _expiry - 300_000) return _token; // 5-min buffer

  const res  = await fetch('https://accounts.zoho.com/oauth/v2/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
    }),
  });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error('Token refresh failed: ' + JSON.stringify(data));
  }
  _token  = data.access_token;
  _expiry = now + (data.expires_in || 3600) * 1000;
  return _token;
}

// ── Helper: extract primary email from string or array ──
function extractEmail(field) {
  if (!field) return '';
  if (typeof field === 'string') return field;
  if (Array.isArray(field)) {
    const p = field.find(e => e.isPrimary) || field[0];
    return p?.mailId || p?.emailAddress || '';
  }
  return '';
}

// ── Helper: zoho fetch with auth header ──
async function zFetch(url, token) {
  const r = await fetch(url, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  });
  return r.json();
}

// ── Main handler ──
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Validate env vars
  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    return res.status(500).json({
      error: 'Missing environment variables. Add ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN in Vercel Settings.',
    });
  }

  try {
    const token = await getAccessToken();

    // ── 1. Get Zoho account ──
    const accData = await zFetch('https://mail.zoho.com/api/accounts', token);
    const accounts = Array.isArray(accData?.data) ? accData.data
      : Array.isArray(accData) ? accData : [];

    if (!accounts.length) {
      return res.status(400).json({ error: 'No Zoho Mail account found.', raw: accData });
    }

    const acc          = accounts[0];
    const accountId    = acc.accountId || acc.id;
    const accountEmail = extractEmail(acc.emailAddress || acc.primaryEmailAddress || '');

    if (!accountId) {
      return res.status(400).json({ error: 'Cannot read accountId from Zoho response.', acc });
    }

    // ── 2. Single message body request ──
    const { msgId, folder: folderQuery, start: startQuery, limit: limitQuery } = req.query;

    if (msgId) {
      const d = await zFetch(
        `https://mail.zoho.com/api/accounts/${accountId}/messages/${msgId}`,
        token
      );
      return res.status(200).json({ message: d.data || d, accountEmail });
    }

    // ── 3. Get all folders ──
    const fData   = await zFetch(`https://mail.zoho.com/api/accounts/${accountId}/folders`, token);
    const rawFolders = Array.isArray(fData?.data) ? fData.data : [];

    const folderList = rawFolders.map(f => ({
      id:     f.folderId || f.id   || '',
      name:   f.folderName || f.name || '',
      unread: parseInt(f.unreadCount  || 0),
      total:  parseInt(f.messageCount || 0),
    }));

    // ── 4. Resolve target folder ──
    // Priority: ?folder= param → first folder with total>0 → first folder
    const requestedName = folderQuery || '';
    const start = Math.max(0, parseInt(startQuery) || 0);
    const limit = Math.min(200, Math.max(1, parseInt(limitQuery) || 200));

    let targetFolder = requestedName
      ? folderList.find(f => f.name.toLowerCase() === requestedName.toLowerCase())
      : null;

    if (!targetFolder) {
      // Auto-pick: folder with most emails (likely where all emails are)
      targetFolder = folderList
        .filter(f => f.total > 0)
        .sort((a, b) => b.total - a.total)[0]
        || folderList[0];
    }

    const folderName = targetFolder?.name || 'Inbox';
    const folderId   = targetFolder?.id;

    // ── 5. Fetch messages ──
    const msgUrl = folderId
      ? `https://mail.zoho.com/api/accounts/${accountId}/folders/${folderId}/messages?limit=${limit}&start=${start}&sortorder=false`
      : `https://mail.zoho.com/api/accounts/${accountId}/messages/view?folder=${encodeURIComponent(folderName)}&limit=${limit}&start=${start}&sortorder=false`;

    const mData  = await zFetch(msgUrl, token);
    const emails = Array.isArray(mData?.data) ? mData.data : [];

    return res.status(200).json({
      emails,
      folders:      folderList,
      accountEmail,
      activeFolder: folderName,
      activeFolderId: folderId,
      total:        targetFolder?.total || emails.length,
      fetched:      emails.length,
      start,
    });

  } catch (err) {
    console.error('[ZohoMail API Error]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
