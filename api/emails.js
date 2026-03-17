// api/emails.js — Vercel Serverless Function
// ទាញ emails ពី Zoho Mail ដោយ auto-refresh token

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
  if (!data.access_token) throw new Error('Cannot refresh token: ' + JSON.stringify(data));
  return data.access_token;
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const token = await getAccessToken();

    // 1. Get account ID
    const accRes = await fetch('https://mail.zoho.com/api/accounts', {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });
    const accData = await accRes.json();
    if (!accData.data?.length) return res.status(400).json({ error: 'No account found' });

    const accountId = accData.data[0].accountId;
    const accountEmail = accData.data[0].emailAddress || accData.data[0].primaryEmailAddress || '';

    // 2. Get folder list
    const folderRes = await fetch(`https://mail.zoho.com/api/accounts/${accountId}/folders`, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });
    const folderData = await folderRes.json();
    const folders = folderData.data || [];

    // 3. Get folder param
    const folderName = req.query.folder || 'Inbox';
    const msgId      = req.query.msgId;
    const limit      = parseInt(req.query.limit) || 50;
    const start      = parseInt(req.query.start) || 0;

    // If requesting single message
    if (msgId) {
      const msgRes = await fetch(`https://mail.zoho.com/api/accounts/${accountId}/messages/${msgId}`, {
        headers: { Authorization: `Zoho-oauthtoken ${token}` },
      });
      const msgData = await msgRes.json();
      return res.status(200).json({ message: msgData.data, accountEmail });
    }

    // Find folder ID
    const folder = folders.find(f => f.folderName.toLowerCase() === folderName.toLowerCase());
    const folderId = folder?.folderId;

    // 4. Get messages
    let msgUrl;
    if (folderId) {
      msgUrl = `https://mail.zoho.com/api/accounts/${accountId}/folders/${folderId}/messages?limit=${limit}&start=${start}&sortorder=false`;
    } else {
      msgUrl = `https://mail.zoho.com/api/accounts/${accountId}/messages/view?folder=${encodeURIComponent(folderName)}&limit=${limit}&start=${start}&sortorder=false`;
    }

    const msgRes  = await fetch(msgUrl, { headers: { Authorization: `Zoho-oauthtoken ${token}` } });
    const msgData = await msgRes.json();

    return res.status(200).json({
      emails:  msgData.data || [],
      folders: folders.map(f => ({ id: f.folderId, name: f.folderName, unread: f.unreadCount || 0 })),
      accountEmail,
      total: msgData.data?.length || 0,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
