# 🚀 Vercel Testing & Deployment Guide

## ✅ **What's Configured for Vercel Deployment**

Your repository is now configured to support testing during Vercel deployments while keeping test artifacts out of git.

### 📁 **Files Committed to Git (Available for Deployment):**
```
tests/                      ✅ Test source files
├── search.spec.ts         ✅ Search functionality tests  
└── utils/                 ✅ Test utilities
    ├── auth.ts           ✅ Authentication helpers
    └── database.ts       ✅ Database test utilities

playwright.config.ts       ✅ Local test configuration
playwright.config.ci.ts    ✅ CI test configuration  
playwright.config.vercel.ts ✅ Vercel-optimized config

scripts/
├── vercel-deploy.sh       ✅ Deployment with testing
├── ignore-build-step.sh   ✅ Smart build skipping
└── clean-test-artifacts.sh ✅ Cleanup utility

package.json               ✅ Test scripts included
vercel.json               ✅ Deployment configuration
```

### 🚫 **Files Ignored by Git (Test Artifacts):**
```
playwright-report/         🚫 HTML test reports
test-results/              🚫 Failed test screenshots
.playwright/               🚫 Browser cache
test-output/               🚫 Custom outputs
screenshots/               🚫 Test screenshots
videos/                    🚫 Test recordings
traces/                    🚫 Playwright traces
```

## 🔧 **Vercel Deployment Options**

### **Option 1: Basic Deployment (No Tests)**
Default behavior - just builds and deploys:

```bash
# Vercel automatically runs:
npm ci
npm run build
```

### **Option 2: Deployment with Testing**
Enable by setting environment variable in Vercel dashboard:

```bash
RUN_TESTS_ON_DEPLOY=true
```

When enabled, Vercel runs:
```bash
npm ci
npx playwright install chromium --with-deps
npm run build
npm run test:vercel  # Runs optimized tests
```

### **Option 3: Manual Test Deployment**
Use custom deployment script:

```bash
# In your package.json:
"scripts": {
  "test:deploy": "bash scripts/vercel-deploy.sh"
}
```

## ⚙️ **Vercel Environment Variables**

Set these in your Vercel dashboard:

### **Required for App:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXTAUTH_SECRET=your-random-secret
NEXTAUTH_URL=https://your-app.vercel.app
```

### **Optional for Testing:**
```bash
# Enable tests during deployment
RUN_TESTS_ON_DEPLOY=true

# Playwright configuration
PLAYWRIGHT_TEST_BASE_URL=https://your-preview-deployment.vercel.app
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
```

## 🧪 **Test Configurations**

### **Local Development:**
```bash
npm run test          # Full test suite (Chromium + Mobile)
npm run test:fast     # Chromium only, single worker
npm run test:chrome   # Desktop Chromium
npm run test:mobile   # Mobile Chrome
```

### **CI/CD (GitHub Actions):**
```bash
npm run test:ci       # Uses playwright.config.ci.ts
```

### **Vercel Deployment:**
```bash
npm run test:vercel   # Uses playwright.config.vercel.ts
npm run test:deploy   # Full deployment with testing
```

## 📊 **Test Configurations Comparison**

| Configuration | Browsers | Workers | Timeout | Use Case |
|--------------|----------|---------|---------|----------|
| `playwright.config.ts` | Chromium + Mobile | 2 | 30s | Local development |
| `playwright.config.ci.ts` | Chromium + Mobile | 1 | 30s | GitHub Actions |
| `playwright.config.vercel.ts` | Chromium only | 1 | 20s | Vercel deployment |

## 🚦 **Smart Build Management**

### **When Builds are Triggered:**
✅ Main branch pushes (always build)  
✅ Code changes (.tsx, .ts, .jsx, .js, .css)  
✅ Configuration changes (package.json, vercel.json)  
⏭️ Documentation-only changes (skipped)  
⏭️ Test-only changes (skipped)

### **Build Skipping Logic:**
```bash
# Runs automatically via ignoreCommand in vercel.json
bash scripts/ignore-build-step.sh
```

## 🔍 **Monitoring & Debugging**

### **View Test Results:**
1. **Vercel Dashboard** → Your Project → Functions tab
2. **Build Logs** → Look for test output
3. **Function Logs** → Runtime test execution

### **Test Artifacts:**
- Screenshots saved to Vercel function storage (temporary)
- Test results logged to console
- HTML reports not generated (saves space/time)

### **Troubleshooting:**
```bash
# Test locally against Vercel preview
PLAYWRIGHT_TEST_BASE_URL=https://your-preview.vercel.app npm run test:vercel

# Check deployment logs
vercel logs your-deployment-url

# Manual cleanup if needed
npm run test:clean
```

## 🎯 **Best Practices**

### **Development Workflow:**
```bash
# 1. Develop locally with tests
npm run test:fast

# 2. Clean before commit
npm run test:clean

# 3. Push to trigger deployment
git push origin main
```

### **Quality Gates:**
- ✅ Tests run in GitHub Actions on PR
- ✅ Optional tests during Vercel deployment  
- ✅ Main branch gets full test coverage
- ✅ Preview deployments can skip tests for speed

### **Performance Optimizations:**
- Single browser (Chromium) for deployment tests
- Reduced timeouts for faster feedback
- Browser launch optimized for serverless
- Smart build skipping for non-code changes

## 🚀 **Quick Start**

1. **Enable Testing in Vercel:**
   ```bash
   # In Vercel dashboard, add environment variable:
   RUN_TESTS_ON_DEPLOY=true
   ```

2. **Deploy with Testing:**
   ```bash
   git push origin main  # Automatically runs tests
   ```

3. **Manual Test Against Deployment:**
   ```bash
   PLAYWRIGHT_TEST_BASE_URL=https://your-app.vercel.app npm run test:vercel
   ```

Your Vercel deployment now supports testing while keeping your repository clean! 🎉

---

## 📋 **Summary**

✅ **Test source files** committed to git (available for deployment)  
✅ **Test artifacts** ignored by git (clean repository)  
✅ **Vercel-optimized** test configuration  
✅ **Smart build skipping** for efficiency  
✅ **Optional testing** during deployment  
✅ **Multiple test configurations** for different environments  

Your deployment pipeline is now robust and efficient! 🚀