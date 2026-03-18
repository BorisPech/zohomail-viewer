/**
 * ZohoMail Viewer — Serverless API
 * Endpoints:
 *   GET /api/emails              → list emails (auto-detect folder)
 *   GET /api/emails?folder=X     → list emails in folder X
 *   GET /api/emails?msgId=X      → get full message body
 *   GET /api/emails?debug=1      → show raw Zoho responses for diagnosis
 */

const CLIENT_ID     = process.env.ZOHO_CLIENT_ID;
const CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN;

// ── Token cache ──
let _token = null, _expiry = 0;

async function getToken() {
  if (_token && Date.now() < _expiry - 60_000) return _token;

  const res = await fetch('https://accounts.zoho.com/oauth/v2/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      grant_type:    'refresh_token',
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
    }),
  });

  const data = await res.json();
  if (!data.access_token) {
    throw new Error('Token refresh failed — ' + JSON.stringify(data));
  }

  _token  = data.access_token;
  _expiry = Date.now() + (data.expires_in || 3600) * 1000;
  return _token;
}

// ── Zoho API fetch ──
async function zFetch(url, token) {
  const res  = await fetch(url, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`JSON parse error from ${url}: ${text.slice(0, 200)}`);
  }
}

// ── Extract primary email from string or array ──
function primaryEmail(field) {
  if (!field)                return '';
  if (typeof field === 'string') return field;
  if (Array.isArray(field))  {
    const p = field.find(e => e.isPrimary) || field[0];
    return p?.mailId || p?.emailAddress || '';
  }
  return String(field);
}

// ─────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── Env check ──
  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    return res.status(500).json({
      error: 'Missing Vercel environment variables',
      missing: {
        ZOHO_CLIENT_ID:     !CLIENT_ID,
        ZOHO_CLIENT_SECRET: !CLIENT_SECRET,
        ZOHO_REFRESH_TOKEN: !REFRESH_TOKEN,
      },
    });
  }

  try {
    const token = await getToken();

    // ── Get account ──
    const accResp = await zFetch('https://mail.zoho.com/api/accounts', token);
    const accounts = Array.isArray(accResp?.data)
      ? accResp.data
      : Array.isArray(accResp) ? accResp : [];

    if (!accounts.length) {
      return res.status(400).json({ error: 'No Zoho Mail accounts found', raw: accResp });
    }

    const account      = accounts[0];
    const accountId    = account.accountId || account.id;
    const accountEmail = primaryEmail(account.emailAddress || account.primaryEmailAddress);

    if (!accountId) {
      return res.status(400).json({ error: 'Cannot read accountId', account });
    }

    // ── DEBUG endpoint — shows everything raw ──
    if (req.query.debug === '1') {
      const folderResp = await zFetch(
        `https://mail.zoho.com/api/accounts/${accountId}/folders`, token
      );
      const folders = folderResp?.data || [];

      // Test fetch 3 emails from each folder
      const tests = {};
      for (const f of folders) {
        const fid  = f.folderId || f.id;
        const name = f.folderName || f.name;
        if (!fid) continue;
        const r = await zFetch(
          `https://mail.zoho.com/api/accounts/${accountId}/folders/${fid}/messages?limit=3&sortorder=false`,
          token
        );
        tests[name] = {
          folderId:     fid,
          messageCount: f.messageCount,
          unreadCount:  f.unreadCount,
          fetched:      (r?.data || []).length,
          status:       r?.status,
        };
      }

      return res.status(200).json({
        accountId, accountEmail,
        foldersRaw: folders.map(f => ({
          name:  f.folderName || f.name,
          id:    f.folderId   || f.id,
          total: f.messageCount,
          unread: f.unreadCount,
        })),
        emailTests: tests,
      });
    }

    // ── Single message body ──
    if (req.query.msgId) {
      const r = await zFetch(
        `https://mail.zoho.com/api/accounts/${accountId}/messages/${req.query.msgId}`,
        token
      );
      return res.status(200).json({ message: r?.data || r, accountEmail });
    }

    // ── Get folders ──
    const folderResp = await zFetch(
      `https://mail.zoho.com/api/accounts/${accountId}/folders`, token
    );
    const rawFolders = Array.isArray(folderResp?.data) ? folderResp.data : [];

    const folders = rawFolders.map(f => ({
      id:     f.folderId    || f.id   || '',
      name:   f.folderName  || f.name || '',
      unread: parseInt(f.unreadCount  || 0),
      total:  parseInt(f.messageCount || 0),
    }));

    // ── Resolve target folder ──
    const requestedFolder = req.query.folder || '';
    const start = parseInt(req.query.start) || 0;

    let target = null;

    if (requestedFolder) {
      target = folders.find(f => f.name.toLowerCase() === requestedFolder.toLowerCase());
    }

    // No folder requested — just use folder[0] (first one Zoho returns)
    if (!target) {
      target = folders[0];
    }

    if (!target || !target.id) {
      return res.status(400).json({ error: 'No usable folder found', folders });
    }

    // ── Fetch emails ──
    const msgUrl = `https://mail.zoho.com/api/accounts/${accountId}/folders/${target.id}/messages?limit=200&start=${start}&sortorder=false`;
    const msgResp = await zFetch(msgUrl, token);
    const emails  = Array.isArray(msgResp?.data) ? msgResp.data : [];

    return res.status(200).json({
      emails,
      folders,
      accountEmail,
      activeFolder:   target.name,
      activeFolderId: target.id,
      total:          emails.length,
      start,
    });

  } catch (err) {
    console.error('[API Error]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
