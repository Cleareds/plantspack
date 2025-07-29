# 🚀 Deployment Guide for Vegan Social App

## ✅ Issues Fixed

### 1. **Stripe Type Errors**
- Fixed `current_period_end` property access issues
- Added proper null checks for Stripe subscription properties
- Updated all Stripe webhook handlers with safe property access

### 2. **Lock File Conflicts**
- Removed duplicate `package-lock.json` 
- Standardized on npm for package management
- Fixed Playwright warnings about multiple lock files

## 📊 Database Schema Updates

### **STEP 1: Execute Database Updates**

Run the SQL commands in `database-updates-for-deployment.sql` in your Supabase SQL editor:

```sql
-- This file contains all necessary schema updates including:
-- ✅ User subscription columns
-- ✅ Subscriptions table with Stripe integration
-- ✅ Subscription events logging
-- ✅ User preferences system
-- ✅ Enhanced post metadata
-- ✅ Proper indexes and RLS policies
-- ✅ Database functions for subscription management
```

**Key Tables Added:**
- `subscriptions` - Stripe subscription data
- `subscription_events` - Webhook event logging
- `user_preferences` - User settings and preferences

**Key Columns Added to Users:**
- `subscription_tier` ('free', 'medium', 'premium')
- `subscription_status` ('active', 'canceled', 'past_due', 'unpaid')
- `stripe_customer_id`
- `subscription_period_start/end`

## 🧪 Playwright Testing Configuration

### **Local Testing**
```bash
# Regular local tests (with dev server)
npm run test

# UI mode for debugging
npm run test:ui

# Specific browser
npm run test:chrome
```

### **CI/CD Testing**
```bash
# Tests configured for CI environments
npm run test:ci
```

### **Files Created:**
- `.github/workflows/playwright.yml` - GitHub Actions workflow
- `playwright.config.ci.ts` - CI-specific Playwright config
- Updated `package.json` with new test scripts

## 🔧 Vercel Deployment Setup

### **STEP 1: Set Environment Variables in Vercel**

In your Vercel dashboard, add these environment variables:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe
STRIPE_SECRET_KEY=sk_live_... # or sk_test_... for testing
STRIPE_PUBLISHABLE_KEY=pk_live_... # or pk_test_... for testing
STRIPE_WEBHOOK_SECRET=whsec_... # from Stripe webhook endpoint

# Auth
NEXTAUTH_SECRET=your-random-secret-key
NEXTAUTH_URL=https://your-app.vercel.app
```

### **STEP 2: Configure Stripe Webhooks**

1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://your-app.vercel.app/api/stripe/webhooks`
3. Select these events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy the webhook secret to your Vercel environment variables

### **STEP 3: Deploy**

```bash
# Deploy to Vercel
vercel --prod

# Or connect your GitHub repo to Vercel for automatic deployments
```

## 🚦 Testing Your Deployment

### **1. Manual Testing Checklist**
- [ ] App loads without errors
- [ ] User authentication works
- [ ] Search functionality works
- [ ] Stripe checkout flow works
- [ ] Subscription management works
- [ ] Mobile responsiveness works

### **2. Automated Testing**
```bash
# Run tests against deployed app
PLAYWRIGHT_TEST_BASE_URL=https://your-app.vercel.app npm run test:ci
```

## 🔍 Monitoring & Troubleshooting

### **Common Issues & Solutions**

1. **Build Errors:**
   ```bash
   # Clear cache and reinstall
   rm -rf .next node_modules
   npm ci
   npm run build
   ```

2. **Database Connection Issues:**
   - Verify Supabase URLs and keys
   - Check RLS policies are properly set
   - Ensure database migrations ran successfully

3. **Stripe Webhook Issues:**
   - Verify webhook endpoint URL
   - Check webhook secret matches
   - Review Vercel function logs

### **Logging & Debugging**
- Check Vercel function logs in dashboard
- Monitor Supabase logs for database issues
- Use Stripe webhook logs for payment debugging

## 📱 Mobile Testing

The app is configured for mobile testing across:
- Mobile Chrome (Pixel 5)
- Mobile Safari (iPhone 12)
- Responsive design testing

## 🔐 Security Considerations

- RLS policies are properly configured
- Service role key secured as environment variable
- Stripe webhooks verified with secrets
- User data properly isolated

## 📈 Performance Optimizations

- Database indexes on key columns
- Vercel edge functions for API routes
- Image optimization through Next.js
- Search functionality optimized

## ✨ Next Steps

After deployment:
1. Set up monitoring (Sentry, LogRocket, etc.)
2. Configure analytics (PostHog, Google Analytics)
3. Set up backup strategies
4. Plan scaling strategy for growth

---

Your app is now ready for production! 🎉

For any issues, check:
1. Vercel deployment logs
2. Supabase dashboard logs  
3. Stripe webhook logs
4. Browser developer console