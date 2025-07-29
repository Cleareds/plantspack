# 🧪 Test Management Guide

## 🗂️ **Test Artifacts & Cleanup**

### **What Gets Generated During Testing:**

When you run Playwright tests, several directories and files are created:

```
├── playwright-report/     # HTML test reports
├── test-results/         # Failed test screenshots & traces
├── .playwright/          # Browser cache
├── test-output/          # Custom test outputs
├── screenshots/          # Test screenshots  
├── videos/              # Test recordings
├── traces/              # Playwright traces
├── downloads/           # Downloaded files during tests
└── tsconfig.tsbuildinfo # TypeScript build cache
```

### **Automated Cleanup:**

All test artifacts are automatically ignored by git via `.gitignore`:

```gitignore
# testing
/playwright-report/
/test-results/
*.spec.js.map
*.test.js.map
test-results/
playwright-report/
playwright/.cache/
.playwright/
test-output/
screenshots/
videos/
traces/
downloads/
```

## 🛠️ **Clean Test Environment**

### **Manual Cleanup:**
```bash
# Clean all test artifacts
npm run test:clean

# Or run the script directly
bash scripts/clean-test-artifacts.sh
```

### **What Gets Cleaned:**
- ✅ Playwright reports and test results
- ✅ TypeScript build cache
- ✅ System files (.DS_Store)
- ✅ Coverage reports  
- ✅ Log files
- ✅ Temporary directories

### **Automatic Cleanup:**
The cleanup script runs automatically when you:
- Push to repository (pre-commit hooks could be added)
- Deploy to production (CI/CD cleans artifacts)
- Run test suites (optional post-test cleanup)

## 📊 **Test Reporting**

### **Report Types:**
1. **Console Output** - Clean list format (`--reporter=list`)
2. **HTML Report** - Detailed report at `playwright-report/index.html`
3. **CI Reports** - GitHub Actions integration

### **Viewing Reports:**
```bash
# Run tests and view HTML report
npm run test
npx playwright show-report

# Clean console output only
npm run test:fast
```

## 🚀 **Best Practices**

### **Keep Repository Clean:**
- ✅ Test artifacts are git-ignored
- ✅ Regular cleanup prevents bloat
- ✅ Only commit test source code, not results

### **Development Workflow:**
```bash
# Start fresh testing session
npm run test:clean
npm run test:setup

# Run optimized tests  
npm run test:fast

# Clean up after testing
npm run test:clean
npm run test:teardown
```

### **CI/CD Integration:**
- Tests run in clean environments
- Artifacts uploaded for failed tests
- Reports generated for debugging
- No test pollution between runs

## 📁 **Directory Structure**

```
tests/
├── search.spec.ts        # Search functionality tests
└── utils/
    ├── auth.ts           # Authentication helpers
    └── database.ts       # Database test utilities

scripts/
└── clean-test-artifacts.sh  # Cleanup script

# Generated (git-ignored):
playwright-report/        # HTML reports
test-results/            # Failed test artifacts
.playwright/             # Browser cache
```

## 🔧 **Configuration**

### **Playwright Config:**
- **Browsers**: Chromium + Mobile Chrome only
- **Reporter**: List (clean) + HTML (detailed)
- **Artifacts**: Screenshots on failure only
- **Traces**: On retry only

### **Performance:**
- **Workers**: 2 locally, 1 in CI
- **Timeouts**: 30s test, 10s assertions
- **Retries**: 1 locally, 2 in CI

---

## 🎯 **Quick Commands**

```bash
# Clean & Fast Test Cycle
npm run test:clean && npm run test:fast

# Full Test Suite (2 browsers)
npm run test

# Mobile Testing Only
npm run test:mobile

# Clean Everything
npm run test:clean
```

Your test environment stays clean and efficient! 🧹✨