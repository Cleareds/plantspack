#!/bin/bash

# Sentry Configuration Test Script
# This script helps verify Sentry is properly configured

echo "🔍 Sentry Configuration Validator"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

echo "📋 Configuration File Checks"
echo "----------------------------"

# Check if Sentry config files exist
if [ -f "sentry.server.config.ts" ]; then
    print_test 0 "sentry.server.config.ts exists"
else
    print_test 1 "sentry.server.config.ts missing"
fi

if [ -f "sentry.edge.config.ts" ]; then
    print_test 0 "sentry.edge.config.ts exists"
else
    print_test 1 "sentry.edge.config.ts missing"
fi

if [ -f "src/instrumentation-client.ts" ]; then
    print_test 0 "src/instrumentation-client.ts exists"
else
    print_test 1 "src/instrumentation-client.ts missing"
fi

if [ -f "src/instrumentation.ts" ]; then
    print_test 0 "src/instrumentation.ts exists"
else
    print_test 1 "src/instrumentation.ts missing"
fi

if [ -f "src/app/global-error.tsx" ]; then
    print_test 0 "src/app/global-error.tsx exists"
else
    print_test 1 "src/app/global-error.tsx missing"
fi

echo ""
echo "📦 Package Configuration"
echo "------------------------"

# Check if @sentry/nextjs is installed
if grep -q "@sentry/nextjs" package.json; then
    VERSION=$(grep "@sentry/nextjs" package.json | sed 's/.*"@sentry\/nextjs": "\([^"]*\)".*/\1/')
    print_test 0 "@sentry/nextjs installed (version: $VERSION)"
else
    print_test 1 "@sentry/nextjs not found in package.json"
fi

# Check if next.config.ts has Sentry wrapper
if grep -q "withSentryConfig" next.config.ts 2>/dev/null; then
    print_test 0 "next.config.ts wrapped with withSentryConfig"
else
    print_test 1 "next.config.ts not wrapped with withSentryConfig"
fi

echo ""
echo "🔐 Security Configuration"
echo "-------------------------"

# Check if auth token file exists
if [ -f ".env.sentry-build-plugin" ]; then
    print_test 0 ".env.sentry-build-plugin exists"
else
    print_test 1 ".env.sentry-build-plugin missing (needed for source maps)"
fi

# Check if auth token is in .gitignore
if grep -q ".env.sentry-build-plugin" .gitignore 2>/dev/null; then
    print_test 0 ".env.sentry-build-plugin in .gitignore"
else
    print_test 1 ".env.sentry-build-plugin not in .gitignore (security risk!)"
fi

echo ""
echo "🧪 Test Page Configuration"
echo "--------------------------"

# Check if test page exists
if [ -f "src/app/sentry-example-page/page.tsx" ]; then
    print_test 0 "Sentry test page exists (/sentry-example-page)"
else
    print_test 1 "Sentry test page missing"
fi

# Check if test API exists
if [ -f "src/app/api/sentry-example-api/route.ts" ]; then
    print_test 0 "Sentry test API exists (/api/sentry-example-api)"
else
    print_test 1 "Sentry test API missing"
fi

echo ""
echo "🔍 DSN Configuration"
echo "--------------------"

# Check if DSN is configured
DSN_COUNT=$(grep -r "https://.*@.*sentry.io" sentry.*.config.ts src/instrumentation*.ts 2>/dev/null | wc -l | tr -d ' ')

if [ "$DSN_COUNT" -ge 3 ]; then
    print_test 0 "DSN configured in all required files"
else
    print_test 1 "DSN not configured in all files (found in $DSN_COUNT/3 files)"
fi

# Extract and display DSN
DSN=$(grep -m 1 'dsn:' sentry.server.config.ts 2>/dev/null | sed 's/.*dsn: "\([^"]*\)".*/\1/')
if [ ! -z "$DSN" ]; then
    echo -e "${BLUE}ℹ${NC} DSN: ${DSN}"
fi

echo ""
echo "🏗️  Build Configuration"
echo "-----------------------"

# Check if build artifacts exist
if [ -d ".next" ]; then
    print_test 0 "Build directory exists"

    # Check if source maps might be generated
    if grep -q "widenClientFileUpload" next.config.ts 2>/dev/null; then
        print_test 0 "Source map upload configured"
    else
        print_test 1 "Source map upload not configured"
    fi
else
    echo -e "${YELLOW}⚠${NC} Build directory doesn't exist (run 'npm run build' to create)"
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
    echo -e "${GREEN}🎉 All Sentry configuration checks passed!${NC}"
    echo ""
    echo "📝 Next Steps:"
    echo "1. Start dev server: npm run dev"
    echo "2. Visit: http://localhost:3000/sentry-example-page"
    echo "3. Click 'Throw Sample Error' button"
    echo "4. Check Sentry dashboard: https://sentry.io/organizations/cleareds/"
    echo ""
    exit 0
elif [ $PERCENTAGE -ge 80 ]; then
    echo -e "${YELLOW}⚠️  Most checks passed, but some configuration is missing.${NC}"
    echo ""
    echo "Review the failed checks above."
    exit 1
else
    echo -e "${RED}❌ Critical configuration issues found.${NC}"
    echo ""
    echo "Please review the failed checks and run the installation again:"
    echo "npx @sentry/wizard@latest -i nextjs"
    exit 2
fi

