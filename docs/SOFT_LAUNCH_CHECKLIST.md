# 📋 SOFT LAUNCH CHECKLIST
**PlantsPack - 50-100 Users**

Print this page and check off items as you complete them.

---

## Phase 1: Database Setup (15 min)
**Do this first!**

- [ ] Open Supabase Dashboard: https://supabase.com/dashboard
- [ ] Select your PlantsPack project
- [ ] Go to SQL Editor
- [ ] Run migration #1: `20251114000001_create_notifications.sql`
  - [ ] Copy content from `/supabase/migrations/20251114000001_create_notifications.sql`
  - [ ] Paste in SQL Editor
  - [ ] Click "Run"
  - [ ] Verify: "Success. No rows returned"
- [ ] Run migration #2: `20251116000001_fix_contact_submissions.sql`
  - [ ] Copy content from `/supabase/migrations/20251116000001_fix_contact_submissions.sql`
  - [ ] Paste in SQL Editor
  - [ ] Click "Run"
  - [ ] Verify: "Success. No rows returned"
- [ ] Verify tables exist:
  ```sql
  SELECT table_name FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('notifications', 'notification_preferences', 'contact_submissions');
  ```
  - [ ] Should return 3 rows

---

## Phase 2: Notifications Testing (30 min)

### Test Account Setup
- [ ] Create Test User A
  - Email: ________________
  - Username: ________________
- [ ] Create Test User B  
  - Email: ________________
  - Username: ________________

### Test Scenario 1: Like Notification
- [ ] Login as User A
- [ ] Create a post: "Testing notifications"
- [ ] Copy post URL
- [ ] Logout
- [ ] Login as User B
- [ ] Navigate to User A's post
- [ ] Like the post
- [ ] Logout
- [ ] Login as User A
- [ ] Check notification bell
  - [ ] Badge shows "1"
  - [ ] Click bell to open dropdown
  - [ ] See "User B liked your post"
  - [ ] Click notification
  - [ ] Goes to correct post
  - [ ] Badge count decreases

### Test Scenario 2: Comment Notification
- [ ] User B comments on User A's post: "Great post!"
- [ ] User A checks notification bell
  - [ ] New notification appears
  - [ ] Shows "User B commented on your post"
  - [ ] Click notification → goes to post with comment

### Test Scenario 3: Follow Notification  
- [ ] User B follows User A (go to User A's profile)
- [ ] User A checks notification bell
  - [ ] New notification appears
  - [ ] Shows "User B followed you"
  - [ ] Click notification → goes to User B's profile

### Test Scenario 4: Mention Notification
- [ ] User B creates new post: "Hey @userA check this out!"
- [ ] User A checks notification bell
  - [ ] New notification appears
  - [ ] Shows "User B mentioned you"
  - [ ] Click notification → goes to post with mention

### Test Scenario 5: Mark All as Read
- [ ] User A has multiple unread notifications
- [ ] Click "Mark all as read" button
  - [ ] Badge goes to 0
  - [ ] All notifications appear as read

**✓ Notifications Status:** 
- [ ] All 5 scenarios passed
- [ ] OR issues found: ____________________

---

## Phase 3: Contact Form Testing (10 min)

### Anonymous Submission
- [ ] Logout (or use incognito window)
- [ ] Go to `/contact` page
- [ ] Fill form:
  - Name: "Test User"
  - Email: "test@example.com"
  - Subject: "Testing contact form"
  - Message: "This is a test submission"
- [ ] Submit form
  - [ ] See success message
  - [ ] No errors in console

### Database Verification
- [ ] Go to Supabase Dashboard > Table Editor
- [ ] Open `contact_submissions` table
- [ ] Find your test submission
  - [ ] Name matches
  - [ ] Email matches
  - [ ] Status is "new"
  - [ ] Created_at is recent

### Admin Panel Test
- [ ] Login as admin user
- [ ] Go to `/admin/contact`
- [ ] Verify submissions list loads
  - [ ] See test submission
  - [ ] All fields display correctly
- [ ] Update submission:
  - [ ] Change status to "in_progress"
  - [ ] Add admin note: "Test note"
  - [ ] Save changes
- [ ] Refresh page
  - [ ] Changes persisted

### Rate Limiting Test
- [ ] Open contact form (logged out)
- [ ] Submit form 3 times rapidly (different data each time)
  - [ ] Submission 1: Success
  - [ ] Submission 2: Success
  - [ ] Submission 3: Success
  - [ ] Submission 4: **Blocked** with "Too many submissions" error
  - [ ] Error shows "Try again in X minutes"

**✓ Contact Form Status:**
- [ ] All tests passed
- [ ] OR issues found: ____________________

---

## Phase 4: Feed UI Testing (10 min)

### Desktop View
- [ ] Login to your account
- [ ] Go to home page (Feed)
- [ ] Verify layout:
  - [ ] "Public" and "Friends" tabs on LEFT side
  - [ ] Sorting dropdown on RIGHT side
  - [ ] Compact spacing (not too tall)
- [ ] Test tabs:
  - [ ] Click "Public" → Shows all public posts
  - [ ] Click "Friends" → Shows friends-only posts
- [ ] Test sorting on Public tab:
  - [ ] Select "Most Recent" → Posts ordered by date
  - [ ] Select "Relevancy" → Posts by engagement score
  - [ ] Select "Most Liked Today" → Today's popular posts
  - [ ] Select "Most Liked This Week" → Week's popular posts
- [ ] Test sorting on Friends tab:
  - [ ] Sorting options work on Friends feed too
  - [ ] Posts update when changing sort

### Mobile View
- [ ] Open Chrome DevTools (F12)
- [ ] Toggle device toolbar (Cmd+Shift+M)
- [ ] Select "iPhone 12 Pro" or similar
- [ ] Verify layout:
  - [ ] Tabs and sorting fit on one line
  - [ ] "Sort by:" text hidden on mobile
  - [ ] Layout doesn't overflow
- [ ] Test functionality:
  - [ ] Can switch tabs
  - [ ] Can change sorting
  - [ ] Can scroll feed
  - [ ] Can create post (mobile button)

**✓ Feed UI Status:**
- [ ] Desktop layout correct
- [ ] Mobile layout correct
- [ ] Sorting works on both tabs
- [ ] OR issues found: ____________________

---

## Phase 5: Mobile Testing (15 min)

### Test on Real Device (iOS or Android)
- [ ] Open your deployed site on mobile browser
- [ ] Test Navigation:
  - [ ] Menu opens/closes
  - [ ] All links work
  - [ ] Search bar functions
- [ ] Test Feed:
  - [ ] Infinite scroll works
  - [ ] Can switch tabs
  - [ ] Can change sorting
  - [ ] Images load properly
- [ ] Test Posting:
  - [ ] Click FAB (floating action button)
  - [ ] Can type post
  - [ ] Can upload image
  - [ ] Can submit post
- [ ] Test Notifications:
  - [ ] Bell icon visible
  - [ ] Can open dropdown
  - [ ] Can read notifications
- [ ] Test Profile:
  - [ ] Profile page loads
  - [ ] Can edit profile
  - [ ] Images display correctly

**✓ Mobile Status:**
- [ ] All core functions work
- [ ] OR issues found: ____________________

---

## Phase 6: Security & Performance (15 min)

### Console Errors Check
- [ ] Open main pages with Console open (F12):
  - [ ] Home/Feed page: No red errors
  - [ ] Profile page: No red errors
  - [ ] Map page: No red errors
  - [ ] Create post: No red errors
  - [ ] Settings page: No red errors

### Performance Check
- [ ] Test page load times:
  - [ ] Home page loads in < 3 seconds
  - [ ] Feed scrolling is smooth
  - [ ] Images load progressively
  - [ ] No layout shifts

### Security Check
- [ ] Logout and try to access:
  - [ ] `/profile/[username]/settings` → Redirects to login ✓
  - [ ] `/admin` → Unauthorized or redirect ✓
- [ ] Check RLS in Supabase:
  - [ ] Go to Supabase > Authentication > Policies
  - [ ] Verify key tables have RLS enabled:
    - [ ] posts
    - [ ] notifications
    - [ ] contact_submissions
    - [ ] users

**✓ Security & Performance Status:**
- [ ] No critical errors
- [ ] Performance acceptable
- [ ] OR issues found: ____________________

---

## Phase 7: Deployment (10 min)

### Pre-Deployment
- [ ] All above tests passed
- [ ] No critical issues found
- [ ] Database migrations applied
- [ ] Environment variables set

### Deploy
- [ ] Commit changes:
  ```bash
  git add .
  git commit -m "Production ready: Feed fixes, notifications, rate limiting"
  git push
  ```
- [ ] Wait for deployment (Vercel/your host)
- [ ] Verify deployment succeeded
  - [ ] No build errors
  - [ ] Check deployment logs

### Post-Deployment Verification
- [ ] Visit production URL: ____________________
- [ ] Quick smoke test:
  - [ ] Home page loads
  - [ ] Can login
  - [ ] Can create post
  - [ ] Feed displays
  - [ ] Notifications work

**✓ Deployment Status:**
- [ ] Successfully deployed
- [ ] Production site working
- [ ] OR issues found: ____________________

---

## Phase 8: Optional Improvements

### Error Monitoring (30 min)
- [ ] Install Sentry:
  ```bash
  npm install @sentry/nextjs
  npx @sentry/wizard@latest -i nextjs
  ```
- [ ] Create Sentry account (free tier)
- [ ] Configure project
- [ ] Test error tracking
- [ ] Set up email alerts

### Analytics (30 min)
- [ ] Choose analytics:
  - [ ] PostHog (recommended)
  - [ ] Google Analytics
  - [ ] Plausible
- [ ] Install and configure
- [ ] Test tracking
- [ ] Set up key events

### Uptime Monitoring (15 min)
- [ ] Sign up for UptimeRobot (free)
- [ ] Add monitor for your site
- [ ] Set check interval: 5 minutes
- [ ] Add email for alerts
- [ ] Test by checking monitor

**✓ Optional Status:**
- [ ] Error monitoring: Done / Skipped
- [ ] Analytics: Done / Skipped  
- [ ] Uptime monitoring: Done / Skipped

---

## Phase 9: Beta Launch (Ongoing)

### Prepare
- [ ] Create beta announcement
- [ ] Prepare feedback form/email
- [ ] Set up support email
- [ ] Document known issues

### Invite Users (Gradual)
**Week 1: 5-10 users (Friends/Family)**
- [ ] Send invites to first group
- [ ] Monitor closely (daily)
- [ ] Collect feedback
- [ ] Fix critical bugs

**Week 2: 20-30 users (If stable)**
- [ ] Send second wave of invites
- [ ] Monitor regularly
- [ ] Track metrics
- [ ] Iterate based on feedback

**Week 3-4: 50-100 users**
- [ ] Open to wider audience
- [ ] Continue monitoring
- [ ] Plan next features
- [ ] Prepare for full launch

### Daily Monitoring
- [ ] Check error logs (Sentry)
- [ ] Review analytics
- [ ] Check Supabase performance
- [ ] Read user feedback
- [ ] Respond to support requests

---

## 📊 Final Score

Total items completed: ____ / 100+

**Launch Readiness:**
- [ ] 90-100%: EXCELLENT - Ready to launch!
- [ ] 80-89%: GOOD - Launch with monitoring
- [ ] 70-79%: OKAY - Fix critical issues first
- [ ] < 70%: NOT READY - More work needed

---

## 🎉 Congratulations!

If you've checked off all critical items, you're ready to soft launch PlantsPack!

**Remember:**
- Start small (5-10 users)
- Monitor closely
- Iterate quickly
- Collect feedback
- Have fun! 🌱

---

**Date Completed:** _______________
**Launched By:** _______________
**Launch URL:** _______________

**Notes:**
_________________________________________________
_________________________________________________
_________________________________________________

