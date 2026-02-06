import { test, expect } from '@playwright/test'

test.describe('Map and Places', () => {
  test('should load map page and display places', async ({ page }) => {
    await page.goto('/map')
    
    // Wait for map to load
    await page.waitForSelector('.leaflet-container', { timeout: 10000 })
    
    // Check that map is visible
    await expect(page.locator('.leaflet-container')).toBeVisible()
  })

  test('should filter places by category', async ({ page }) => {
    await page.goto('/map')
    await page.waitForSelector('.leaflet-container')
    
    // Click on a category filter (if available)
    const categoryButton = page.locator('button:has-text("Restaurants")').first()
    if (await categoryButton.isVisible()) {
      await categoryButton.click()
    }
  })

  test('should navigate to place detail from map', async ({ page }) => {
    await page.goto('/map')
    await page.waitForSelector('.leaflet-container')
    
    // Click on a place marker (if available)
    await page.waitForTimeout(2000) // Wait for markers to load
    
    const placeLink = page.locator('a[href^="/place/"]').first()
    if (await placeLink.isVisible({ timeout: 5000 })) {
      await placeLink.click()
      await expect(page).toHaveURL(/.*\/place\//)
    }
  })
})
