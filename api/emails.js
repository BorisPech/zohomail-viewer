// api/emails.js — Vercel Serverless Function (Fixed)

const CLIENT_ID     = process.env.ZOHO_CLIENT_ID;
const CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN;

async function getAccessToken() {
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
  return data.access_token;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
      return res.status(500).json({
        error: 'Missing environment variables',
        has_id: !!CLIENT_ID, has_secret: !!CLIENT_SECRET, has_token: !!REFRESH_TOKEN,
      });
    }

    const token = await getAccessToken();

    // 1. Get accounts
    const accRes = await fetch('https://mail.zoho.com/api/accounts', {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });
    const accRaw = await accRes.text();
    let accData;
    try { accData = JSON.parse(accRaw); } catch(e) {
      return res.status(500).json({ error: 'Account parse error', raw: accRaw.slice(0,500) });
    }

    const accounts = Array.isArray(accData) ? accData
      : Array.isArray(accData?.data) ? accData.data
      : accData?.data ? [accData.data] : [];

    if (!accounts.length) {
      return res.status(400).json({ error: 'No Zoho Mail account found', raw: accData });
    }

    const acc          = accounts[0];
    const accountId    = acc.accountId || acc.id;
    const accountEmail = acc.emailAddress || acc.primaryEmailAddress || acc.email || '';

    if (!accountId) {
      return res.status(400).json({ error: 'No accountId found', acc });
    }

    // 2. Get folders
    const folderRes = await fetch(`https://mail.zoho.com/api/accounts/${accountId}/folders`, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });
    const folderData = await folderRes.json().catch(() => ({}));
    const folders = Array.isArray(folderData?.data) ? folderData.data
      : Array.isArray(folderData) ? folderData : [];

    const folderList = folders.map(f => ({
      id:     f.folderId || f.id,
      name:   f.folderName || f.name,
      unread: f.unreadCount || f.unread || 0,
    }));

    // 3. Single message
    const msgId = req.query.msgId;
    if (msgId) {
      const msgRes  = await fetch(
        `https://mail.zoho.com/api/accounts/${accountId}/messages/${msgId}`,
        { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
      );
      const msgData = await msgRes.json();
      return res.status(200).json({ message: msgData.data || msgData, accountEmail });
    }

    // 4. Messages list
    const folderName = req.query.folder || 'Inbox';
    const limit      = Math.min(parseInt(req.query.limit) || 50, 200);
    const start      = parseInt(req.query.start) || 0;

    const matchedFolder = folderList.find(
      f => (f.name || '').toLowerCase() === folderName.toLowerCase()
    );
    const folderId = matchedFolder?.id;

    let msgUrl;
    if (folderId) {
      msgUrl = `https://mail.zoho.com/api/accounts/${accountId}/folders/${folderId}/messages?limit=${limit}&start=${start}&sortorder=false`;
    } else {
      msgUrl = `https://mail.zoho.com/api/accounts/${accountId}/messages/view?folder=${encodeURIComponent(folderName)}&limit=${limit}&start=${start}&sortorder=false`;
    }

    const msgRes = await fetch(msgUrl, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });
    const msgRaw = await msgRes.text();
    let msgData;
    try { msgData = JSON.parse(msgRaw); } catch(e) {
      return res.status(500).json({ error: 'Message parse error', raw: msgRaw.slice(0,500) });
    }

    const emails = Array.isArray(msgData?.data) ? msgData.data
      : Array.isArray(msgData) ? msgData : [];

    return res.status(200).json({
      emails,
      folders: folderList,
      accountEmail,
      total: emails.length,
    });

  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
