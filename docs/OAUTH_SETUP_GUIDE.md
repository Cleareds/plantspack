# 🔐 OAuth Setup Guide (Google & Facebook)

This guide will help you set up Google and Facebook OAuth authentication for PlantsPack.

## ✅ Prerequisites

- Supabase project already set up
- Your app domain/URL (for production: `https://yourapp.com`, for local: `http://localhost:3000`)

---

## 🔵 Google OAuth Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a Project"** → **"New Project"**
3. Name it: `PlantsPack` (or your app name)
4. Click **"Create"**

### Step 2: Configure OAuth Consent Screen

1. In your project, go to **"APIs & Services"** → **"OAuth consent screen"**
2. Select **"External"** (unless you have Google Workspace)
3. Click **"Create"**

**Fill in the form:**
- **App name:** PlantsPack
- **User support email:** your-email@gmail.com
- **App logo:** (optional, but recommended)
- **Application home page:** `https://yourapp.com` (or localhost for testing)
- **Authorized domains:**
  - `yourapp.com` (production)
  - `supabase.co` (required for Supabase)
- **Developer contact email:** your-email@gmail.com

4. Click **"Save and Continue"**
5. **Scopes:** Click **"Add or Remove Scopes"**
   - Select: `./auth/userinfo.email`
   - Select: `./auth/userinfo.profile`
   - Select: `openid`
6. Click **"Save and Continue"**
7. **Test users:** Add your email (for testing before verification)
8. Click **"Save and Continue"**

### Step 3: Create OAuth Credentials

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"OAuth 2.0 Client ID"**
3. **Application type:** Web application
4. **Name:** PlantsPack Web Client

**Authorized JavaScript origins:**
- `http://localhost:3000` (for local development)
- `https://yourapp.com` (production)

**Authorized redirect URIs:**
- `https://mfeelaqjbtnypoojhfjp.supabase.co/auth/v1/callback` (from your Supabase project)
- To get your Supabase callback URL:
  - Go to your Supabase Dashboard
  - Navigate to **Authentication** → **Providers** → **Google**
  - Copy the **Callback URL (for OAuth)**

5. Click **"Create"**
6. **SAVE THESE CREDENTIALS:**
   - Client ID: `xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com`
   - Client Secret: `GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Step 4: Configure in Supabase

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Authentication** → **Providers**
4. Find **Google** and click to expand
5. **Enable Google provider**
6. Paste your credentials:
   - **Client ID:** (from Step 3)
   - **Client Secret:** (from Step 3)
7. Click **"Save"**

---

## 🔴 Facebook OAuth Setup

### Step 1: Create Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click **"My Apps"** → **"Create App"**
3. Select **"Consumer"** (for social login)
4. Click **"Next"**

**Fill in the form:**
- **App Name:** PlantsPack
- **App Contact Email:** your-email@gmail.com
- **Business Portfolio:** (optional, skip if you don't have one)

5. Click **"Create App"**

### Step 2: Add Facebook Login Product

1. In your app dashboard, find **"Facebook Login"**
2. Click **"Set Up"**
3. Select **"Web"** platform
4. **Site URL:** `https://yourapp.com` (or `http://localhost:3000` for testing)
5. Click **"Save"** and **"Continue"**

### Step 3: Configure Facebook Login Settings

1. Go to **"Facebook Login"** → **"Settings"** (in left sidebar)
2. **Valid OAuth Redirect URIs:**
   - Add: `https://mfeelaqjbtnypoojhfjp.supabase.co/auth/v1/callback`
   - To get your Supabase callback URL:
     - Go to your Supabase Dashboard
     - Navigate to **Authentication** → **Providers** → **Facebook**
     - Copy the **Callback URL (for OAuth)**
3. Click **"Save Changes"**

### Step 4: Get App Credentials

1. Go to **"Settings"** → **"Basic"** (in left sidebar)
2. **SAVE THESE CREDENTIALS:**
   - **App ID:** `123456789012345`
   - **App Secret:** Click **"Show"** → `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Step 5: Configure App Domain

1. Still in **"Settings"** → **"Basic"**
2. **App Domains:**
   - Add: `yourapp.com` (production)
   - Add: `localhost` (for testing)
   - Add: `supabase.co` (required)
3. **Privacy Policy URL:** `https://yourapp.com/privacy` (required before going live)
4. **Terms of Service URL:** `https://yourapp.com/terms` (optional)
5. Click **"Save Changes"**

### Step 6: Configure in Supabase

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Authentication** → **Providers**
4. Find **Facebook** and click to expand
5. **Enable Facebook provider**
6. Paste your credentials:
   - **Facebook client ID:** (App ID from Step 4)
   - **Facebook secret:** (App Secret from Step 4)
7. Click **"Save"**

### Step 7: Make App Live (When Ready for Production)

1. Go to your Facebook App Dashboard
2. Toggle **"App Mode"** from **"Development"** to **"Live"**
3. You may need to:
   - Complete **Data Use Checkup**
   - Add Privacy Policy URL
   - Verify your business (if required)

---

## 📝 Environment Variables (No Keys Needed in Your Code!)

**Good news:** You don't need to add any OAuth keys to your `.env.local` file!

All OAuth credentials are stored securely in Supabase. Your app uses:
- `NEXT_PUBLIC_SUPABASE_URL` - Already configured ✅
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Already configured ✅

That's it! The OAuth flow is handled entirely by Supabase.

---

## 🧪 Testing OAuth

### Local Testing

1. Start your dev server: `npm run dev`
2. Go to: `http://localhost:3000/auth`
3. Click **"Continue with Google"** or **"Continue with Facebook"**
4. You should be redirected to the provider's login page
5. After login, you'll be redirected back to your app

### Expected Flow

```
User clicks "Sign in with Google"
  ↓
Supabase redirects to Google OAuth
  ↓
User logs in with Google
  ↓
Google redirects to: https://[your-project].supabase.co/auth/v1/callback
  ↓
Supabase processes the OAuth response
  ↓
User redirected to: http://localhost:3000/auth/callback?code=xxx
  ↓
Your callback route exchanges code for session
  ↓
User redirected to: http://localhost:3000/ (home page, logged in)
```

---

## 🐛 Troubleshooting

### "redirect_uri_mismatch" Error

**Problem:** OAuth redirect URI doesn't match what you configured

**Solution:**
1. Double-check the redirect URI in Google/Facebook console
2. Make sure it exactly matches Supabase's callback URL
3. Format should be: `https://[project-ref].supabase.co/auth/v1/callback`

### "Access Blocked: This app's request is invalid"

**Problem:** OAuth consent screen not properly configured

**Solution:**
1. Go to Google Cloud Console → OAuth consent screen
2. Make sure you've added test users (for development)
3. Verify all required fields are filled

### "URL Blocked: This redirect failed" (Facebook)

**Problem:** Domain not whitelisted

**Solution:**
1. Go to Facebook App Settings → Basic
2. Add your domain to **App Domains**
3. Make sure redirect URI is in **Facebook Login Settings**

### Users Can Sign In But Profile Not Created

**Problem:** Your app might not be creating user profiles automatically

**Check:** `/src/lib/auth.tsx` - The `signUp` function should create user profiles

---

## 🔒 Security Best Practices

1. **Never commit OAuth secrets to Git**
   - OAuth credentials are stored in Supabase only
   - No secrets in your codebase ✅

2. **Use HTTPS in production**
   - Never use `http://` for production OAuth
   - Supabase enforces HTTPS ✅

3. **Verify email addresses**
   - Supabase can require email verification
   - Go to: Authentication → Settings → Email Auth

4. **Rate limiting**
   - Supabase provides built-in rate limiting
   - Configure in: Authentication → Settings → Rate Limits

---

## ✅ Checklist

### Google OAuth
- [ ] Created Google Cloud Project
- [ ] Configured OAuth consent screen
- [ ] Created OAuth Client ID
- [ ] Added authorized redirect URIs
- [ ] Saved Client ID and Secret
- [ ] Configured in Supabase
- [ ] Tested sign-in flow

### Facebook OAuth
- [ ] Created Facebook App
- [ ] Added Facebook Login product
- [ ] Configured redirect URIs
- [ ] Saved App ID and App Secret
- [ ] Added app domains
- [ ] Configured in Supabase
- [ ] Tested sign-in flow
- [ ] Made app live (for production)

---

## 📚 Additional Resources

- [Supabase OAuth Documentation](https://supabase.com/docs/guides/auth/social-login)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Facebook Login Documentation](https://developers.facebook.com/docs/facebook-login)

---

## 🎉 You're Done!

Once both providers are configured in Supabase, your users can sign in with Google or Facebook using the existing buttons in your auth page.

**No code changes needed** - it's already implemented! 🚀
