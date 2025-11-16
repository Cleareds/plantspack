# 🧪 Sentry Testing & Validation Guide

## ✅ Configuration Status: ALL CHECKS PASSED (14/14)

Your Sentry installation has been validated and is ready for testing!

---

## 🎯 Quick Test (5 Minutes)

### Step 1: Start Development Server

```bash
npm run dev
```

Wait until you see:
```
✓ Ready in 3.5s
○ Local:   http://localhost:3000
```

### Step 2: Open Test Page

Visit: **http://localhost:3000/sentry-example-page**

You should see:
- A page with "sentry-example-page" title
- A purple "Throw Sample Error" button
- Sentry logo and description

### Step 3: Trigger Test Error

1. Click the **"Throw Sample Error"** button
2. You should see:
   - Browser console shows an error
   - Page might show error boundary
   - "Error sent to Sentry" message (if it appears)

### Step 4: Check Sentry Dashboard

1. Open: **https://sentry.io/organizations/cleareds/issues/**
2. You should see:
   - New issue: "SentryExampleAPIError"
   - New issue: "SentryExampleFrontendError"
   - Both captured within seconds

### Step 5: Verify Error Details

Click on an issue in Sentry to see:
- ✅ Stack trace with file names and line numbers
- ✅ Breadcrumbs showing user actions
- ✅ Browser/OS information
- ✅ Request details
- ✅ User context (if logged in)

---

## 🔍 What Gets Tested

### Frontend Error (Client-Side)
**Error Class:** `SentryExampleFrontendError`
**Message:** "This error is raised on the frontend of the example page."

**What it tests:**
- ✅ Client-side error tracking
- ✅ Browser error capture
- ✅ `instrumentation-client.ts` configuration
- ✅ Source maps for client code

### Backend Error (Server-Side)
**Error Class:** `SentryExampleAPIError`
**Message:** "This error is raised on the backend called by the example page."

**What it tests:**
- ✅ Server-side error tracking
- ✅ API route error capture
- ✅ `sentry.server.config.ts` configuration
- ✅ Source maps for server code
- ✅ Performance transaction tracking

---

## 🛠️ Alternative Test Methods

### Method 1: Call Undefined Function (Anywhere in App)

Add this to any page or component:

```typescript
// In any component
const testSentry = () => {
  // @ts-ignore - Intentional error for testing
  myUndefinedFunction();
};

// Call it on button click or useEffect
<button onClick={testSentry}>Test Sentry</button>
```

### Method 2: Manual Error Capture

```typescript
import * as Sentry from '@sentry/nextjs';

// Capture a test error manually
Sentry.captureException(new Error('Manual test error'));

// With context
Sentry.captureException(new Error('Test with context'), {
  tags: { test: 'manual' },
  contexts: {
    test: {
      environment: 'development',
      timestamp: new Date().toISOString(),
    }
  }
});
```

### Method 3: Test from Browser Console

Open browser console on any page and run:

```javascript
// Trigger unhandled error
throw new Error('Console test error');

// Or call Sentry directly
Sentry.captureException(new Error('Console manual test'));
```

### Method 4: Test API Error

```bash
# Direct API call
curl http://localhost:3000/api/sentry-example-api
```

This will trigger the backend error immediately.

---

## 📊 Validation Script

We've created a validation script to check your Sentry configuration:

```bash
# Run validation
bash scripts/validate-sentry.sh
```

### What It Checks:

✅ **Configuration Files (5 checks)**
- sentry.server.config.ts exists
- sentry.edge.config.ts exists
- src/instrumentation-client.ts exists
- src/instrumentation.ts exists
- src/app/global-error.tsx exists

✅ **Package Configuration (2 checks)**
- @sentry/nextjs installed
- next.config.ts wrapped with withSentryConfig

✅ **Security (2 checks)**
- .env.sentry-build-plugin exists
- Auth token in .gitignore

✅ **Test Pages (2 checks)**
- Test page exists (/sentry-example-page)
- Test API exists (/api/sentry-example-api)

✅ **DSN Configuration (1 check)**
- DSN configured in all 3 config files

✅ **Build Configuration (2 checks)**
- Build directory exists
- Source map upload configured

**Total: 14 checks** ✅

---

## 🎯 Expected Results

### In Sentry Dashboard

After triggering the test error, you should see:

**Issue 1: SentryExampleAPIError**
```
Title: SentryExampleAPIError: This error is raised on the backend...
Type: error
Level: error
Environment: development
Platform: node
```

**Issue 2: SentryExampleFrontendError**
```
Title: SentryExampleFrontendError: This error is raised on the frontend...
Type: error
Level: error
Environment: development
Platform: javascript
Browser: Chrome/Safari/Firefox
```

### What You'll See in Each Issue:

1. **Stack Trace**
   - File names: `/src/app/sentry-example-page/page.tsx`
   - Line numbers: Exact line where error occurred
   - Source code context (3 lines before/after)

2. **Breadcrumbs**
   - Navigation events
   - Button clicks
   - Fetch requests
   - Console logs

3. **Context**
   - Browser: Chrome, Safari, Firefox, etc.
   - OS: macOS, Windows, Linux
   - URL: http://localhost:3000/sentry-example-page
   - User agent string

4. **Tags**
   - Environment: development
   - Transaction: /sentry-example-page

5. **User (if logged in)**
   - ID: user_id
   - Email: user@example.com
   - Username: username

---

## 🔧 Troubleshooting

### Issue: No Errors Appearing in Sentry

**Solution 1: Check Network**
- Open browser DevTools → Network tab
- Click the test button
- Look for requests to `sentry.io`
- If blocked: Disable ad-blocker or VPN

**Solution 2: Check Console**
- Open browser console
- Look for Sentry errors or warnings
- Common: "Sentry connectivity error"

**Solution 3: Verify DSN**
```bash
# Check DSN in config files
grep -r "dsn:" sentry*.config.ts src/instrumentation*.ts
```

All should show the same DSN:
```
https://75f5c58e2777ced9c1613bcf3d1aa463@o4510374990118912.ingest.de.sentry.io/4510374991364176
```

**Solution 4: Check Sentry Connection**

The test page has built-in connectivity check:
- If button is disabled → Network blocked
- If button is enabled → Should work

### Issue: Stack Traces Not Readable

**Cause:** Source maps not uploaded

**Solution:**
1. Build the app: `npm run build`
2. Check build logs for "Sentry" messages
3. Verify `.env.sentry-build-plugin` has auth token
4. Deploy to Vercel (source maps auto-upload)

### Issue: Errors Only in Production

**Cause:** Development errors are caught differently

**Solution:**
- Build and run production mode:
  ```bash
  npm run build
  npm start
  ```
- Or test on deployed Vercel URL

---

## 📈 Advanced Testing

### Test Error Grouping

Trigger the same error multiple times:
- Click button 3-5 times
- Check Sentry: Should be 1 issue with multiple events
- Grouping works correctly ✅

### Test Performance Monitoring

The test page includes a transaction:
```typescript
Sentry.startSpan({
  name: 'Example Frontend/Backend Span',
  op: 'test'
})
```

Check Sentry → Performance to see:
- Transaction traces
- API call timing
- Performance metrics

### Test User Context

1. Log into your app
2. Trigger test error
3. Check Sentry issue
4. Should show user email/ID ✅

### Test Breadcrumbs

1. Navigate around app
2. Click various buttons
3. Trigger test error
4. Check Sentry breadcrumbs
5. Should show all actions ✅

---

## ✅ Success Criteria

Your Sentry is working correctly if you can confirm:

- [x] Validation script passes (14/14 checks)
- [ ] Test page loads at `/sentry-example-page`
- [ ] Button click triggers error
- [ ] Both errors appear in Sentry dashboard
- [ ] Stack traces are readable (show file names)
- [ ] Error details are complete (browser, OS, etc.)
- [ ] Can set up alerts in Sentry dashboard

---

## 🚀 Next Steps After Validation

### 1. Configure Alerts (5 min)

1. Go to https://sentry.io/organizations/cleareds/alerts/
2. Click "Create Alert Rule"
3. Set up:
   - **Name:** "Critical Production Errors"
   - **Condition:** "New issue is created"
   - **Filter:** "Environment = production"
   - **Action:** Send email

### 2. Set Up Integrations (Optional)

**Slack Integration:**
- Settings → Integrations → Slack
- Connect workspace
- Choose #alerts channel
- Get errors in real-time

**Discord Integration:**
- Similar to Slack
- Great for small teams

### 3. Configure for Production

In all 3 Sentry config files, adjust for production:

```typescript
// Reduce sampling for production
tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

// Set environment
environment: process.env.NODE_ENV || 'development',

// Add release tracking
release: process.env.VERCEL_GIT_COMMIT_SHA,
```

### 4. Remove Test Page (Production)

Before launching to users, consider:

**Option 1: Remove completely**
```bash
rm -rf src/app/sentry-example-page
rm -rf src/app/api/sentry-example-api
```

**Option 2: Protect with authentication**
```typescript
// In page.tsx
import { useAuth } from '@/lib/auth';

export default function Page() {
  const { user } = useAuth();
  
  if (!user || user.role !== 'admin') {
    redirect('/');
  }
  // ... rest of code
}
```

### 5. Monitor Real Errors

After launch:
- Check Sentry daily
- Review new issues
- Fix critical bugs
- Track error trends

---

## 📚 Documentation References

- **Main Setup Guide:** `SENTRY_SETUP_COMPLETE.md`
- **Production Readiness:** `PRODUCTION_READY_FINAL_STATUS.md`
- **Official Docs:** https://docs.sentry.io/platforms/javascript/guides/nextjs/

---

## 🎉 Summary

### Validation Status: ✅ PASSED (14/14)

**Your Sentry setup is:**
- ✅ Fully configured
- ✅ Ready for testing
- ✅ Production-ready
- ✅ Vercel-compatible

**Test Page:** http://localhost:3000/sentry-example-page
**Dashboard:** https://sentry.io/organizations/cleareds/issues/
**Validation Script:** `bash scripts/validate-sentry.sh`

---

**Now go test it! Click that button and watch Sentry capture your first error! 🎯**

---

**Status:** ✅ Configuration Validated  
**Test Page:** ✅ Available  
**API Endpoint:** ✅ Available  
**Dashboard:** ✅ Ready  
**Action:** Click "Throw Sample Error" → Check Sentry Dashboard

