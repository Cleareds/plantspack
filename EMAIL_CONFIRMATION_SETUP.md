# Email Confirmation Setup Guide

## CRITICAL: Enable Email Confirmation Before Launch

Currently, users can register and login immediately without verifying their email address. This is a security risk that allows:
- Spam accounts with fake emails
- Unverified registrations
- Email abuse

---

## Step-by-Step Setup Instructions

### 1. Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Sign in to your account
3. Select the **plantspack** project

### 2. Navigate to Authentication Settings
1. In the left sidebar, click **Authentication**
2. Click **Providers** tab
3. Find the **Email** provider in the list

### 3. Enable Email Confirmation
1. Click on the **Email** provider to open settings
2. Scroll to find **Email confirmation** section
3. **Toggle ON** the switch for "Confirm email"
4. **Save** changes

### 4. Configure Email Templates (Optional but Recommended)
1. Still in Authentication section, click **Email Templates** tab
2. Customize these templates for your brand:
   - **Confirm signup**: Email sent when user registers
   - **Magic Link**: For passwordless login (optional)
   - **Change Email Address**: When user updates email
   - **Reset Password**: For password resets

#### Recommended Changes:
- Update sender name from "Supabase" to "PlantsPack"
- Customize email copy to match your brand voice
- Add your logo/branding
- Update the confirmation button text

### 5. Test the Flow
1. Log out of your account (if logged in)
2. Go to https://plantspack.com/auth (or your domain)
3. Create a new test account with a real email you can access
4. **Expected behavior**:
   - Registration succeeds
   - You receive a confirmation email
   - You must click the link in the email before you can login
   - Attempting to login before confirmation shows an error

### 6. Update Rate Limits (Recommended)
Since email confirmation is now required, adjust rate limits to prevent abuse:

1. In Supabase Dashboard → Authentication → Rate Limits
2. Recommended settings:
   - **Email sends**: 3 per hour per IP
   - **Sign-ups**: 5 per hour per IP
   - **Password resets**: 3 per hour per email

---

## What Changes After Enabling

### User Registration Flow:
**Before (current):**
1. User fills signup form
2. Account created
3. User logged in immediately ✅
4. No email verification required

**After (with confirmation):**
1. User fills signup form
2. Account created
3. Confirmation email sent 📧
4. User must click link in email
5. Then user can login ✅

### Code Changes Needed: NONE ✅
The codebase already handles email confirmation properly:
- `auth.tsx` uses Supabase auth which respects confirmation settings
- Email templates are configured in Supabase dashboard
- No code changes required - this is a dashboard-only configuration

---

## Troubleshooting

### Issue: "Email not configured"
**Solution**: Check that SMTP settings are configured in Supabase
1. Authentication → Settings → SMTP Settings
2. Either use Supabase's email service (default) OR configure custom SMTP

### Issue: Confirmation emails not arriving
**Solutions**:
1. Check spam folder
2. Verify SMTP configuration
3. Check Supabase logs: Authentication → Logs
4. Test with multiple email providers (Gmail, Outlook, etc.)

### Issue: Users confused about confirmation
**Solution**: Update signup success message
- Already handled in `SignupForm.tsx` line 70-73
- Message says "Account created successfully! Check your email..."

---

## Production Checklist

Before launching, verify:
- [ ] Email confirmation is enabled in Supabase
- [ ] Test registration with real email address
- [ ] Confirm email arrives and link works
- [ ] Try logging in before clicking link (should fail)
- [ ] Try logging in after clicking link (should succeed)
- [ ] Email templates are branded for PlantsPack
- [ ] Rate limits are configured
- [ ] Spam folder check across Gmail/Outlook/Yahoo

---

## Related Files

- `/src/lib/auth.tsx` - Authentication logic (already compatible)
- `/src/components/auth/SignupForm.tsx` - Registration form
- `/src/components/auth/LoginForm.tsx` - Login form
- `/src/app/api/auth/create-profile/route.ts` - Profile creation (works with confirmed accounts)

---

## Support

If you encounter issues:
1. Check Supabase documentation: https://supabase.com/docs/guides/auth/auth-email
2. Review Supabase logs in dashboard
3. Test with curl or Postman to isolate issues

---

**Last Updated**: 2026-02-04
**Status**: ⚠️ REQUIRED BEFORE LAUNCH
