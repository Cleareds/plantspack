import { test, expect } from '@playwright/test'

test.describe('Homepage and Navigation', () => {
  test('should load homepage and display key elements', async ({ page }) => {
    await page.goto('/')
    
    // Check header elements
    await expect(page.locator('text=PLANTS PACK')).toBeVisible()
    await expect(page.locator('text=BETA')).toBeVisible()
    
    // Check navigation links
    await expect(page.locator('a[href="/map"]')).toBeVisible()
    await expect(page.locator('a[href="/packs"]')).toBeVisible()
  })

  test('should navigate to map page', async ({ page }) => {
    await page.goto('/')
    await page.click('a[href="/map"]')
    await expect(page).toHaveURL(/.*map/)
  })

  test('should navigate to packs page', async ({ page }) => {
    await page.goto('/')
    await page.click('a[href="/packs"]')
    await expect(page).toHaveURL(/.*packs/)
  })
})
