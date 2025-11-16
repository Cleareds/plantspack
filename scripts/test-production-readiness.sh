#!/bin/bash

# PlantsPack Production Readiness Test Script
# This script helps verify critical functionality before launch

echo "🧪 PlantsPack Production Readiness Tests"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Function to print test results
print_test() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $2"
        ((FAILED++))
    fi
}

echo "📋 Pre-flight Checks"
echo "--------------------"

# Check if .env.local exists
if [ -f .env.local ]; then
    print_test 0 ".env.local file exists"
else
    print_test 1 ".env.local file missing"
fi

# Check required environment variables
if grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local 2>/dev/null; then
    print_test 0 "Supabase URL configured"
else
    print_test 1 "Supabase URL not configured"
fi

if grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.local 2>/dev/null; then
    print_test 0 "Supabase anon key configured"
else
    print_test 1 "Supabase anon key not configured"
fi

if grep -q "SUPABASE_SERVICE_ROLE_KEY" .env.local 2>/dev/null; then
    print_test 0 "Supabase service role key configured"
else
    print_test 1 "Supabase service role key not configured"
fi

# Check if node_modules exists
if [ -d node_modules ]; then
    print_test 0 "Dependencies installed"
else
    print_test 1 "Dependencies not installed (run: npm install)"
fi

echo ""
echo "📦 Build Check"
echo "--------------"

# Try to build the project
echo "Building project... (this may take a minute)"
npm run build > /tmp/plantspack-build.log 2>&1

if [ $? -eq 0 ]; then
    print_test 0 "Project builds successfully"
else
    print_test 1 "Build failed (check /tmp/plantspack-build.log)"
fi

echo ""
echo "🗄️  Database Checks"
echo "-------------------"
echo "${YELLOW}Note: These require Supabase CLI and local instance${NC}"

# Check if Supabase CLI is installed
if command -v supabase &> /dev/null; then
    print_test 0 "Supabase CLI installed"

    # Check if local Supabase is running
    if supabase status &> /dev/null; then
        print_test 0 "Local Supabase instance running"

        # List migrations
        echo ""
        echo "  Checking migrations..."
        MIGRATION_COUNT=$(ls -1 supabase/migrations/*.sql 2>/dev/null | wc -l)
        echo "  Found ${MIGRATION_COUNT} migration files"

        # Key migrations to check
        if [ -f "supabase/migrations/20251114000001_create_notifications.sql" ]; then
            print_test 0 "Notifications migration exists"
        else
            print_test 1 "Notifications migration missing"
        fi

        if [ -f "supabase/migrations/20251116000001_fix_contact_submissions.sql" ]; then
            print_test 0 "Contact submissions migration exists"
        else
            print_test 1 "Contact submissions migration missing"
        fi
    else
        print_test 1 "Local Supabase not running (run: npm run db:start)"
    fi
else
    print_test 1 "Supabase CLI not installed"
    echo "  Install: npm install -g supabase"
fi

echo ""
echo "🧩 Critical Components"
echo "---------------------"

# Check if critical files exist
critical_files=(
    "src/components/notifications/NotificationBell.tsx"
    "src/app/api/notifications/route.ts"
    "src/app/api/notifications/create/route.ts"
    "src/app/api/contact/route.ts"
    "src/app/contact/page.tsx"
    "src/app/admin/contact/page.tsx"
    "src/lib/rate-limit.ts"
    "src/components/posts/Feed.tsx"
    "src/components/posts/CreatePost.tsx"
)

for file in "${critical_files[@]}"; do
    if [ -f "$file" ]; then
        print_test 0 "$(basename $file) exists"
    else
        print_test 1 "$(basename $file) missing"
    fi
done

echo ""
echo "🔒 Security Checks"
echo "------------------"

# Check for sensitive data in code
if grep -r "password.*=.*['\"]" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "password:" | grep -v "// " | grep -v "/\*" > /dev/null; then
    print_test 1 "Potential hardcoded passwords found"
else
    print_test 0 "No hardcoded passwords detected"
fi

# Check if .env.local is in .gitignore
if grep -q ".env.local" .gitignore 2>/dev/null; then
    print_test 0 ".env.local in .gitignore"
else
    print_test 1 ".env.local not in .gitignore (security risk!)"
fi

echo ""
echo "📱 Mobile Readiness"
echo "------------------"

# Check for viewport meta tag in layout
if grep -q "viewport" src/app/layout.tsx 2>/dev/null; then
    print_test 0 "Viewport meta tag configured"
else
    print_test 1 "Viewport meta tag missing"
fi

# Check for PWA manifest
if [ -f "public/manifest.json" ]; then
    print_test 0 "PWA manifest exists"
else
    print_test 1 "PWA manifest missing"
fi

echo ""
echo "📊 Summary"
echo "=========="
TOTAL=$((PASSED + FAILED))
PERCENTAGE=$((PASSED * 100 / TOTAL))

echo -e "Tests Passed: ${GREEN}${PASSED}${NC}/${TOTAL} (${PERCENTAGE}%)"
echo -e "Tests Failed: ${RED}${FAILED}${NC}/${TOTAL}"

echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! Your app is ready for testing.${NC}"
    exit 0
elif [ $PERCENTAGE -ge 80 ]; then
    echo -e "${YELLOW}⚠️  Most tests passed, but there are some issues to address.${NC}"
    exit 1
else
    echo -e "${RED}❌ Critical issues found. Please fix them before launching.${NC}"
    exit 2
fi

