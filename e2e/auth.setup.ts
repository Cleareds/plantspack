import { test as setup, expect } from '@playwright/test'

const authFile = 'e2e/.auth/user.json'

setup('authenticate', async ({ page }) => {
  // Go to auth page
  await page.goto('/auth')

  // Fill in credentials
  await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'e2e.test@plantspack.com')
  await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'TestPassword123!')

  // Click sign in
  await page.click('button[type="submit"]')

  // Wait for redirect to homepage
  await page.waitForURL('/', { timeout: 10000 })

  // Verify signed in by checking for user menu or profile link
  await expect(page.locator('a[href^="/profile/"]').first()).toBeVisible({ timeout: 5000 })

  // Save signed-in state
  await page.context().storageState({ path: authFile })
})
