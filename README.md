# ZohoMail Viewer — Deploy Guide

## Project Structure
```
zohomail-viewer/
├── api/
│   └── emails.js        ← Serverless function (auto-refresh token)
├── public/
│   └── index.html       ← Website UI
├── vercel.json          ← Vercel config
└── README.md
```

## Deploy Steps

### Step 1 — Upload to GitHub
1. Go to github.com → New Repository → name: `zohomail-viewer`
2. Upload all files (keep folder structure)

### Step 2 — Deploy to Vercel
1. Go to vercel.com → Add New Project
2. Import your GitHub repo
3. Click Deploy → You get URL like: `https://zohomail-viewer.vercel.app`

### Step 3 — Update Zoho Redirect URI
1. Go to api-console.zoho.com
2. Open EmailViewer → Client Details
3. Change Authorized Redirect URI to: `https://YOUR-VERCEL-URL.vercel.app/callback`

### Step 4 — Get Refresh Token (ONE TIME ONLY)
Open this URL in browser (replace YOUR_VERCEL_URL):
```
https://accounts.zoho.com/oauth/v2/auth?response_type=code&client_id=1000.73M1ILFU7Q64CYOHHKHWKMRJPVVP7M&scope=ZohoMail.messages.READ,ZohoMail.folders.READ,ZohoMail.accounts.READ&redirect_uri=https://YOUR_VERCEL_URL.vercel.app/callback&access_type=offline&prompt=consent
```
- Login → Allow
- Copy the `code` from redirect URL
- Run this curl command:
```bash
curl -X POST https://accounts.zoho.com/oauth/v2/token \
  -d "grant_type=authorization_code" \
  -d "client_id=1000.73M1ILFU7Q64CYOHHKHWKMRJPVVP7M" \
  -d "client_secret=3f2a2280ddbdd5f1df9938bbb40f164089680e3efa" \
  -d "redirect_uri=https://YOUR_VERCEL_URL.vercel.app/callback" \
  -d "code=PASTE_CODE_HERE"
```
- Copy the `refresh_token` from response

### Step 5 — Add Environment Variables to Vercel
In Vercel → Project Settings → Environment Variables, add:
```
ZOHO_CLIENT_ID     = 1000.73M1ILFU7Q64CYOHHKHWKMRJPVVP7M
ZOHO_CLIENT_SECRET = 3f2a2280ddbdd5f1df9938bbb40f164089680e3efa
ZOHO_REFRESH_TOKEN = (paste your refresh_token here)
```
Then Redeploy.

### Done! ✅
Your website will auto-refresh the token forever.
Anyone can visit and see all emails — no login needed.
