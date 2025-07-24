# Troubleshooting Guide

Common issues and solutions for VeganConnect local development.

## Database Migration Errors

### Error: "must be owner of table users (SQLSTATE 42501)"

**Problem**: Migration trying to modify `auth.users` table which is system-owned.

**Solution**: Use the clean migration files that avoid auth.users modifications.

**Quick Fix**:
```bash
# Use the standalone setup (JavaScript-based, no psql required)
npm run db:start
npm run db:standalone
```

### Error: \"psql: command not found\"

**Problem**: PostgreSQL client tools not installed on system.

**Solution**: Use the JavaScript-based standalone setup that doesn't require psql.

**Quick Fix**:
```bash
# Updated standalone setup uses JavaScript instead of psql
npm run db:start
npm run db:standalone
```

**Alternative**: Remove problematic migrations and use clean version:
```bash
rm supabase/migrations/20240101000001_initial_schema.sql
# The clean migration 20240101000002_clean_schema.sql will be used instead
npm run db:reset
```

### Error: "Cannot connect to Docker daemon"

**Problem**: Docker is not running or not installed.

**Solutions**:
1. **Install Docker**: https://docs.docker.com/get-docker/
2. **Start Docker**: Make sure Docker Desktop is running
3. **Check Docker**: Run `docker ps` to verify

**Alternative without Docker**:
Use a remote PostgreSQL database and run `standalone-setup.sql` directly.

## Authentication Issues

### Error: "Invalid login credentials"

**Problem**: Test users not created in Supabase Auth.

**Solution**:
```bash
# Create auth users specifically
npm run db:create-users
```

### Users exist but can't login

**Problem**: Auth and profile data mismatch.

**Solution**:
```bash
# Reset and recreate everything
npm run db:seed-js
```

## Build and Runtime Errors

### Error: "Type error in profile page"

**Problem**: Next.js 15 async params issue.

**Status**: ✅ **Fixed** - The profile page now properly awaits params.

### Error: "Leaflet SSR issues"

**Problem**: Map components not loading.

**Status**: ✅ **Fixed** - Using dynamic imports with `ssr: false`.

### Error: "Supabase client errors"

**Problem**: Environment variables not set correctly.

**Solution**:
Check `.env.local` has correct values:
```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
```

## Data Issues

### No posts or places showing

**Problem**: Database not seeded or RLS policies blocking access.

**Solutions**:
1. **Re-seed database**: `npm run db:seed-js`
2. **Check Supabase Studio**: Visit http://localhost:54323
3. **Use standalone setup**: `npm run db:standalone`

### Map not loading places

**Problem**: Places data not inserted or coordinates invalid.

**Solution**:
```bash
# Check places in database
npm run db:populate-js
```

Visit Supabase Studio → Tables → places to verify data.

### Users can't interact (like, comment)

**Problem**: Authentication not working or RLS policies too strict.

**Solution**:
1. **Check login**: Make sure user is logged in
2. **Reset auth**: `npm run db:create-users`
3. **Use permissive policies**: The clean migration has more permissive policies for local dev

## Performance Issues

### Slow page loads

**Solutions**:
1. **Check database connections**: Ensure Supabase is running
2. **Clear Next.js cache**: `rm -rf .next && npm run dev`
3. **Check console**: Look for network errors

### Map rendering slowly

**Solutions**:
1. **Reduce marker count**: Filter places by category
2. **Check coordinates**: Ensure valid lat/lng values
3. **Network**: Check if OpenStreetMap tiles are loading

## Development Workflow Issues

### Changes not reflecting

**Solutions**:
1. **Restart dev server**: `npm run dev`
2. **Clear cache**: `rm -rf .next`
3. **Check file watching**: Ensure no file permission issues

### Database out of sync

**Solutions**:
```bash
# Nuclear option - reset everything
npm run db:stop
npm run db:start
npm run db:seed-js
npm run dev
```

## Emergency Reset Procedures

### Complete Reset (Nuclear Option)

If everything is broken:

```bash
# Stop everything
npm run db:stop

# Clean up
rm -rf .next
rm -rf node_modules
rm -rf supabase/.branches

# Reinstall
npm install

# Start fresh
npm run db:start
npm run db:standalone  # Use standalone setup
npm run dev
```

### Quick Reset (Keep Node Modules)

If just database issues:

```bash
npm run db:stop
npm run db:start
npm run db:standalone
npm run dev
```

### Database Only Reset

If just data issues:

```bash
npm run db:standalone  # Standalone setup with all data
# OR
npm run db:seed-js     # Full Supabase setup
```

## Getting Help

### Check These First
1. **Docker running**: `docker ps`
2. **Supabase status**: `npx supabase status`
3. **Environment file**: `.env.local` exists and has correct values
4. **Build passes**: `npm run build`

### Debug Information
When asking for help, include:
```bash
# System info
node --version
docker --version
npx supabase --version

# Service status
npx supabase status
docker ps

# Environment (hide sensitive values)
cat .env.local | sed 's/=.*/=HIDDEN/'
```

### Working Configurations

**Minimal working setup**:
```bash
# 1. Docker running ✅
docker ps

# 2. Supabase started ✅
npm run db:start

# 3. Data populated with standalone setup ✅
npm run db:standalone

# 4. App running ✅
npm run dev
```

**Full Supabase setup**:
```bash
# 1. Docker running ✅
docker ps

# 2. Supabase started ✅
npm run db:start

# 3. Migration applied ✅
npx supabase db reset

# 4. Auth users created ✅
npm run db:create-users

# 5. Data populated ✅
npm run db:populate-js

# 6. App running ✅
npm run dev
```

## Still Having Issues?

1. **Check the logs**: Look at terminal output for specific errors
2. **Use Supabase Studio**: http://localhost:54323 to inspect database
3. **Simplify**: Try the standalone setup first
4. **Update documentation**: If you find a solution, consider contributing it back!

---

**Remember**: The standalone setup (`npm run db:standalone`) is the most reliable method and works without any Supabase-specific features.