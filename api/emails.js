// api/emails.js — v5 — Auto-detect default folder + fetch all

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
  const batchSize = 200;
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
    if (!batch.length) break;
    all = all.concat(batch);
    start += batch.length;
    if (batch.length < batchSize) break;
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

    // 3. Get folders with unread counts
    const fRes    = await fetch(`https://mail.zoho.com/api/accounts/${accountId}/folders`, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });
    const fData   = await fRes.json();
    const folders = Array.isArray(fData?.data) ? fData.data : Array.isArray(fData) ? fData : [];

    const folderList = folders.map(f => ({
      id:     f.folderId || f.id || '',
      name:   f.folderName || f.name || '',
      unread: parseInt(f.unreadCount || f.unread || 0),
      total:  parseInt(f.messageCount || f.total || 0),
    }));

    // 4. Find requested folder — default to first folder that has messages
    const requestedFolder = req.query.folder || '';
    let targetFolder;

    if (requestedFolder) {
      targetFolder = folderList.find(f => f.name.toLowerCase() === requestedFolder.toLowerCase());
    }

    // If no folder requested or not found, find first folder with messages
    if (!targetFolder) {
      // Try Inbox first, then any folder with total > 0
      targetFolder = folderList.find(f => f.name.toLowerCase() === 'inbox') || folderList.find(f => f.total > 0) || folderList[0];
    }

    const folderName = targetFolder?.name || 'Inbox';
    const folderId   = targetFolder?.id;

    // 5. Fetch ALL emails
    let emails = await fetchAllMessages(accountId, folderId, folderName, token);

    // If empty, try fetching each folder to find where emails are
    if (!emails.length) {
      for (const f of folderList) {
        if (!f.id) continue;
        const test = await fetchAllMessages(accountId, f.id, f.name, token);
        if (test.length > 0) {
          emails = test;
          targetFolder = f;
          break;
        }
      }
    }

    // Update folder unread counts from actual data
    const actualUnread = emails.filter(m => m.status === '0').length;

    return res.status(200).json({
      emails,
      folders: folderList,
      accountEmail,
      total:        emails.length,
      activeFolder: targetFolder?.name || folderName,
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
