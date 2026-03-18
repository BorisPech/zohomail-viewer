/**
 * ZohoMail Viewer API — v10
 *
 * CONFIRMED WORKING URL:
 *   /messages/view?folderId={id}  ← only format that works for this account
 *
 * Changes in v10:
 *   - /api/emails/counts endpoint → returns unread across ALL folders fast
 *   - unread count calculated from real email status field, not Zoho metadata
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
      grant_type:    'refresh_token',
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
    }),
  });
  const d = await res.json();
  if (!d.access_token) throw new Error('Token failed: ' + JSON.stringify(d));
  _token  = d.access_token;
  _expiry = Date.now() + (d.expires_in || 3600) * 1000;
  return _token;
}

async function zFetch(url, token) {
  const res  = await fetch(url, { headers: { Authorization: `Zoho-oauthtoken ${token}` } });
  const text = await res.text();
  try { return JSON.parse(text); }
  catch { throw new Error('Parse error: ' + text.slice(0, 200)); }
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
    return res.status(500).json({ error: 'Missing env vars' });

  try {
    const token = await getToken();

    // Get account
    const accData = await zFetch('https://mail.zoho.com/api/accounts', token);
    const acc     = (accData?.data || [])[0];
    if (!acc) return res.status(400).json({ error: 'No account', raw: accData });
    const accountId    = acc.accountId || acc.id;
    const accountEmail = primaryEmail(acc.emailAddress || acc.primaryEmailAddress);
    if (!accountId) return res.status(400).json({ error: 'No accountId' });

    // ── Single message body ──
    if (req.query.msgId) {
      const d = await zFetch(
        `https://mail.zoho.com/api/accounts/${accountId}/messages/${req.query.msgId}`, token
      );
      return res.status(200).json({ message: d?.data || d, accountEmail });
    }

    // ── GET ALL FOLDER COUNTS (fast poll endpoint) ──
    // Called every 15s by frontend to update badges without loading full emails
    if (req.query.counts === '1') {
      const fData  = await zFetch(`https://mail.zoho.com/api/accounts/${accountId}/folders`, token);
      const rawF   = fData?.data || [];

      // For the active folder, fetch real unread count from emails
      const activeId = req.query.activeId || '';
      let activeUnread = 0;
      let activeTotal  = 0;
      let newMsgIds    = [];

      if (activeId) {
        const md = await zFetch(
          `https://mail.zoho.com/api/accounts/${accountId}/messages/view?folderId=${activeId}&limit=200&sortorder=false`,
          token
        );
        const msgs   = Array.isArray(md?.data) ? md.data : [];
        activeUnread = msgs.filter(m => m.status === '0').length;
        activeTotal  = msgs.length;
        // Return only msgIds + timestamps for change detection (lightweight)
        newMsgIds = msgs.map(m => ({ id: m.messageId || m.mid, ts: m.receivedTime || m.sentDateInGMT }));
      }

      return res.status(200).json({
        folders: rawF.map(f => ({
          id:     f.folderId || f.id || '',
          name:   f.folderName || f.name || '',
          unread: parseInt(f.unreadCount || 0), // from Zoho metadata
        })),
        activeUnread,
        activeTotal,
        msgIds:    newMsgIds,
        timestamp: Date.now(),
      });
    }

    // ── Debug ──
    if (req.query.debug === '1') {
      const fData = await zFetch(`https://mail.zoho.com/api/accounts/${accountId}/folders`, token);
      const rawF  = fData?.data || [];
      const tests = {};
      for (const f of rawF.slice(0, 3)) {
        const fid  = f.folderId || f.id;
        const name = f.folderName || f.name;
        const r1 = await zFetch(`https://mail.zoho.com/api/accounts/${accountId}/messages/view?folderId=${fid}&limit=2`, token);
        const r2 = await zFetch(`https://mail.zoho.com/api/accounts/${accountId}/folders/${fid}/messages?limit=2`, token);
        tests[name] = {
          folderId: fid,
          'format1_folderId_param': { fetched: (r1?.data||[]).length, status: r1?.status },
          'format2_folder_path':    { fetched: (r2?.data||[]).length, status: r2?.status },
        };
      }
      return res.status(200).json({ accountId, accountEmail, tests });
    }

    // ── Get folders ──
    const fData    = await zFetch(`https://mail.zoho.com/api/accounts/${accountId}/folders`, token);
    const rawFolders = fData?.data || [];
    const folders  = rawFolders.map(f => ({
      id:     f.folderId || f.id   || '',
      name:   f.folderName || f.name || '',
      unread: parseInt(f.unreadCount  || 0),
      total:  parseInt(f.messageCount || 0),
    }));

    // ── Resolve folder ──
    const reqFolder = req.query.folder || '';
    const start     = parseInt(req.query.start) || 0;
    const PRIORITY  = ['Notification','Newsletter','Inbox','Archive','Sent','Spam','Trash','Drafts'];
    let target = reqFolder
      ? folders.find(f => f.name.toLowerCase() === reqFolder.toLowerCase())
      : null;
    if (!target) {
      for (const name of PRIORITY) {
        const f = folders.find(x => x.name === name);
        if (f) { target = f; break; }
      }
      if (!target) target = folders[0];
    }
    if (!target) return res.status(400).json({ error: 'No folder', folders });

    // ── Fetch emails (CONFIRMED WORKING: ?folderId=) ──
    const md     = await zFetch(
      `https://mail.zoho.com/api/accounts/${accountId}/messages/view?folderId=${target.id}&limit=200&start=${start}&sortorder=false`,
      token
    );
    const emails  = Array.isArray(md?.data) ? md.data : [];
    const realUnread = emails.filter(m => m.status === '0').length;

    // Update folder unread from real data
    const updatedFolders = folders.map(f =>
      f.id === target.id ? { ...f, unread: realUnread } : f
    );

    return res.status(200).json({
      emails,
      folders: updatedFolders,
      accountEmail,
      activeFolder:   target.name,
      activeFolderId: target.id,
      total:          emails.length,
      unread:         realUnread,
      timestamp:      Date.now(),
      start,
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
