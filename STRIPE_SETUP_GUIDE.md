# 🔧 Stripe Subscription Setup Guide

This guide will walk you through setting up Stripe subscriptions for your PlantsPack vegan social network.

## 📋 Prerequisites

- Stripe account (create at [stripe.com](https://stripe.com))
- Supabase project with the subscription database migration applied
- Next.js application with Stripe components (already included)

## 🚀 Step-by-Step Setup

### 1. Create Stripe Account & Get API Keys

1. **Sign up/Login to Stripe**: Visit [dashboard.stripe.com](https://dashboard.stripe.com)

2. **Get your API keys**:
   - Go to **Developers > API keys**
   - Copy your **Publishable key** (starts with `pk_`)
   - Copy your **Secret key** (starts with `sk_`)
   - For production, make sure you're viewing **Live** keys, not **Test** keys

### 2. Create Subscription Products & Prices

#### Via Stripe Dashboard (Recommended for beginners):

1. **Go to Products**:
   - Navigate to **Products** in your Stripe dashboard
   - Click **"+ Add product"**

2. **Create Supporter Tier**:
   - **Name**: `Supporter`
   - **Description**: `Monthly supporter subscription with enhanced features`
   - **Pricing model**: `Standard pricing`
   - **Price**: `$1.00`
   - **Billing period**: `Monthly`
   - Click **Save product**
   - Copy the **Price ID** (starts with `price_`) - you'll need this!

3. **Create Premium Tier**:
   - **Name**: `Premium`
   - **Description**: `Premium monthly subscription with all features`
   - **Pricing model**: `Standard pricing`
   - **Price**: `$10.00`
   - **Billing period**: `Monthly`
   - Click **Save product**
   - Copy the **Price ID** (starts with `price_`) - you'll need this!

#### Via Stripe CLI (Advanced):

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Create Supporter product and price
stripe products create \
  --name="Supporter" \
  --description="Monthly supporter subscription with enhanced features"

stripe prices create \
  --unit-amount=100 \
  --currency=usd \
  --recurring[interval]=month \
  --product=prod_XXXXXXXXXX \
  --lookup-key=medium_monthly

# Create Premium product and price
stripe products create \
  --name="Premium" \
  --description="Premium monthly subscription with all features"

stripe prices create \
  --unit-amount=1000 \
  --currency=usd \
  --recurring[interval]=month \
  --product=prod_XXXXXXXXXX \
  --lookup-key=premium_monthly
```

### 3. Set Up Webhooks

1. **Create Webhook Endpoint**:
   - Go to **Developers > Webhooks**
   - Click **"+ Add endpoint"**
   - **Endpoint URL**: `https://yourdomain.com/api/stripe/webhooks`
   - **Description**: `PlantsPack Subscription Events`

2. **Select Events**:
   Select these events to listen for:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

3. **Get Webhook Secret**:
   - After creating the webhook, click on it
   - In the **Signing secret** section, click **"Reveal"**
   - Copy the webhook secret (starts with `whsec_`)

### 4. Configure Environment Variables

Add these to your `.env.local` file:

```bash
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Product Price IDs (from step 2)
STRIPE_MEDIUM_PRICE_ID=price_your_medium_price_id_here
STRIPE_PREMIUM_PRICE_ID=price_your_premium_price_id_here

# Your application URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

**⚠️ Important**: For production, use **live** keys (starting with `pk_live_` and `sk_live_`)

### 5. Apply Database Migration

If you haven't already, apply the subscription database migration:

```bash
# Navigate to your project directory
cd /path/to/your/project

# Apply the migration using Supabase CLI
npx supabase db push

# Or apply it manually in your Supabase dashboard
# Copy the contents of supabase/migrations/20250728190000_premium_tiers.sql
# And run it in the SQL editor
```

### 6. Install Required Dependencies

Make sure you have the required npm packages:

```bash
npm install @stripe/stripe-js stripe
```

### 7. Configure Stripe Customer Portal

1. **Go to Settings**:
   - Navigate to **Settings > Billing** in Stripe dashboard
   - Click **Customer portal**

2. **Configure Portal**:
   - **Business information**: Add your business name and support details
   - **Functionality**: Enable these features:
     - ✅ Invoice history
     - ✅ Update payment methods
     - ✅ Update billing address
     - ✅ Cancel subscriptions
   - **Products**: Select your Supporter and Premium products
   - Click **Save changes**

### 8. Test Your Integration

#### Test Cards (Use in Test Mode Only):

- **Successful payment**: `4242 4242 4242 4242`
- **Declined payment**: `4000 0000 0000 0002`
- **Insufficient funds**: `4000 0000 0000 9995`
- **Generic decline**: `4000 0000 0000 0069`

Use any future expiry date and any 3-digit CVC.

#### Testing Workflow:

1. **Create a test user** in your application
2. **Go to pricing page** (`/pricing`)
3. **Click upgrade** for Supporter or Premium
4. **Use test card** `4242 4242 4242 4242`
5. **Complete checkout**
6. **Verify**:
   - User subscription is updated in database
   - User sees tier badge in UI
   - User has access to premium features

### 9. Production Setup

#### Moving to Production:

1. **Activate your Stripe account**:
   - Complete business verification in Stripe dashboard
   - Add bank account for payouts

2. **Update environment variables**:
   - Replace test keys with live keys
   - Update webhook endpoint URL to production domain
   - Update `NEXT_PUBLIC_BASE_URL` to production URL

3. **Create production webhook**:
   - Create a new webhook endpoint pointing to your production domain
   - Use the same events as in testing
   - Update `STRIPE_WEBHOOK_SECRET` with production webhook secret

4. **Update price IDs**:
   - Create live versions of your products/prices
   - Update `STRIPE_MEDIUM_PRICE_ID` and `STRIPE_PREMIUM_PRICE_ID`

## 🔧 Configuration Files Reference

### Environment Variables Template

```bash
# Copy this to your .env.local file and fill in your values

# Stripe Keys (Test)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_
STRIPE_SECRET_KEY=sk_test_
STRIPE_WEBHOOK_SECRET=whsec_

# Stripe Keys (Production - use when going live)
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_
# STRIPE_SECRET_KEY=sk_live_
# STRIPE_WEBHOOK_SECRET=whsec_

# Price IDs
STRIPE_MEDIUM_PRICE_ID=price_
STRIPE_PREMIUM_PRICE_ID=price_

# Application URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000  # Change to your production URL
```

### Stripe Products Configuration

Your Stripe dashboard should have these products:

| Product | Price | Interval | Price ID | Description |
|---------|-------|----------|----------|-------------|
| Supporter | $1.00 | Monthly | `price_xxx` | Enhanced features for supporters |
| Premium | $10.00 | Monthly | `price_xxx` | Full premium experience |

## 🎯 Features Included

### Database Schema
- ✅ `subscription_tier` enum (free, medium, premium)
- ✅ User subscription tracking
- ✅ Stripe customer/subscription IDs
- ✅ Billing period tracking
- ✅ Subscription event logging

### API Routes
- ✅ `/api/stripe/create-checkout-session` - Create payment sessions
- ✅ `/api/stripe/create-portal-session` - Customer portal access
- ✅ `/api/stripe/cancel-subscription` - Cancel subscriptions
- ✅ `/api/stripe/webhooks` - Handle Stripe events

### React Components
- ✅ `SubscriptionDashboard` - Full subscription management
- ✅ `UpgradeModal` - Upgrade prompts
- ✅ `SubscriptionStatus` - Status indicators
- ✅ `TierBadge` - User tier badges

### Subscription Tiers

#### Free Tier
- 250 character posts
- 1 image per post
- Basic feed access
- Community support

#### Supporter Tier ($1/month)
- 1000 character posts
- 3 images per post
- Location sharing
- Post analytics
- Priority in algorithm
- Community support

#### Premium Tier ($10/month)
- 1000 character posts
- 5 images per post
- Location sharing
- Advanced analytics
- Highest algorithm priority
- Early access features
- Priority support
- Custom profile themes

## 🐛 Troubleshooting

### Common Issues:

1. **"Invalid API Key"**
   - Check that you're using the correct keys for your environment (test vs live)
   - Ensure keys are properly set in environment variables

2. **"No such price"**
   - Verify your price IDs are correct
   - Make sure you're using the right price IDs for your environment

3. **Webhook signature verification failed**
   - Check that your webhook secret is correct
   - Ensure your webhook endpoint URL is accessible
   - Verify you're listening for the correct events

4. **Database errors**
   - Ensure the subscription migration has been applied
   - Check that your Supabase service role key has proper permissions

5. **Checkout not working**
   - Verify `NEXT_PUBLIC_BASE_URL` is set correctly
   - Check that success/cancel URLs are accessible
   - Ensure Stripe publishable key is correct

### Testing Webhooks Locally:

Use Stripe CLI to forward webhooks to your local development server:

```bash
# Install Stripe CLI
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:3000/api/stripe/webhooks

# This will give you a webhook secret starting with whsec_
# Use this secret in your .env.local
```

## 📞 Support

If you encounter issues:

1. **Check Stripe logs**: Dashboard > Developers > Logs
2. **Check webhook events**: Dashboard > Developers > Webhooks > [Your webhook] > Events
3. **Review application logs**: Check your Next.js console for errors
4. **Stripe documentation**: [docs.stripe.com](https://docs.stripe.com)

## 🎉 You're Ready!

Once you've completed all these steps, your subscription system should be fully functional. Users will be able to:

- View pricing and subscription options
- Upgrade to paid tiers
- Manage their subscriptions
- Access tier-based features
- See their subscription status

The system automatically handles billing, failed payments, cancellations, and downgrades through Stripe webhooks.