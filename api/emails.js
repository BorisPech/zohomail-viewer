/**
 * ZohoMail Viewer API — FINAL WORKING VERSION
 *
 * CONFIRMED WORKING URL FORMAT (from debug):
 *   GET /api/accounts/{accountId}/messages/view?folderId={folderId}&limit=200
 *
 * BROKEN FORMATS (404/400):
 *   GET /api/accounts/{accountId}/folders/{folderId}/messages  → 404
 *   GET /api/accounts/{accountId}/messages/view?folder=name    → 400
 */

const CLIENT_ID     = process.env.ZOHO_CLIENT_ID;
const CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN;

let _token = null, _expiry = 0;

async function getToken() {
  if (_token && Date.now() < _expiry - 60_000) return _token;
  const res = await fetch('https://accounts.zoho.com/oauth/v2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
    }),
  });
  const d = await res.json();
  if (!d.access_token) throw new Error('Token failed: ' + JSON.stringify(d));
  _token  = d.access_token;
  _expiry = Date.now() + (d.expires_in || 3600) * 1000;
  return _token;
}

async function zFetch(url, token) {
  const res  = await fetch(url, { headers: { Authorization: `Zoho-oauthtoken ${token}` } });
  const text = await res.text();
  try { return JSON.parse(text); }
  catch { throw new Error('Parse error: ' + text.slice(0, 300)); }
}

function primaryEmail(f) {
  if (!f) return '';
  if (typeof f === 'string') return f;
  if (Array.isArray(f)) {
    const p = f.find(x => x.isPrimary) || f[0];
    return p?.mailId || p?.emailAddress || '';
  }
  return '';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN)
    return res.status(500).json({ error: 'Missing env vars' });

  try {
    const token = await getToken();

    // ── Account ──
    const accData = await zFetch('https://mail.zoho.com/api/accounts', token);
    const acc     = (accData?.data || [])[0];
    if (!acc) return res.status(400).json({ error: 'No account', raw: accData });

    const accountId    = acc.accountId || acc.id;
    const accountEmail = primaryEmail(acc.emailAddress || acc.primaryEmailAddress);
    if (!accountId) return res.status(400).json({ error: 'No accountId' });

    // ── Single message body ──
    if (req.query.msgId) {
      const d = await zFetch(
        `https://mail.zoho.com/api/accounts/${accountId}/messages/${req.query.msgId}`, token
      );
      return res.status(200).json({ message: d?.data || d, accountEmail });
    }

    // ── Folders ──
    const fData      = await zFetch(`https://mail.zoho.com/api/accounts/${accountId}/folders`, token);
    const rawFolders = fData?.data || [];
    const folders    = rawFolders.map(f => ({
      id:     f.folderId || f.id   || '',
      name:   f.folderName || f.name || '',
      unread: parseInt(f.unreadCount  || 0),
      total:  parseInt(f.messageCount || 0),
    }));

    // ── Resolve target folder ──
    const reqFolder = req.query.folder || '';
    const start     = parseInt(req.query.start) || 0;
    const limit     = Math.min(200, parseInt(req.query.limit) || 200);

    let target = reqFolder
      ? folders.find(f => f.name.toLowerCase() === reqFolder.toLowerCase())
      : null;

    // Default: pick folder with most emails
    // Since messageCount is unreliable, use known priority order
    if (!target) {
      const PRIORITY = ['Notification','Newsletter','Inbox','Archive','Sent','Spam','Trash','Drafts'];
      for (const name of PRIORITY) {
        const f = folders.find(x => x.name === name);
        if (f) { target = f; break; }
      }
      if (!target) target = folders[0];
    }

    if (!target) return res.status(400).json({ error: 'No folder found', folders });

    // ── Fetch emails using CONFIRMED WORKING format: ?folderId= ──
    const msgUrl = `https://mail.zoho.com/api/accounts/${accountId}/messages/view?folderId=${target.id}&limit=${limit}&start=${start}&sortorder=false`;
    const msgData = await zFetch(msgUrl, token);
    const emails  = Array.isArray(msgData?.data) ? msgData.data : [];

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
    return res.status(500).json({ error: err.message });
  }
}
