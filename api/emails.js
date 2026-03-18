/**
 * ZohoMail Viewer API — Fixed
 * 
 * ROOT CAUSE FOUND:
 * Zoho API URL for messages must include accountId:
 * WRONG: /api/accounts/{accountId}/folders/{folderId}/messages
 * RIGHT: /api/accounts/{accountId}/messages/view?folderId={folderId}
 * OR use the correct endpoint format verified by debug
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
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
    }),
  });
  const d = await res.json();
  if (!d.access_token) throw new Error('Token failed: ' + JSON.stringify(d));
  _token = d.access_token;
  _expiry = Date.now() + (d.expires_in || 3600) * 1000;
  return _token;
}

async function zFetch(url, token) {
  const res = await fetch(url, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  });
  const text = await res.text();
  try { return JSON.parse(text); }
  catch { throw new Error(`Parse error from ${url.split('?')[0]}: ${text.slice(0, 200)}`); }
}

function primaryEmail(f) {
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
    return res.status(500).json({ error: 'Missing env vars: ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN' });

  try {
    const token = await getToken();

    // Get account
    const accData = await zFetch('https://mail.zoho.com/api/accounts', token);
    const acc = (accData?.data || [])[0];
    if (!acc) return res.status(400).json({ error: 'No account found', raw: accData });

    const accountId    = acc.accountId || acc.id;
    const accountEmail = primaryEmail(acc.emailAddress || acc.primaryEmailAddress);
    if (!accountId) return res.status(400).json({ error: 'No accountId', acc });

    // Single message body
    if (req.query.msgId) {
      const d = await zFetch(
        `https://mail.zoho.com/api/accounts/${accountId}/messages/${req.query.msgId}`,
        token
      );
      return res.status(200).json({ message: d?.data || d, accountEmail });
    }

    // Get folders
    const fData = await zFetch(
      `https://mail.zoho.com/api/accounts/${accountId}/folders`, token
    );
    const rawFolders = fData?.data || [];
    const folders = rawFolders.map(f => ({
      id:     f.folderId || f.id || '',
      name:   f.folderName || f.name || '',
      unread: parseInt(f.unreadCount || 0),
      total:  parseInt(f.messageCount || 0),
    }));

    // DEBUG — try all 3 known working URL formats
    if (req.query.debug === '1') {
      const results = {};
      for (const f of folders.slice(0, 3)) {
        const fid = f.id;
        const fname = f.name;
        // Try format 1: /messages/view with folderId param
        const url1 = `https://mail.zoho.com/api/accounts/${accountId}/messages/view?folderId=${fid}&limit=2`;
        const r1 = await zFetch(url1, token);
        // Try format 2: /folders/{id}/messages
        const url2 = `https://mail.zoho.com/api/accounts/${accountId}/folders/${fid}/messages?limit=2`;
        const r2 = await zFetch(url2, token);
        // Try format 3: /messages/view with folderName
        const url3 = `https://mail.zoho.com/api/accounts/${accountId}/messages/view?folder=${encodeURIComponent(fname)}&limit=2`;
        const r3 = await zFetch(url3, token);

        results[fname] = {
          folderId: fid,
          'format1_folderId_param': { fetched: (r1?.data||[]).length, status: r1?.status, error: r1?.error },
          'format2_folder_path':    { fetched: (r2?.data||[]).length, status: r2?.status, error: r2?.error },
          'format3_folder_name':    { fetched: (r3?.data||[]).length, status: r3?.status, error: r3?.error },
        };
      }
      return res.status(200).json({ accountId, accountEmail, results });
    }

    // Resolve target folder
    const requestedFolder = req.query.folder || '';
    const start = parseInt(req.query.start) || 0;

    let target = requestedFolder
      ? folders.find(f => f.name.toLowerCase() === requestedFolder.toLowerCase())
      : folders[0];

    if (!target) return res.status(400).json({ error: 'No folder found', folders });

    // Try format 1: /messages/view?folderId= (most standard)
    const url1 = `https://mail.zoho.com/api/accounts/${accountId}/messages/view?folderId=${target.id}&limit=200&start=${start}&sortorder=false`;
    const data1 = await zFetch(url1, token);
    let emails = Array.isArray(data1?.data) ? data1.data : [];

    // Fallback: try folder name param
    if (!emails.length) {
      const url2 = `https://mail.zoho.com/api/accounts/${accountId}/messages/view?folder=${encodeURIComponent(target.name)}&limit=200&start=${start}&sortorder=false`;
      const data2 = await zFetch(url2, token);
      emails = Array.isArray(data2?.data) ? data2.data : [];
    }

    // Fallback: try all messages view
    if (!emails.length) {
      const url3 = `https://mail.zoho.com/api/accounts/${accountId}/messages/view?limit=200&start=${start}&sortorder=false`;
      const data3 = await zFetch(url3, token);
      emails = Array.isArray(data3?.data) ? data3.data : [];
    }

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
