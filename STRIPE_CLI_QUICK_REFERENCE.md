# Stripe CLI Quick Reference

## 🚀 Essential Commands for Development

### Initial Setup (One-Time)
```bash
# Login to Stripe account
stripe login
```

### Daily Development Workflow

#### 1. Start Local Development
```bash
# Terminal 1: Start Next.js dev server
npm run dev

# Terminal 2: Forward webhooks to local server
stripe listen --forward-to http://localhost:3000/api/stripe/webhooks
```

#### 2. Test Subscription Flow
```bash
# Go to: http://localhost:3000/support
# Use test card: 4242 4242 4242 4242
# Expiry: Any future date (e.g., 12/25)
# CVC: Any 3 digits (e.g., 123)
# ZIP: Any 5 digits (e.g., 12345)
```

### Trigger Test Webhook Events
```bash
# Successful checkout
stripe trigger checkout.session.completed

# Payment succeeded
stripe trigger invoice.payment_succeeded

# Payment failed
stripe trigger invoice.payment_failed

# Subscription updated
stripe trigger customer.subscription.updated

# Subscription canceled
stripe trigger customer.subscription.deleted
```

### View Data in Stripe
```bash
# List recent events
stripe events list --limit 10

# List customers
stripe customers list --limit 10

# List subscriptions
stripe subscriptions list --limit 10

# List products
stripe products list

# List prices
stripe prices list
```

### Debugging
```bash
# Show detailed webhook payload
stripe listen --print-json

# Filter specific events
stripe listen --events checkout.session.completed,customer.subscription.updated

# View event details
stripe events retrieve evt_xxxxxxxxxxxxx
```

### Create Test Data
```bash
# Create test customer
stripe customers create --email test@example.com --name "Test User"

# Create test subscription
stripe subscriptions create \
  --customer cus_xxxxxxxxxxxxx \
  --items '[{"price": "price_xxxxxxxxxxxxx"}]'
```

### Webhook Management
```bash
# List webhook endpoints
stripe webhook-endpoints list

# Create webhook endpoint
stripe webhook-endpoints create \
  --url https://yourdomain.com/api/stripe/webhooks \
  --enabled-events checkout.session.completed,customer.subscription.updated

# Update webhook endpoint
stripe webhook-endpoints update we_xxxxxxxxxxxxx \
  --enabled-events checkout.session.completed,invoice.payment_succeeded
```

---

## 🎯 Common Development Scenarios

### Scenario 1: Test New User Subscription
```bash
# 1. Start webhook listener
stripe listen --forward-to http://localhost:3000/api/stripe/webhooks

# 2. Copy the webhook secret from output: whsec_xxxxx
# 3. Add to .env.local: STRIPE_WEBHOOK_SECRET=whsec_xxxxx
# 4. Restart dev server
# 5. Go to /support and upgrade
# 6. Watch webhook events in terminal
```

### Scenario 2: Test Payment Failure
```bash
# Use card: 4000 0000 0000 0341
# This card will fail on the first payment attempt
```

### Scenario 3: Test Subscription Cancellation
```bash
# 1. Create subscription via app
# 2. Go to /support → Manage Subscription
# 3. Cancel in Stripe portal
# 4. Watch for customer.subscription.deleted event
# 5. Verify user downgraded to Free in database
```

### Scenario 4: Manually Trigger Subscription Events
```bash
# Get subscription ID from dashboard
stripe subscriptions retrieve sub_xxxxxxxxxxxxx

# Update subscription (e.g., change price)
stripe subscriptions update sub_xxxxxxxxxxxxx \
  --items '[{"id": "si_xxxxxxxxxxxxx", "price": "price_new_price_id"}]'

# Cancel subscription
stripe subscriptions cancel sub_xxxxxxxxxxxxx
```

---

## 🔑 Test Card Numbers

| Scenario | Card Number | Description |
|----------|-------------|-------------|
| ✅ Success | 4242 4242 4242 4242 | Default success |
| ✅ Success (debit) | 4000 0566 5566 5556 | Debit card |
| ❌ Decline | 4000 0000 0000 0002 | Generic decline |
| ❌ Insufficient funds | 4000 0000 0000 9995 | Insufficient funds |
| ⚠️ Requires auth | 4000 0025 0000 3155 | 3D Secure required |
| 🔄 Processing | 4000 0000 0000 0341 | Fails first, succeeds on retry |

**All test cards:**
- Expiry: Any future date
- CVC: Any 3 digits
- ZIP: Any 5 digits

Full list: https://stripe.com/docs/testing#cards

---

## 📝 Environment Variables Check

```bash
# Quick check if Stripe is configured
cat .env.local | grep STRIPE
```

**Expected output:**
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_MEDIUM_PRICE_ID=price_...
STRIPE_PREMIUM_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 🐛 Troubleshooting

### Issue: Webhook events not received
```bash
# Check if listener is running
stripe listen --forward-to http://localhost:3000/api/stripe/webhooks

# Verify webhook secret in .env.local matches listener output
```

### Issue: "Stripe not configured" error
```bash
# Verify API keys are set
echo $STRIPE_SECRET_KEY

# If empty, check .env.local
cat .env.local | grep STRIPE_SECRET_KEY
```

### Issue: Price ID not found
```bash
# List all prices
stripe prices list

# Copy the correct price ID to .env.local
```

### Issue: Webhook signature verification failed
```bash
# Get new webhook secret from listener
stripe listen --forward-to http://localhost:3000/api/stripe/webhooks
# Copy the whsec_xxx secret
# Update .env.local
# Restart dev server
```

---

## 📚 Useful Links

- **Stripe CLI Docs:** https://stripe.com/docs/stripe-cli
- **Webhook Events:** https://stripe.com/docs/api/events/types
- **Test Cards:** https://stripe.com/docs/testing#cards
- **Dashboard:** https://dashboard.stripe.com/test/dashboard

---

## 💡 Pro Tips

1. **Keep webhook listener running** - It needs to be active when testing checkout
2. **Use --print-json** for detailed webhook payloads during debugging
3. **Save webhook secret** after each `stripe listen` session
4. **Test both success and failure scenarios** before deploying
5. **Check Stripe Dashboard logs** for production issues
6. **Use test mode** for all development (keys start with `_test_`)

---

## ⚡ Quick Start Script

Save this as `dev.sh`:
```bash
#!/bin/bash
echo "Starting development environment..."

# Start webhook listener in background
stripe listen --forward-to http://localhost:3000/api/stripe/webhooks &

# Wait for webhook secret
sleep 2

# Start Next.js dev server
npm run dev
```

Make executable: `chmod +x dev.sh`
Run: `./dev.sh`
