// api/emails.js — Fixed v3

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
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
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

function getEmail(accountEmail) {
  // accountEmail can be string or array of objects
  if (typeof accountEmail === 'string') return accountEmail;
  if (Array.isArray(accountEmail)) {
    const primary = accountEmail.find(e => e.isPrimary) || accountEmail[0];
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
    const accounts = Array.isArray(accData?.data) ? accData.data
      : Array.isArray(accData) ? accData : [];
    if (!accounts.length) return res.status(400).json({ error: 'No account', raw: accData });

    const acc       = accounts[0];
    const accountId = acc.accountId || acc.id;
    // Fix: emailAddress can be array or string
    const accountEmail = getEmail(acc.emailAddress || acc.primaryEmailAddress || acc.email || '');

    if (!accountId) return res.status(400).json({ error: 'No accountId', acc });

    // 2. Single message
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
    const folders = Array.isArray(fData?.data) ? fData.data
      : Array.isArray(fData) ? fData : [];

    const folderList = folders.map(f => ({
      id:     f.folderId || f.id || '',
      name:   f.folderName || f.name || '',
      unread: parseInt(f.unreadCount || f.unread || 0),
    }));

    // 4. Get messages using folder ID directly
    const folderName = req.query.folder || 'Inbox';
    const limit      = Math.min(parseInt(req.query.limit) || 100, 200);
    const start      = parseInt(req.query.start) || 0;

    const matched  = folderList.find(f => f.name.toLowerCase() === folderName.toLowerCase());
    const folderId = matched?.id;

    let emails = [];

    if (folderId) {
      // Use folder ID — most reliable
      const mRes  = await fetch(
        `https://mail.zoho.com/api/accounts/${accountId}/folders/${folderId}/messages?limit=${limit}&start=${start}&sortorder=false`,
        { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
      );
      const mData = await mRes.json();
      emails = Array.isArray(mData?.data) ? mData.data : [];
    }

    // Fallback: try view API if folder fetch returned nothing
    if (!emails.length) {
      const mRes2  = await fetch(
        `https://mail.zoho.com/api/accounts/${accountId}/messages/view?limit=${limit}&start=${start}&sortorder=false`,
        { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
      );
      const mData2 = await mRes2.json();
      emails = Array.isArray(mData2?.data) ? mData2.data : [];
    }

    return res.status(200).json({ emails, folders: folderList, accountEmail, total: emails.length });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
