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
  
  // Wait for the form to be visible
  await expect(page.locator('h2:has-text("Join PlantsPack")')).toBeVisible()
  
  // Fill out the signup form
  await page.fill('input[type="email"]', user.email)
  await page.fill('input[placeholder="Choose a username"]', user.username)
  await page.fill('input[placeholder="First name"]', user.firstName)
  await page.fill('input[placeholder="Last name"]', user.lastName)
  await page.fill('input[placeholder="Create password"]', user.password)
  await page.fill('input[placeholder="Confirm password"]', user.password)
  
  // Submit the form
  await page.click('button[type="submit"]:has-text("Create Account")')
  
  // Wait for success or redirect
  await page.waitForURL('/', { timeout: 10000 })
  
  // Verify we're signed in by checking for authenticated elements
  // For mobile, the Sign Out button might be in a menu, so check for search input or profile link instead
  const signOutButton = page.locator('button:has-text("Sign Out")')
  const searchInput = page.locator('input[placeholder*="Search posts and users"]')
  const profileLink = page.locator('a[href*="/profile/"]')
  
  await expect(signOutButton.or(searchInput).or(profileLink).first()).toBeVisible({ timeout: 10000 })
}

/**
 * Sign in an existing user for testing
 */
export async function signInUser(page: Page, user: TestUser) {
  // Navigate to auth page
  await page.goto('/auth?mode=signin')
  
  // Wait for the form to be visible
  await expect(page.locator('h2:has-text("Welcome Back")')).toBeVisible()
  
  // Fill out the signin form
  await page.fill('input[placeholder="Enter email or username"]', user.email)
  await page.fill('input[placeholder="Enter password"]', user.password)
  
  // Submit the form
  await page.click('button[type="submit"]:has-text("Sign In")')
  
  // Wait for redirect to home page
  await page.waitForURL('/', { timeout: 10000 })
  
  // Verify we're signed in by checking for authenticated elements
  // For mobile, the Sign Out button might be in a menu, so check for search input or profile link instead
  const signOutButton = page.locator('button:has-text("Sign Out")')
  const searchInput = page.locator('input[placeholder*="Search posts and users"]')
  const profileLink = page.locator('a[href*="/profile/"]')
  
  await expect(signOutButton.or(searchInput).or(profileLink).first()).toBeVisible({ timeout: 10000 })
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
    await page.click('button[aria-label="Menu"]')
    await page.click('button:has-text("Sign Out")')
  }
  
  // Wait for redirect to home page and verify signed out state
  await expect(page.locator('text=Welcome to PlantsPack!')).toBeVisible({ timeout: 5000 })
}

/**
 * Create test posts for search functionality
 */
export async function createTestPost(page: Page, content: string, privacy: 'public' | 'friends' = 'public') {
  // Navigate to home page
  await page.goto('/')
  
  // Wait for and fill the post creation form
  const createPostTextarea = page.locator('textarea[placeholder*="Share your vegan journey"]')
  await expect(createPostTextarea).toBeVisible({ timeout: 10000 })
  await createPostTextarea.fill(content)
  
  // Set privacy if needed
  if (privacy === 'friends') {
    await page.click('input[value="friends"]')
  }
  
  // Submit the post
  await page.click('button:has-text("Post")')
  
  // Wait for the post to appear in the feed
  await expect(page.locator(`text=${content}`)).toBeVisible({ timeout: 5000 })
}

/**
 * Wait for search functionality to be available
 */
export async function waitForSearchReady(page: Page) {
  // Wait for the search bar to be visible (only for logged-in users)
  await expect(page.locator('input[placeholder*="Search posts and users"]')).toBeVisible({ timeout: 5000 })
}