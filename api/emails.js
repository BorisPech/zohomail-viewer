// api/emails.js — Fixed with token caching

const CLIENT_ID     = process.env.ZOHO_CLIENT_ID;
const CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN;

// Cache token in memory (survives multiple requests on same serverless instance)
let cachedToken = null;
let tokenExpiry  = 0;

async function getAccessToken() {
  const now = Date.now();
  // Return cached token if still valid (with 5min buffer)
  if (cachedToken && now < tokenExpiry - 300000) {
    return cachedToken;
  }
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
  if (!data.access_token) {
    throw new Error('Token refresh failed: ' + JSON.stringify(data));
  }
  cachedToken = data.access_token;
  tokenExpiry  = now + (data.expires_in || 3600) * 1000;
  return cachedToken;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
      return res.status(500).json({ error: 'Missing env vars: ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN' });
    }

    const token = await getAccessToken();

    // 1. Get account
    const accRes  = await fetch('https://mail.zoho.com/api/accounts', {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });
    const accData = await accRes.json();
    const accounts = Array.isArray(accData?.data) ? accData.data
      : Array.isArray(accData) ? accData : [];

    if (!accounts.length) {
      return res.status(400).json({ error: 'No account found', detail: accData });
    }

    const acc          = accounts[0];
    const accountId    = acc.accountId || acc.id;
    const accountEmail = acc.emailAddress || acc.primaryEmailAddress || '';

    if (!accountId) {
      return res.status(400).json({ error: 'accountId missing', acc });
    }

    // 2. Single message detail
    const msgId = req.query.msgId;
    if (msgId) {
      const r    = await fetch(`https://mail.zoho.com/api/accounts/${accountId}/messages/${msgId}`, {
        headers: { Authorization: `Zoho-oauthtoken ${token}` },
      });
      const d = await r.json();
      return res.status(200).json({ message: d.data || d, accountEmail });
    }

    // 3. Get folders
    const fRes    = await fetch(`https://mail.zoho.com/api/accounts/${accountId}/folders`, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });
    const fData   = await fRes.json();
    const folders = Array.isArray(fData?.data) ? fData.data
      : Array.isArray(fData) ? fData : [];

    const folderList = folders.map(f => ({
      id:     f.folderId || f.id || '',
      name:   f.folderName || f.name || '',
      unread: parseInt(f.unreadCount || f.unread || 0),
    }));

    // 4. Get messages
    const folderName = req.query.folder || 'Inbox';
    const limit      = Math.min(parseInt(req.query.limit) || 100, 200);
    const start      = parseInt(req.query.start) || 0;

    const matched  = folderList.find(f => f.name.toLowerCase() === folderName.toLowerCase());
    const folderId = matched?.id;

    const msgUrl = folderId
      ? `https://mail.zoho.com/api/accounts/${accountId}/folders/${folderId}/messages?limit=${limit}&start=${start}&sortorder=false`
      : `https://mail.zoho.com/api/accounts/${accountId}/messages/view?folder=${encodeURIComponent(folderName)}&limit=${limit}&start=${start}&sortorder=false`;

    const mRes  = await fetch(msgUrl, { headers: { Authorization: `Zoho-oauthtoken ${token}` } });
    const mData = await mRes.json();

    const emails = Array.isArray(mData?.data) ? mData.data
      : Array.isArray(mData) ? mData : [];

    return res.status(200).json({ emails, folders: folderList, accountEmail, total: emails.length });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
