# Supabase Authentication Configuration Guide

This document outlines the required Supabase dashboard configuration for the PlantsPack authentication system.

## Overview

The authentication system has been updated to:
- ✅ Require email confirmation before login
- ✅ Provide clear error messages for login failures
- ✅ Support password reset functionality
- ✅ Allow social logins (Google/Facebook) without email confirmation
- ✅ Use custom email templates

## Required Supabase Dashboard Configuration

### 1. Email Authentication Settings

Navigate to: **Authentication > Providers > Email**

Configure the following settings:

#### Basic Settings
- **Enable email provider**: ✅ Enabled
- **Enable email signup**: ✅ Enabled
- **Confirm email**: ✅ **ENABLED** (Critical for security)
- **Secure email change**: ✅ Enabled
- **Secure password change**: ✅ Enabled

#### Rate Limiting (Optional but Recommended)
- **Minimum interval between emails**: 5 seconds (prevents spam)

### 2. Email Templates

Navigate to: **Authentication > Email Templates**

#### Confirmation Email (Signup)
- **Subject**: `Confirm Your Email - PlantsPack`
- **Template**: Use the template from `supabase/templates/confirmation.html`
- **Redirect URL**: `https://plantspack.com/auth/callback` (or your domain)

#### Password Recovery
- **Subject**: `Reset Your Password - PlantsPack`
- **Template**: Use the template from `supabase/templates/recovery.html`
- **Redirect URL**: `https://plantspack.com/auth/update-password`

#### Email Change Confirmation
- **Subject**: `Confirm Your Email Change - PlantsPack`
- **Template**: Use the template from `supabase/templates/email_change.html`
- **Redirect URL**: `https://plantspack.com/auth/callback`

#### Magic Link
- **Subject**: `Your Magic Sign-in Link - PlantsPack`
- **Template**: Use the template from `supabase/templates/magic_link.html`
- **Redirect URL**: `https://plantspack.com/auth/callback`

#### Invite User
- **Subject**: `You've Been Invited to PlantsPack`
- **Template**: Use the template from `supabase/templates/invite.html`
- **Redirect URL**: `https://plantspack.com/auth/callback`

### 3. SMTP Configuration (Production)

Navigate to: **Project Settings > Auth > SMTP Settings**

For production, configure your SMTP provider (recommended: SendGrid, AWS SES, or Mailgun):

```
SMTP Host: smtp.sendgrid.net
SMTP Port: 587
SMTP User: apikey
SMTP Password: [Your SendGrid API Key]
Sender Name: PlantsPack
Sender Email: noreply@plantspack.com
```

**Important**:
- In development, Supabase uses Inbucket (local email testing)
- In production, you MUST configure SMTP or emails won't be delivered

### 4. URL Configuration

Navigate to: **Authentication > URL Configuration**

Configure redirect URLs:

#### Site URL
```
Production: https://plantspack.com
Development: http://localhost:3000
```

#### Redirect URLs (Allowed list)
```
https://plantspack.com/**
https://www.plantspack.com/**
http://localhost:3000/**
```

### 5. OAuth Providers (Google & Facebook)

#### Google OAuth
Navigate to: **Authentication > Providers > Google**

1. **Enable Google provider**: ✅ Enabled
2. **Client ID**: From Google Cloud Console
3. **Client Secret**: From Google Cloud Console
4. **Authorized redirect URIs** in Google Console:
   ```
   https://[your-project-ref].supabase.co/auth/v1/callback
   ```

**Skip email verification for OAuth users**: ✅ Enabled
(This allows OAuth users to skip email confirmation since their email is already verified by Google)

#### Facebook OAuth
Navigate to: **Authentication > Providers > Facebook**

1. **Enable Facebook provider**: ✅ Enabled
2. **Facebook App ID**: From Facebook Developer Console
3. **Facebook App Secret**: From Facebook Developer Console
4. **Valid OAuth Redirect URIs** in Facebook Console:
   ```
   https://[your-project-ref].supabase.co/auth/v1/callback
   ```

**Skip email verification for OAuth users**: ✅ Enabled

### 6. Password Requirements

Navigate to: **Authentication > Auth Policies**

Minimum password length: **6 characters** (configurable)

For stronger security, you can enforce:
- Upper and lowercase letters
- Numbers
- Special characters

Current implementation enforces these in the update-password page but not in signup (for better UX).

### 7. Session & Token Settings

Navigate to: **Authentication > Auth Policies**

- **JWT expiry**: 3600 seconds (1 hour)
- **Refresh token rotation**: ✅ Enabled
- **Reuse interval**: 10 seconds

## Testing Email Flow

### Local Development

1. Start Supabase locally:
   ```bash
   supabase start
   ```

2. Access Inbucket (local email testing):
   ```
   http://localhost:54324
   ```

3. All emails sent during local development appear in Inbucket.

### Production Testing

1. Register a test account with a real email address
2. Check your inbox for the confirmation email
3. Click the confirmation link
4. Try to log in before confirming (should show error)
5. After confirming, login should work

## Common Issues & Solutions

### Issue 1: Emails Not Being Received

**Cause**: SMTP not configured in production
**Solution**: Configure SMTP settings in Supabase dashboard (see section 3)

### Issue 2: Users Can Login Without Email Confirmation

**Cause**: "Confirm email" setting is disabled
**Solution**: Enable "Confirm email" in Authentication > Providers > Email

### Issue 3: Password Reset Link Goes to Homepage

**Cause**: Incorrect redirect URL in email template or settings
**Solution**:
1. Update email template redirect to `/auth/update-password`
2. Add the full URL to allowed redirect URLs list

### Issue 4: OAuth Users Can't Login

**Cause**: Email verification required for OAuth users
**Solution**: In each OAuth provider settings, enable "Skip email verification"

### Issue 5: "Invalid credentials" Error with Correct Password

**Possible causes**:
1. Email not confirmed (check user in Supabase dashboard)
2. User trying to use password on OAuth account
3. Typo in password

**Solution**: Check error message - the updated code provides specific feedback

## Environment Variables Required

Ensure these are set in your production environment:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]

# OAuth (if using)
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=[google-client-id]
SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=[google-client-secret]
SUPABASE_AUTH_EXTERNAL_FACEBOOK_CLIENT_ID=[facebook-app-id]
SUPABASE_AUTH_EXTERNAL_FACEBOOK_SECRET=[facebook-app-secret]
```

## Email Template Variables

The following variables are available in email templates:

- `{{ .ConfirmationURL }}` - The confirmation/action URL
- `{{ .Token }}` - The confirmation token (raw)
- `{{ .TokenHash }}` - The hashed token
- `{{ .SiteURL }}` - Your site URL
- `{{ .Email }}` - User's email address
- `{{ .Data }}` - Custom user metadata

## Monitoring & Debugging

### Check User Confirmation Status

1. Go to Supabase Dashboard > Authentication > Users
2. Find the user
3. Check the "Email Confirmed" column
4. You can manually confirm emails if needed

### View Auth Logs

1. Go to Supabase Dashboard > Logs > Auth Logs
2. Filter by event type (signup, login, password_recovery, etc.)
3. Look for error messages

### Common Log Events

- `signup` - User registration
- `login` - User login attempt
- `token_refreshed` - Session refresh
- `password_recovery` - Password reset request
- `user_confirmation` - Email confirmation

## Security Best Practices

1. ✅ **Always require email confirmation in production**
2. ✅ **Use HTTPS in production**
3. ✅ **Configure proper redirect URLs** (don't use wildcards)
4. ✅ **Enable secure password change**
5. ✅ **Use strong JWT secrets** (auto-generated by Supabase)
6. ✅ **Monitor auth logs** for suspicious activity
7. ✅ **Rate limit authentication endpoints** (configured in config.toml)

## Support

For issues or questions:
- Check Supabase Auth documentation: https://supabase.com/docs/guides/auth
- Review application logs
- Check Supabase dashboard logs
- Test email flow in local Inbucket first

---

Last updated: 2026-02-06
