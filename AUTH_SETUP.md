# Authentication Setup Guide

## Current Issues Fixed

1. ✅ **Server-side validation** - New `/api/auth/signup` endpoint validates:
   - Email format
   - Email uniqueness (checks if already registered)
   - Username availability
   - Password strength
   - All validation happens server-side before creating account

2. ✅ **Better error messages** - Clear feedback for:
   - Duplicate email: "An account with this email already exists. Please sign in instead."
   - Duplicate username: "Username is already taken. Please choose another."
   - Invalid formats, weak passwords, etc.

3. ✅ **Email confirmation support** - Handles both scenarios:
   - Email confirmation enabled: User must verify email before login
   - Email confirmation disabled: User can login immediately

## Required Supabase Configuration

### Email Confirmation Settings

Navigate to **Supabase Dashboard → Authentication → Email Templates**

**Option 1: Disable Email Confirmation (Recommended for testing)**
- Go to **Authentication → Providers → Email**
- Turn OFF "Confirm email"
- Users can login immediately after registration
- **Current behavior**: This seems to be enabled based on the code

**Option 2: Enable Email Confirmation (Production)**
- Go to **Authentication → Providers → Email**
- Turn ON "Confirm email"
- Configure email templates (see below)
- Users must click link in email before they can login

### Email Templates (if confirmation enabled)

**Confirm Signup Template**
```
Subject: Confirm your signup to PlantsPack

<h2>Confirm your signup</h2>
<p>Follow this link to confirm your account:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your email</a></p>
<p>This link expires in 24 hours.</p>
```

**Redirect URL**: `https://plantspack.com/auth/callback`

### SMTP Settings (for email sending)

If using custom SMTP (not Supabase's default):
- Go to **Project Settings → Auth → SMTP Settings**
- Configure your SMTP provider (e.g., SendGrid, AWS SES, Resend)
- Test email delivery

## Testing the Flow

### Test Email Confirmation Disabled (Immediate Login)

1. Go to signup page
2. Enter email, username, password
3. Click "Create Account"
4. Should see: "Account created successfully! Redirecting..."
5. Should be immediately logged in and redirected to home

### Test Email Confirmation Enabled

1. Go to signup page
2. Enter email, username, password
3. Click "Create Account"
4. Should see: "Account created! Please check your email..."
5. Check email inbox for confirmation link
6. Click confirmation link
7. Should redirect to app
8. Now user can login with email/password

## Verification Steps

Run these checks to ensure everything works:

```bash
# 1. Test duplicate email (should fail)
curl -X POST https://plantspack.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"existing@example.com","password":"test123","username":"test"}'

# 2. Test duplicate username (should fail)
curl -X POST https://plantspack.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"new@example.com","password":"test123","username":"existinguser"}'

# 3. Test successful signup
curl -X POST https://plantspack.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"newuser@example.com","password":"securepass123","username":"newuser","firstName":"John","lastName":"Doe"}'
```

## Manual Configuration Required

**YOU NEED TO CHECK THESE SETTINGS IN SUPABASE:**

1. **Navigate to Supabase Dashboard**
   - URL: https://supabase.com/dashboard/project/YOUR_PROJECT_ID

2. **Check Email Confirmation Status**
   - Go to: Authentication → Providers → Email
   - Check if "Confirm email" is ON or OFF
   - **Recommended for testing**: Turn OFF
   - **Recommended for production**: Turn ON

3. **If Email Confirmation is ON, verify:**
   - Email templates are configured
   - SMTP is working (send test email)
   - Redirect URL is set to: `https://plantspack.com/auth/callback`

4. **Test Registration**
   - Create a new account
   - Verify the flow works as expected

## Current Implementation

- **SignupForm** → calls `/api/auth/signup`
- **API validates** → email, username, password
- **Creates Supabase auth user** → with metadata
- **Creates profile** → if email confirmation disabled
- **Sends welcome email** → via Resend (separate from auth emails)

## Troubleshooting

**Login not working after signup:**
- Check if email confirmation is enabled
- Verify user confirmed their email
- Check Supabase auth logs for errors

**Email not received:**
- Check SMTP configuration in Supabase
- Check spam/junk folder
- Verify email template is configured
- Test with Supabase's test email feature

**Username or email shows as available but signup fails:**
- Server-side validation is authoritative
- Client-side checks are for UX only
- Clear error message will explain the issue
