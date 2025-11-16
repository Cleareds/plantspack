# 🎯 Sentry Quick Test Card

## 30-Second Test

```bash
# 1. Validate (2 sec)
bash scripts/validate-sentry.sh

# 2. Start (wait 10 sec)
npm run dev

# 3. Test (open in browser)
http://localhost:3000/sentry-example-page

# 4. Click button: "Throw Sample Error"

# 5. Check dashboard
https://sentry.io/organizations/cleareds/issues/
```

**Expected:** 2 errors appear in Sentry within 5 seconds ✅

---

## Test Page Features

**URL:** /sentry-example-page

**Errors it throws:**
1. Frontend: `SentryExampleFrontendError`
2. Backend: `SentryExampleAPIError`

**What it tests:**
- ✅ Client error tracking
- ✅ Server error tracking
- ✅ Performance monitoring
- ✅ Source maps
- ✅ Connectivity

---

## Validation Results

✅ **14/14 checks passed:**
- 5 config files ✓
- Package installed ✓
- Security configured ✓
- DSN configured ✓
- Source maps ready ✓
- Test pages exist ✓

---

## Quick Alternatives

**Test 1:** Call undefined function
```javascript
myUndefinedFunction();
```

**Test 2:** Manual capture
```javascript
Sentry.captureException(new Error('Test'));
```

**Test 3:** API test
```bash
curl localhost:3000/api/sentry-example-api
```

---

## Troubleshooting

**No errors in Sentry?**
1. Check ad-blocker (disable it)
2. Check browser console for errors
3. Verify DSN: `grep dsn sentry.server.config.ts`

**Button disabled?**
- Network connectivity issue
- Try disabling VPN/ad-blocker

---

## Documentation

- **Full Guide:** `SENTRY_TESTING_GUIDE.md`
- **Setup:** `SENTRY_SETUP_COMPLETE.md`
- **Validation:** `scripts/validate-sentry.sh`

---

## Success = Both Errors in Dashboard

**What you'll see:**
1. Issue: SentryExampleAPIError (backend)
2. Issue: SentryExampleFrontendError (frontend)

**Each with:**
- Stack trace + source code
- Browser/OS info
- Breadcrumbs
- Timestamp

---

**Status:** ✅ Ready to Test
**Time:** < 1 minute
**Action:** Click that button! 🎯

