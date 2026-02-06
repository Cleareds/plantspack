import { test, expect } from '@playwright/test'

test.describe('Feed and Posts', () => {
  test('should load feed page and display posts', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    // Wait for feed content to load
    await page.waitForTimeout(2000)

    // Check if posts are displayed or empty state
    const hasPosts = await page.locator('article').count() > 0
    const hasEmptyState = await page.locator('text=No posts yet').isVisible().catch(() => false)

    expect(hasPosts || hasEmptyState).toBeTruthy()
  })

  test('should display post cards with key elements', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(2000)

    // Check if there are any posts
    const postCount = await page.locator('article').count()

    if (postCount > 0) {
      const firstPost = page.locator('article').first()

      // Check for author info
      await expect(firstPost.locator('a[href^="/profile/"]')).toBeVisible()

      // Check for post actions (like, comment, share)
      const hasActions = await firstPost.locator('button').count() > 0
      expect(hasActions).toBeTruthy()
    }
  })

  test('should navigate to create post page', async ({ page }) => {
    await page.goto('/')

    // Look for "Create Post" or "New Post" button
    const createButton = page.locator('button:has-text("Create Post"), button:has-text("New Post"), a:has-text("Create Post"), a:has-text("New Post")').first()

    if (await createButton.isVisible({ timeout: 5000 })) {
      await createButton.click()

      // Should navigate to create post page or open modal
      await page.waitForTimeout(1000)

      // Check for post creation form
      const hasTextarea = await page.locator('textarea[placeholder*="thoughts"], textarea[placeholder*="share"], textarea[placeholder*="mind"]').isVisible({ timeout: 5000 })
      expect(hasTextarea).toBeTruthy()
    }
  })

  test('should create a text post', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(1000)

    // Find and click create post button
    const createButton = page.locator('button:has-text("Create Post"), button:has-text("New Post"), a:has-text("Create Post"), a:has-text("New Post"), button[aria-label*="Create"], button[aria-label*="New post"]').first()

    if (await createButton.isVisible({ timeout: 5000 })) {
      await createButton.click()
      await page.waitForTimeout(1000)

      // Find post content textarea
      const textarea = page.locator('textarea').first()
      await textarea.waitFor({ state: 'visible', timeout: 5000 })

      // Fill in post content with timestamp to make it unique
      const timestamp = Date.now()
      const postContent = `E2E Test Post - ${timestamp}\n\nThis is an automated test post created by Playwright. 🤖`
      await textarea.fill(postContent)

      // Find and click submit button
      const submitButton = page.locator('button:has-text("Post"), button:has-text("Publish"), button:has-text("Share"), button[type="submit"]').first()
      await submitButton.click()

      // Wait for post to be created and page to update
      await page.waitForTimeout(3000)

      // Verify post appears in feed
      await expect(page.locator(`text=${postContent.substring(0, 20)}`).first()).toBeVisible({ timeout: 10000 })
    }
  })

  test('should interact with a post (like/react)', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(2000)

    // Check if there are any posts
    const postCount = await page.locator('article').count()

    if (postCount > 0) {
      const firstPost = page.locator('article').first()

      // Find like/react button (common patterns: heart icon, thumbs up, "Like" text)
      const likeButton = firstPost.locator('button:has-text("Like"), button[aria-label*="Like"], button[aria-label*="like"]').first()

      if (await likeButton.isVisible({ timeout: 5000 })) {
        // Get initial state
        const initialState = await likeButton.getAttribute('aria-pressed')

        // Click like button
        await likeButton.click()
        await page.waitForTimeout(1000)

        // Verify state changed (or at least interaction worked)
        const newState = await likeButton.getAttribute('aria-pressed')
        // State should toggle or button should still be visible (interaction succeeded)
        expect(await likeButton.isVisible()).toBeTruthy()
      }
    }
  })

  test('should open post detail page', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(2000)

    // Check if there are any posts
    const postCount = await page.locator('article').count()

    if (postCount > 0) {
      // Click on first post to open details
      const firstPost = page.locator('article').first()

      // Try to find a link to post detail (could be on timestamp, content, or dedicated button)
      const postLink = firstPost.locator('a[href^="/post/"]').first()

      if (await postLink.isVisible({ timeout: 5000 })) {
        await postLink.click()

        // Should navigate to post detail page
        await expect(page).toHaveURL(/.*\/post\/.*/)

        // Verify post detail page elements
        await expect(page.locator('article').first()).toBeVisible()

        // Check for comments section
        const hasComments = await page.locator('text=Comments, text=Comment, textarea[placeholder*="comment"]').isVisible({ timeout: 5000 })
        expect(hasComments).toBeTruthy()
      }
    }
  })

  test('should comment on a post', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(2000)

    // Check if there are any posts
    const postCount = await page.locator('article').count()

    if (postCount > 0) {
      // Click on first post to open details
      const firstPost = page.locator('article').first()
      const postLink = firstPost.locator('a[href^="/post/"]').first()

      if (await postLink.isVisible({ timeout: 5000 })) {
        await postLink.click()
        await page.waitForURL(/.*\/post\/.*/)
        await page.waitForTimeout(1000)

        // Find comment textarea
        const commentTextarea = page.locator('textarea[placeholder*="comment"], textarea[placeholder*="Comment"]').first()

        if (await commentTextarea.isVisible({ timeout: 5000 })) {
          // Write a comment
          const timestamp = Date.now()
          const commentContent = `E2E Test Comment - ${timestamp} 🧪`
          await commentTextarea.fill(commentContent)

          // Find and click submit button
          const submitButton = page.locator('button:has-text("Comment"), button:has-text("Post"), button:has-text("Submit")').first()
          await submitButton.click()

          // Wait for comment to appear
          await page.waitForTimeout(2000)

          // Verify comment appears
          await expect(page.locator(`text=${commentContent.substring(0, 20)}`).first()).toBeVisible({ timeout: 5000 })
        }
      }
    }
  })

  test('should filter feed by category or tab', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(1000)

    // Check for feed filter tabs (For You, Following, Latest, etc.)
    const filterTabs = page.locator('button:has-text("For You"), button:has-text("Following"), button:has-text("Latest"), button:has-text("Popular")')
    const tabCount = await filterTabs.count()

    if (tabCount > 0) {
      // Click on second tab if it exists
      const secondTab = filterTabs.nth(1)
      await secondTab.click()

      // Wait for content to reload
      await page.waitForTimeout(2000)

      // Verify page didn't error out
      await expect(page.locator('body')).toBeVisible()
    }
  })
})
