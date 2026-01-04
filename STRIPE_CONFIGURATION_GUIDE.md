# Stripe Configuration Guide for PlantsPack

## Current Status
✅ Stripe checkout is working
✅ Test mode is configured
⚠️ Webhooks need configuration for automatic subscription updates
⚠️ Customer Portal needs configuration for subscription management

## 1. Configure Customer Portal (Required for "Manage Subscription")

### Steps:
1. Go to: https://dashboard.stripe.com/test/settings/billing/portal
2. **Activate the customer portal** if not already active
3. Configure these settings:

#### Features to Enable:
- ✅ **Update subscriptions**
  - Allow customers to switch plans
  - Proration: "Always invoice immediately" (for upgrades to take effect immediately)
  - Choose: "Charge for the prorated amount"

- ✅ **Cancel subscriptions**
  - Choose: "At the end of billing period" (keeps access until paid period ends)
  - Allow customers to reactivate subscriptions

- ✅ **Update payment methods**
  - Allow customers to add/remove payment methods

#### Subscription Changes Behavior:
**For Upgrades (Supporter → Premium):**
- Proration: **"Always invoice immediately"**
- This will:
  - Charge prorated amount for upgrade
  - Start Premium access immediately
  - Credit unused Supporter time

**For Downgrades (Premium → Supporter or to Free):**
- Schedule change: **"At the end of billing period"**
- This will:
  - Keep current tier until period ends
  - Downgrade happens on renewal date
  - Customer keeps paid access

4. **Save Changes**

## 2. Configure Webhooks (Required for Automatic Subscription Updates)

### Current Webhook Setup:
- **Endpoint URL:** `https://plantspack.com/api/stripe/webhooks`
- **Webhook Secret:** `whsec_iKhus9nCaClXgF00uE4ndKQkkFcPI5k8`

### Steps to Configure:
1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click **"Add endpoint"**
3. **Endpoint URL:** `https://plantspack.com/api/stripe/webhooks`
4. **Description:** "PlantsPack Subscription Events"
5. **Events to send:** Select these specific events:
   - ✅ `checkout.session.completed` - When customer completes payment
   - ✅ `customer.subscription.created` - When subscription is created
   - ✅ `customer.subscription.updated` - When subscription changes (upgrade/downgrade)
   - ✅ `customer.subscription.deleted` - When subscription is canceled
   - ✅ `invoice.payment_succeeded` - When recurring payment succeeds
   - ✅ `invoice.payment_failed` - When payment fails
6. Click **"Add endpoint"**
7. **Copy the Signing Secret** (starts with `whsec_...`)
8. Verify it matches: `whsec_iKhus9nCaClXgF00uE4ndKQkkFcPI5k8`

### Testing Webhooks:
1. In Stripe Dashboard, go to your webhook
2. Click **"Send test webhook"**
3. Select `checkout.session.completed`
4. Click **"Send test webhook"**
5. Check the response - should return `200 OK`

## 3. Database Requirements

### Required Database Function:
The webhook calls `update_user_subscription` RPC function. If it doesn't exist, the webhook has a fallback that directly updates the users table.

Current fallback updates:
```sql
UPDATE users SET
  subscription_tier = 'medium' OR 'premium',
  subscription_status = 'active' OR 'canceled' OR 'past_due',
  stripe_subscription_id = 'sub_...',
  stripe_customer_id = 'cus_...',
  updated_at = NOW()
WHERE id = user_id;
```

## 4. Expected Subscription Flow

### New Subscription (Checkout):
1. User clicks "Upgrade to Supporter"
2. Redirected to Stripe Checkout
3. Completes payment
4. Stripe sends `checkout.session.completed` webhook
5. Webhook creates/updates subscription in database
6. User sees Supporter features immediately

### Upgrade (Supporter → Premium):
1. User clicks "Manage Subscription"
2. Opens Stripe Customer Portal
3. Clicks "Update plan" → selects Premium
4. **Immediately charged** prorated amount
5. Stripe sends `customer.subscription.updated` webhook
6. Webhook updates tier to `premium`
7. **Premium access starts immediately**

### Downgrade (Premium → Supporter):
1. User clicks "Manage Subscription"
2. Opens Stripe Customer Portal
3. Clicks "Update plan" → selects Supporter
4. **Scheduled for end of period** (keeps Premium until paid time ends)
5. Stripe sends `customer.subscription.updated` webhook with `cancel_at_period_end`
6. Webhook updates but keeps Premium tier until period ends
7. On renewal date, Stripe sends another update webhook
8. Webhook downgrades to Supporter tier

### Cancel (Any → Free):
1. User clicks "Manage Subscription" → "Cancel"
2. **Keeps access until end of billing period**
3. Stripe sends `customer.subscription.updated` with `cancel_at_period_end = true`
4. On end date, Stripe sends `customer.subscription.deleted`
5. Webhook sets tier to `free`

## 5. Pricing Configuration

### Current Test Mode Prices:
- **Supporter:** `price_1SlvIEAqP7U8Au3xiz7C42sV` ($3/month)
- **Premium:** `price_1SlvIgAqP7U8Au3xpHZGuqrf` ($7/month)

### To Configure Pricing Changes:
1. Go to: https://dashboard.stripe.com/test/products
2. Click on a product
3. Add new price if needed
4. Update environment variables in Vercel:
   ```bash
   vercel env add STRIPE_MEDIUM_PRICE_ID production
   vercel env add STRIPE_PREMIUM_PRICE_ID production
   ```

## 6. Switching to Live Mode

When ready for production:

1. **Get Live API Keys:**
   - Go to: https://dashboard.stripe.com/apikeys (NOT test mode)
   - Copy Secret Key (sk_live_...)
   - Copy Publishable Key (pk_live_...)

2. **Create Live Products:**
   - Go to: https://dashboard.stripe.com/products
   - Create products with same tiers
   - Get price IDs (price_...)

3. **Update Environment Variables:**
   ```bash
   vercel env add STRIPE_SECRET_KEY production
   vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
   vercel env add STRIPE_MEDIUM_PRICE_ID production
   vercel env add STRIPE_PREMIUM_PRICE_ID production
   ```

4. **Configure Live Webhook:**
   - Go to: https://dashboard.stripe.com/webhooks
   - Add same endpoint with same events
   - Update `STRIPE_WEBHOOK_SECRET` in Vercel

5. **Configure Live Customer Portal:**
   - Go to: https://dashboard.stripe.com/settings/billing/portal
   - Configure same settings as test mode

## 7. Testing Checklist

- [ ] Test new Supporter subscription
- [ ] Test new Premium subscription
- [ ] Test upgrade from Supporter to Premium (should be immediate)
- [ ] Test downgrade from Premium to Supporter (should schedule for period end)
- [ ] Test cancellation (should keep access until period end)
- [ ] Test payment method update in portal
- [ ] Test webhook receives all events
- [ ] Verify subscription status in database matches Stripe

## 8. Troubleshooting

### "Manage Subscription" button doesn't work:
- User must have a real Stripe subscription (not manually activated)
- Check if user has `stripe_customer_id` in database
- Customer Portal must be activated in Stripe Dashboard

### Subscription doesn't update after payment:
- Check webhook endpoint is configured
- Check webhook secret matches
- Look at webhook logs in Stripe Dashboard
- Check Vercel function logs

### Wrong tier after upgrade/downgrade:
- Check webhook received the event
- Check proration settings in Customer Portal
- Verify RPC function or fallback is working

## 9. Current Limitations (To Fix)

1. ⚠️ Webhook doesn't update database automatically yet
   - **Workaround:** Manual activation for now
   - **Fix:** Configure webhook properly in Stripe Dashboard

2. ⚠️ "Manage Subscription" requires real Stripe subscription
   - **Workaround:** Create real test subscription
   - **Not an issue:** Works fine for real customers

3. ⚠️ Success message shows wrong tier initially
   - **Fix:** Already fixed in code - shows "Supporter features" or "Premium features" based on tier
