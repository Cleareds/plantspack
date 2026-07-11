import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { Database } from './database.types'
import { sharedCookieDomain, SHARED_COOKIE_OPTIONS } from './auth-cookie'

export const createClient = async () => {
  const cookieStore = await cookies()
  const host = (await headers()).get('host')
  const cookieDomain = sharedCookieDomain(host)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn('Supabase environment variables are missing in server client.')
  }

  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookieOptions: { ...SHARED_COOKIE_OPTIONS, ...(cookieDomain ? { domain: cookieDomain } : {}) },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}