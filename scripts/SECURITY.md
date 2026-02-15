# Scripts Security Guidelines

## ⚠️ IMPORTANT: Never Commit Credentials

**NEVER hardcode credentials in scripts:**
- ❌ No emails
- ❌ No passwords
- ❌ No API keys
- ❌ No service role keys

## Safe Script Patterns

### ✅ Good: Accept credentials as parameters
```typescript
const args = process.argv.slice(2)
const [email, password] = args
```

### ✅ Good: Load from environment variables
```typescript
const email = process.env.ADMIN_EMAIL
```

### ❌ Bad: Hardcoded credentials
```typescript
const ADMIN_EMAIL = 'admin@example.com'  // NEVER DO THIS
const ADMIN_PASSWORD = 'password123'     // NEVER DO THIS
```

## Available Scripts

### Change Admin Password
```bash
npx tsx scripts/change-admin-password.ts <email> <new-password>
```

### Set Admin Role
```bash
npx tsx scripts/set-admin-role.ts <email>
```

### Manage User Subscription
```bash
npx tsx scripts/manage-subscription.ts <email> <tier>
# tier: free, medium, premium
```

### Database Cleanup
```bash
npx tsx scripts/cleanup-production.ts
```

## If Credentials Are Accidentally Committed

1. **Immediately change all exposed credentials**
2. **Remove the files from the repository**
3. **Commit the changes with clear security message**
4. **Consider rewriting git history if extremely sensitive**

## Notes

- All scripts use environment variables from `.env.local`
- `.env.local` is in `.gitignore` and never committed
- Credentials should only be stored in secure password managers
- Production credentials should be rotated regularly
