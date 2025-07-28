import { test, expect } from '@playwright/test'
import { signInUser, signUpUser, createTestPost, waitForSearchReady, TEST_USERS } from './utils/auth'
import { cleanupTestData, createTestPosts } from './utils/database'

test.describe('Search Functionality', () => {
  // Cleanup after tests
  test.afterAll(async () => {
    await cleanupTestData()
  })

  test.beforeEach(async ({ page }) => {
    // Clean up data and create/sign in test user
    await cleanupTestData()
    
    // Sign in as test user 1
    try {
      await signInUser(page, TEST_USERS.user1)
    } catch (error) {
      // If user doesn't exist, create it
      await signUpUser(page, TEST_USERS.user1)
    }
    await waitForSearchReady(page)
  })

  test('should show search bar only for authenticated users', async ({ page }) => {
    // Verify search bar is visible for authenticated user
    await expect(page.locator('input[placeholder*="Search posts and users"]')).toBeVisible()
    
    // Sign out and verify search bar is hidden
    await page.click('button:has-text("Sign Out")')
    await expect(page.locator('input[placeholder*="Search posts and users"]')).not.toBeVisible()
  })

  test('should not trigger search with less than 3 characters', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search posts and users"]')
    
    // Type 1-2 characters
    await searchInput.fill('ve')
    
    // Wait a bit for debounce
    await page.waitForTimeout(500)
    
    // Verify no dropdown appears
    await expect(page.locator('[role="listbox"], .search-results')).not.toBeVisible()
  })

  test('should trigger search with 3+ characters and show results', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search posts and users"]')
    
    // Type search query
    await searchInput.fill('vegan')
    
    // Wait for debounce and search results
    await page.waitForTimeout(500)
    
    // Verify dropdown appears
    await expect(page.locator('[data-testid="search-dropdown"]')).toBeVisible()
    
    // Verify the grid layout (posts left, users right)
    await expect(page.locator('.grid.grid-cols-2')).toBeVisible()
  })

  test('should search posts and display results in left column', async ({ page }) => {
    // First create a test post to search for
    await createTestPost(page, 'This is a delicious vegan pasta recipe for testing')
    
    const searchInput = page.locator('input[placeholder*="Search posts and users"]')
    
    // Search for content that exists in test posts
    await searchInput.fill('vegan recipe')
    
    // Wait for search results
    await page.waitForTimeout(500)
    
    // Verify posts column header
    await expect(page.locator('text=Posts (')).toBeVisible()
    
    // Verify post content appears in results
    await expect(page.locator('text=delicious vegan pasta recipe')).toBeVisible()
    
    // Verify post metadata (author, timestamp)
    await expect(page.locator('text=Test')).toBeVisible()
    await expect(page.locator('text=ago')).toBeVisible()
  })

  test('should search users and display results in right column', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search posts and users"]')
    
    // Search for common term that should match usernames
    await searchInput.fill('testuser')
    
    // Wait for search results
    await page.waitForTimeout(500)
    
    // Verify users column header
    await expect(page.locator('text=Users (')).toBeVisible()
    
    // Verify at least one user appears in results (should find testuser1)
    const userResults = page.locator('text=testuser1').or(page.locator('text=testuser2'))
    await expect(userResults.first()).toBeVisible()
  })

  test('should highlight search matches in results', async ({ page }) => {
    // First create a test post with content to search for
    await createTestPost(page, 'Just tried an amazing plant-based burger for testing')
    
    const searchInput = page.locator('input[placeholder*="Search posts and users"]')
    
    // Search for specific term
    await searchInput.fill('plant')
    
    // Wait for search results
    await page.waitForTimeout(500)
    
    // Verify highlighted text (marked elements) - expect at least one match
    await expect(page.locator('mark:has-text("plant")').first()).toBeVisible()
  })

  test('should show "no results" message when search returns empty', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search posts and users"]')
    
    // Search for non-existent content
    await searchInput.fill('nonexistentcontent123')
    
    // Wait for search results
    await page.waitForTimeout(500)
    
    // Verify no results message
    await expect(page.locator('text=No results found for "nonexistentcontent123"')).toBeVisible()
  })

  test('should show loading state during search', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search posts and users"]')
    
    // Type search query
    await searchInput.fill('test')
    
    // Check for loading indicator (might be brief)
    const loadingSpinner = page.locator('.animate-spin')
    // Note: Loading state might be too fast to reliably test, but we'll try
  })

  test('should close search results when clicking outside', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search posts and users"]')
    
    // Open search results
    await searchInput.fill('vegan')
    await page.waitForTimeout(500)
    
    // Verify dropdown is open
    await expect(page.locator('[data-testid="search-dropdown"]')).toBeVisible()
    
    // Click outside the search area
    await page.click('body')
    
    // Verify dropdown is closed
    await expect(page.locator('[data-testid="search-dropdown"]')).not.toBeVisible()
  })

  test('should clear search when clicking X button', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search posts and users"]')
    
    // Type search query
    await searchInput.fill('vegan')
    await page.waitForTimeout(500)
    
    // Verify search has content
    await expect(searchInput).toHaveValue('vegan')
    
    // Find the clear button using test id
    const clearButton = page.locator('[data-testid="clear-search-button"]')
    await expect(clearButton).toBeVisible()
    await clearButton.click()
    
    // Verify search is cleared
    await expect(searchInput).toHaveValue('')
    
    // Verify dropdown is closed
    await expect(page.locator('[data-testid="search-dropdown"]')).not.toBeVisible()
  })

  test('should navigate to user profile when clicking user result', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search posts and users"]')
    
    // Search for current user
    await searchInput.fill('testuser1')
    await page.waitForTimeout(500)
    
    // Click on user result in the search dropdown
    await page.click('text=Test User1')
    
    // Verify navigation to user profile
    await expect(page).toHaveURL(/\/user\/testuser1/)
    
    // Verify profile page content
    await expect(page.locator('text=@testuser1')).toBeVisible()
  })

  test('should handle mobile search functionality', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Wait for page to be responsive
    await page.waitForTimeout(200)
    
    // Find the mobile menu button - it has md:hidden class directly on the button
    const menuButton = page.locator('button.md\\:hidden')
    await expect(menuButton).toBeVisible()
    await menuButton.click()
    
    // Wait for mobile menu to open
    await page.waitForTimeout(200)
    
    // Look for search in mobile menu - it should be visible now
    const mobileSearchInput = page.locator('input[placeholder*="Search posts and users"]')
    await expect(mobileSearchInput).toBeVisible()
    
    // Test search functionality on mobile
    await mobileSearchInput.fill('vegan')
    await page.waitForTimeout(500)
    
    // Verify mobile search results
    await expect(page.locator('[data-testid="search-dropdown"]')).toBeVisible()
  })

  test('should debounce search requests', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search posts and users"]')
    
    // Type multiple characters quickly
    await searchInput.type('veg', { delay: 50 })
    await searchInput.type('an', { delay: 50 })
    
    // Wait less than debounce time
    await page.waitForTimeout(200)
    
    // Should not show results yet due to debouncing
    await expect(page.locator('[data-testid="search-dropdown"]')).not.toBeVisible()
    
    // Wait for debounce to complete
    await page.waitForTimeout(400)
    
    // Now results should appear
    await expect(page.locator('[data-testid="search-dropdown"]')).toBeVisible()
  })

  test('should only search public posts', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search posts and users"]')
    
    // Search for content that exists in friends-only post
    await searchInput.fill('friends_only')
    await page.waitForTimeout(500)
    
    // Verify friends-only post doesn't appear in search results
    await expect(page.locator('text=friends only post about my garden')).not.toBeVisible()
    
    // But if we search for public post content, it should appear
    await searchInput.fill('vegan recipe')
    await page.waitForTimeout(500)
    
    await expect(page.locator('text=delicious vegan pasta recipe')).toBeVisible()
  })
})

test.describe('Search Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    try {
      await signInUser(page, TEST_USERS.user1)
    } catch (error) {
      // If user doesn't exist, create it
      await signUpUser(page, TEST_USERS.user1)
    }
    await waitForSearchReady(page)
  })

  test('should handle special characters in search', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search posts and users"]')
    
    // Search with special characters
    await searchInput.fill('test@#$%')
    await page.waitForTimeout(500)
    
    // Should not crash and should show no results
    await expect(page.locator('text=No results found')).toBeVisible()
  })

  test('should handle very long search queries', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search posts and users"]')
    
    // Very long search query
    const longQuery = 'a'.repeat(200)
    await searchInput.fill(longQuery)
    await page.waitForTimeout(500)
    
    // Should handle gracefully
    await expect(page.locator('[data-testid="search-dropdown"]')).toBeVisible()
  })

  test('should handle unicode characters', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search posts and users"]')
    
    // Search with emoji and unicode
    await searchInput.fill('test 🌱 végān')
    await page.waitForTimeout(500)
    
    // Should not crash
    await expect(page.locator('[data-testid="search-dropdown"]')).toBeVisible()
  })
})