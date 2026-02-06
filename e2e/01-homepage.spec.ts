import { test, expect } from '@playwright/test'

test.describe('Homepage and Navigation', () => {
  test('should load homepage and display key elements', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // Check header elements (use .first() to avoid strict mode violation with duplicate text in footer)
    await expect(page.locator('text=PLANTS PACK').first()).toBeVisible({ timeout: 10000 })

    // Check navigation links
    await expect(page.locator('a[href="/map"]').first()).toBeVisible()
    await expect(page.locator('a[href="/packs"]').first()).toBeVisible()
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
