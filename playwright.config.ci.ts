import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for CI/CD environments (Vercel, GitHub Actions)
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  /* Global timeout for each test */
  timeout: 45 * 1000, // 45 seconds per test in CI
  /* Global timeout for expect() calls */
  expect: {
    timeout: 15 * 1000, // 15 seconds for assertions
  },
  /* Run tests in series for CI stability */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry failed tests */
  retries: 2,
  /* Single worker for CI stability */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['github'] // GitHub Actions integration
  ],
  /* Shared settings for all the projects below. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test. */
    trace: 'on-first-retry',
    
    /* Take screenshot only on failure */
    screenshot: 'only-on-failure',
    
    /* Record video only on failure */
    video: 'retain-on-failure',
  },

  /* Configure projects for essential browsers only in CI */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // CI optimizations
        launchOptions: {
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        }
      },
    },
  ],

  /* Don't run a dev server in CI - tests run against deployed app */
  // webServer: undefined - CI tests run against deployed Vercel preview
})