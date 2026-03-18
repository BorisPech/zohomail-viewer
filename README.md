# ZohoMail Viewer

> **Public email viewer for Zoho Mail — no login required for visitors.**
> Built with Vercel Serverless Functions + vanilla HTML/CSS/JS.

---

## 📋 តើគម្រោងនេះធ្វើអ្វី? (What does this project do?)

គម្រោងនេះបង្ហាញ emails ទាំងអស់ពី Zoho Mail account មួយ ដោយ:
- **Visitor** (អ្នកទស្សនា) **មិន**ចាំបាច់ login
- Owner (អ្នកដំឡើង) login **ម្តងទឹ** ដើម្បីយក Refresh Token
- Website auto-refresh token ដោយខ្លួនឯង **រហូត**

---

## 🏗️ Project Structure

```
zohomail-viewer/
├── api/
│   └── emails.js        ← Vercel Serverless Function (backend)
├── public/
│   └── index.html       ← Frontend UI (HTML + CSS + JS)
├── vercel.json          ← Vercel routing config
└── README.md            ← This file
```

---

## ⚙️ How It Works (Architecture)

```
Browser (visitor)
    │
    ▼
public/index.html          ← Static frontend served by Vercel
    │  calls fetch('/api/emails')
    ▼
api/emails.js              ← Serverless function (runs on Vercel server)
    │  uses REFRESH_TOKEN from env vars
    │  → calls Zoho OAuth to get fresh Access Token (cached 55 min)
    │  → calls Zoho Mail API to get emails/folders/message body
    ▼
Zoho Mail API              ← https://mail.zoho.com/api/...
```

**Token Flow:**
```
REFRESH_TOKEN (permanent, stored in Vercel env)
    ↓ POST /oauth/v2/token
ACCESS_TOKEN (expires 1 hour, cached in memory)
    ↓ Authorization: Zoho-oauthtoken {token}
Zoho Mail API calls
```

---

## 🔑 Environment Variables (Vercel Settings)

| Variable | Description | Example |
|----------|-------------|---------|
| `ZOHO_CLIENT_ID` | From Zoho API Console | `1000.73M1ILFU7Q...` |
| `ZOHO_CLIENT_SECRET` | From Zoho API Console | `3f2a2280ddbdd5f1...` |
| `ZOHO_REFRESH_TOKEN` | Generated once via OAuth | `1000.ca0949f2e0a...` |

> ⚠️ **NEVER** commit these values to GitHub. Always use Vercel Environment Variables.

---

## 🚀 Setup Guide (Complete Step-by-Step)

### Prerequisites
- GitHub account
- Vercel account (free tier works)
- Zoho Mail account
- Zoho API Console access (api-console.zoho.com)

---

### Step 1 — Create Zoho OAuth App

1. Go to **https://api-console.zoho.com**
2. Click **Add Client** → Select **Web Based**
3. Fill in:
   - **Client Name**: `EmailViewer` (or any name)
   - **Homepage URL**: `https://YOUR-PROJECT.vercel.app`
   - **Authorized Redirect URI**: `https://YOUR-PROJECT.vercel.app/callback`
4. Click **Create**
5. Note down **Client ID** and **Client Secret** from the "Client Secret" tab

---

### Step 2 — Deploy to Vercel

1. Push this project to GitHub
2. Go to **vercel.com** → **Add New Project**
3. Import your GitHub repository
4. Click **Deploy**
5. Note your Vercel URL (e.g. `zohomail-viewer.vercel.app`)

---

### Step 3 — Update Zoho Redirect URI

1. Go back to **api-console.zoho.com** → Your app → **Client Details**
2. Update **Authorized Redirect URIs** to:
   ```
   https://YOUR-PROJECT.vercel.app/callback
   ```
3. Click **Update**

---

### Step 4 — Get Refresh Token (ONE TIME ONLY)

**4a. Open this URL in browser** (replace `YOUR_VERCEL_URL`):
```
https://accounts.zoho.com/oauth/v2/auth?response_type=code&client_id=YOUR_CLIENT_ID&scope=ZohoMail.messages.READ,ZohoMail.folders.READ,ZohoMail.accounts.READ&redirect_uri=https://YOUR_VERCEL_URL/callback&access_type=offline&prompt=consent
```

**4b. Login → Accept permissions → Copy the `code` from redirect URL:**
```
https://YOUR_VERCEL_URL/callback?code=1000.XXXXXXXX...
                                       ^^^^^^^^^^^^^ copy this
```

**4c. Exchange code for tokens** (run in CMD/Terminal — must be done within ~1 minute):
```bash
curl -X POST "https://accounts.zoho.com/oauth/v2/token" \
  -d "grant_type=authorization_code" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "redirect_uri=https://YOUR_VERCEL_URL/callback" \
  -d "code=PASTE_CODE_HERE"
```

**4d. Response will contain:**
```json
{
  "access_token": "1000.xxxx...",
  "refresh_token": "1000.yyyy...",   ← SAVE THIS
  "expires_in": 3600
}
```

---

### Step 5 — Add Environment Variables to Vercel

1. Go to **vercel.com** → Your project → **Settings** → **Environment Variables**
2. Add these 3 variables:

| Key | Value |
|-----|-------|
| `ZOHO_CLIENT_ID` | Your Client ID |
| `ZOHO_CLIENT_SECRET` | Your Client Secret |
| `ZOHO_REFRESH_TOKEN` | The refresh_token from Step 4d |

3. Click **Save** → Go to **Deployments** → **Redeploy**

---

### Step 6 — Verify

Visit: `https://YOUR-PROJECT.vercel.app/api/emails`

You should see JSON with emails. If you see an error, check the Vercel Logs.

---

## 🐛 Troubleshooting

### "Token refresh failed: Access Denied / Too many requests"
- **Cause**: Zoho rate-limited your token refresh calls
- **Fix**: Wait 30-60 minutes, then generate a new Refresh Token (repeat Step 4)
- **Prevention**: The code caches the access token for 55 minutes to minimize refreshes

### "emails is not iterable" / Empty email list
- **Cause**: Emails are not in Inbox — check other folders (Notification, Newsletter, etc.)
- **Fix**: Click different folders in the sidebar
- **Root cause**: Zoho routes different email types to different folders automatically

### "404: NOT_FOUND" on callback
- **Cause**: The `/callback` route isn't handled (Vercel routes everything to index.html)
- **Fix**: This is normal — just copy the `code` from the URL before the page shows 404
- **Better fix**: Add a `/api/callback.js` handler if needed

### Email body shows "(Empty)" or "(Content unavailable)"
- **Cause**: The `messageId` fetch failed or Zoho returned no body
- **Fix**: Check Vercel Logs for the specific error. The summary/preview text is shown as fallback.

### Inbox shows 0 emails but other folders have emails
- **Cause**: Your Zoho account uses "Notification" or other folders as primary
- **Fix**: The app auto-detects the folder with most emails on load

---

## 📡 API Reference

### `GET /api/emails`
Fetch email list for a folder.

**Query params:**
| Param | Default | Description |
|-------|---------|-------------|
| `folder` | auto-detect | Folder name (Inbox, Sent, Notification, etc.) |
| `limit` | 200 | Max emails per request (max: 200) |
| `start` | 0 | Offset for pagination |

**Response:**
```json
{
  "emails": [...],
  "folders": [{ "id": "...", "name": "Inbox", "unread": 5, "total": 238 }],
  "accountEmail": "user@zohomail.com",
  "activeFolder": "Notification",
  "total": 238,
  "fetched": 200,
  "start": 0
}
```

### `GET /api/emails?msgId=XXX`
Fetch full message body.

**Response:**
```json
{
  "message": {
    "subject": "...",
    "fromAddress": "...",
    "toAddress": "...",
    "htmlBody": "<html>...</html>",
    "content": "plain text fallback",
    "receivedTime": "1773784303224"
  },
  "accountEmail": "user@zohomail.com"
}
```

---

## 🎨 Frontend Features

| Feature | Details |
|---------|---------|
| 📁 Folder sidebar | All Zoho folders with unread counts |
| 📧 Email list | Sender avatar, subject, preview, time |
| 🔵 Unread indicators | Blue dot + highlight for unread |
| 🔍 Client-side search | Filter by sender, subject, preview |
| 📄 Email detail | Full HTML body in sandboxed iframe |
| 📑 Pagination | 30 emails per page, smart page buttons |
| 🌙 Dark theme | Full dark UI with ambient glow effects |
| 📱 Responsive | Mobile-friendly (sidebar hidden on small screens) |
| ⚡ Fast load | Token cached, single API call per folder |

---

## 🔒 Security Notes

1. **Refresh Token** — stored only in Vercel env vars, never in code or GitHub
2. **Access Token** — cached in serverless function memory, never sent to browser
3. **Read-only scope** — only `ZohoMail.messages.READ`, `ZohoMail.folders.READ`, `ZohoMail.accounts.READ`
4. **HTML email rendering** — rendered in sandboxed `<iframe>` with `srcdoc` (no external JS execution)
5. **No user data stored** — stateless, each request fetches fresh from Zoho

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Hosting | Vercel (free tier) |
| Backend | Vercel Serverless Functions (Node.js) |
| Auth | Zoho OAuth 2.0 (offline access) |
| Frontend | Vanilla HTML + CSS + JavaScript (no framework) |
| Fonts | Google Fonts (Syne + Inter) |
| Email API | Zoho Mail REST API v1 |

---

## 🔄 Known Limitations

1. **200 emails per folder per load** — Zoho API max is 200/request. For more, use `?start=200` offset. Full pagination requires multiple API calls (risk of timeout on Vercel's 10s limit).
2. **Vercel 10s timeout** — Serverless functions must respond in ≤10 seconds. Fetching 200+ emails in one call is safe; looping is not.
3. **Refresh token expiry** — Zoho refresh tokens can expire if unused for 30 days or if revoked. Regenerate via Step 4 if this happens.
4. **Rate limiting** — Zoho limits token refresh to ~10/minute. The in-memory cache mitigates this but doesn't persist across cold starts.

---

## 🗺️ Future Improvements (for next developer/AI)

- [ ] **Server-side pagination** — add `?start=` param to load more than 200 emails
- [ ] **Search API** — use Zoho's `/messages/search` endpoint for full-text server search
- [ ] **Mark as read** — add `PATCH /api/emails?msgId=X` to mark messages read via Zoho API
- [ ] **Multiple accounts** — support switching between Zoho accounts
- [ ] **Token persistence** — use Vercel KV or Edge Config to cache token across cold starts
- [ ] **Attachment download** — add `/api/attachment?msgId=X&attachId=Y` endpoint
- [ ] **Callback handler** — add `api/callback.js` to auto-exchange code (no manual curl needed)
- [ ] **Email compose** — add `ZohoMail.messages.CREATE` scope + send API
- [ ] **Refresh token renewal** — auto-detect expiry and re-authenticate

---

## 📝 Changelog

| Version | Changes |
|---------|---------|
| v1 | Initial OAuth flow with redirect to localhost |
| v2 | Moved to Vercel, basic email list |
| v3 | Fixed `emails is not iterable` — handle array emailAddress field |
| v4 | Added pagination loop (caused timeouts — reverted) |
| v5 | Auto-detect folder with most emails |
| v6 | Fast single-request fetch, no timeout, server-side folder detection |
| v7 (current) | Full rewrite — clean code, proper comments, smart folder auto-pick by total count |

---

## 👨‍💻 Developer Notes

**Zoho API base URL:** `https://mail.zoho.com/api/`

**Key endpoints used:**
```
GET  /api/accounts                              → list accounts
GET  /api/accounts/{id}/folders                 → list folders
GET  /api/accounts/{id}/folders/{fid}/messages  → list emails in folder
GET  /api/accounts/{id}/messages/{mid}          → get email body
POST https://accounts.zoho.com/oauth/v2/token   → refresh access token
```

**Email object key fields:**
```js
{
  messageId:    "1773784303235154200",  // unique ID for fetching body
  subject:      "Hello &quot;world&quot;",  // HTML-encoded — use decodeHtml()
  fromAddress:  "sender@example.com",
  toAddress:    "\"Name\" <me@zoho.com>",
  sender:       "sender@example.com",   // fallback if fromAddress empty
  summary:      "Email preview text...",
  receivedTime: "1773784303224",        // Unix ms timestamp as string
  sentDateInGMT:"1773809500000",        // fallback timestamp
  status:       "0",                    // "0" = unread, "1" = read
  folderId:     "1441392000000009001",
  hasAttachment:"0",                    // "1" if has attachments
  size:         "22475",                // bytes
}
```

**Message body object:**
```js
{
  htmlBody: "<html>...</html>",  // present if HTML email
  content:  "plain text",        // plain text version
  body:     "...",               // fallback
}
```

---

*Last updated: March 2026*
*Live URL: https://zohomail-viewer.vercel.app*
