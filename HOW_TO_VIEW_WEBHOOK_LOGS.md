# How to View Webhook Logs

The webhook now has comprehensive logging. Here's how to view the logs to debug why subscriptions aren't updating:

---

## Option 1: View Logs in Vercel Dashboard (Recommended)

1. Go to: https://vercel.com/cleareds/plantspack
2. Click on the **"Logs"** tab
3. You'll see real-time logs from all your functions

### To see webhook logs:

1. In the Logs tab, filter by **"Functions"**
2. Look for `/api/stripe/webhooks` in the function name
3. Make a subscription change in Stripe portal
4. Watch the logs appear in real-time

### What to look for:

✅ **Success logs:**
```
🔔 ===== STRIPE WEBHOOK RECEIVED =====
✅ Signature verified successfully
📋 Event type: customer.subscription.updated
🔄 Handling subscription update...
📊 ===== SUBSCRIPTION UPDATE HANDLER =====
✅ User ID found: a7eaff5b-70ed-4ca8-b055-4566e2e8014d
💰 Price ID from subscription: price_1SlvIgAqP7U8Au3xpHZGuqrf
✅ Detected tier: PREMIUM
✅ RPC function succeeded!
✅ ===== SUBSCRIPTION UPDATE COMPLETE: premium (active) =====
✅ ===== WEBHOOK PROCESSED SUCCESSFULLY =====
```

❌ **Error logs to watch for:**
- `❌ No userId in subscription metadata!` - Subscription missing userId
- `❌ RPC Error:` - Database update failed
- `⚠️  Unknown price ID:` - Price ID doesn't match configured tiers
- `❌ Webhook signature verification failed:` - Wrong webhook secret

---

## Option 2: Use Vercel CLI

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Login to Vercel
vercel login

# View real-time logs
vercel logs --scope cleareds --follow

# Or view logs for specific deployment
vercel logs [deployment-url] --scope cleareds
```

---

## Option 3: Check Stripe Dashboard

1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click on your webhook endpoint: `https://www.plantspack.com/api/stripe/webhooks`
3. Click **"Attempted webhooks"** tab
4. Find recent events

### Check each event:

- **HTTP Status:**
  - ✅ `200` = Success
  - ❌ `400` = Bad request (signature issue?)
  - ❌ `500` = Server error (check Vercel logs)
  - ❌ `307` = Redirect (should be fixed now)

- **Response Body:**
  - Should see: `{"received":true}`

- **Webhook attempts:**
  - Click on an event to see full request/response
  - Check if Stripe is retrying (indicates failures)

---

## Testing Steps

### 1. Clear Current State

```bash
# Make sure you're on Supporter tier
npx tsx scripts/sync-stripe-subscription.ts
```

### 2. Make a Change in Stripe Portal

1. Go to: https://www.plantspack.com/settings
2. Click **"Manage Subscription"**
3. Change to Premium (or back to Supporter)
4. Wait for portal to redirect

### 3. Check Logs Immediately

**In Vercel Dashboard:**
- Refresh the Logs page
- Look for webhook logs (they appear within seconds)
- Search for "STRIPE WEBHOOK RECEIVED"

**In Stripe Dashboard:**
- Refresh "Attempted webhooks" tab
- Should see new event with 200 status

### 4. Refresh Your Website

- Go to: https://www.plantspack.com/profile/ak.papasoft
- Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
- Check if badge updated

### 5. If Still Not Working

Check the logs for specific errors:

1. **If you see "No userId in subscription metadata":**
   - The subscription created outside of our checkout flow
   - Need to manually add metadata to subscription in Stripe

2. **If you see "RPC Error":**
   - Database function failing
   - Check the specific error code and message in logs

3. **If you don't see webhook logs at all:**
   - Webhook not being called
   - Check Stripe webhook configuration
   - Verify URL is correct with `www`

4. **If tier detection shows "Unknown price ID":**
   - Environment variables not matching
   - Check Vercel environment variables

---

## Quick Debug Script

Run this to see current state vs Stripe:

```bash
npx tsx scripts/cleanup-subscriptions.ts
```

This will show:
- What's in Stripe (actual subscription tier)
- What's in database (what website shows)
- If they don't match, it will sync them

---

## Viewing Specific Deployment Logs

```bash
# List recent deployments
vercel ls --scope cleareds

# View logs for specific deployment
vercel logs [deployment-url] --scope cleareds

# Example:
vercel logs https://plantspack-mzt93mlvs-cleareds.vercel.app --scope cleareds
```

---

## What the Logs Will Tell You

The comprehensive logging will show:

1. **Webhook Receipt:**
   - ✅ Webhook received
   - ✅ Signature verified
   - Event type and ID

2. **Subscription Detection:**
   - User ID from metadata
   - Price ID from subscription items
   - Tier detection (premium/medium/free)
   - Status mapping

3. **Database Update:**
   - RPC function call with all parameters
   - Success or error response
   - Fallback attempt if RPC fails

4. **Completion:**
   - Final tier and status
   - Success confirmation

---

## Next Steps After Viewing Logs

**If webhook is being called and succeeding:**
- Website should update automatically
- Check for browser caching (hard refresh)
- Check if UI is fetching latest data

**If webhook is failing:**
- Share the error logs with me
- I'll help diagnose the specific issue

**If webhook is not being called at all:**
- Check Stripe webhook configuration
- Verify endpoint URL has `www`
- Check webhook secret is correct

---

## Quick Test

1. Make a subscription change in portal
2. Wait 5 seconds
3. Run: `npx tsx scripts/cleanup-subscriptions.ts`
4. See if "Database tier" matches "Stripe tier"

If they match → webhook is working!
If they don't match → check logs to see why webhook failed

