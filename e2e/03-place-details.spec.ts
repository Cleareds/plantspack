import { test, expect } from '@playwright/test'

test.describe('Place Detail Page', () => {
  test('should navigate to a place from map', async ({ page }) => {
    // Start from map page
    await page.goto('/map')
    await page.waitForSelector('.leaflet-container')
    await page.waitForTimeout(2000)

    // Click on first place link
    const placeLink = page.locator('a[href^="/place/"]').first()
    if (await placeLink.isVisible({ timeout: 5000 })) {
      await placeLink.click()

      // Verify we're on a place detail page
      await expect(page).toHaveURL(/.*\/place\/.*/)

      // Check place info is displayed
      await expect(page.locator('h1')).toBeVisible()
      await expect(page.locator('text=Reviews')).toBeVisible()
    }
  })

  test('should display review form for authenticated users', async ({ page }) => {
    // Go to map and find a place
    await page.goto('/map')
    await page.waitForSelector('.leaflet-container')
    await page.waitForTimeout(2000)

    const placeLink = page.locator('a[href^="/place/"]').first()
    if (await placeLink.isVisible({ timeout: 5000 })) {
      await placeLink.click()
      await page.waitForURL(/.*\/place\/.*/)

      // Should see review form (authenticated)
      const reviewTextarea = page.locator('textarea[placeholder*="review"]').first()
      await expect(reviewTextarea).toBeVisible({ timeout: 5000 })
    }
  })

  test('should display external map links', async ({ page }) => {
    // Go to map and find a place
    await page.goto('/map')
    await page.waitForSelector('.leaflet-container')
    await page.waitForTimeout(2000)

    const placeLink = page.locator('a[href^="/place/"]').first()
    if (await placeLink.isVisible({ timeout: 5000 })) {
      await placeLink.click()
      await page.waitForURL(/.*\/place\/.*/)

      // Check for Google Maps and Apple Maps links
      await expect(page.locator('a[href*="google.com/maps"]')).toBeVisible()
      await expect(page.locator('a[href*="maps.apple.com"]')).toBeVisible()
    }
  })
})
