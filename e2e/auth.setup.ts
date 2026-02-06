import { test as setup, expect } from '@playwright/test'

const authFile = 'e2e/.auth/user.json'

setup('authenticate', async ({ page }) => {
  // Go to auth page
  await page.goto('/auth', { waitUntil: 'domcontentloaded' })

  // Wait for auth form to be visible
  await page.getByPlaceholder('Enter email or username').waitFor({ state: 'visible', timeout: 10000 })

  // Fill in credentials using placeholder text
  await page.getByPlaceholder('Enter email or username').fill(process.env.TEST_USER_EMAIL || 'e2e.test@plantspack.com')
  await page.getByPlaceholder('Enter password').fill(process.env.TEST_USER_PASSWORD || 'TestPassword123!')

  // Click sign in button
  await page.getByRole('button', { name: 'Sign In' }).click()

  // Wait for redirect to homepage (use regex to match any base URL)
  await page.waitForURL(/\/$/, { timeout: 15000 })

  // Verify signed in by checking for user menu or profile link
  await expect(page.locator('a[href^="/profile/"]').first()).toBeVisible({ timeout: 10000 })

  // Save signed-in state
  await page.context().storageState({ path: authFile })
})
