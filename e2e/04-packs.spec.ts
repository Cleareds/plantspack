import { test, expect } from '@playwright/test'

test.describe('Packs', () => {
  test('should load packs page', async ({ page }) => {
    await page.goto('/packs')
    
    // Check header
    await expect(page.locator('h1:has-text("Discover Packs")')).toBeVisible()
  })

  test('should display pack list', async ({ page }) => {
    await page.goto('/packs')
    
    // Wait for packs to load
    await page.waitForTimeout(2000)
    
    // Check if packs are displayed or empty state
    const hasPacks = await page.locator('a[href^="/packs/"]').count() > 0
    const hasEmptyState = await page.locator('text=No packs found').isVisible()
    
    expect(hasPacks || hasEmptyState).toBeTruthy()
  })

  test('should navigate to pack detail', async ({ page }) => {
    await page.goto('/packs')
    await page.waitForTimeout(2000)
    
    const packLink = page.locator('a[href^="/packs/"]').first()
    if (await packLink.isVisible({ timeout: 5000 })) {
      await packLink.click()
      await expect(page).toHaveURL(/.*\/packs\//)
    }
  })

  test.skip('should show pack tabs (Posts, Places, Members)', async ({ page }) => {
    const testPackId = process.env.TEST_PACK_ID || 'test-pack-id'
    await page.goto(`/packs/${testPackId}`)
    
    await expect(page.locator('button:has-text("Posts")')).toBeVisible()
    await expect(page.locator('button:has-text("Places")')).toBeVisible()
    await expect(page.locator('button:has-text("Members")')).toBeVisible()
  })
})
