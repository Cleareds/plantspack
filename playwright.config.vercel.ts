import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for Vercel deployments
 * Optimized for speed and reliability in serverless environment
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  /* Global timeout for each test - reduced for deployment */
  timeout: 20 * 1000, // 20 seconds per test
  /* Global timeout for expect() calls */
  expect: {
    timeout: 8 * 1000, // 8 seconds for assertions
  },
  /* Run tests in series for serverless stability */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry failed tests */
  retries: 2,
  /* Single worker for serverless environment */
  workers: 1,
  /* Reporter optimized for deployment logs */
  reporter: [
    ['list'], // Clean console output for Vercel logs
    ['json', { outputFile: 'test-results.json' }], // Machine readable results
  ],
  /* Shared settings optimized for deployment */
  use: {
    /* Base URL - will be set to Vercel preview URL */
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
    
    /* Faster trace collection */
    trace: 'retain-on-failure',
    
    /* Screenshots only on failure to save space */
    screenshot: 'only-on-failure',
    
    /* No video recording to save time/space */
    video: 'off',
    
    /* Faster navigation */
    navigationTimeout: 15 * 1000,
    actionTimeout: 10 * 1000,
  },

  /* Essential browsers only for deployment testing */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Optimized for serverless
        launchOptions: {
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote',
            '--single-process', // Critical for serverless
          ]
        }
      },
    },
  ],

  /* No dev server - tests run against deployed app */
  // webServer: undefined
})