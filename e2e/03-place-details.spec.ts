import { test, expect } from '@playwright/test'

test.describe('Place Detail Page', () => {
  test.skip('should display place details', async ({ page }) => {
    // This test requires a known place ID
    // Skip in automated runs, use for manual testing
    const testPlaceId = process.env.TEST_PLACE_ID || 'test-place-id'
    await page.goto(`/place/${testPlaceId}`)
    
    // Check place info is displayed
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('text=Address')).toBeVisible()
    
    // Check reviews section
    await expect(page.locator('text=Reviews')).toBeVisible()
  })

  test.skip('should show sign-in prompt for non-authenticated users', async ({ page }) => {
    const testPlaceId = process.env.TEST_PLACE_ID || 'test-place-id'
    await page.goto(`/place/${testPlaceId}`)
    
    // Should see sign-in prompt in reviews section
    await expect(page.locator('text=Sign in to leave a review')).toBeVisible()
  })
})
