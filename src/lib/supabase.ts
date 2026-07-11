import { createBrowserClient } from '@supabase/ssr'
import { Database } from './database.types'
import { sharedCookieDomain, SHARED_COOKIE_OPTIONS } from './auth-cookie'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn('Supabase environment variables are missing. Using placeholder values for build.')
}

// Client-side sessions live in cookies scoped to .plantspack.com so the game
// at play.plantspack.com shares the login (host-scoped on localhost/previews).
const cookieDomain = typeof window !== 'undefined' ? sharedCookieDomain(window.location.hostname) : undefined
export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
  cookieOptions: { ...SHARED_COOKIE_OPTIONS, ...(cookieDomain ? { domain: cookieDomain } : {}) },
})

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]