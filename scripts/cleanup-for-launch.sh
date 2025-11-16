#!/bin/bash

# PlantsPack Pre-Launch Cleanup Script
# Removes unnecessary files and prepares for production deployment

echo "🧹 PlantsPack Pre-Launch Cleanup"
echo "================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

REMOVED=0
KEPT=0

echo "📋 Step 1: Removing Test & Development Files"
echo "---------------------------------------------"

# Remove test artifacts
if [ -d "playwright-report" ]; then
    rm -rf playwright-report
    echo -e "${GREEN}✓${NC} Removed: playwright-report/"
    ((REMOVED++))
fi

if [ -d "test-results" ]; then
    rm -rf test-results
    echo -e "${GREEN}✓${NC} Removed: test-results/"
    ((REMOVED++))
fi

if [ -d ".playwright" ]; then
    rm -rf .playwright
    echo -e "${GREEN}✓${NC} Removed: .playwright/"
    ((REMOVED++))
fi

# Remove test output files
if [ -d "test-output" ]; then
    rm -rf test-output
    echo -e "${GREEN}✓${NC} Removed: test-output/"
    ((REMOVED++))
fi

echo ""
echo "📋 Step 2: Removing Development Artifacts"
echo "------------------------------------------"

# Remove local Supabase files (if using remote)
if [ -d ".supabase" ]; then
    echo -e "${YELLOW}⚠${NC}  Found: .supabase/ (local Supabase instance)"
    echo "   Keep this if using local development, remove for production only"
    ((KEPT++))
fi

# Remove IDE files
if [ -d ".idea" ]; then
    rm -rf .idea
    echo -e "${GREEN}✓${NC} Removed: .idea/ (JetBrains IDE)"
    ((REMOVED++))
fi

if [ -d ".vscode" ]; then
    echo -e "${YELLOW}⚠${NC}  Found: .vscode/ (VS Code settings)"
    echo "   Keeping for team consistency"
    ((KEPT++))
fi

# Remove DS_Store files (macOS)
find . -name ".DS_Store" -type f -delete 2>/dev/null
echo -e "${GREEN}✓${NC} Removed: All .DS_Store files"
((REMOVED++))

echo ""
echo "📋 Step 3: Checking Sensitive Files"
echo "------------------------------------"

# Check for accidentally committed secrets
if grep -r "password.*=.*['\"]" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "password:" | grep -v "//" | grep -v "/\*" > /dev/null; then
    echo -e "${RED}✗${NC} WARNING: Potential hardcoded passwords found!"
    echo "   Review src/ directory for hardcoded credentials"
else
    echo -e "${GREEN}✓${NC} No hardcoded passwords detected"
fi

# Check .env.local is in .gitignore
if grep -q ".env.local" .gitignore 2>/dev/null; then
    echo -e "${GREEN}✓${NC} .env.local is in .gitignore"
else
    echo -e "${RED}✗${NC} WARNING: .env.local not in .gitignore!"
fi

# Check Sentry auth token is in .gitignore
if grep -q ".env.sentry-build-plugin" .gitignore 2>/dev/null; then
    echo -e "${GREEN}✓${NC} .env.sentry-build-plugin is in .gitignore"
else
    echo -e "${RED}✗${NC} WARNING: Sentry auth token not in .gitignore!"
fi

echo ""
echo "📋 Step 4: Cleaning Build Artifacts"
echo "------------------------------------"

# Clean Next.js build (will be rebuilt on deploy)
if [ -d ".next" ]; then
    echo -e "${BLUE}ℹ${NC}  Found: .next/ (Next.js build cache)"
    echo "   Vercel will rebuild this - safe to remove locally"
    ((KEPT++))
fi

# Clean node_modules (if needed)
echo -e "${BLUE}ℹ${NC}  node_modules/ (keeping for local development)"
((KEPT++))

echo ""
echo "📋 Step 5: Removing Backup Files"
echo "---------------------------------"

# Remove backup files
find . -name "*.backup" -type f -delete 2>/dev/null
find . -name "*.bak" -type f -delete 2>/dev/null
find . -name "*~" -type f -delete 2>/dev/null
echo -e "${GREEN}✓${NC} Removed: All backup files (*.backup, *.bak, *~)"
((REMOVED++))

# Check for vercel.json.backup
if [ -f "vercel.json.backup" ]; then
    rm -f vercel.json.backup
    echo -e "${GREEN}✓${NC} Removed: vercel.json.backup"
    ((REMOVED++))
fi

echo ""
echo "📋 Step 6: Optimizing Dependencies"
echo "-----------------------------------"

# Check for unused dependencies (optional - just report)
echo -e "${BLUE}ℹ${NC}  Checking for potential unused dependencies..."
echo "   (Run 'npx depcheck' manually for detailed analysis)"

echo ""
echo "📋 Step 7: Checking File Sizes"
echo "-------------------------------"

# Find large files
echo "Largest files in src/:"
du -sh src/* 2>/dev/null | sort -rh | head -5

echo ""
echo "Public folder size:"
du -sh public 2>/dev/null

echo ""
echo "📋 Step 8: Git Status Check"
echo "----------------------------"

# Check git status
if git status &>/dev/null; then
    UNTRACKED=$(git ls-files --others --exclude-standard | wc -l)
    if [ $UNTRACKED -gt 0 ]; then
        echo -e "${YELLOW}⚠${NC}  Found $UNTRACKED untracked files"
        echo "   Review with: git status"
    else
        echo -e "${GREEN}✓${NC} No untracked files"
    fi

    # Check for large files in git
    LARGE_FILES=$(find . -type f -size +1M -not -path "./node_modules/*" -not -path "./.next/*" -not -path "./.git/*" 2>/dev/null | wc -l)
    if [ $LARGE_FILES -gt 0 ]; then
        echo -e "${YELLOW}⚠${NC}  Found $LARGE_FILES files > 1MB (excluding node_modules)"
        echo "   Consider optimizing: find . -type f -size +1M -not -path './node_modules/*' -ls"
    else
        echo -e "${GREEN}✓${NC} No large files detected"
    fi
else
    echo -e "${BLUE}ℹ${NC}  Not a git repository"
fi

echo ""
echo "📋 Step 9: Final Checks"
echo "-----------------------"

# Check critical files exist
CRITICAL_FILES=(
    "package.json"
    "next.config.ts"
    "tsconfig.json"
    ".env.local"
    "vercel.json"
    "README.md"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} Found: $file"
    else
        echo -e "${RED}✗${NC} Missing: $file"
    fi
done

# Check migrations
MIGRATION_COUNT=$(ls -1 supabase/migrations/*.sql 2>/dev/null | wc -l)
echo -e "${BLUE}ℹ${NC}  Found $MIGRATION_COUNT SQL migrations"

# Check documentation
DOC_COUNT=$(ls -1 docs/*.md 2>/dev/null | wc -l)
echo -e "${BLUE}ℹ${NC}  Found $DOC_COUNT documentation files in docs/"

echo ""
echo "📊 Summary"
echo "=========="
echo -e "Files/Folders Removed: ${GREEN}${REMOVED}${NC}"
echo -e "Files/Folders Kept: ${BLUE}${KEPT}${NC}"

echo ""
echo "✅ Cleanup Complete!"
echo ""
echo "📝 Next Steps:"
echo "1. Review: git status"
echo "2. Test: npm run build"
echo "3. Commit: git add . && git commit -m 'Pre-launch cleanup'"
echo "4. Deploy: git push (Vercel auto-deploys)"
echo ""
echo "📚 See docs/DEPLOYMENT_GUIDE.md for complete deployment steps"

