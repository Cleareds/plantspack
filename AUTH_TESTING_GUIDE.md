# Authentication Testing Guide

This guide helps you test the authentication flow to ensure everything works correctly.

## Pre-Testing Setup

### 1. Local Development Setup

```bash
# Start Supabase local development
supabase start

# Access Inbucket (email testing) at:
http://localhost:54324

# Start Next.js development server
npm run dev
```

### 2. Production Setup Checklist

Before testing in production, ensure:
- [ ] SMTP is configured in Supabase dashboard
- [ ] Email confirmation is enabled
- [ ] Email templates are uploaded
- [ ] OAuth providers are configured (if using)
- [ ] Redirect URLs are whitelisted

## Test Cases

### Test 1: Email Registration with Confirmation

**Purpose**: Verify users must confirm email before logging in

**Steps**:
1. Navigate to `/auth?mode=signup`
2. Fill in registration form:
   - Email: `test@example.com`
   - Username: `testuser`
   - Password: `Test123!`
3. Submit the form

**Expected Results**:
- ✅ Success message: "Account created! Please check your email to verify your address before signing in."
- ✅ Email received with confirmation link
- ✅ Email subject: "Confirm Your Email - PlantsPack"
- ✅ Email has PlantsPack branding

**Test Login Before Confirmation**:
4. Try to log in with the credentials

**Expected Result**:
- ❌ Error: "Please verify your email address before signing in. Check your inbox for the confirmation link."

**Complete Confirmation**:
5. Open email and click confirmation link
6. Should redirect to homepage
7. Try logging in again

**Expected Result**:
- ✅ Login successful
- ✅ Redirected to homepage
- ✅ User profile created in database

**Database Verification**:
```sql
-- Check user exists with confirmed email
SELECT email, email_confirmed_at, created_at
FROM auth.users
WHERE email = 'test@example.com';

-- Check profile was created
SELECT id, email, username, created_at
FROM public.users
WHERE email = 'test@example.com';
```

---

### Test 2: Password Reset Flow

**Purpose**: Verify password reset works correctly

**Steps**:
1. Navigate to `/auth`
2. Click "Forgot password?"
3. Enter email: `test@example.com`
4. Submit

**Expected Results**:
- ✅ Success message: "We've sent a password reset link to test@example.com"
- ✅ Email received
- ✅ Email subject: "Reset Your Password - PlantsPack"

**Complete Reset**:
5. Click reset link in email
6. Should redirect to `/auth/update-password`
7. Enter new password (must meet requirements)
8. Submit

**Expected Results**:
- ✅ Success message: "Password Updated!"
- ✅ Auto-redirect to homepage after 2 seconds
- ✅ Can log in with new password

**Verify Old Password Doesn't Work**:
9. Log out
10. Try logging in with old password

**Expected Result**:
- ❌ Error: "Invalid email or password"

---

### Test 3: Google OAuth Login

**Purpose**: Verify Google login works without email confirmation

**Steps**:
1. Navigate to `/auth`
2. Click "Google" button
3. Complete Google OAuth flow

**Expected Results**:
- ✅ Redirected to Google login
- ✅ After authorization, redirected back to app
- ✅ Automatically logged in (no email confirmation required)
- ✅ Profile created automatically
- ✅ Username auto-generated from Google account
- ✅ Avatar copied from Google profile

**Database Verification**:
```sql
-- Check OAuth user
SELECT email, raw_user_meta_data->>'provider' as provider
FROM auth.users
WHERE email = '[google-email]';

-- Check profile
SELECT username, first_name, last_name, avatar_url
FROM public.users
WHERE email = '[google-email]';
```

---

### Test 4: Facebook OAuth Login

**Purpose**: Verify Facebook login works

**Steps**:
1. Navigate to `/auth`
2. Click "Facebook" button
3. Complete Facebook OAuth flow

**Expected Results**:
- ✅ Similar to Google test
- ✅ No email confirmation required
- ✅ Profile auto-created

---

### Test 5: Login Error Handling

**Purpose**: Verify proper error messages for various scenarios

**Test 5a: User Not Found**
1. Try logging in with email that doesn't exist

**Expected Result**:
- ❌ Error: "No account found with this email address"

**Test 5b: Wrong Password**
1. Log in with correct email, wrong password

**Expected Result**:
- ❌ Error: "Invalid email or password"

**Test 5c: Unconfirmed Email**
1. Register new account
2. Try logging in before confirming

**Expected Result**:
- ❌ Error: "Please verify your email address before signing in. Check your inbox for the confirmation link."

**Test 5d: Username Login**
1. Log in with username instead of email

**Expected Result**:
- ✅ Should work if username exists
- ❌ "Invalid username or password" if wrong

---

### Test 6: Registration Validation

**Purpose**: Verify registration form validation

**Test 6a: Duplicate Email**
1. Try registering with existing email

**Expected Result**:
- ❌ Error: "An account with this email already exists. Please sign in instead."

**Test 6b: Duplicate Username**
1. Enter existing username
2. Should show red X and error message

**Expected Result**:
- ❌ "Username is already taken"

**Test 6c: Available Username**
1. Enter unique username
2. Should show green checkmark

**Expected Result**:
- ✅ "Username is available!"

**Test 6d: Weak Password**
1. Try password less than 6 characters

**Expected Result**:
- ❌ Error: "Password must be at least 6 characters"

**Test 6e: Password Mismatch**
1. Enter different passwords in password fields

**Expected Result**:
- ❌ Error: "Passwords do not match"

---

### Test 7: Email Templates

**Purpose**: Verify all email templates are working

**Emails to Check**:
1. **Confirmation Email**
   - Sent on signup
   - Has PlantsPack branding
   - Button works
   - Link expires after 24 hours

2. **Password Recovery Email**
   - Sent on password reset
   - Has security warning
   - Link works
   - Link expires after 1 hour

3. **Email Change Email**
   - Sent when user changes email
   - Requires confirmation on both old and new email

4. **Magic Link Email** (if enabled)
   - Passwordless login
   - Link works
   - Link expires after 1 hour

---

### Test 8: Session Management

**Purpose**: Verify sessions work correctly

**Test 8a: Session Persistence**
1. Log in
2. Close browser
3. Reopen browser

**Expected Result**:
- ✅ Still logged in

**Test 8b: Session Refresh**
1. Log in
2. Wait for token to expire (after 1 hour)

**Expected Result**:
- ✅ Automatically refreshed
- ✅ User stays logged in

**Test 8c: Logout**
1. Log in
2. Click logout

**Expected Result**:
- ✅ Redirected to auth page
- ✅ Can't access protected pages

---

### Test 9: Profile Creation

**Purpose**: Verify profile is created correctly

**Scenarios to Test**:

**9a: Email Registration**
- Profile created on email confirmation
- Username from form data
- Email from form data

**9b: OAuth Registration**
- Profile created immediately
- Username from OAuth data or auto-generated
- Avatar from OAuth provider

**9c: Username Uniqueness**
- If username exists, auto-append number
- Example: `john` → `john1` → `john2`

---

### Test 10: Callback Error Handling

**Purpose**: Verify OAuth callback handles errors

**Test Steps**:
1. Start OAuth flow
2. Decline authorization on provider
3. Check redirect

**Expected Result**:
- ✅ Redirected to `/auth?error=...`
- ✅ Error message shown on auth page

---

## Performance Tests

### Load Testing Email Confirmation

1. Register 10 accounts quickly
2. Check all emails arrive
3. Confirm all emails work

**Expected Result**:
- ✅ All emails delivered
- ✅ No rate limit errors
- ✅ All confirmations work

---

## Security Tests

### Test 11: SQL Injection Protection

Try entering SQL in forms:
```
email: test@test.com'; DROP TABLE users; --
username: admin' OR '1'='1
```

**Expected Result**:
- ✅ Treated as literal strings
- ✅ No SQL executed

### Test 12: XSS Protection

Try entering scripts:
```
username: <script>alert('xss')</script>
```

**Expected Result**:
- ✅ Escaped/sanitized
- ✅ No script execution

### Test 13: CSRF Protection

**Expected Result**:
- ✅ Supabase handles CSRF automatically

---

## Browser Compatibility Tests

Test in:
- ✅ Chrome
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ✅ Mobile Safari
- ✅ Mobile Chrome

---

## Accessibility Tests

1. Tab through forms
2. Use screen reader
3. Check color contrast

**Expected Results**:
- ✅ Keyboard navigation works
- ✅ Form labels readable
- ✅ Error messages announced

---

## Edge Cases

### Test 14: Email Case Sensitivity

1. Register with `Test@Example.com`
2. Try logging in with `test@example.com`

**Expected Result**:
- ✅ Should work (emails are case-insensitive)

### Test 15: Whitespace Handling

1. Register with username `test user`

**Expected Result**:
- ✅ Spaces removed automatically → `testuser`

### Test 16: Network Errors

1. Disable network
2. Try logging in
3. Re-enable network

**Expected Result**:
- ✅ Error shown
- ✅ Can retry when network returns

---

## Production Verification Checklist

Before going live:

### Configuration
- [ ] Email confirmation enabled in Supabase
- [ ] SMTP configured and tested
- [ ] Email templates uploaded
- [ ] Redirect URLs whitelisted
- [ ] OAuth providers configured
- [ ] Environment variables set

### Functionality
- [ ] Registration works
- [ ] Email confirmation works
- [ ] Login works
- [ ] Logout works
- [ ] Password reset works
- [ ] OAuth login works
- [ ] Error messages clear
- [ ] Email templates branded

### Security
- [ ] HTTPS enabled
- [ ] JWT secrets secure
- [ ] RLS policies active
- [ ] Rate limiting configured
- [ ] SQL injection protected
- [ ] XSS protected

### Monitoring
- [ ] Error tracking enabled (Sentry)
- [ ] Auth logs monitored
- [ ] Email delivery monitored
- [ ] Failed login attempts tracked

---

## Troubleshooting Common Issues

### Issue: Emails not received

**Checks**:
1. Is SMTP configured?
2. Check spam folder
3. Check Supabase logs
4. Verify email service is working
5. Check rate limits

### Issue: Password reset link goes to homepage

**Fix**:
1. Update email template redirect URL
2. Check allowed redirect URLs
3. Verify `/auth/update-password` route exists

### Issue: OAuth profile not created

**Checks**:
1. Check callback route logs
2. Verify admin client permissions
3. Check RLS policies
4. Look for database errors

### Issue: "Invalid credentials" with correct password

**Possible Causes**:
1. Email not confirmed
2. Using OAuth email with password
3. Typo in password
4. Account doesn't exist

---

## Monitoring in Production

### Key Metrics to Track

1. **Registration Rate**
   - New signups per day
   - Confirmation rate (confirmed / registered)

2. **Login Success Rate**
   - Successful logins / total attempts
   - Failed login reasons

3. **Email Delivery**
   - Sent vs delivered
   - Bounce rate
   - Time to delivery

4. **OAuth Usage**
   - Google vs Facebook vs Email
   - OAuth success rate

### Alerts to Set Up

- Email delivery failures
- High failed login rate
- Unusual signup patterns
- SMTP errors
- Database errors

---

## Test Result Template

```markdown
# Auth Testing Results - [Date]

## Environment: [Local/Production]

### Test 1: Email Registration ✅/❌
- Registration: ✅
- Email sent: ✅
- Confirmation: ✅
- Login: ✅
- Notes: [any issues]

### Test 2: Password Reset ✅/❌
[continue for all tests...]

## Issues Found
1. [Issue description]
   - Severity: High/Medium/Low
   - Status: Open/Fixed
   - Notes: [details]

## Overall Status: ✅ Pass / ❌ Fail
```

---

Last updated: 2026-02-06
