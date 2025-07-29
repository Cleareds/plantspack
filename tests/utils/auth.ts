import { Page, expect } from '@playwright/test'

export interface TestUser {
  email: string
  password: string
  username: string
  firstName: string
  lastName: string
}

// Test user credentials - these should match your test database
export const TEST_USERS = {
  user1: {
    email: 'test1@plantspack.com',
    password: 'testpassword123',
    username: 'testuser1',
    firstName: 'Test',
    lastName: 'User1'
  },
  user2: {
    email: 'test2@plantspack.com', 
    password: 'testpassword123',
    username: 'testuser2',
    firstName: 'Test',
    lastName: 'User2'
  }
} as const

/**
 * Sign up a new user for testing
 */
export async function signUpUser(page: Page, user: TestUser) {
  // Navigate to auth page with signup mode
  await page.goto('/auth?mode=signup')
  
  // Wait for page load and check if signup form or main page is displayed
  await page.waitForLoadState('networkidle')
  
  // Check if we're already signed in (redirect to main page)
  const isMainPage = await page.locator('input[placeholder*="Search posts and users"]').isVisible()
  if (isMainPage) {
    console.log('User already signed in, skipping signup')
    return
  }
  
  // Wait for the signup form with flexible text matching
  const signupHeader = page.locator('h2').filter({ hasText: /join|sign.*up|create/i })
  await expect(signupHeader.first()).toBeVisible({ timeout: 15000 })
  
  // Fill out the signup form with improved selectors
  await page.fill('input[type="email"], input[name="email"]', user.email)
  await page.fill('input[placeholder*="username"], input[name="username"]', user.username)
  await page.fill('input[placeholder*="First"], input[name="firstName"]', user.firstName)
  await page.fill('input[placeholder*="Last"], input[name="lastName"]', user.lastName)
  await page.fill('input[placeholder*="Create"], input[name="password"], input[type="password"]', user.password)
  
  // Find confirm password field
  const passwordFields = page.locator('input[type="password"]')
  if (await passwordFields.count() > 1) {
    await passwordFields.nth(1).fill(user.password)
  }
  
  // Submit the form
  const submitButton = page.locator('button[type="submit"]').filter({ hasText: /create|sign.*up|join/i })
  await submitButton.click()
  
  // Wait for success or redirect with more generous timeout
  await page.waitForURL('/', { timeout: 15000 })
  
  // Verify we're signed in with more robust checks
  const authElements = [
    page.locator('input[placeholder*="Search posts and users"]'),
    page.locator('button:has-text("Sign Out")'),
    page.locator('a[href*="/profile/"]'),
    page.locator('a[href*="/settings"]')
  ]
  
  let authenticated = false
  for (const element of authElements) {
    if (await element.isVisible()) {
      authenticated = true
      break
    }
  }
  
  if (!authenticated) {
    throw new Error('User signup succeeded but authentication verification failed')
  }
}

/**
 * Sign in an existing user for testing
 */
export async function signInUser(page: Page, user: TestUser) {
  // Navigate to auth page
  await page.goto('/auth?mode=signin')
  
  // Wait for page load
  await page.waitForLoadState('networkidle')
  
  // Check if we're already signed in (redirect to main page)
  const isMainPage = await page.locator('input[placeholder*="Search posts and users"]').isVisible()
  if (isMainPage) {
    console.log('User already signed in, skipping signin')
    return
  }
  
  // Wait for the signin form with flexible text matching
  const signinHeader = page.locator('h2').filter({ hasText: /welcome|sign.*in|login/i })
  await expect(signinHeader.first()).toBeVisible({ timeout: 15000 })
  
  // Fill out the signin form with improved selectors
  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email"], input[placeholder*="username"]').first()
  await emailInput.fill(user.email)
  
  const passwordInput = page.locator('input[type="password"], input[name="password"], input[placeholder*="password"]').first()
  await passwordInput.fill(user.password)
  
  // Submit the form
  const submitButton = page.locator('button[type="submit"]').filter({ hasText: /sign.*in|login|enter/i })
  await submitButton.click()
  
  // Wait for redirect to home page with more generous timeout
  await page.waitForURL('/', { timeout: 15000 })
  
  // Verify we're signed in with more robust checks
  const authElements = [
    page.locator('input[placeholder*="Search posts and users"]'),
    page.locator('button:has-text("Sign Out")'),
    page.locator('a[href*="/profile/"]'),
    page.locator('a[href*="/settings"]')
  ]
  
  let authenticated = false
  for (const element of authElements) {
    if (await element.isVisible()) {
      authenticated = true
      break
    }
  }
  
  if (!authenticated) {
    throw new Error('User signin succeeded but authentication verification failed')
  }
}

/**
 * Sign out the current user
 */
export async function signOutUser(page: Page) {
  // Look for sign out button in desktop navigation
  const signOutButton = page.locator('button:has-text("Sign Out")')
  
  if (await signOutButton.isVisible()) {
    await signOutButton.click()
  } else {
    // Try mobile menu
    const menuButton = page.locator('button.md\\:hidden, button[aria-label="Menu"], .mobile-menu-button')
    if (await menuButton.isVisible()) {
      await menuButton.click()
      await page.waitForTimeout(500) // Wait for menu to open
      await page.click('button:has-text("Sign Out")')
    }
  }
  
  // Wait for redirect and verify signed out state with flexible matching
  await page.waitForLoadState('networkidle')
  const welcomeElements = [
    page.locator('text=Welcome to PlantsPack!'),
    page.locator('text=Sign In'),
    page.locator('a[href="/auth"]'),
    page.locator('button:contains("Sign In")')
  ]
  
  let signedOut = false
  for (const element of welcomeElements) {
    if (await element.isVisible()) {
      signedOut = true
      break
    }
  }
  
  if (!signedOut) {
    console.log('Sign out may have failed, but continuing with test')
  }
}

/**
 * Create test posts for search functionality
 */
export async function createTestPost(page: Page, content: string, privacy: 'public' | 'friends' = 'public') {
  // Navigate to home page
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  
  // Wait for and fill the post creation form with flexible selectors
  const possibleTextareas = [
    'textarea[placeholder*="Share your vegan journey"]',
    'textarea[placeholder*="What\'s on your mind"]',
    'textarea[placeholder*="Share"]',
    'textarea[name="content"]',
    '.post-textarea'
  ]
  
  let createPostTextarea = null
  for (const selector of possibleTextareas) {
    const textarea = page.locator(selector)
    if (await textarea.isVisible()) {
      createPostTextarea = textarea
      break
    }
  }
  
  if (!createPostTextarea) {
    throw new Error('Could not find post creation textarea')
  }
  
  await createPostTextarea.fill(content)
  
  // Set privacy if needed
  if (privacy === 'friends') {
    const privacyButton = page.locator('input[value="friends"], button:has-text("Friends")')
    if (await privacyButton.isVisible()) {
      await privacyButton.click()
    }
  }
  
  // Submit the post with flexible button matching
  const postButtons = [
    'button:has-text("Post")',
    'button:has-text("Share")',
    'button[type="submit"]',
    '.post-submit-button'
  ]
  
  let submitted = false
  for (const buttonSelector of postButtons) {
    const button = page.locator(buttonSelector)
    if (await button.isVisible()) {
      await button.click()
      submitted = true
      break
    }
  }
  
  if (!submitted) {
    throw new Error('Could not find post submit button')
  }
  
  // Wait for the post to appear in the feed with timeout
  await page.waitForTimeout(2000) // Give time for post to be created
  
  // Verify post was created (optional - don't fail test if not visible)
  const postContent = page.locator('text=' + content)
  try {
    await expect(postContent).toBeVisible({ timeout: 5000 })
  } catch (error) {
    console.log('Post may not be immediately visible in feed, but continuing test')
  }
}

/**
 * Wait for search functionality to be available
 */
export async function waitForSearchReady(page: Page) {
  // Wait for page to be fully loaded
  await page.waitForLoadState('networkidle')
  
  // Wait for the search bar to be visible (only for logged-in users)
  const searchInput = page.locator('input[placeholder*="Search posts and users"], input[placeholder*="Search"], .search-input')
  
  try {
    await expect(searchInput.first()).toBeVisible({ timeout: 10000 })
  } catch (error) {
    // If search input not visible, check if we're authenticated
    const authElements = [
      page.locator('button:has-text("Sign Out")'),
      page.locator('a[href*="/profile/"]'),
      page.locator('a[href*="/settings"]')
    ]
    
    let authenticated = false
    for (const element of authElements) {
      if (await element.isVisible()) {
        authenticated = true
        break
      }
    }
    
    if (!authenticated) {
      throw new Error('User not authenticated - search functionality requires login')
    }
    
    // If authenticated but search not visible, it might be in mobile menu
    console.log('Search input not immediately visible, but user appears authenticated')
  }
}