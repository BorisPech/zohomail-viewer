// api/emails.js — Fixed v4 — Fetch ALL emails with pagination loop

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

async function fetchAllMessages(accountId, folderId, folderName, token) {
  let all = [];
  let start = 0;
  const batchSize = 200; // Zoho max per request

  while (true) {
    let url;
    if (folderId) {
      url = `https://mail.zoho.com/api/accounts/${accountId}/folders/${folderId}/messages?limit=${batchSize}&start=${start}&sortorder=false`;
    } else {
      url = `https://mail.zoho.com/api/accounts/${accountId}/messages/view?folder=${encodeURIComponent(folderName)}&limit=${batchSize}&start=${start}&sortorder=false`;
    }

    const r = await fetch(url, { headers: { Authorization: `Zoho-oauthtoken ${token}` } });
    const d = await r.json();
    const batch = Array.isArray(d?.data) ? d.data : [];

    if (!batch.length) break; // no more emails

    all = all.concat(batch);
    start += batch.length;

    // If batch < batchSize, we got all
    if (batch.length < batchSize) break;

    // Safety: max 2000 emails
    if (all.length >= 2000) break;
  }

  return all;
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

    const acc          = accounts[0];
    const accountId    = acc.accountId || acc.id;
    const accountEmail = getEmail(acc.emailAddress || acc.primaryEmailAddress || acc.email || '');
    if (!accountId) return res.status(400).json({ error: 'No accountId', acc });

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

    // 4. Find folder
    const folderName = req.query.folder || 'Inbox';
    const matched    = folderList.find(f => f.name.toLowerCase() === folderName.toLowerCase());
    const folderId   = matched?.id;

    // 5. Fetch ALL emails with loop
    let emails = await fetchAllMessages(accountId, folderId, folderName, token);

    // Fallback if folder fetch empty
    if (!emails.length && folderId) {
      emails = await fetchAllMessages(accountId, null, folderName, token);
    }

    return res.status(200).json({
      emails,
      folders: folderList,
      accountEmail,
      total: emails.length,
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
