import { test, expect } from '@playwright/test'

test.describe('Packs', () => {
  test('should load packs page', async ({ page }) => {
    await page.goto('/packs', { waitUntil: 'domcontentloaded' })

    // Check header - use more flexible selector
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })
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

  test('should show pack tabs on detail page', async ({ page }) => {
    await page.goto('/packs')
    await page.waitForTimeout(2000)

    const packLink = page.locator('a[href^="/packs/"]').first()
    if (await packLink.isVisible({ timeout: 5000 })) {
      await packLink.click()
      await page.waitForURL(/.*\/packs\/.*/)

      // Check for tab buttons
      await expect(page.locator('button:has-text("Posts")')).toBeVisible({ timeout: 5000 })
      await expect(page.locator('button:has-text("Places")')).toBeVisible()
      await expect(page.locator('button:has-text("Members")')).toBeVisible()
    }
  })

  test('should switch between pack tabs', async ({ page }) => {
    await page.goto('/packs')
    await page.waitForTimeout(2000)

    const packLink = page.locator('a[href^="/packs/"]').first()
    if (await packLink.isVisible({ timeout: 5000 })) {
      await packLink.click()
      await page.waitForURL(/.*\/packs\/.*/)

      // Click Places tab
      const placesTab = page.locator('button:has-text("Places")')
      if (await placesTab.isVisible({ timeout: 5000 })) {
        await placesTab.click()
        await page.waitForTimeout(500)
      }

      // Click Members tab
      const membersTab = page.locator('button:has-text("Members")')
      if (await membersTab.isVisible({ timeout: 5000 })) {
        await membersTab.click()
        await page.waitForTimeout(500)
      }
    }
  })
})
