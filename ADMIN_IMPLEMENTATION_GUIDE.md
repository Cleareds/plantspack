# 🛡️ Admin & Moderation System - Implementation Guide

This guide outlines the implementation of the comprehensive admin, moderation, and safety system for PlantsPack.

## ✅ COMPLETED (Phase 1)

### 1. Database Schema
**File:** `supabase/migrations/20251113100000_admin_moderation_safety_system.sql`

**Created Tables:**
- ✅ `admin_logs` - Audit trail for all admin actions
- ✅ `contact_submissions` - Contact form storage
- ✅ `reports` - Content moderation reports
- ✅ `user_blocks` - User blocking system
- ✅ `user_mutes` - User muting system
- ✅ `rate_limits` - Rate limiting tracking

**Added Columns to `users`:**
- ✅ `role` (user/admin)
- ✅ `is_banned`
- ✅ `ban_reason`
- ✅ `banned_at`
- ✅ `banned_by`

**Helper Functions:**
- ✅ `is_admin(user_id)` - Check admin status
- ✅ `is_user_blocked(blocker_id, blocked_id)` - Check if blocked
- ✅ `is_user_muted(muter_id, muted_id)` - Check if muted
- ✅ `check_rate_limit(user_id, action, max, window)` - Rate limit checking
- ✅ `log_rate_limit(user_id, action)` - Log rate-limited action

**RLS Policies:**
- ✅ All tables have proper RLS enabled
- ✅ Posts now filter blocked/blocking users
- ✅ Admin-only access to logs and full reports
- ✅ Users can manage their own blocks/mutes

### 2. Admin User Creation
**Files:**
- ✅ `supabase/migrations/20251113100001_create_admin_user.sql`
- ✅ `scripts/create-admin-user.js`

**Admin Credentials:**
- Email: `hello@cleareds.com`
- Password: `Admin2024!SecurePlantsPack`
- Username: `admin`

### 3. Admin Dashboard Foundation
**Files:**
- ✅ `src/app/admin/layout.tsx` - Admin layout with sidebar navigation
- ✅ `src/app/admin/page.tsx` - Dashboard with stats and quick actions

**Features:**
- Dashboard with live stats
- Navigation sidebar
- Mobile-responsive
- Admin role check
- Quick action buttons

---

## 🚧 TO BE IMPLEMENTED (Phase 2-5)

### Phase 2: Core Admin Pages (High Priority)

#### 2.1 User Management
**File to create:** `src/app/admin/users/page.tsx`

**Features needed:**
- [ ] List all users with pagination (20 per page)
- [ ] Search users by email/username
- [ ] Filter by role, subscription tier, banned status
- [ ] View user details
- [ ] Edit user (change role, ban/unban)
- [ ] Delete user (with confirmation)
- [ ] View user's posts/comments
- [ ] Ban user with reason

**API needed:**
- [ ] `GET /api/admin/users` - List users with pagination
- [ ] `PUT /api/admin/users/[id]` - Update user
- [ ] `DELETE /api/admin/users/[id]` - Delete user
- [ ] `POST /api/admin/users/[id]/ban` - Ban user
- [ ] `POST /api/admin/users/[id]/unban` - Unban user

#### 2.2 Post Management
**File to create:** `src/app/admin/posts/page.tsx`

**Features needed:**
- [ ] List all posts with pagination (20 per page)
- [ ] Search posts by content/user
- [ ] Filter by privacy, deleted status
- [ ] View post details
- [ ] Delete post (with reason)
- [ ] Restore deleted post
- [ ] View post reports

**API needed:**
- [ ] `GET /api/admin/posts` - List posts with pagination
- [ ] `DELETE /api/admin/posts/[id]` - Delete post
- [ ] `POST /api/admin/posts/[id]/restore` - Restore post

#### 2.3 Comment Management
**File to create:** `src/app/admin/comments/page.tsx`

**Features needed:**
- [ ] List all comments with pagination (20 per page)
- [ ] Search comments by content/user
- [ ] View comment details
- [ ] Delete comment
- [ ] View parent post

**API needed:**
- [ ] `GET /api/admin/comments` - List comments with pagination
- [ ] `DELETE /api/admin/comments/[id]` - Delete comment

#### 2.4 Place Management
**File to create:** `src/app/admin/places/page.tsx`

**Features needed:**
- [ ] List all places with pagination (20 per page)
- [ ] Search places by name/location
- [ ] Filter by category
- [ ] View place details
- [ ] Edit place
- [ ] Delete place
- [ ] Approve/reject pending places

**API needed:**
- [ ] `GET /api/admin/places` - List places with pagination
- [ ] `PUT /api/admin/places/[id]` - Update place
- [ ] `DELETE /api/admin/places/[id]` - Delete place

#### 2.5 Reports Review
**File to create:** `src/app/admin/reports/page.tsx`

**Features needed:**
- [ ] List all reports with pagination (20 per page)
- [ ] Filter by status, type, reason
- [ ] View reported content (post/comment/user/place)
- [ ] Review report (approve/dismiss)
- [ ] Take action (delete content, ban user)
- [ ] Add admin notes
- [ ] Mark as resolved

**API needed:**
- [ ] `GET /api/admin/reports` - List reports with pagination
- [ ] `PUT /api/admin/reports/[id]` - Update report status
- [ ] `POST /api/admin/reports/[id]/resolve` - Resolve report

#### 2.6 Contact Form Review
**File to create:** `src/app/admin/contact/page.tsx` (already exists, needs update)

**Features needed:**
- [ ] List all contact submissions with pagination (20 per page)
- [ ] Filter by status
- [ ] View submission details
- [ ] Mark as reviewed/resolved/spam
- [ ] Add admin notes
- [ ] Reply to contact (future)

**API needed:**
- [ ] `GET /api/admin/contact` - List submissions with pagination
- [ ] `PUT /api/admin/contact/[id]` - Update submission status

### Phase 3: Content Moderation System

#### 3.1 Report Buttons
**Files to create:**
- `src/components/moderation/ReportButton.tsx`
- `src/components/moderation/ReportModal.tsx`

**Features needed:**
- [ ] Report button on PostCard
- [ ] Report button on Comment
- [ ] Report button on Profile
- [ ] Report modal with reason selection
- [ ] Report description input
- [ ] Submit report API call

**API needed:**
- [ ] `POST /api/reports` - Create report

#### 3.2 Report Reason Categories
```typescript
- Spam
- Harassment/Bullying
- Hate Speech
- Violence/Threats
- Misinformation
- NSFW/Inappropriate Content
- Off-Topic
- Copyright Violation
- Other
```

### Phase 4: User Safety Features

#### 4.1 User Blocking
**Files to create:**
- `src/components/social/BlockButton.tsx`
- `src/lib/blocking.ts`

**Features needed:**
- [ ] Block user button on profile
- [ ] Unblock user functionality
- [ ] View blocked users list
- [ ] Confirm block action
- [ ] Hide blocked user's content across app
- [ ] Prevent blocked user from seeing your content

**API needed:**
- [ ] `POST /api/users/[id]/block` - Block user
- [ ] `DELETE /api/users/[id]/block` - Unblock user
- [ ] `GET /api/users/blocked` - Get blocked users list

#### 4.2 User Muting
**Files to create:**
- `src/components/social/MuteButton.tsx`
- `src/lib/muting.ts`

**Features needed:**
- [ ] Mute user button on profile
- [ ] Unmute user functionality
- [ ] View muted users list
- [ ] Hide muted user's posts from feed
- [ ] Still allow direct interaction (unlike blocking)

**API needed:**
- [ ] `POST /api/users/[id]/mute` - Mute user
- [ ] `DELETE /api/users/[id]/mute` - Unmute user
- [ ] `GET /api/users/muted` - Get muted users list

#### 4.3 Rate Limiting
**Files to update:**
- `src/components/posts/CreatePost.tsx`
- `src/components/posts/Comments.tsx`
- `src/app/api/posts/route.ts`
- `src/app/api/comments/route.ts`

**Limits to implement:**
- [ ] Posts: 10 per hour, 50 per day
- [ ] Comments: 30 per hour, 200 per day
- [ ] Reports: 5 per hour, 20 per day
- [ ] Account creation: 3 per IP per day

### Phase 5: Legal & Compliance

#### 5.1 Legal Pages
**Files to create:**
- [ ] `src/app/terms/page.tsx` - Terms of Service
- [ ] `src/app/privacy/page.tsx` - Privacy Policy
- [ ] `src/app/guidelines/page.tsx` - Community Guidelines

**Content to write:**
- [ ] Terms of Service (legal requirements, user agreements)
- [ ] Privacy Policy (GDPR-compliant, data usage)
- [ ] Community Guidelines (safe, supportive, drama-light principles)

#### 5.2 Cookie Consent
**Library:** https://c15t.com/

**Files to create:**
- [ ] `src/components/legal/CookieConsent.tsx`

**Features needed:**
- [ ] Cookie consent banner
- [ ] Accept/Decline buttons
- [ ] Cookie preferences
- [ ] Store consent in localStorage
- [ ] Link to Privacy Policy

**Installation:**
```bash
npm install consent15t
```

### Phase 6: Account Security

#### 6.1 Password Reset
**Files to create:**
- [ ] `src/app/reset-password/page.tsx`
- [ ] `src/components/auth/PasswordResetForm.tsx`
- [ ] `src/app/api/auth/reset-password/route.ts`

**Features needed:**
- [ ] Request password reset (email input)
- [ ] Send reset email
- [ ] Reset password with token
- [ ] Confirm new password

**Supabase setup:**
- Configure email templates in Supabase Dashboard
- Set up SMTP settings

#### 6.2 Email Verification
**Files to update:**
- [ ] `src/lib/auth.tsx` - Enforce verification
- [ ] `src/components/auth/SignupForm.tsx` - Show verification message

**Features needed:**
- [ ] Require email verification before login
- [ ] Resend verification email
- [ ] Verification status indicator

**Supabase config:**
```sql
-- In Supabase Dashboard → Authentication → Settings
-- Enable "Enable email confirmations"
```

#### 6.3 Password Requirements
**Files to update:**
- [ ] `src/components/auth/SignupForm.tsx`
- [ ] `src/components/auth/LoginForm.tsx`

**Requirements:**
- Minimum 8 characters (currently 6)
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character

**Validation function:**
```typescript
function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors = [];
  if (password.length < 8) errors.push('At least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('At least 1 uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('At least 1 lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('At least 1 number');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('At least 1 special character');
  return { valid: errors.length === 0, errors };
}
```

#### 6.4 Auth Rate Limiting
**Files to create:**
- [ ] `src/middleware.ts` - Rate limiting middleware

**Features needed:**
- [ ] Login attempts: 5 per 15 minutes per IP
- [ ] Signup attempts: 3 per hour per IP
- [ ] Password reset: 3 per hour per email

---

## 📋 STEP-BY-STEP IMPLEMENTATION GUIDE

### Step 1: Apply Database Migrations

```bash
# Make sure your Supabase project is linked
npx supabase link

# Apply the migrations
npx supabase db push

# Or manually run the SQL in Supabase Dashboard → SQL Editor
```

### Step 2: Create Admin User

**Option A: Run the script**
```bash
node scripts/create-admin-user.js
```

**Option B: Manual creation**
1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add user"
3. Email: `hello@cleareds.com`
4. Password: `Admin2024!SecurePlantsPack`
5. Auto Confirm: YES
6. Run in SQL Editor:
```sql
UPDATE public.users
SET role = 'admin'
WHERE email = 'hello@cleareds.com';
```

### Step 3: Test Admin Dashboard

1. Start your dev server: `npm run dev`
2. Login with admin credentials
3. Navigate to `/admin`
4. You should see the dashboard with stats

### Step 4: Implement Remaining Pages

Work through each phase systematically. Recommended order:

1. **User Management** (most critical)
2. **Reports Review** (for moderation)
3. **Contact Form Review**
4. **Post/Comment/Place Management**
5. **Report Buttons** (user-facing)
6. **Block/Mute System**
7. **Rate Limiting**
8. **Legal Pages**
9. **Cookie Consent**
10. **Password Security**

---

## 🔒 SECURITY CONSIDERATIONS

### Admin Access
- Admin panel checks `profile.role === 'admin'` on client
- All admin API routes MUST verify admin status server-side
- Log all admin actions to `admin_logs` table

### Example Admin Route Protection:
```typescript
// src/app/api/admin/users/route.ts
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Admin logic here...
}
```

---

## 📊 DATABASE QUERIES FOR ADMIN PAGES

### User Management
```typescript
// Get users with pagination
const { data, error } = await supabase
  .from('users')
  .select('*')
  .order('created_at', { ascending: false })
  .range(offset, offset + limit - 1)
```

### Post Management
```typescript
// Get posts with user info
const { data, error } = await supabase
  .from('posts')
  .select(`
    *,
    users (
      id,
      username,
      email,
      avatar_url
    )
  `)
  .order('created_at', { ascending: false })
  .range(offset, offset + limit - 1)
```

### Reports with Content
```typescript
// Get reports with reported content
const { data, error } = await supabase
  .from('reports')
  .select(`
    *,
    reporter:users!reports_reporter_id_fkey (
      id,
      username,
      email
    )
  `)
  .eq('status', 'pending')
  .order('created_at', { ascending: false })
  .range(offset, offset + limit - 1)
```

---

## 🎯 TESTING CHECKLIST

Before going live, test:

### Admin System
- [ ] Can access admin dashboard
- [ ] Cannot access if not admin
- [ ] All stats load correctly
- [ ] Navigation works

### User Management
- [ ] Can view users
- [ ] Can search users
- [ ] Can ban/unban users
- [ ] Can delete users
- [ ] Pagination works

### Content Moderation
- [ ] Can report content
- [ ] Reports appear in queue
- [ ] Can review reports
- [ ] Can resolve reports
- [ ] Actions are logged

### Safety Features
- [ ] Can block users
- [ ] Blocked users' content hidden
- [ ] Can mute users
- [ ] Muted users' posts hidden from feed
- [ ] Rate limits prevent spam

### Legal
- [ ] Terms of Service accessible
- [ ] Privacy Policy accessible
- [ ] Community Guidelines accessible
- [ ] Cookie consent appears for new visitors

### Security
- [ ] Password reset works
- [ ] Email verification required
- [ ] Strong passwords enforced
- [ ] Auth rate limiting prevents brute force

---

## 📚 USEFUL RESOURCES

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Auth API](https://supabase.com/docs/reference/javascript/auth-api)
- [Next.js API Routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes)
- [GDPR Compliance Checklist](https://gdpr.eu/checklist/)
- [Content Moderation Best Practices](https://www.eff.org/issues/content-moderation)

---

## 🆘 TROUBLESHOOTING

### Admin can't access dashboard
- Check that user has `role = 'admin'` in users table
- Check browser console for errors
- Verify auth session is valid

### RLS errors on admin queries
- Admin queries should use service role key (server-side)
- Client-side queries go through RLS
- Use `createClient()` with service role for admin operations

### Rate limiting not working
- Verify `rate_limits` table exists
- Check that `log_rate_limit()` function is being called
- Verify cleanup job is running (delete old entries)

### Reports not showing
- Check RLS policies on `reports` table
- Verify admin role in database
- Check that reports are being created correctly

---

## ⏱️ ESTIMATED TIME TO COMPLETE

- **Phase 2 (Admin Pages):** 2-3 weeks full-time
- **Phase 3 (Moderation):** 1 week
- **Phase 4 (Safety):** 1 week
- **Phase 5 (Legal):** 3-5 days
- **Phase 6 (Security):** 1 week

**Total:** 6-8 weeks for one developer

---

## 🎉 COMPLETION CRITERIA

The system is complete when:

✅ All admin CRUD pages functional
✅ Reports can be submitted and reviewed
✅ Users can block/mute others
✅ Rate limiting prevents spam
✅ Legal pages are published
✅ Cookie consent is implemented
✅ Password reset works
✅ Email verification enforced
✅ All features tested end-to-end

---

**Last Updated:** November 13, 2025
**Status:** Phase 1 Complete, Phase 2-6 In Progress
