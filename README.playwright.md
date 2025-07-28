# Playwright Testing Guide

This document provides instructions for running Playwright tests for the search functionality.

## Prerequisites

1. **Node.js and npm**: Ensure you have Node.js installed
2. **Supabase Local Development**: You need Supabase CLI installed and configured
3. **Environment Variables**: Set up your test environment variables

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create a `.env.test.local` file based on `.env.test`:
```bash
cp .env.test .env.test.local
```

Update `.env.test.local` with your local Supabase credentials:
- Get your `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` from your local Supabase instance
- You can find these in your Supabase project settings or by running `npx supabase status`

### 3. Database Setup
Start your local Supabase instance and seed test data:
```bash
npm run test:setup
```
This will:
- Start the local Supabase database
- Reset and seed the database with test data

## Running Tests

### Basic Test Commands

```bash
# Run all tests
npm test

# Run tests with UI mode (visual test runner)
npm run test:ui

# Run tests in headed mode (see browser)
npm run test:headed

# Run tests only in Chrome
npm run test:chrome
```

### Advanced Playwright Commands

```bash
# Run tests in specific browser
npx playwright test --project=firefox
npx playwright test --project=webkit

# Run specific test file
npx playwright test tests/search.spec.ts

# Run tests matching a pattern
npx playwright test --grep "should search posts"

# Debug tests
npx playwright test --debug

# Generate test code
npx playwright codegen localhost:3000
```

## Test Structure

### Test Files
- `tests/search.spec.ts` - Main search functionality tests
- `tests/utils/auth.ts` - Authentication utilities for tests
- `tests/utils/database.ts` - Database setup and cleanup utilities

### Test Categories

1. **Authentication Tests**
   - Verify search bar visibility for logged-in users only
   - Test sign-in/sign-out functionality

2. **Search Behavior Tests**
   - Minimum character requirement (3+ characters)
   - Debounce functionality
   - Search results display

3. **Results Display Tests**
   - Two-column layout (posts left, users right)
   - Text highlighting in search results
   - "No results" message display

4. **User Interaction Tests**
   - Click outside to close dropdown
   - Clear search functionality
   - Navigation to user profiles

5. **Edge Case Tests**
   - Special characters in search
   - Very long search queries
   - Unicode character handling

## Test Data

The tests use predefined test users and posts:

### Test Users
- `test1@plantspack.com` (testuser1)
- `test2@plantspack.com` (testuser2)

### Test Posts
- Content includes terms like "vegan recipe", "plant-based", "sustainability"
- Mix of public and friends-only posts to test privacy filtering

## Debugging Failed Tests

### View Test Reports
```bash
npx playwright show-report
```

### Screenshots and Videos
Failed tests automatically capture:
- Screenshots (stored in `test-results/`)
- Videos of test execution
- Traces for debugging

### Common Issues

1. **Database Connection**: Ensure Supabase is running locally
2. **Test Data**: Run `npm run test:setup` to refresh test data
3. **Environment Variables**: Verify `.env.test.local` is configured correctly
4. **Port Conflicts**: Make sure port 3000 is available for the dev server

## Cleanup

After testing, stop the database:
```bash
npm run test:teardown
```

## CI/CD Integration

The tests are configured to run in CI environments with:
- Automatic retries (2 retries on CI)
- Single worker process for stability
- HTML reporting for results

Example GitHub Actions workflow:
```yaml
- name: Install dependencies
  run: npm ci

- name: Install Playwright browsers
  run: npx playwright install --with-deps

- name: Setup test database
  run: npm run test:setup

- name: Run Playwright tests
  run: npm test

- name: Upload test reports
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
```

## Configuration

See `playwright.config.ts` for detailed configuration including:
- Browser projects (Chrome, Firefox, Safari, Mobile)
- Test timeouts and retries
- Reporter settings
- Global setup and teardown