/**
 * api/markread.js — Mark email as read in Zoho
 * PUT /api/markread?msgId=XXX&folderId=YYY
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { msgId, folderId } = req.query;
  if (!msgId || !folderId) return res.status(400).json({ error: 'msgId and folderId required' });

  try {
    const token = await getToken();

    // Get account
    const accRes = await fetch('https://mail.zoho.com/api/accounts', {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });
    const accData = await accRes.json();
    const acc = (accData?.data || [])[0];
    if (!acc) return res.status(400).json({ error: 'No account' });
    const accountId = acc.accountId || acc.id;

    // Mark as read via Zoho API
    // PUT /api/accounts/{accountId}/updatemessage
    const markRes = await fetch(
      `https://mail.zoho.com/api/accounts/${accountId}/updatemessage`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Zoho-oauthtoken ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode:      'markAsRead',
          messageId: [msgId],
          folderId:  folderId,
        }),
      }
    );
    const result = await markRes.json();
    return res.status(200).json({ ok: true, result });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
