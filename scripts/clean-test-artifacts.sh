#!/bin/bash
# Clean Test Artifacts Script
# This script removes all test-related temporary files and reports

echo "🧹 Cleaning test artifacts..."

# Remove Playwright reports and results
rm -rf playwright-report/
rm -rf test-results/
rm -rf .playwright/
rm -rf test-output/
rm -rf screenshots/
rm -rf videos/
rm -rf traces/
rm -rf downloads/

# Remove TypeScript build artifacts
rm -f tsconfig.tsbuildinfo
rm -f next-env.d.ts

# Remove system files
find . -name ".DS_Store" -delete 2>/dev/null || true

# Remove test coverage
rm -rf coverage/
rm -rf .nyc_output/

# Remove temporary files
rm -rf .tmp/
rm -rf tmp/

# Remove log files
rm -f *.log
rm -f npm-debug.log*
rm -f yarn-debug.log*
rm -f yarn-error.log*
rm -f .pnpm-debug.log*

echo "✅ Test artifacts cleaned successfully!"
echo ""
echo "📋 Cleaned:"
echo "  - Playwright reports and test results"
echo "  - TypeScript build cache"
echo "  - System files (.DS_Store)"
echo "  - Coverage reports"
echo "  - Log files"
echo ""
echo "🚀 Ready for clean testing!"