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

  test.skip('should allow sign in with valid credentials', async ({ page }) => {
    // Skip in automated tests - requires valid test credentials
    await page.goto('/auth')
    
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com')
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'password')
    await page.click('button[type="submit"]')
    
    // Should redirect after successful login
    await page.waitForURL('/', { timeout: 10000 })
  })
})
