import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('should load auth page', async ({ page }) => {
    await page.goto('/auth')

    // Check for sign-in form
    await expect(page.getByPlaceholder('Enter email or username')).toBeVisible()
    await expect(page.getByPlaceholder('Enter password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
  })

  test('should show validation for empty fields', async ({ page }) => {
    await page.goto('/auth')

    // Try to submit without credentials
    await page.getByRole('button', { name: 'Sign In' }).click()

    // Page should still be on auth page (validation prevented submission)
    await expect(page).toHaveURL(/.*auth/)
  })

  // Note: Actual sign-in is tested in auth.setup.ts
  // This setup runs before all other tests to authenticate the user
})
