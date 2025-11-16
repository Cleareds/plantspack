# 🚀 Quick Launch Checklist

Print this and check off as you go!

---

## ⏱️ Time: ~45 Minutes Total

---

## 📋 Pre-Launch (30 min)

### Database Setup (15 min)
- [ ] Go to https://supabase.com/dashboard
- [ ] Open SQL Editor
- [ ] Run migration: `20251114000001_create_notifications.sql`
- [ ] Run migration: `20251116000001_fix_contact_submissions.sql`
- [ ] Verify: 3 tables created (notifications, notification_preferences, contact_submissions)

### Cleanup (5 min)
- [ ] Run: `bash scripts/cleanup-for-launch.sh`
- [ ] Review output - all checks pass
- [ ] No sensitive data warnings

### Local Test (10 min)
- [ ] Run: `npm run build`
- [ ] Build succeeds (warnings OK, no errors)
- [ ] Test: `npm run dev`
- [ ] Homepage loads
- [ ] Can login/signup
- [ ] Can create post
- [ ] Notifications work

---

## 🚀 Deployment (15 min)

### Git Commit
- [ ] Run: `git status`
- [ ] Run: `git add .`
- [ ] Run: `git commit -m "Production ready"`
- [ ] Run: `git push origin main`

### Vercel Setup
- [ ] Go to https://vercel.com/dashboard
- [ ] Import project (if new)
- [ ] Add environment variables:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - [ ] `STRIPE_SECRET_KEY`
  - [ ] `STRIPE_WEBHOOK_SECRET`
  - [ ] `SENTRY_AUTH_TOKEN`
- [ ] Click "Deploy"
- [ ] Wait for build (2-5 min)

---

## ✅ Verification (10 min)

### Production Test
- [ ] Open production URL
- [ ] Homepage loads
- [ ] Sign up with test account
- [ ] Create test post
- [ ] Like a post
- [ ] Comment on post
- [ ] Check notifications bell
- [ ] No console errors

### Monitoring
- [ ] Check Sentry: https://sentry.io/organizations/cleareds/issues/
- [ ] No errors yet (should be empty)
- [ ] Check Vercel dashboard - deployment successful

---

## 🎯 Post-Launch (10 min)

### Sentry Alerts
- [ ] Go to https://sentry.io/organizations/cleareds/alerts/
- [ ] Create alert rule: "Production Errors"
- [ ] Set to email you on new issues
- [ ] Test alert (optional)

### Stripe Webhooks (if using payments)
- [ ] Go to Stripe Dashboard → Webhooks
- [ ] Add endpoint: `https://your-domain.com/api/stripe/webhook`
- [ ] Select events (checkout.session.completed, etc.)
- [ ] Copy webhook secret
- [ ] Update in Vercel env vars

---

## 🎉 Launch!

### Invite First Users (5-10)
- [ ] Friends & family
- [ ] Ask for feedback
- [ ] Monitor Sentry closely (hourly)

### Day 1 Checklist
- [ ] Check Sentry (morning, afternoon, evening)
- [ ] Respond to user feedback
- [ ] Fix any critical bugs
- [ ] Celebrate! 🎊

---

## 📊 Success Metrics

Week 1 Goals:
- [ ] 5-10 active users
- [ ] < 1% error rate
- [ ] No critical bugs
- [ ] Positive user feedback

---

## 🚨 Emergency Contacts

- **Vercel:** https://vercel.com/support
- **Supabase:** https://supabase.com/support
- **Sentry:** https://sentry.io/support
- **Stripe:** https://support.stripe.com

---

## 📚 Full Guide

See: `docs/DEPLOYMENT_GUIDE.md`

---

**Date:** _______________
**Deployed By:** _______________
**Production URL:** _______________

---

✅ **READY TO LAUNCH!**
# 🚀 Quick Launch Checklist

Print this and check off as you go!

---

## ⏱️ Time: ~1 Hour Total

---

## 📋 Pre-Launch (15 min)

### Cleanup (5 min)
- [ ] Run: `bash scripts/cleanup-for-launch.sh`
- [ ] Review output - all checks pass
- [ ] No sensitive data warnings

### Local Test (10 min)
- [ ] Run: `npm run build`
- [ ] Build succeeds (warnings OK, no errors)
- [ ] Test: `npm run dev`
- [ ] Homepage loads
- [ ] Can login/signup
- [ ] Can create post
- [ ] Notifications work

---

## 🚀 Deployment (15 min)

### Git Commit
- [ ] Run: `git status`
- [ ] Run: `git add .`
- [ ] Run: `git commit -m "Production ready"`
- [ ] Run: `git push origin main`

### Vercel Setup
- [ ] Go to https://vercel.com/dashboard
- [ ] Import project (if new)
- [ ] Add environment variables:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - [ ] `STRIPE_SECRET_KEY`
  - [ ] `STRIPE_WEBHOOK_SECRET`
  - [ ] `SENTRY_AUTH_TOKEN`
- [ ] Click "Deploy"
- [ ] Wait for build (2-5 min)

---

## ✅ Verification (10 min)

### Production Test
- [ ] Open production URL
- [ ] Homepage loads
- [ ] Sign up with test account
- [ ] Create test post
- [ ] Like a post
- [ ] Comment on post
- [ ] Check notifications bell
- [ ] No console errors

### Monitoring
- [ ] Check Sentry: https://sentry.io/organizations/cleareds/issues/
- [ ] No errors yet (should be empty)
- [ ] Check Vercel dashboard - deployment successful

---

## 🎯 Post-Launch (10 min)

### Sentry Alerts
- [ ] Go to https://sentry.io/organizations/cleareds/alerts/
- [ ] Create alert rule: "Production Errors"
- [ ] Set to email you on new issues
- [ ] Test alert (optional)

### Stripe Webhooks (if using payments)
- [ ] Go to Stripe Dashboard → Webhooks
- [ ] Add endpoint: `https://your-domain.com/api/stripe/webhook`
- [ ] Select events (checkout.session.completed, etc.)
- [ ] Copy webhook secret
- [ ] Update in Vercel env vars

---

## 🎉 Launch!

### Invite First Users (5-10)
- [ ] Friends & family
- [ ] Ask for feedback
- [ ] Monitor Sentry closely (hourly)

### Day 1 Checklist
- [ ] Check Sentry (morning, afternoon, evening)
- [ ] Respond to user feedback
- [ ] Fix any critical bugs
- [ ] Celebrate! 🎊

---

## 📊 Success Metrics

Week 1 Goals:
- [ ] 5-10 active users
- [ ] < 1% error rate
- [ ] No critical bugs
- [ ] Positive user feedback

---

## 🚨 Emergency Contacts

- **Vercel:** https://vercel.com/support
- **Supabase:** https://supabase.com/support
- **Sentry:** https://sentry.io/support
- **Stripe:** https://support.stripe.com

---

## 📚 Full Guide

See: `docs/DEPLOYMENT_GUIDE.md`

---

**Date:** _______________
**Deployed By:** _______________
**Production URL:** _______________

---

✅ **READY TO LAUNCH!**

