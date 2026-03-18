# ZohoMail Viewer

A production-ready web application that displays Zoho Mail messages publicly on a website — **no login required for visitors**. Built with Vercel Serverless Functions and vanilla HTML/CSS/JS. Features real-time polling, browser notifications, and a clean dark UI.

**Live URL:** https://zohomail-viewer.vercel.app

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [File Structure](#file-structure)
4. [How It Works](#how-it-works)
5. [API Reference](#api-reference)
6. [Zoho OAuth Setup](#zoho-oauth-setup)
7. [Vercel Deployment](#vercel-deployment)
8. [Environment Variables](#environment-variables)
9. [Getting a Refresh Token](#getting-a-refresh-token)
10. [Critical Bug History](#critical-bug-history)
11. [Frontend Features](#frontend-features)
12. [Real-time System](#real-time-system)
13. [Known Limitations](#known-limitations)
14. [Troubleshooting](#troubleshooting)
15. [Future Improvements](#future-improvements)
16. [Zoho API Field Reference](#zoho-api-field-reference)

---

## Project Overview

| Property | Value |
|----------|-------|
| **Purpose** | Display Zoho Mail inbox publicly without visitor login |
| **Hosting** | Vercel (free tier) |
| **Backend** | Vercel Serverless Function (Node.js) |
| **Frontend** | Single HTML file — vanilla JS, no framework |
| **Auth** | Zoho OAuth 2.0 with offline Refresh Token |
| **Font** | Geist (Vercel's font family) |
| **Theme** | Dark — `#0a0a0a` base with Indigo `#6366f1` accent |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Browser (Visitor)                   │
│              public/index.html                       │
│  - Renders email list                                │
│  - Polls /api/emails every 30s for new mail          │
│  - Shows browser notifications for new messages      │
└──────────────────┬──────────────────────────────────┘
                   │ fetch('/api/emails')
                   ▼
┌─────────────────────────────────────────────────────┐
│           Vercel Serverless Function                 │
│              api/emails.js                           │
│  - Reads REFRESH_TOKEN from env vars                 │
│  - Calls Zoho OAuth to get fresh Access Token        │
│  - Caches Access Token in memory (55 min)            │
│  - Calls Zoho Mail REST API                          │
│  - Returns JSON to browser                           │
└──────────────────┬──────────────────────────────────┘
                   │ Zoho-oauthtoken {access_token}
                   ▼
┌─────────────────────────────────────────────────────┐
│              Zoho Mail REST API                      │
│         https://mail.zoho.com/api/                   │
│  - GET /accounts                                     │
│  - GET /accounts/{id}/folders                        │
│  - GET /accounts/{id}/messages/view?folderId={id}    │
│  - GET /accounts/{id}/messages/{msgId}               │
└─────────────────────────────────────────────────────┘
```

### Token Flow

```
REFRESH_TOKEN (permanent, stored in Vercel env)
    │
    ▼  POST https://accounts.zoho.com/oauth/v2/token
    │  grant_type=refresh_token
    │
ACCESS_TOKEN (expires 1 hour, cached in memory)
    │
    ▼  Authorization: Zoho-oauthtoken {access_token}
    │
Zoho Mail API calls
```

---

## File Structure

```
zohomail-viewer/
│
├── api/
│   └── emails.js          ← Vercel Serverless Function (backend)
│
├── public/
│   └── index.html         ← Complete frontend (HTML + CSS + JS)
│
├── vercel.json            ← Vercel routing configuration
└── README.md              ← This file
```

### vercel.json

```json
{
  "version": 2,
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)",     "destination": "/public/index.html" }
  ]
}
```

This routes all `/api/*` requests to serverless functions, and everything else to `index.html`.

---

## How It Works

### Initial Load

1. Browser opens `https://zohomail-viewer.vercel.app`
2. `index.html` loads and calls `loadFolder('')`
3. Frontend fetches `GET /api/emails?limit=200`
4. `api/emails.js` runs on Vercel server:
   - Refreshes access token (or uses cached one)
   - Gets Zoho account ID
   - Gets folder list
   - Auto-detects best folder (priority: Notification → Newsletter → Inbox)
   - Fetches up to 200 emails from that folder
5. Returns JSON response to browser
6. Frontend renders all emails in a scrollable list

### Real-time Polling

Every 30 seconds, the frontend:
1. Calls `GET /api/emails?folder={current}&limit=200` silently
2. Compares returned `messageId` values against existing list
3. If new messages found → shows `"✦ N new messages"` banner
4. Clicking banner adds new emails to top of list with a highlight animation
5. Browser Notification API fires if permission granted

---

## API Reference

### `GET /api/emails`

Fetch email list from auto-detected folder.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `folder` | string | auto-detect | Folder name (e.g. `Notification`, `Inbox`) |
| `limit` | number | 200 | Max emails (hard cap: 200) |
| `start` | number | 0 | Offset for pagination |
| `msgId` | string | — | If set, returns single message body |
| `debug` | `1` | — | Returns raw Zoho responses for all formats |

**Success Response:**

```json
{
  "emails": [
    {
      "messageId": "1773784303235154200",
      "subject": "Hello &quot;world&quot;",
      "fromAddress": "sender@example.com",
      "toAddress": "\"Name\" <me@zohomail.com>",
      "sender": "sender@example.com",
      "summary": "Email preview text...",
      "receivedTime": "1773784303224",
      "sentDateInGMT": "1773809500000",
      "status": "0",
      "folderId": "1441392000000009001",
      "hasAttachment": "0",
      "size": "22475"
    }
  ],
  "folders": [
    {
      "id": "1441392000000008014",
      "name": "Inbox",
      "unread": 5,
      "total": 238
    }
  ],
  "accountEmail": "user@zohomail.com",
  "activeFolder": "Notification",
  "activeFolderId": "1441392000000009001",
  "total": 200,
  "unread": 45,
  "timestamp": 1742280000000,
  "start": 0
}
```

### `GET /api/emails?msgId={id}`

Fetch full message body.

**Success Response:**

```json
{
  "message": {
    "subject": "Hello",
    "fromAddress": "sender@example.com",
    "toAddress": "me@zohomail.com",
    "htmlBody": "<html>...</html>",
    "content": "Plain text fallback",
    "body": "Another fallback",
    "receivedTime": "1773784303224"
  },
  "accountEmail": "user@zohomail.com"
}
```

### `GET /api/emails?debug=1`

Returns diagnostic information showing which URL formats work for each folder. Use this when emails show as empty to diagnose the issue.

**Response example:**

```json
{
  "accountId": "1441392000000008002",
  "accountEmail": "user@zohomail.com",
  "results": {
    "Inbox": {
      "folderId": "1441392000000008014",
      "format1_folderId_param": { "fetched": 2, "status": { "code": 200 } },
      "format2_folder_path":    { "status": { "code": 404 } },
      "format3_folder_name":    { "status": { "code": 400 } }
    }
  }
}
```

---

## Zoho OAuth Setup

### Step 1 — Create OAuth App

1. Go to **https://api-console.zoho.com**
2. Click **Add Client** → Select **Web Based**
3. Fill in:
   - **Client Name:** `EmailViewer` (or any name)
   - **Homepage URL:** `https://YOUR-PROJECT.vercel.app`
   - **Authorized Redirect URI:** `https://YOUR-PROJECT.vercel.app/callback`
4. Click **Create**
5. Go to **Client Secret** tab — note down **Client ID** and **Client Secret**

### Scopes Required

```
ZohoMail.messages.READ
ZohoMail.folders.READ
ZohoMail.accounts.READ
```

---

## Vercel Deployment

### Step 1 — Push to GitHub

```
github.com/YOUR_USERNAME/zohomail-viewer
```

Upload files maintaining this exact structure:
```
api/emails.js
public/index.html
vercel.json
```

### Step 2 — Import to Vercel

1. Go to **vercel.com** → **Add New Project**
2. Import your GitHub repository
3. Click **Deploy**
4. Note your URL: `https://zohomail-viewer.vercel.app`

### Step 3 — Update Zoho Redirect URI

In Zoho API Console → Your App → Client Details:
- Change Redirect URI to: `https://YOUR-VERCEL-URL.vercel.app/callback`
- Click **Update**

---

## Environment Variables

Add in **Vercel → Project → Settings → Environment Variables**:

| Variable | Description | Example |
|----------|-------------|---------|
| `ZOHO_CLIENT_ID` | From Zoho API Console | `1000.73M1ILFU7Q64CYOHHKHWKMRJPVVP7M` |
| `ZOHO_CLIENT_SECRET` | From Zoho API Console | `3f2a2280ddbdd5f1df9938bbb40...` |
| `ZOHO_REFRESH_TOKEN` | From OAuth exchange (see below) | `1000.ca0949f2e0a2ccc8b35a9a...` |

> ⚠️ **NEVER** commit these values to GitHub. Always use Vercel Environment Variables.

After adding variables → Go to **Deployments** → **Redeploy** (required for env vars to take effect).

---

## Getting a Refresh Token

This must be done **once** when first setting up, or when the token expires/is revoked.

### Step 1 — Get Authorization Code

Open this URL in browser (replace values):

```
https://accounts.zoho.com/oauth/v2/auth?response_type=code&client_id=YOUR_CLIENT_ID&scope=ZohoMail.messages.READ,ZohoMail.folders.READ,ZohoMail.accounts.READ&redirect_uri=https://YOUR_VERCEL_URL/callback&access_type=offline&prompt=consent
```

- Login to Zoho → Accept permissions
- Browser redirects to: `https://YOUR_VERCEL_URL/callback?code=1000.XXXXXXXX...`
- **Copy the `code` value** — it expires in ~1 minute

### Step 2 — Exchange Code for Tokens

Run immediately in CMD/Terminal:

```bash
curl -X POST "https://accounts.zoho.com/oauth/v2/token" \
  -d "grant_type=authorization_code" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "redirect_uri=https://YOUR_VERCEL_URL/callback" \
  -d "code=PASTE_CODE_HERE"
```

Response:

```json
{
  "access_token": "1000.xxxx...",
  "refresh_token": "1000.yyyy...",
  "expires_in": 3600
}
```

**Save the `refresh_token`** → paste into Vercel Environment Variables as `ZOHO_REFRESH_TOKEN`.

---

## Critical Bug History

This section documents every major bug found during development — **read this before debugging**.

### Bug 1 — Wrong Zoho API URL Format (ROOT CAUSE of empty emails)

**Problem:** Emails always showed empty (`[]`) even though the account had 200+ messages.

**Discovery:** Used `/api/emails?debug=1` which tested 3 URL formats:

| Format | Result |
|--------|--------|
| `/messages/view?folderId=XXX` | ✅ **WORKS** — returns emails |
| `/folders/{folderId}/messages` | ❌ **404** Invalid Input |
| `/messages/view?folder=name` | ❌ **400** Invalid Input |

**Fix:** Changed all email fetching to use `?folderId=` query parameter format.

```javascript
// WRONG — causes 404
const url = `https://mail.zoho.com/api/accounts/${accountId}/folders/${folderId}/messages`;

// CORRECT — works for this account
const url = `https://mail.zoho.com/api/accounts/${accountId}/messages/view?folderId=${folderId}&limit=200`;
```

### Bug 2 — All emails in "Notification" folder, not "Inbox"

**Problem:** App defaulted to loading "Inbox" which was empty. All 238 emails were in the "Notification" folder.

**Fix:** Changed auto-detection priority order:
```javascript
const PRIORITY = ['Notification', 'Newsletter', 'Inbox', 'Archive', 'Sent', 'Spam', 'Trash', 'Drafts'];
```

### Bug 3 — Token Rate Limiting (Access Denied)

**Problem:** After many rapid API calls during debugging, Zoho returned:
```json
{ "error": "Access Denied", "error_description": "You have made too many requests continuously" }
```

**Fix:**
1. Added in-memory token cache: only refresh when token expires or within 60s of expiry
2. Wait 30–60 minutes for Zoho to unblock

### Bug 4 — `accountEmail` was an Array, not a String

**Problem:** `acc.emailAddress` returned an array of objects, causing the email display to show `[object Object]`.

**Fix:** Added `primaryEmail()` helper function:

```javascript
function primaryEmail(field) {
  if (!field) return '';
  if (typeof field === 'string') return field;
  if (Array.isArray(field)) {
    const p = field.find(e => e.isPrimary) || field[0];
    return p?.mailId || p?.emailAddress || '';
  }
  return '';
}
```

### Bug 5 — Folder `messageCount` always returns 0

**Problem:** `f.messageCount` from Zoho folders API is always `0`, so auto-detecting "folder with most emails" didn't work.

**Fix:** Stopped relying on `messageCount`. Instead use hard-coded priority order (see Bug 2 fix).

### Bug 6 — Vercel Function Timeout from Folder Loop

**Problem:** Attempted to fix Bug 2 by looping through all folders, fetching 1 email from each to find which has data. This caused Vercel's 10-second function timeout.

**Fix:** Removed the loop entirely. Use the priority list instead.

### Bug 7 — `subject` contains HTML entities

**Problem:** Email subjects displayed as `Meeting &quot;tomorrow&quot;` instead of `Meeting "tomorrow"`.

**Fix:** Added `decodeHtml()` function:

```javascript
function decodeHtml(s) {
  const el = document.createElement('textarea');
  el.innerHTML = s || '';
  return el.value;
}
```

---

## Frontend Features

### Layout

```
┌──────────────────────────────────────────────────────┐
│  HEADER: Logo | [New mail alert] [Live] [↻]          │
├────────────────┬─────────────────────────────────────┤
│                │  TOOLBAR: [Search...........] [↻]   │
│   SIDEBAR      ├─────────────────────────────────────┤
│                │  STATS: Total | Unread | Last Sync   │
│  • Folders     ├─────────────────────────────────────┤
│    Inbox  0    │  COUNT: Showing 200 messages         │
│    Sent   0    ├─────────────────────────────────────┤
│    Drafts 0    │                                      │
│    Spam   0    │  EMAIL LIST (scrollable, all emails) │
│    Trash  0    │  ┌──────────────────────────────┐   │
│    ...    0    │  │ [AV] From    Subject  Preview │   │
│                │  │           unread •      time  │   │
│                │  └──────────────────────────────┘   │
│  Active folder │  [repeats for all 200 emails...]     │
│  Notification  │                                      │
└────────────────┴─────────────────────────────────────┘

When email clicked → DETAIL DRAWER slides in from right:
┌────────────────────────────────────────┐
│ [✕]  Subject line                      │
│       Date: Full date + time           │
├────────────────────────────────────────┤
│ [AV] Sender Name                       │
│      sender@email.com                  │
│      To: recipient@email.com           │
├────────────────────────────────────────┤
│ [↩ Reply] [→ Forward] [⬇ Download]    │
├────────────────────────────────────────┤
│                                        │
│   Email body (HTML iframe or text)     │
│                                        │
└────────────────────────────────────────┘
```

### Color System

8 avatar color pairs, assigned by hashing the sender's email address:

```javascript
const COLS = [
  { bg: 'rgba(99,102,241,.15)',  fg: '#818cf8' },  // indigo
  { bg: 'rgba(239,68,68,.15)',   fg: '#f87171' },  // red
  { bg: 'rgba(34,197,94,.15)',   fg: '#4ade80' },  // green
  { bg: 'rgba(249,115,22,.15)',  fg: '#fb923c' },  // orange
  { bg: 'rgba(234,179,8,.15)',   fg: '#facc15' },  // yellow
  { bg: 'rgba(168,85,247,.15)',  fg: '#c084fc' },  // purple
  { bg: 'rgba(20,184,166,.15)',  fg: '#2dd4bf' },  // teal
  { bg: 'rgba(236,72,153,.15)',  fg: '#f472b6' },  // pink
];
```

### Email State Classes

| CSS Class | Meaning |
|-----------|---------|
| `.email-row` | Default (read) email |
| `.email-row.unread` | Unread — indigo left border + subtle tint |
| `.email-row.sel` | Currently selected / open in drawer |
| `.email-row.new-row` | Just arrived — flash highlight animation |

### Unread Detection

Zoho returns `status: "0"` for unread and `status: "1"` for read:

```javascript
const isUnread = m.status === '0';
const realUnread = emails.filter(m => m.status === '0').length;
```

> ⚠️ Do NOT use `m.isRead` — it is inconsistent. Always use `m.status === '0'`.

---

## Real-time System

### Polling Architecture

```
Page Load → loadFolder() → renderAll()
               │
               └──► startPolling()
                         │
                    setInterval(checkForNew, 30000)
                         │
                    every 30 seconds:
                    checkForNew()
                         │
                    ┌────▼────────────────────────┐
                    │  fetch /api/emails (silent)  │
                    │  compare messageId sets      │
                    │  if new found:               │
                    │    showNewAlert(count)        │
                    │    notifyUser() via Browser  │
                    │  update unread badges        │
                    └─────────────────────────────┘
```

### New Mail Alert

When new emails are detected, a banner appears in the header:

```
✦ 3 new messages   ← click to load them
```

Clicking it:
1. Merges new emails at the top of the list
2. Applies `.new-row` CSS class (gold flash animation)
3. Updates unread count
4. Hides the banner

### Browser Notifications

On first load, the app requests `Notification` permission. When new mail arrives during polling, a browser notification fires:

```javascript
new Notification(`${count} new email — Zoho Mail`, {
  body: `From: ${senderName}\n${subject}`,
});
```

---

## Known Limitations

| Limitation | Details |
|------------|---------|
| **200 emails max per folder** | Zoho API max is 200 per request. No pagination implemented yet |
| **Vercel 10s timeout** | Serverless functions must respond in ≤10s. Looping folders will timeout |
| **Token cache is in-memory** | Each Vercel cold start re-fetches the token. Can hit rate limits under high traffic |
| **Refresh token can expire** | If unused 30+ days, or manually revoked. Must re-generate via OAuth flow |
| **Read-only** | Only `READ` scopes. Cannot send, delete, or mark as read via this app |
| **Single account** | Hardcoded to `accounts[0]`. Multi-account not supported |
| **No attachment download** | `hasAttachment` field shows if attachments exist, but download not implemented |

---

## Troubleshooting

### "Token refresh failed" or "Access Denied"

**Cause:** Refresh token expired or rate limited.

**Fix:**
1. Wait 30–60 minutes if rate limited
2. Generate a new refresh token (see [Getting a Refresh Token](#getting-a-refresh-token))
3. Update `ZOHO_REFRESH_TOKEN` in Vercel → Redeploy

### Emails show as empty

**Step 1:** Visit `https://YOUR-URL.vercel.app/api/emails?debug=1`

Look at `results` — check which folder has `"fetched": > 0`.

**Step 2:** If all folders show `fetched: 0` with `status: 404`, the URL format is wrong. Check that `api/emails.js` uses `?folderId=` format.

**Step 3:** If format1 works but emails are in an unexpected folder (like "Notification" not "Inbox"), update the `PRIORITY` array in `api/emails.js`.

### Folders show unread count = 0

**Cause:** Zoho's `unreadCount` field in the folders API is unreliable. This app calculates unread from actual email `status` field.

**Fix:** Already handled. The `realUnread` variable counts `m.status === '0'` from fetched emails.

### Email body shows "(Empty)" or "(No content)"

**Cause:** The `messageId` fetch succeeded but `htmlBody`, `content`, and `body` fields are all empty.

**Check:** Visit `https://YOUR-URL.vercel.app/api/emails?msgId=MESSAGE_ID_HERE`

If the response shows the message data, the issue is in how the frontend reads the fields. Check the order: `msg.htmlBody → msg.content → msg.body → m.summary`.

### 404 on `/callback` page

This is normal. The OAuth flow redirects to `/callback?code=XXXX`, but there's no page there (shows Vercel 404). **You only need the `code` parameter from the URL**, not the page content.

---

## Future Improvements

### High Priority

- [ ] **Server-side pagination** — add `?start=200` to load more than 200 emails per folder
- [ ] **Callback handler** — add `api/callback.js` to auto-exchange authorization code (no manual curl)
- [ ] **Mark as read** — add `PATCH` to Zoho API to mark messages read on click
- [ ] **Token persistence** — use Vercel KV to cache token across cold starts (avoids rate limits)

### Medium Priority

- [ ] **Search via Zoho API** — use `/messages/search` endpoint for server-side full-text search
- [ ] **Multiple folders polling** — poll all folders for unread counts, not just active folder
- [ ] **Attachment download** — add `/api/attachment?msgId=X&attachId=Y` endpoint
- [ ] **Email threads** — group by thread ID using `threadId` field
- [ ] **Responsive mobile sidebar** — hamburger menu to show/hide sidebar on mobile

### Low Priority

- [ ] **Multiple accounts** — support switching between Zoho accounts
- [ ] **Light/dark toggle** — add theme switcher
- [ ] **Email compose** — add `ZohoMail.messages.CREATE` scope + compose UI
- [ ] **Keyboard shortcuts** — `j/k` navigation, `o` to open, `esc` to close

---

## Zoho API Field Reference

### Account Object (`accounts[0]`)

```javascript
{
  accountId:           "1441392000000008002",  // ← use this as accountId
  id:                  "1441392000000008002",  // fallback
  emailAddress: [                               // NOTE: can be array!
    { mailId: "user@zohomail.com", isPrimary: true },
    { mailId: "alias@gmail.com",   isPrimary: false }
  ],
  primaryEmailAddress: "user@zohomail.com",    // string fallback
  displayName:         "User Name",
}
```

### Folder Object (`folders[n]`)

```javascript
{
  folderId:     "1441392000000009001",  // ← use this as folderId
  id:           "1441392000000009001",  // fallback
  folderName:   "Notification",         // ← use this as folder name
  name:         "Notification",         // fallback
  unreadCount:  0,   // ⚠️ UNRELIABLE — often wrong, sometimes always 0
  messageCount: 0,   // ⚠️ UNRELIABLE — often 0 even when folder has emails
}
```

### Email Object (`emails[n]`)

```javascript
{
  messageId:    "1773784303235154200",  // ← unique ID for fetching body
  mid:          "1773784303235154200",  // fallback
  subject:      "Hello &quot;world&quot;",  // ⚠️ HTML-encoded — use decodeHtml()
  fromAddress:  "sender@example.com",
  toAddress:    "\"Name\" <me@zoho.com>",   // may include display name
  sender:       "sender@example.com",        // fallback if fromAddress empty
  summary:      "Email preview text...",     // first ~200 chars of body
  receivedTime: "1773784303224",             // Unix ms as STRING
  sentDateInGMT:"1773809500000",             // fallback timestamp
  status:       "0",          // "0" = unread, "1" = read ← USE THIS for unread
  isRead:       false,        // ⚠️ INCONSISTENT — do not rely on this
  folderId:     "1441392000000009001",
  hasAttachment:"0",          // "1" if has attachments
  size:         "22475",      // bytes as string
  calendarType: 0,
  flagid:       "flag_not_set",
  priority:     "3",
}
```

### Message Body Object (`message`)

```javascript
{
  // Same fields as email object PLUS:
  htmlBody: "<html>...</html>",  // HTML version — render in sandboxed iframe
  content:  "Plain text...",      // Plain text version
  body:     "...",                // Another fallback
}
```

### Correct API URL Formats (VERIFIED)

```javascript
// ✅ WORKS — List emails in folder
`https://mail.zoho.com/api/accounts/${accountId}/messages/view?folderId=${folderId}&limit=200&start=0&sortorder=false`

// ✅ WORKS — Get full message body
`https://mail.zoho.com/api/accounts/${accountId}/messages/${messageId}`

// ✅ WORKS — Get all accounts
`https://mail.zoho.com/api/accounts`

// ✅ WORKS — Get all folders
`https://mail.zoho.com/api/accounts/${accountId}/folders`

// ❌ BROKEN — 404 for this account
`https://mail.zoho.com/api/accounts/${accountId}/folders/${folderId}/messages`

// ❌ BROKEN — 400 for this account
`https://mail.zoho.com/api/accounts/${accountId}/messages/view?folder=Inbox`
```

> ⚠️ **Important:** The URL formats that work may differ between Zoho accounts. If emails are empty, always run `?debug=1` to confirm which format works.

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| v1 | Mar 2026 | Initial OAuth setup with localhost redirect |
| v2 | Mar 2026 | Deployed to Vercel, basic email list |
| v3 | Mar 2026 | Fixed `emails is not iterable` — handle array emailAddress |
| v4 | Mar 2026 | Added folder loop to auto-detect (caused timeout — reverted) |
| v5 | Mar 2026 | Priority-based folder auto-detection |
| v6 | Mar 2026 | Discovered root cause: wrong URL format. Fixed to use `?folderId=` |
| v7 | Mar 2026 | Full UI redesign — Geist font, dark theme, clean grid layout |
| v8 | Mar 2026 | Removed pagination — show all 200 emails in one scrollable list |
| v9 | Mar 2026 | Real-time polling every 30s, new mail alert, browser notifications |

---

## Quick Reference Card

```bash
# Generate new refresh token (run when token expires)
curl -X POST "https://accounts.zoho.com/oauth/v2/token" \
  -d "grant_type=authorization_code" \
  -d "client_id=ZOHO_CLIENT_ID" \
  -d "client_secret=ZOHO_CLIENT_SECRET" \
  -d "redirect_uri=https://YOUR-URL.vercel.app/callback" \
  -d "code=AUTHORIZATION_CODE"

# Debug endpoint — shows raw Zoho responses
GET https://YOUR-URL.vercel.app/api/emails?debug=1

# Test specific folder
GET https://YOUR-URL.vercel.app/api/emails?folder=Notification

# Test message body
GET https://YOUR-URL.vercel.app/api/emails?msgId=1773784303235154200
```

---

## README Maintenance Policy

> **This section defines how this README must be updated whenever the project changes.**
> Anyone (human or AI) continuing this project must follow these rules.

### When to Update This README

Update this README **every time** any of the following changes:

| What changed | What to update in README |
|---|---|
| New bug found and fixed | Add entry to [Critical Bug History](#critical-bug-history) |
| New API endpoint added | Add to [API Reference](#api-reference) |
| Zoho URL format changed | Update [Zoho API Field Reference](#zoho-api-field-reference) — Correct URL Formats |
| New env variable added | Update [Environment Variables](#environment-variables) table |
| Frontend layout changed | Update ASCII layout diagram in [Frontend Features](#frontend-features) |
| New feature shipped | Add to [Changelog](#changelog) + update [Frontend Features](#frontend-features) if UI |
| Bug in polling/real-time | Update [Real-time System](#real-time-system) |
| Known limitation resolved | Remove from [Known Limitations](#known-limitations) table |
| New limitation discovered | Add to [Known Limitations](#known-limitations) table |
| Folder priority changed | Update Bug 2 in [Critical Bug History](#critical-bug-history) |

---

### How to Write a Changelog Entry

Add one row to the [Changelog](#changelog) table per release. Format:

```
| v10 | Apr 2026 | Short description of what changed and why |
```

**Rules:**
- One row per meaningful change — do not batch unrelated changes into one row
- Include the version number (increment from last)
- Include month + year
- Describe **what** changed and **why** (not just "fixed bug")

**Good example:**
```
| v10 | Apr 2026 | Added server-side pagination — load emails beyond 200 via ?start= param |
```

**Bad example:**
```
| v10 | Apr 2026 | Bug fixes and improvements |
```

---

### How to Write a Bug History Entry

When a new bug is found and fixed, add a new section under [Critical Bug History](#critical-bug-history):

```markdown
### Bug N — Short description of the bug

**Problem:** What the symptom was. What the user saw.

**Discovery:** How it was found (debug URL, console error, user report).

**Root Cause:** The exact technical reason it happened.

**Fix:** The code change that resolved it. Include before/after snippets if helpful.
```

**Include a bug entry if:**
- It took more than 30 minutes to diagnose
- The cause was non-obvious (e.g. a Zoho API quirk)
- It could easily regress if someone refactors the code
- The fix required understanding something undocumented about Zoho

**Skip a bug entry if:**
- It was a simple typo
- It was caught immediately before any commit

---

### How to Write a "Last Update" Summary

At the very bottom of this file, always keep this block updated:

```
*Documentation last updated: {Month Year}*
*Last code change: {short description of most recent meaningful change}*
*Project: zohomail-viewer — github.com/BorisPech/zohomail-viewer*
```

**You do not need to rewrite the whole README for every small change.**
Only update the specific sections that are affected. Then update the "last update" block below.

---

### What Must Always Stay Accurate

These sections become outdated most often — always verify them when making changes:

1. **Correct URL Formats** — if Zoho API behavior changes, update the ✅/❌ table
2. **Environment Variables** — if a new var is needed, add it immediately
3. **Known Limitations** — remove items when they are resolved
4. **Changelog** — never skip adding an entry, even for small fixes
5. **Critical Bug History** — the most valuable section for future developers; keep it honest

---

*Documentation last updated: March 2026*
*Last code change: Added real-time polling (30s interval), new mail banner alert, browser Notification API, removed pagination to show all 200 emails in single scroll, fixed unread count to use email status field instead of unreliable Zoho folder metadata*
*Project: zohomail-viewer — github.com/BorisPech/zohomail-viewer*
