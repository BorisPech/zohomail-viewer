// api/emails.js — FINAL WORKING VERSION
// Key insight: fetch ALL folders then pick the one with most emails in ONE call

const CLIENT_ID     = process.env.ZOHO_CLIENT_ID;
const CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN;

let _tok = null, _exp = 0;

async function getToken() {
  if (_tok && Date.now() < _exp - 300000) return _tok;
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
  _tok = d.access_token;
  _exp = Date.now() + (d.expires_in || 3600) * 1000;
  return _tok;
}

async function zGet(url, tok) {
  const r = await fetch(url, { headers: { Authorization: `Zoho-oauthtoken ${tok}` } });
  return r.json();
}

function getEmail(f) {
  if (!f) return '';
  if (typeof f === 'string') return f;
  if (Array.isArray(f)) { const p = f.find(x => x.isPrimary) || f[0]; return p?.mailId || p?.emailAddress || ''; }
  return '';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN)
    return res.status(500).json({ error: 'Missing env vars' });

  try {
    const tok = await getToken();

    // 1. Account
    const accD = await zGet('https://mail.zoho.com/api/accounts', tok);
    const acc = (accD?.data || [])[0];
    if (!acc) return res.status(400).json({ error: 'No account', raw: accD });
    const accountId    = acc.accountId || acc.id;
    const accountEmail = getEmail(acc.emailAddress || acc.primaryEmailAddress || '');
    if (!accountId) return res.status(400).json({ error: 'No accountId' });

    // 2. Single message
    if (req.query.msgId) {
      const d = await zGet(`https://mail.zoho.com/api/accounts/${accountId}/messages/${req.query.msgId}`, tok);
      return res.status(200).json({ message: d.data || d, accountEmail });
    }

    // 3. Debug
    if (req.query.debug) {
      const fd = await zGet(`https://mail.zoho.com/api/accounts/${accountId}/folders`, tok);
      // Also test fetch from first folder
      const folders = fd?.data || [];
      const tests = {};
      for (const f of folders.slice(0, 5)) {
        const mid = f.folderId || f.id;
        if (!mid) continue;
        const td = await zGet(`https://mail.zoho.com/api/accounts/${accountId}/folders/${mid}/messages?limit=2`, tok);
        tests[f.folderName || f.name] = { count: (td?.data||[]).length, raw: td };
      }
      return res.status(200).json({ accountId, accountEmail, folders: fd, tests });
    }

    // 4. Folders
    const fd = await zGet(`https://mail.zoho.com/api/accounts/${accountId}/folders`, tok);
    const rawF = fd?.data || [];
    const folderList = rawF.map(f => ({
      id:     f.folderId || f.id || '',
      name:   f.folderName || f.name || '',
      unread: parseInt(f.unreadCount || 0),
      total:  parseInt(f.messageCount || 0),
    }));

    // 5. Find folder - NO LOOP, just use ?folder= param or first folder
    const reqFolder = req.query.folder || '';
    const start = parseInt(req.query.start) || 0;
    const limit = 200;

    let target = reqFolder
      ? folderList.find(f => f.name.toLowerCase() === reqFolder.toLowerCase())
      : folderList[0]; // Default: first folder in list

    if (!target) return res.status(400).json({ error: 'No folders found', folderList });

    // 6. Fetch emails from target folder
    const url = `https://mail.zoho.com/api/accounts/${accountId}/folders/${target.id}/messages?limit=${limit}&start=${start}&sortorder=false`;
    const md = await zGet(url, tok);
    const emails = Array.isArray(md?.data) ? md.data : [];

    return res.status(200).json({
      emails,
      folders: folderList,
      accountEmail,
      activeFolder: target.name,
      total: emails.length,
      fetched: emails.length,
      start,
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
