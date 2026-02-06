import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('should load auth page', async ({ page }) => {
    await page.goto('/auth')
    
    // Check for sign-in form
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })

  test('should show validation for empty email', async ({ page }) => {
    await page.goto('/auth')
    
    // Try to submit without email
    const submitButton = page.locator('button[type="submit"]').first()
    await submitButton.click()
    
    // Browser validation should prevent submission
    const emailInput = page.locator('input[type="email"]')
    expect(await emailInput.evaluate(el => (el as HTMLInputElement).validationMessage)).toBeTruthy()
  })

  // Note: Actual sign-in is tested in auth.setup.ts
  // This setup runs before all other tests to authenticate the user
})
