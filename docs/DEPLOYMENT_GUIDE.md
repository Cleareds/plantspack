# 🚀 Deployment → Launch Guide

**Time Required:** 30 minutes  
**Difficulty:** Easy  
**Platform:** Vercel + Supabase

---

## ✅ Pre-Deployment Checklist (5 min)

### 1. Run Cleanup Script
```bash
bash scripts/cleanup-for-launch.sh
```

**What it does:**
- Removes test artifacts
- Cleans development files
- Checks for sensitive data
- Verifies critical files exist

### 2. Apply Database Migrations (15 min)

**Go to:** https://supabase.com/dashboard

**Run these 2 migrations in SQL Editor:**

**Migration 1: Notifications**
```sql
-- Copy from: supabase/migrations/20251114000001_create_notifications.sql
-- Paste in SQL Editor and click "Run"
```

**Migration 2: Contact Submissions**
```sql
-- Copy from: supabase/migrations/20251116000001_fix_contact_submissions.sql
-- Paste in SQL Editor and click "Run"
```

**Verify:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('notifications', 'notification_preferences', 'contact_submissions');
```
Should return 3 rows ✅

### 3. Test Build Locally (5 min)
```bash
npm run build
```

**Expected:** Build succeeds with only warnings (no errors)

### 4. Quick Feature Test (5 min)

**Test these work:**
- [ ] Homepage loads
- [ ] Can create account
- [ ] Can login
- [ ] Can create post
- [ ] Feed displays
- [ ] Notifications bell shows

---

## 🚀 Deployment Steps (15 min)

### Step 1: Commit & Push (2 min)

```bash
# Check what's changed
git status

# Add all files
git add .

# Commit
git commit -m "Production ready - cleanup and documentation"

# Push to main branch
git push origin main
```

### Step 2: Vercel Deployment (10 min)

**If not connected to Vercel yet:**

1. Go to https://vercel.com/dashboard
2. Click "Add New Project"
3. Import your Git repository
4. Configure:
   - **Framework Preset:** Next.js
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`

**Add Environment Variables:**

Click "Environment Variables" and add:

```env
# Supabase (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe (REQUIRED for payments)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_MEDIUM_PRICE_ID=your_medium_price_id
STRIPE_PREMIUM_PRICE_ID=your_premium_price_id
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# Email (OPTIONAL - for contact form)
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
CONTACT_EMAIL=hello@plantspack.com

# Sentry auth token (for source maps)
SENTRY_AUTH_TOKEN=your_sentry_auth_token
```

**Get values from:**
- Supabase: https://supabase.com/dashboard → Your Project → Settings → API
- Stripe: https://dashboard.stripe.com/apikeys
- Sentry: `.env.sentry-build-plugin` file

5. Click "Deploy"
6. Wait 2-5 minutes for build

### Step 3: Verify Deployment (3 min)

Once deployed:

1. **Visit Production URL** (e.g., `your-app.vercel.app`)
2. **Check Homepage** - Loads correctly ✅
3. **Test Auth** - Sign up with test account ✅
4. **Test Core Features:**
   - Create a post ✅
   - Like a post ✅
   - Comment on a post ✅
   - Check notifications ✅

### Step 4: Sentry Verification (2 min)

1. Go to https://sentry.io/organizations/cleareds/issues/
2. Check for any deployment errors
3. Should be empty (no errors yet) ✅

---

## 🎯 Post-Deployment Setup (10 min)

### 1. Configure Sentry Alerts (5 min)

**Go to:** https://sentry.io/organizations/cleareds/alerts/

**Create Alert Rule:**
- **Name:** "Production Errors"
- **Condition:** "New issue is created"
- **Filter:** Environment = production
- **Action:** Send email to your address

### 2. Set Up Domain (Optional, 5 min)

**In Vercel:**
1. Go to Project → Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions
4. Wait for SSL certificate (automatic)

**Update in Supabase:**
1. Go to Authentication → URL Configuration
2. Add your production domain to "Site URL"
3. Add to "Redirect URLs"

### 3. Configure Stripe Webhooks (5 min)

**In Stripe Dashboard:**
1. Go to Developers → Webhooks
2. Add endpoint: `https://your-domain.com/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy webhook secret
5. Add to Vercel environment variables: `STRIPE_WEBHOOK_SECRET`

---

## 🧪 Launch Checklist (Before Users)

### Critical ✅
- [ ] Build succeeds
- [ ] Deployed to Vercel
- [ ] Database migrations applied
- [ ] Environment variables configured
- [ ] Homepage loads
- [ ] Auth works (signup/login)
- [ ] Can create posts
- [ ] Feed displays
- [ ] Notifications work
- [ ] Sentry tracking active
- [ ] No console errors

### Important ✅
- [ ] Sentry alerts configured
- [ ] Stripe webhooks configured (if using payments)
- [ ] Custom domain added (if ready)
- [ ] SSL certificate active
- [ ] Error monitoring verified

### Optional ✅
- [ ] Analytics installed (PostHog/GA)
- [ ] Uptime monitoring (UptimeRobot)
- [ ] Status page created
- [ ] Support email configured

---

## 👥 Soft Launch Strategy (Week 1)

### Day 1: Friends & Family (5-10 users)
```bash
# Monitor closely
- Check Sentry every hour
- Respond to feedback immediately
- Fix critical bugs
```

### Day 2-3: Private Beta (20-30 users)
```bash
# Invite engaged community members
- Check Sentry 2-3x per day
- Monitor database performance
- Track key metrics
```

### Day 4-7: Public Beta (50-100 users)
```bash
# Open with invite codes
- Daily Sentry reviews
- Weekly analytics review
- Iterate based on feedback
```

---

## 📊 Monitoring Dashboard

### Daily Checks:
- **Sentry:** https://sentry.io/organizations/cleareds/issues/
- **Vercel:** https://vercel.com/dashboard
- **Supabase:** https://supabase.com/dashboard

### Key Metrics:
- **Error Rate:** < 1% (from Sentry)
- **Uptime:** > 99.5% (from Vercel)
- **Response Time:** < 500ms (from Vercel Analytics)
- **Active Users:** Track daily sign-ups

---

## 🐛 Troubleshooting

### Build Fails
```bash
# Check locally first
npm run build

# Check error logs in Vercel dashboard
# Common issues:
- Missing environment variables
- TypeScript errors
- Dependency issues
```

### Database Connection Fails
```bash
# Check Supabase:
1. Project is not paused
2. Connection pooling enabled
3. RLS policies are correct
4. Service role key is valid
```

### Sentry Not Working
```bash
# Verify:
1. SENTRY_AUTH_TOKEN in Vercel env vars
2. DSN configured in config files
3. Build logs show "Sentry" messages
4. No ad-blocker blocking requests
```

### Stripe Webhooks Fail
```bash
# Check:
1. Webhook URL is correct
2. Events are selected
3. Secret matches env variable
4. Endpoint is publicly accessible
```

---

## 🚨 Rollback Procedure

If critical issues occur:

### Quick Rollback (Vercel):
1. Go to Vercel Dashboard
2. Find previous deployment
3. Click "..." → "Promote to Production"
4. Previous version goes live immediately

### Database Rollback:
```bash
# Supabase has automatic backups
# Free tier: 7 days
# Contact Supabase support for restore
```

---

## ✅ Success Criteria

Your app is successfully launched when:

- ✅ Deployed and accessible
- ✅ Users can sign up and login
- ✅ Core features work (posts, comments, likes)
- ✅ No critical errors in Sentry
- ✅ Error rate < 1%
- ✅ Response time < 500ms
- ✅ Database performing well
- ✅ First users are happy!

---

## 📞 Support Contacts

### Services:
- **Vercel Support:** https://vercel.com/support
- **Supabase Support:** https://supabase.com/support
- **Sentry Support:** https://sentry.io/support
- **Stripe Support:** https://support.stripe.com

### Documentation:
- **Project Docs:** `/docs` folder
- **Sentry Guide:** `docs/SENTRY_SETUP_COMPLETE.md`
- **Features List:** `docs/FEATURES_IMPLEMENTED.md`

---

## 🎉 You're Ready to Launch!

**Estimated Timeline:**
- Pre-deployment: 30 min
- Deployment: 15 min
- Post-deployment: 10 min
- **Total: ~1 hour**

**Next Command:**
```bash
bash scripts/cleanup-for-launch.sh
```

Then follow this guide step-by-step!

---

**Last Updated:** November 16, 2025  
**Status:** Production Ready ✅  
**Platform:** Vercel + Supabase  
**Monitoring:** Sentry Active

