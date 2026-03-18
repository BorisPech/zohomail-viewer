/**
 * api/emails.js — ZohoMail Viewer (Final Clean Version)
 * ─────────────────────────────────────────────────────
 * Env vars needed in Vercel:
 *   ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN
 */

const CLIENT_ID     = process.env.ZOHO_CLIENT_ID;
const CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN;

let _token  = null;
let _expiry = 0;

async function getToken() {
  if (_token && Date.now() < _expiry - 300_000) return _token;
  const r = await fetch('https://accounts.zoho.com/oauth/v2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
    }),
  });
  const d = await r.json();
  if (!d.access_token) throw new Error('Token failed: ' + JSON.stringify(d));
  _token  = d.access_token;
  _expiry = Date.now() + (d.expires_in || 3600) * 1000;
  return _token;
}

async function zGet(url, token) {
  const r = await fetch(url, { headers: { Authorization: `Zoho-oauthtoken ${token}` } });
  const text = await r.text();
  try { return JSON.parse(text); }
  catch(e) { throw new Error('Parse error: ' + text.slice(0, 300)); }
}

function extractEmail(f) {
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

  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    return res.status(500).json({ error: 'Missing env vars: ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN' });
  }

  try {
    const token = await getToken();

    // ── Get account ──
    const accData = await zGet('https://mail.zoho.com/api/accounts', token);
    const accounts = accData?.data || [];
    if (!accounts.length) return res.status(400).json({ error: 'No account found', raw: accData });

    const acc = accounts[0];
    const accountId    = acc.accountId || acc.id;
    const accountEmail = extractEmail(acc.emailAddress || acc.primaryEmailAddress || '');
    if (!accountId) return res.status(400).json({ error: 'No accountId', acc });

    // ── Single message ──
    if (req.query.msgId) {
      const d = await zGet(`https://mail.zoho.com/api/accounts/${accountId}/messages/${req.query.msgId}`, token);
      return res.status(200).json({ message: d.data || d, accountEmail });
    }

    // ── Debug mode: show raw folder data ──
    if (req.query.debug === '1') {
      const fd = await zGet(`https://mail.zoho.com/api/accounts/${accountId}/folders`, token);
      return res.status(200).json({ accountId, accountEmail, rawFolders: fd });
    }

    // ── Get folders ──
    const fd = await zGet(`https://mail.zoho.com/api/accounts/${accountId}/folders`, token);
    const rawFolders = fd?.data || [];
    const folderList = rawFolders.map(f => ({
      id:     f.folderId || f.id || '',
      name:   f.folderName || f.name || '',
      unread: parseInt(f.unreadCount  || f.unread_count  || 0),
      total:  parseInt(f.messageCount || f.message_count || f.totalCount || 0),
    }));

    // ── Resolve folder ──
    const reqFolder = req.query.folder || '';
    const start = parseInt(req.query.start) || 0;
    const limit = Math.min(200, parseInt(req.query.limit) || 200);

    let target = reqFolder
      ? folderList.find(f => f.name.toLowerCase() === reqFolder.toLowerCase())
      : null;

    // Auto-pick: try each folder until we find emails
    if (!target || !target.id) {
      // Try all folders in order, pick the one with emails
      for (const f of folderList) {
        if (!f.id) continue;
        const testUrl = `https://mail.zoho.com/api/accounts/${accountId}/folders/${f.id}/messages?limit=1&start=0`;
        const testD   = await zGet(testUrl, token);
        const testArr = testD?.data || [];
        if (testArr.length > 0) { target = f; break; }
      }
    }

    if (!target) target = folderList[0] || { id: '', name: 'Inbox' };

    // ── Fetch emails ──
    const msgUrl = target.id
      ? `https://mail.zoho.com/api/accounts/${accountId}/folders/${target.id}/messages?limit=${limit}&start=${start}&sortorder=false`
      : `https://mail.zoho.com/api/accounts/${accountId}/messages/view?limit=${limit}&start=${start}&sortorder=false`;

    const md = await zGet(msgUrl, token);
    const emails = md?.data || [];

    // Re-fetch actual total by checking folder count
    let actualTotal = target.total || emails.length;
    if (emails.length > 0 && actualTotal === 0) actualTotal = emails.length;

    return res.status(200).json({
      emails,
      folders: folderList,
      accountEmail,
      activeFolder: target.name,
      total: actualTotal,
      fetched: emails.length,
      start,
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
