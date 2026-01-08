# OpenAI API Security & Cost Protection

## 🔴 Current Risk Level: MEDIUM

You now have **basic protection** against bot abuse, but additional measures are recommended for production.

---

## ✅ Protections Currently Implemented

### **Layer 1: IP-Based Rate Limiting**
- **Limit:** 30 requests per minute per IP address
- **Protection:** Prevents single bot from overwhelming API
- **Weakness:** Bots can rotate IPs or use proxies

### **Layer 2: User-Based Rate Limiting**
- **Limit:** 10 requests per minute per user
- **Protection:** Limits abuse from individual accounts
- **Weakness:** In-memory storage (resets on deploy, not shared across serverless instances)

### **Layer 3: Authentication Required**
- **Protection:** All API calls require valid Supabase session
- **Weakness:** Bots can create fake accounts

### **Layer 4: Usage Logging**
- **Feature:** All OpenAI API calls are logged with:
  - User ID and email
  - Client IP address
  - Timestamp
  - Estimated cost ($0.00015 per request)
- **Benefit:** You can monitor logs in Vercel for abuse patterns

---

## ⚠️ Remaining Vulnerabilities

### **1. In-Memory Rate Limiting (Medium Risk)**
**Problem:** Rate limits reset when serverless functions restart
**Impact:** Bot could exploit this by triggering function restarts
**Cost if exploited:** $50-200/day

### **2. No Daily/Monthly Caps (High Risk)**
**Problem:** No hard limit on total API usage
**Impact:** Runaway bot could rack up unlimited bills
**Cost if exploited:** $1,000+ in a weekend

### **3. No CAPTCHA on Registration (Medium Risk)**
**Problem:** Bots can create unlimited accounts
**Impact:** Each account gets separate rate limits
**Cost if exploited:** $10-50/day per 100 accounts

### **4. No IP Reputation Checking (Low Risk)**
**Problem:** Known bot IPs aren't blocked
**Impact:** Professional bot networks could abuse
**Cost if exploited:** $20-100/day

---

## 🛡️ Recommended Additional Protections

### **Priority 1: Set OpenAI Spending Limits (DO THIS NOW!)**

1. Go to: https://platform.openai.com/settings/organization/limits
2. Set **Hard Limit:** $20/month (or your comfort level)
3. Set **Email Alert:** When usage reaches $10/month

**This is your safety net!** Even if all other protections fail, OpenAI will cut you off at $20.

### **Priority 2: Monitor Vercel Logs Daily**

Check for suspicious patterns:
```bash
# In Vercel dashboard, search logs for:
[OPENAI_USAGE]
```

**Red flags:**
- Same IP making 20+ requests/minute
- Same user making requests every second
- Unknown email addresses with high usage
- Requests at odd hours (3am-6am)

### **Priority 3: Database-Backed Rate Limiting (Medium Effort)**

**Create table in Supabase:**
```sql
CREATE TABLE IF NOT EXISTS content_analysis_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  cost DECIMAL(10, 6) DEFAULT 0.00015
);

-- Index for fast queries
CREATE INDEX idx_usage_user_time ON content_analysis_usage(user_id, created_at DESC);
CREATE INDEX idx_usage_ip_time ON content_analysis_usage(ip_address, created_at DESC);

-- Daily cost limit function
CREATE OR REPLACE FUNCTION check_daily_openai_limit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  daily_cost DECIMAL;
BEGIN
  SELECT COALESCE(SUM(cost), 0) INTO daily_cost
  FROM content_analysis_usage
  WHERE user_id = p_user_id
    AND created_at >= CURRENT_DATE;
  
  -- Limit: $1/day per user
  RETURN daily_cost < 1.0;
END;
$$ LANGUAGE plpgsql;
```

Then update API to use database instead of in-memory Map.

**Benefits:**
- Persistent rate limits (survive deploys)
- Shared across all serverless instances
- Can query usage patterns
- Can block abusive users

### **Priority 4: Add CAPTCHA to Registration (Low Effort)**

Use **Cloudflare Turnstile** (free):
```bash
npm install @marsidev/react-turnstile
```

Add to registration form - prevents bot account creation.

### **Priority 5: Advanced - Upstash Redis Rate Limiting (Production-Grade)**

For serious protection, use distributed rate limiting:

```bash
npm install @upstash/ratelimit @upstash/redis
```

**Cost:** $0.25/month (10K requests free)

**Benefits:**
- Distributed rate limiting
- Survives deploys
- Shared across instances
- Sub-millisecond performance

---

## 📊 Cost Monitoring Strategy

### **Expected Costs (Normal Usage)**
- **10 users/day, 5 posts each = 50 analyses/day**
- 50 × $0.00015 = $0.0075/day = **$0.23/month**

### **Warning Signs**
- **$1/day** = Possible bot (1,000+ analyses)
- **$5/day** = Likely bot (50,000+ analyses)
- **$20/day** = Definite bot attack

### **How to Monitor**

1. **OpenAI Dashboard:**
   - https://platform.openai.com/usage
   - Check daily usage
   - Set up email alerts

2. **Vercel Logs:**
   ```bash
   # Search for: [OPENAI_USAGE]
   # Look for patterns in userId, clientIp
   ```

3. **Weekly Review:**
   - Check OpenAI billing
   - Review Vercel logs for abuse
   - Block suspicious user IDs

---

## 🚨 What to Do If You Detect Abuse

### **Step 1: Stop the Bleeding**
1. Go to OpenAI dashboard
2. **Revoke API key** immediately
3. Generate new key
4. Update Vercel environment variables

### **Step 2: Find the Attacker**
Check Vercel logs for `[SECURITY]` and `[OPENAI_USAGE]`:
- Identify user ID(s)
- Identify IP address(es)

### **Step 3: Block the Attacker**
```sql
-- In Supabase SQL Editor
-- Block user permanently
UPDATE auth.users
SET banned_at = NOW()
WHERE id = 'attacker-user-id';

-- Or delete the user
DELETE FROM auth.users WHERE id = 'attacker-user-id';
```

### **Step 4: Add IP Block (if needed)**
Add to your API route:
```typescript
const BLOCKED_IPS = ['1.2.3.4', '5.6.7.8']
if (BLOCKED_IPS.includes(clientIp)) {
  return NextResponse.json({ error: 'Access denied' }, { status: 403 })
}
```

---

## 📋 Security Checklist

- [x] IP-based rate limiting (30 req/min per IP)
- [x] User-based rate limiting (10 req/min per user)
- [x] Authentication required
- [x] Usage logging
- [ ] **OpenAI spending limit set** ← DO THIS NOW!
- [ ] Database-backed rate limiting
- [ ] CAPTCHA on registration
- [ ] Daily monitoring routine
- [ ] Alert webhooks configured

---

## 💡 Best Practices

1. **Set OpenAI limit to $20/month** - Your safety net
2. **Check logs weekly** - Catch abuse early
3. **Monitor costs daily** for first month
4. **Start conservative** - Tighten limits if needed
5. **Keep audit logs** - Track all API usage

---

## 📞 Emergency Contacts

- **OpenAI Support:** https://help.openai.com
- **Revoke API Key:** https://platform.openai.com/api-keys
- **Vercel Support:** https://vercel.com/support

---

## 📈 Cost Estimates

| Usage Level | Daily Requests | Daily Cost | Monthly Cost |
|------------|---------------|------------|--------------|
| Light (10 users) | 50 | $0.01 | $0.30 |
| Medium (100 users) | 500 | $0.08 | $2.40 |
| Heavy (1,000 users) | 5,000 | $0.75 | $22.50 |
| **Bot Attack** | 50,000+ | $7.50+ | $225+ |

With $20/month OpenAI limit, worst case = **$20 total**, not $225+.

---

**Last Updated:** 2026-01-08
