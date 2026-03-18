// api/emails.js — v6 — Fast single fetch, no timeout

const CLIENT_ID     = process.env.ZOHO_CLIENT_ID;
const CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN;

let cachedToken = null;
let tokenExpiry  = 0;

async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry - 300000) return cachedToken;
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
  const data = await res.json();
  if (!data.access_token) throw new Error('Token refresh failed: ' + JSON.stringify(data));
  cachedToken = data.access_token;
  tokenExpiry  = now + (data.expires_in || 3600) * 1000;
  return cachedToken;
}

function getEmail(emailField) {
  if (!emailField) return '';
  if (typeof emailField === 'string') return emailField;
  if (Array.isArray(emailField)) {
    const primary = emailField.find(e => e.isPrimary) || emailField[0];
    return primary?.mailId || primary?.emailAddress || '';
  }
  return '';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
      return res.status(500).json({ error: 'Missing env vars' });
    }

    const token = await getAccessToken();

    // 1. Get account
    const accRes  = await fetch('https://mail.zoho.com/api/accounts', {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });
    const accData = await accRes.json();
    const accounts = Array.isArray(accData?.data) ? accData.data : Array.isArray(accData) ? accData : [];
    if (!accounts.length) return res.status(400).json({ error: 'No account' });

    const acc          = accounts[0];
    const accountId    = acc.accountId || acc.id;
    const accountEmail = getEmail(acc.emailAddress || acc.primaryEmailAddress || '');
    if (!accountId) return res.status(400).json({ error: 'No accountId' });

    // 2. Single message detail
    const msgId = req.query.msgId;
    if (msgId) {
      const r = await fetch(`https://mail.zoho.com/api/accounts/${accountId}/messages/${msgId}`, {
        headers: { Authorization: `Zoho-oauthtoken ${token}` },
      });
      const d = await r.json();
      return res.status(200).json({ message: d.data || d, accountEmail });
    }

    // 3. Get folders
    const fRes  = await fetch(`https://mail.zoho.com/api/accounts/${accountId}/folders`, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });
    const fData = await fRes.json();
    const folders = Array.isArray(fData?.data) ? fData.data : [];

    const folderList = folders.map(f => ({
      id:     f.folderId || f.id || '',
      name:   f.folderName || f.name || '',
      unread: parseInt(f.unreadCount || 0),
      total:  parseInt(f.messageCount || 0),
    }));

    // 4. Find target folder
    const requestedFolder = req.query.folder || 'Notification';
    const start  = parseInt(req.query.start) || 0;
    const limit  = Math.min(parseInt(req.query.limit) || 200, 200);

    const targetFolder = folderList.find(f => f.name.toLowerCase() === requestedFolder.toLowerCase())
      || folderList.find(f => f.total > 0)
      || folderList[0];

    const folderName = targetFolder?.name || requestedFolder;
    const folderId   = targetFolder?.id;

    // 5. Fetch messages — single request
    const msgUrl = folderId
      ? `https://mail.zoho.com/api/accounts/${accountId}/folders/${folderId}/messages?limit=${limit}&start=${start}&sortorder=false`
      : `https://mail.zoho.com/api/accounts/${accountId}/messages/view?folder=${encodeURIComponent(folderName)}&limit=${limit}&start=${start}&sortorder=false`;

    const mRes  = await fetch(msgUrl, { headers: { Authorization: `Zoho-oauthtoken ${token}` } });
    const mData = await mRes.json();
    const emails = Array.isArray(mData?.data) ? mData.data : [];

    // Total count from folder info
    const totalCount = targetFolder?.total || emails.length;

    return res.status(200).json({
      emails,
      folders: folderList,
      accountEmail,
      total:        totalCount,
      fetched:      emails.length,
      activeFolder: folderName,
      start,
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
