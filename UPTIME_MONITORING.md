# Uptime Monitoring & Alerts

## Critical Endpoints to Monitor

### 1. Main Application
- **URL**: `https://plantspack.com`
- **Method**: GET
- **Expected**: HTTP 200
- **Check Interval**: 5 minutes
- **Alert After**: 2 consecutive failures

### 2. Stripe Webhook Endpoint
- **URL**: `https://plantspack.com/api/stripe/webhooks`
- **Method**: POST (with test payload)
- **Expected**: HTTP 200 or 400 (400 is ok - means endpoint is up)
- **Check Interval**: 10 minutes
- **Alert After**: 3 consecutive failures
- **Critical**: Yes (payment processing depends on this)

### 3. API Health Check
- **URL**: `https://plantspack.com/api/health`
- **Method**: GET
- **Expected**: HTTP 200 with JSON response
- **Check Interval**: 5 minutes
- **Alert After**: 2 consecutive failures

## Recommended Monitoring Services

### Option 1: UptimeRobot (Free - Recommended)
**Setup:**
1. Go to [UptimeRobot](https://uptimerobot.com)
2. Create free account
3. Add monitors:
   - Main App: `https://plantspack.com` (HTTP)
   - Stripe Webhook: `https://plantspack.com/api/stripe/webhooks` (HTTP)
   - Health Check: `https://plantspack.com/api/health` (Keyword: "healthy")

**Alert Settings:**
- Email: antonkravchuk@email.com
- SMS: Optional (paid feature)
- Slack: Optional via webhook integration

### Option 2: Better Uptime (Free Tier)
**Setup:**
1. Go to [Better Uptime](https://betteruptime.com)
2. Create account
3. Add monitors with same URLs
4. Configure alerts via email/Slack

### Option 3: Vercel Monitoring (Built-in)
**Setup:**
1. Already included with Vercel deployment
2. Go to [Vercel Dashboard](https://vercel.com/cleareds/plantspack)
3. Enable "Monitoring" tab
4. Set up alerts for:
   - High error rate (>5%)
   - Slow response time (>2s average)
   - High CPU/memory usage

## Implementation Steps

### 1. Create Health Check Endpoint (5 minutes)

Create `/src/app/api/health/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    // Check database connectivity
    const supabase = await createClient()
    const { error } = await supabase
      .from('users')
      .select('id')
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" which is ok
      throw error
    }

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      version: process.env.npm_package_version || '1.0.0'
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    )
  }
}
```

### 2. Set Up UptimeRobot Monitors (10 minutes)

1. **Sign up**: https://uptimerobot.com/signUp
2. **Add Monitor #1 - Main App**
   - Monitor Type: HTTP(s)
   - Friendly Name: Plantspack Main
   - URL: https://plantspack.com
   - Monitoring Interval: 5 minutes
   - Alert Contacts: Your email

3. **Add Monitor #2 - Stripe Webhook**
   - Monitor Type: HTTP(s)
   - Friendly Name: Plantspack Stripe Webhook
   - URL: https://plantspack.com/api/stripe/webhooks
   - Monitoring Interval: 10 minutes
   - Alert When: Down for 2+ checks
   - Alert Contacts: Your email

4. **Add Monitor #3 - Health Check**
   - Monitor Type: Keyword
   - Friendly Name: Plantspack Health
   - URL: https://plantspack.com/api/health
   - Keyword: "healthy"
   - Monitoring Interval: 5 minutes
   - Alert Contacts: Your email

### 3. Configure Slack Alerts (Optional, 5 minutes)

1. Create Slack webhook URL
2. In UptimeRobot:
   - Settings > Alert Contacts
   - Add "Webhook" contact
   - Paste Slack webhook URL
3. Assign to all monitors

### 4. Set Up Status Page (Optional, 5 minutes)

UptimeRobot offers a free public status page:
1. Dashboard > Status Pages
2. Create New Status Page
3. Add all monitors
4. Custom domain: status.plantspack.com (optional)
5. Share link: Useful for users to check service status

## Monitoring Metrics

### What to Monitor

1. **Uptime Percentage**
   - Target: 99.9% (43 minutes downtime/month)
   - Acceptable: 99.5% (3.6 hours downtime/month)
   - Alert if: <99% over 7 days

2. **Response Time**
   - Target: <1s average
   - Acceptable: <2s average
   - Alert if: >3s average for 10 minutes

3. **Error Rate**
   - Target: <0.1%
   - Acceptable: <1%
   - Alert if: >5% for 5 minutes

4. **Stripe Webhook Delivery**
   - Target: 100% success rate
   - Alert if: Any 500 errors or 3+ consecutive failures

### Dashboard Recommended Checks

**Daily:**
- Review Vercel deployment logs
- Check error rate in Sentry
- Verify Stripe webhook delivery success

**Weekly:**
- Review uptime percentage
- Check average response times
- Audit failed requests

**Monthly:**
- Full performance audit
- Review alert accuracy
- Update monitoring thresholds

## Alert Response Procedures

### Main App Down
1. Check Vercel status
2. Check deployment logs
3. If needed: Rollback to previous deployment
4. Check database connectivity

### Stripe Webhook Failing
1. **CRITICAL** - Affects payments
2. Check Stripe dashboard for webhook status
3. Verify webhook signature key
4. Check recent Stripe events for failures
5. Test webhook manually: `stripe listen --forward-to localhost:3000/api/stripe/webhooks`

### High Error Rate
1. Check Sentry for error patterns
2. Review recent deployments
3. Check database query performance
4. Verify external API connectivity (Stripe, Supabase)

### Slow Response Time
1. Check Vercel analytics for slow pages
2. Review database query logs
3. Check for N+1 query issues
4. Verify CDN cache hit rates

## Integration with CI/CD

Add health check to deployment:

```yaml
# .github/workflows/deploy.yml
- name: Health Check
  run: |
    sleep 30  # Wait for deployment
    curl -f https://plantspack.com/api/health || exit 1
```

## Cost Breakdown

| Service | Cost | Features |
|---------|------|----------|
| UptimeRobot Free | $0 | 50 monitors, 5-min intervals, email alerts |
| UptimeRobot Pro | $7/month | 1-min intervals, SMS alerts, status page |
| Better Uptime Free | $0 | 10 monitors, phone call alerts |
| Vercel Monitoring | Included | Error tracking, analytics |
| Sentry Free | $0 | 5K errors/month |

**Recommendation**: Start with UptimeRobot Free + Vercel built-in monitoring = $0/month

## Quick Setup Checklist

- [ ] Create `/api/health` endpoint
- [ ] Deploy to production
- [ ] Sign up for UptimeRobot
- [ ] Add 3 monitors (Main, Webhook, Health)
- [ ] Configure email alerts
- [ ] Test alerts by pausing a monitor
- [ ] Optional: Set up Slack integration
- [ ] Optional: Create public status page
- [ ] Document alert procedures in team wiki

## Testing Alerts

```bash
# Test health endpoint
curl https://plantspack.com/api/health

# Expected response:
# {"status":"healthy","timestamp":"...","database":"connected","version":"1.0.0"}

# Test alert by simulating downtime
# In UptimeRobot: Pause monitor for 10 minutes, then resume
# You should receive an email alert
```

## Additional Resources

- [UptimeRobot Documentation](https://uptimerobot.com/docs/)
- [Vercel Monitoring](https://vercel.com/docs/concepts/observability/monitoring)
- [Sentry Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Stripe Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)
