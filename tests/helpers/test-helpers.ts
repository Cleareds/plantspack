import { Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mfeelaqjbtnypoojhfjp.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mZWVsYXFqYnRueXBvb2poZmpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzOTEyMjQsImV4cCI6MjA2ODk2NzIyNH0.GzLJ-RdHvF0TUXEdRjU8HyOcAopl5kyp81Wc7mSi0z0'

const supabase = createClient(supabaseUrl, supabaseKey)

export interface TestUser {
  email: string
  password: string
  username: string
}

/**
 * Create test users in the database
 */
export async function createTestUsers(count: number): Promise<TestUser[]> {
  const users: TestUser[] = []
  const timestamp = Date.now()

  for (let i = 0; i < count; i++) {
    const username = `testuser${timestamp}${i}`
    const email = `${username}@test.plantspack.com`
    const password = `TestPassword${timestamp}!`

    // Create user via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        username,
        first_name: `Test${i}`,
        last_name: `User${i}`
      }
    })

    if (authError) {
      console.error('Error creating auth user:', authError)
      continue
    }

    if (!authData.user) {
      console.error('No user data returned')
      continue
    }

    // Create user profile in users table
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        username,
        first_name: `Test${i}`,
        last_name: `User${i}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (profileError) {
      console.error('Error creating user profile:', profileError)
    }

    users.push({ email, password, username })
  }

  return users
}

/**
 * Clean up test users from database
 */
export async function cleanupTestUsers(emails: string[]): Promise<void> {
  for (const email of emails) {
    try {
      // Get user by email
      const { data: users } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .limit(1)

      if (users && users[0]) {
        // Delete user via admin API
        await supabase.auth.admin.deleteUser(users[0].id)
      }
    } catch (error) {
      console.error(`Error cleaning up user ${email}:`, error)
    }
  }
}

/**
 * Login user via UI
 */
export async function loginUser(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/auth')
  await page.waitForLoadState('networkidle')

  // Fill login form
  const emailInput = page.locator('input[type="email"], input[name="email"]')
  const passwordInput = page.locator('input[type="password"], input[name="password"]')

  await emailInput.fill(email)
  await passwordInput.fill(password)

  // Click login/sign in button
  const loginButton = page.locator('button:has-text("Sign In"), button:has-text("Log In"), button[type="submit"]').first()
  await loginButton.click()

  // Wait for redirect to home page
  await page.waitForURL('/', { timeout: 10000 })
  await page.waitForLoadState('networkidle')
}

/**
 * Create a test post
 */
export async function createTestPost(page: Page, content: string): Promise<void> {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  const textarea = page.locator('textarea[placeholder*="Share"]')
  await textarea.fill(content)

  // Wait for content analysis
  await page.waitForTimeout(1500)

  const postButton = page.locator('button:has-text("Post")')
  await postButton.click()

  // Wait for post to appear
  await page.locator(`text=${content}`).first().waitFor({ timeout: 5000 })
}

/**
 * Get notification count
 */
export async function getNotificationCount(page: Page): Promise<number> {
  const badge = page.locator('span.bg-red-600')

  if (await badge.isVisible()) {
    const text = await badge.textContent()
    return parseInt(text?.replace('+', '') || '0')
  }

  return 0
}

/**
 * Wait for notification to appear
 */
export async function waitForNotification(
  page: Page,
  expectedType: string,
  timeout: number = 5000
): Promise<boolean> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    try {
      const notificationBell = page.locator('button:has(svg[class*="lucide-bell"])')
      await notificationBell.click({ timeout: 1000 })
      await page.waitForTimeout(500)

      // Check if notification of expected type exists
      const notification = page.locator(`text=/${expectedType}/i`).first()
      if (await notification.isVisible({ timeout: 1000 })) {
        // Close dropdown
        await page.keyboard.press('Escape')
        return true
      }

      // Close dropdown
      await page.keyboard.press('Escape')
      await page.waitForTimeout(1000)
    } catch (error) {
      // Continue waiting
    }
  }

  return false
}
