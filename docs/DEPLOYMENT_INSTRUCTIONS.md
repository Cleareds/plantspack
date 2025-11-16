# Deployment Instructions for New Features

This guide will help you deploy the newly implemented features to your production environment.

## 🚀 Features Implemented

All features from the original request have been fully integrated:

### ✅ GDPR Compliance
- Account deletion endpoint with data cleanup
- Data export functionality (JSON download)
- Privacy controls dashboard in settings

### ✅ Notifications System
- Real-time notification bell in header (desktop & mobile)
- Notification preferences page
- Notifications for likes, comments, and follows
- Database schema for notifications

### ✅ Content Moderation
- OpenAI Moderation API integration in post creation
- Sensitive content warnings with blur functionality
- Content warnings display on flagged posts

---

## 📋 Step-by-Step Deployment

### Step 1: Apply Database Migrations

You have two migration files that need to be applied:

1. **Notifications Schema** (`20251114000001_create_notifications.sql`)
2. **Moderation Fields** (`20251114000002_add_moderation_to_posts.sql`)

#### Option A: Using Supabase CLI (Recommended)

```bash
# Link your project (if not already linked)
npx supabase link --project-ref your-project-ref

# Apply all pending migrations
npx supabase db push
```

#### Option B: Using Supabase Dashboard

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of each migration file:
   - First: `supabase/migrations/20251114000001_create_notifications.sql`
   - Then: `supabase/migrations/20251114000002_add_moderation_to_posts.sql`
5. Run each query

#### Verify Migrations

After applying, verify the tables and columns exist:

```sql
-- Check notifications tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('notifications', 'notification_preferences');

-- Check posts table has new columns
SELECT column_name FROM information_schema.columns
WHERE table_name = 'posts'
AND column_name IN ('content_warnings', 'is_sensitive');
```

---

### Step 2: Configure Environment Variables

Add the following to your `.env.local` file:

```env
# OpenAI Moderation API (Required for content moderation)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Optional: Enable image moderation (requires additional setup)
ENABLE_IMAGE_MODERATION=false

# Your existing Supabase variables should already be set:
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### Getting an OpenAI API Key:

1. Go to [platform.openai.com](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy and paste into your `.env.local`

**Note:** The moderation API is very affordable (~$0.002 per 1K characters).

---

### Step 3: Deploy to Production

#### For Vercel Deployment:

```bash
# Add environment variables to Vercel
npx vercel env add OPENAI_API_KEY

# Deploy
npx vercel --prod
```

Or via Vercel Dashboard:
1. Go to your project settings
2. Navigate to Environment Variables
3. Add `OPENAI_API_KEY`
4. Redeploy your application

---

### Step 4: Test the Features

#### Test Notifications:

1. Log in with two different accounts
2. Have one account like, comment, or follow the other
3. Check the notification bell icon in the header
4. Verify notifications appear in real-time
5. Test "Mark all as read" functionality
6. Visit `/profile/[username]/notifications` to test preferences

#### Test Content Moderation:

1. Try creating a post with potentially sensitive content
2. Check that warnings are applied
3. Verify the post displays with a blur overlay
4. Test the "Show Content" / "Hide Content" toggle

#### Test GDPR Compliance:

1. Visit your profile settings
2. Test data export - download should contain all your data
3. Test account deletion (use a test account!)
   - Should require password confirmation
   - Should delete all data and sign you out

---

## 🔧 Troubleshooting

### Notifications Not Appearing

**Check:**
- Database migrations were applied successfully
- Notification preferences exist for the user
- Check browser console for errors
- Verify Supabase real-time is enabled in your project

**Fix:**
```sql
-- Manually create notification preferences for existing users
INSERT INTO notification_preferences (user_id)
SELECT id FROM users
WHERE id NOT IN (SELECT user_id FROM notification_preferences);
```

### Content Moderation Not Working

**Check:**
- `OPENAI_API_KEY` is set correctly
- API key has available credits
- Check browser/server console for errors

**Fix:**
- If moderation fails, content will be allowed by default (fail-open)
- Check OpenAI API dashboard for usage and errors

### Sensitive Content Not Blurred

**Check:**
- Post has `is_sensitive = true` in database
- Post has `content_warnings` array populated
- SensitiveContentWarning component is imported

**Verify:**
```sql
-- Check if posts have moderation data
SELECT id, is_sensitive, content_warnings
FROM posts
WHERE is_sensitive = true
LIMIT 5;
```

### Database Migration Errors

**Common issues:**
- Column already exists: Safe to ignore if column exists
- Missing dependencies: Run migrations in order
- Permission errors: Ensure you're using service role key

---

## 📊 Monitoring & Analytics

### Monitor Notification Creation

```sql
-- Check notification counts by type
SELECT type, COUNT(*) as count
FROM notifications
GROUP BY type
ORDER BY count DESC;

-- Check unread notifications
SELECT COUNT(*) as unread_count
FROM notifications
WHERE read = false;
```

### Monitor Content Moderation

```sql
-- Check flagged content
SELECT COUNT(*) as flagged_posts
FROM posts
WHERE is_sensitive = true;

-- See most common warning types
SELECT unnest(content_warnings) as warning, COUNT(*) as count
FROM posts
WHERE content_warnings IS NOT NULL
GROUP BY warning
ORDER BY count DESC;
```

---

## 🎯 Next Steps (Optional Enhancements)

### Email Notifications (Pending)

The framework is ready for email notifications. To implement:

1. **Choose an email service:**
   - [Resend](https://resend.com) - Recommended, 100 emails/day free
   - [SendGrid](https://sendgrid.com) - 100 emails/day free
   - [AWS SES](https://aws.amazon.com/ses/) - Pay per use, very cheap

2. **Update notification creation API:**

Edit `/src/app/api/notifications/create/route.ts`:

```typescript
// Add after creating notification
if (prefs && prefs[`email_${type}s`] === true) {
  await sendEmail({
    to: userEmail,
    subject: getEmailSubject(type),
    template: getEmailTemplate(type, { actor, entity }),
  })
}
```

3. **Create email templates** in your chosen service

### Image Moderation

To enable image moderation:

1. Set `ENABLE_IMAGE_MODERATION=true`
2. Integrate a vision API:
   - Google Cloud Vision API
   - AWS Rekognition
   - Azure Computer Vision
3. Update `/src/app/api/moderation/check/route.ts` to call the vision API

---

## 📞 Support

### If You Encounter Issues:

1. **Check migration status:**
   ```bash
   npx supabase db diff
   ```

2. **Check logs:**
   - Browser console for client-side errors
   - Vercel/deployment logs for server errors
   - Supabase Dashboard > Logs

3. **Common fixes:**
   ```bash
   # Rebuild the project
   npm run build

   # Clear Next.js cache
   rm -rf .next
   npm run dev
   ```

4. **Database reset (development only!):**
   ```bash
   npx supabase db reset
   ```

---

## ✅ Deployment Checklist

Before going live, ensure:

- [ ] Database migrations applied successfully
- [ ] `OPENAI_API_KEY` environment variable set
- [ ] Notification bell appears in header
- [ ] Notifications work (like, comment, follow)
- [ ] Content warnings display on flagged posts
- [ ] Sensitive content is blurred properly
- [ ] Data export downloads correctly
- [ ] Account deletion works (tested with test account)
- [ ] Notification preferences save correctly
- [ ] Real-time notifications update without refresh
- [ ] All features tested on production deployment

---

## 🎉 You're All Set!

All features are now fully integrated and ready for production use. The implementation follows industry best practices for:

- ✅ Security (RLS policies, password verification)
- ✅ Performance (indexed queries, optimistic updates)
- ✅ User Experience (real-time updates, smooth animations)
- ✅ Data Privacy (GDPR compliance)
- ✅ Content Safety (automated moderation)

If you have any questions or need further customization, refer to the feature documentation in `FEATURES_IMPLEMENTED.md`.
