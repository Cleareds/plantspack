import { test as setup, expect } from '@playwright/test'

const authFile = 'e2e/.auth/user.json'

setup('authenticate', async ({ page }) => {
  // Go to auth page
  await page.goto('/auth')

  // Wait for page to load
  await page.waitForLoadState('networkidle')

  // Fill in credentials using placeholder text
  await page.getByPlaceholder('Enter email or username').fill(process.env.TEST_USER_EMAIL || 'e2e.test@plantspack.com')
  await page.getByPlaceholder('Enter password').fill(process.env.TEST_USER_PASSWORD || 'TestPassword123!')

  // Click sign in button
  await page.getByRole('button', { name: 'Sign In' }).click()

  // Wait for redirect to homepage
  await page.waitForURL('/', { timeout: 10000 })

  // Verify signed in by checking for user menu or profile link
  await expect(page.locator('a[href^="/profile/"]').first()).toBeVisible({ timeout: 5000 })

  // Save signed-in state
  await page.context().storageState({ path: authFile })
})
