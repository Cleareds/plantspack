import { defineConfig, devices } from '@playwright/test'
import path from 'path'

// Load test environment variables from .env.test.local if it exists
try {
  require('dotenv').config({ path: path.resolve(__dirname, '.env.test.local') })
} catch (e) {
  // dotenv is not available, which is fine for production builds
}

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  /* Global timeout for each test */
  timeout: 30 * 1000, // 30 seconds per test
  /* Global timeout for expect() calls */
  expect: {
    timeout: 10 * 1000, // 10 seconds for assertions
  },
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 1, // 1 retry locally for flaky tests
  /* Limit workers for better stability */
  workers: process.env.CI ? 1 : 2, // Max 2 workers locally
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['list'], // Clean console output
    ['html', { open: 'never' }], // HTML report without auto-opening
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Take screenshot only on failure */
    screenshot: 'only-on-failure',
  },

  /* Configure projects for essential browsers only */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Faster execution settings
        launchOptions: {
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
      },
    },

    /* Test against mobile viewports */
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        // Faster mobile testing
        launchOptions: {
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev:test',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180 * 1000, // Increased to 3 minutes
    stdout: 'pipe',
    stderr: 'pipe',
  },
})