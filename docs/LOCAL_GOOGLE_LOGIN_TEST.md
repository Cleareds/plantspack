# 🧪 Test Google Login Locally - Quick Guide

## Prerequisites
✅ Your code already has Google OAuth implemented
✅ You just need to configure it in Google Cloud and Supabase

---

## Step 1: Get Your Supabase Callback URL

1. Go to your **Supabase Dashboard**: https://app.supabase.com
2. Select your project
3. Navigate to **Authentication** → **Providers** → **Google**
4. Copy the **Callback URL** - it looks like:
   ```
   https://mfeelaqjbtnypoojhfjp.supabase.co/auth/v1/callback
   ```
5. Keep this URL handy - you'll need it in Step 3

---

## Step 2: Create Google OAuth Credentials

### 2.1 Create Project
1. Go to: https://console.cloud.google.com/
2. Click **"Select a Project"** → **"New Project"**
3. Name: `PlantsPack Local Testing` (or whatever you want)
4. Click **"Create"**

### 2.2 Configure OAuth Consent Screen
1. Go to **"APIs & Services"** → **"OAuth consent screen"**
2. Select **"External"**
3. Click **"Create"**

Fill in the form:
- **App name:** PlantsPack
- **User support email:** your-email@gmail.com
- **Authorized domains:**
  - Click "Add domain"
  - Add: `supabase.co`
- **Developer contact email:** your-email@gmail.com
- Click **"Save and Continue"**

**Scopes:**
- Click **"Add or Remove Scopes"**
- Check these boxes:
  - `.../auth/userinfo.email`
  - `.../auth/userinfo.profile`
  - `openid`
- Click **"Update"** → **"Save and Continue"**

**Test users:**
- Click **"Add Users"**
- Add your email address (the one you'll test with)
- Click **"Save and Continue"**
- Click **"Back to Dashboard"**

### 2.3 Create OAuth Client ID
1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"OAuth 2.0 Client ID"**
3. **Application type:** Web application
4. **Name:** PlantsPack Local

**Authorized JavaScript origins:**
- Click "Add URI"
- Add: `http://localhost:3000`

**Authorized redirect URIs:**
- Click "Add URI"
- Add: `https://mfeelaqjbtnypoojhfjp.supabase.co/auth/v1/callback`
  (This is the URL you copied in Step 1)

5. Click **"Create"**
6. **IMPORTANT:** Copy and save these:
   - **Client ID:** `xxxxxxxxxxxx-xxxxxxxxxxxxxxxx.apps.googleusercontent.com`
   - **Client Secret:** `GOCSPX-xxxxxxxxxxxxxxxxxxxx`

---

## Step 3: Configure Supabase

1. Go to your **Supabase Dashboard**: https://app.supabase.com
2. Select your project
3. Navigate to **Authentication** → **Providers**
4. Find **Google** in the list
5. Toggle it **ON** (enable it)
6. Paste your credentials from Step 2.3:
   - **Client ID:** (paste here)
   - **Client Secret:** (paste here)
7. Click **"Save"**

---

## Step 4: Test Locally

### 4.1 Start your dev server
```bash
npm run dev
```

### 4.2 Test the login flow
1. Open your browser: http://localhost:3000/auth
2. Click the **"Google"** button
3. You'll be redirected to Google login
4. **Important:** Use the email you added as a "Test user" in Step 2.2
5. After logging in with Google, you'll be redirected back to your app
6. You should be logged in and redirected to the home page

### Expected flow:
```
Click "Google" button
  ↓
Redirect to Google login
  ↓
Enter email/password (use test user email)
  ↓
Google redirects to Supabase
  ↓
Supabase redirects to: http://localhost:3000/auth/callback?code=xxx
  ↓
Your app exchanges code for session
  ↓
Redirect to home page, logged in! ✅
```

---

## 🐛 Troubleshooting

### Error: "redirect_uri_mismatch"
**Problem:** The redirect URI in Google doesn't match Supabase

**Solution:**
1. Go to Google Cloud Console → Credentials
2. Click on your OAuth client
3. Under "Authorized redirect URIs", make sure it EXACTLY matches:
   `https://mfeelaqjbtnypoojhfjp.supabase.co/auth/v1/callback`
4. No trailing slashes, must be exact

### Error: "Access Blocked: This app's request is invalid"
**Problem:** You didn't add yourself as a test user

**Solution:**
1. Go to Google Cloud Console → OAuth consent screen
2. Scroll to "Test users"
3. Click "Add Users"
4. Add the email you're trying to login with
5. Try again

### Error: "URL Blocked"
**Problem:** localhost isn't in authorized origins

**Solution:**
1. Go to Google Cloud Console → Credentials
2. Click on your OAuth client
3. Under "Authorized JavaScript origins", add:
   `http://localhost:3000`
4. Save and try again

### Login works but no profile created
**Check:** Open browser console and look for errors

**Fix:** The auth callback should auto-create profiles. If it doesn't:
1. Check Supabase logs: Dashboard → Logs → Auth
2. Make sure the `users` table has proper RLS policies

---

## ✅ Quick Checklist

- [ ] Created Google Cloud project
- [ ] Configured OAuth consent screen
- [ ] Added `supabase.co` to authorized domains
- [ ] Added yourself as test user
- [ ] Created OAuth client ID
- [ ] Added `http://localhost:3000` to authorized origins
- [ ] Added Supabase callback URL to redirect URIs
- [ ] Saved Client ID and Secret
- [ ] Enabled Google in Supabase
- [ ] Pasted credentials in Supabase
- [ ] Started dev server
- [ ] Tested login flow

---

## 🎉 You're Done!

Once everything is configured, you should be able to:
1. Click "Google" button on http://localhost:3000/auth
2. Login with your Google account
3. Get redirected back to your app, logged in

**No code changes needed** - the implementation is already complete! 🚀

---

## 📝 Notes

- The app is in "Testing" mode, so only test users can login
- When you're ready for production:
  1. Add your production domain to authorized origins
  2. Update redirect URIs with your production URL
  3. Publish the OAuth consent screen (in Google Cloud Console)

- All OAuth credentials are stored securely in Supabase
- Your code doesn't need any Google API keys in `.env` files
