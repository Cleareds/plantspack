'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { Tables } from './supabase'
import { pushDataLayerEvent } from './analytics'
import { log } from '@/lib/logger'
import { safeStorage } from './safe-storage'

type UserProfile = Tables<'users'> & { role?: string; is_banned?: boolean }

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
  initialized: boolean
  authReady: boolean  // New: true when auth is stable and components can fetch data
  signUp: (email: string, password: string, userData: { username: string; firstName?: string; lastName?: string }) => Promise<any>
  signIn: (email: string, password: string) => Promise<any>
  signInWithGoogle: (next?: string) => Promise<any>
  signInWithFacebook: (next?: string) => Promise<any>
  signOut: () => Promise<any>
  updateProfile: (updates: Partial<UserProfile>) => Promise<any>
  validateSession: () => Promise<boolean>
}

// Explicit safe-column list for reading public.users from the browser
// (authenticated) key. NOT select('*'): email / stripe ids /
// marketing_email_token are revoked from the anon+authenticated roles
// (2026-07-14 security fix), so select('*') now 403s and would break
// profile loading for every logged-in user. Own email comes from the auth
// session (user.email), never from this table.
const PROFILE_COLUMNS =
  'id, username, first_name, last_name, bio, avatar_url, is_private, created_at, updated_at, subscription_tier, subscription_status, subscription_period_start, subscription_period_end, subscription_ends_at, role, is_banned, ban_reason, banned_at, banned_by, newsletter_opt_in, newsletter_opted_in_at, newsletter_unsubscribed_at, newsletter_source, trust_score, donor_source, sprouts_lifetime, sprouts_balance, sprouts_seeded, is_vegan, vegan_since, vegan_reasons, transition_story, favourite_vegan_meal, current_challenges, dietary_specifics, cooking_frequency, home_city, home_country, forest_size'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const [authReady, setAuthReady] = useState(false)

  // Guards to prevent duplicate profile creation
  const profileCreationInProgress = useRef(false)
  const profileCache = useRef<Map<string, UserProfile>>(new Map())

  useEffect(() => {
    let isMounted = true // Prevent state updates if component unmounts
    
    const initializeAuth = async () => {
      if (!isMounted) return
      
      setLoading(true)
      setInitialized(false)
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!isMounted) return
        
        if (error) {
          setUser(null)
          setProfile(null)
          setSession(null)
          safeStorage.session.set('auth-status', 'unauthenticated')
        } else if (session?.user) {
          setSession(session)
          setUser(session.user)
          safeStorage.session.set('auth-status', 'authenticated')
          
          loadUserProfile(session.user.id).catch(error => {
            console.error('Profile loading failed:', error)
          })
        } else {
          setUser(null)
          setProfile(null)
          setSession(null)
          safeStorage.session.set('auth-status', 'unauthenticated')
        }
      } catch (error) {
        if (!isMounted) return
        console.error('Auth initialization error:', error)
        setUser(null)
        setProfile(null)
        setSession(null)
        safeStorage.session.set('auth-status', 'error')
      } finally {
        if (isMounted) {
          setLoading(false)
          setInitialized(true)
          setAuthReady(true)
        }
      }
    }

    const loadUserProfile = async (userId: string) => {
      try {
        // Check cache first
        const cached = profileCache.current.get(userId)
        if (cached) {
          setProfile(cached as any)
          return
        }

        const { data, error } = await supabase
          .from('users')
          .select(PROFILE_COLUMNS)
          .eq('id', userId)
          .maybeSingle()

        if (!error && data) {
          profileCache.current.set(userId, data as any)
          setProfile(data as any)
        } else if (!data && !profileCreationInProgress.current) {
          // Profile doesn't exist and not already creating
          profileCreationInProgress.current = true
          log.debug('Profile not found, attempting to create one...')

          try {
            const response = await fetch('/api/auth/create-profile', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
            })

            if (response.ok) {
              const result = await response.json()
              if (result.profile) {
                profileCache.current.set(userId, result.profile as any)
                setProfile(result.profile as any)
                log.debug('Profile created successfully:', result.profile.username)
              }
            } else {
              const errorData = await response.json()
              console.error('Failed to create profile:', errorData.error)
            }
          } catch (fetchError) {
            console.error('Error calling create-profile API:', fetchError)
          } finally {
            profileCreationInProgress.current = false
          }
        }
      } catch (error) {
        console.error('Profile fetch error:', error)
        profileCreationInProgress.current = false
      }
    }

    // Listen for auth changes (login/logout events) - set up first
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return

      // Password recovery flow — redirect to set new password page
      if (event === 'PASSWORD_RECOVERY') {
        window.location.href = '/auth/update-password'
        return
      }

      if (event === 'SIGNED_OUT') {
        setAuthReady(false)
        setLoading(true)
        setSession(null)
        setUser(null)
        setProfile(null)
        safeStorage.session.set('auth-status', 'unauthenticated')
      } else {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
        setInitialized(true)
        setAuthReady(true)

        if (session?.user) {
          safeStorage.session.set('auth-status', 'authenticated')
          // Fire sign_up vs login to the dataLayer. SIGNED_IN fires for both
          // fresh signups and returning logins; distinguish by comparing
          // created_at to last_sign_in_at (within 60s = fresh signup, esp.
          // useful for OAuth where we don't see a separate signUp call).
          if (event === 'SIGNED_IN') {
            const u: any = session.user
            const provider = u.app_metadata?.provider || 'email'
            const createdMs = u.created_at ? Date.parse(u.created_at) : 0
            const lastSignInMs = u.last_sign_in_at ? Date.parse(u.last_sign_in_at) : 0
            const isFresh = createdMs && Math.abs(lastSignInMs - createdMs) < 60_000
            pushDataLayerEvent(isFresh ? 'sign_up' : 'login', { method: provider })
          }
          loadUserProfile(session.user.id).catch(error => {
            console.error('Profile loading failed:', error)
          })
        } else {
          safeStorage.session.set('auth-status', 'unauthenticated')
          setProfile(null)
        }
      }
    })

    // Initialize auth after setting up the listener
    initializeAuth()

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])



  const signUp = async (email: string, password: string, userData: { username: string; firstName?: string; lastName?: string }) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            username: userData.username,
            first_name: userData.firstName,
            last_name: userData.lastName,
          },
        },
      })

      if (error) {
        return { data, error }
      }

      // sign_up event is fired centrally from the onAuthStateChange listener
      // so it covers email + OAuth signups uniformly (isFresh check there).

      // If email confirmation is enabled, data.user exists but data.session is null
      // If email confirmation is disabled, both exist
      if (data?.user) {
        if (data?.session) {
          // User is immediately authenticated (email confirmation disabled)
          // Call API route to create profile using admin client (bypasses RLS)
          try {
            const profileResponse = await fetch('/api/auth/create-profile', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
            })

            if (!profileResponse.ok) {
              const errorData = await profileResponse.json()
              console.error('Profile creation failed:', errorData.error)
            }
          } catch (profileError) {
            console.error('Profile creation request failed:', profileError)
          }
        }
        // If no session, user needs to confirm email
      }

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  const signIn = async (identifier: string, password: string) => {
    try {
      // Determine if identifier is email or username
      const isEmail = identifier.includes('@')

      if (isEmail) {
        // Direct email login
        const result = await supabase.auth.signInWithPassword({
          email: identifier,
          password,
        })

        // Provide better error messages
        if (result.error) {
          const errorMsg = result.error.message.toLowerCase()
          if (errorMsg.includes('invalid login credentials') || errorMsg.includes('invalid password')) {
            return { data: null, error: { message: 'Invalid email or password' } }
          } else if (errorMsg.includes('email not confirmed')) {
            return { data: null, error: { message: 'Please verify your email address before signing in. Check your inbox for the confirmation link.' } }
          } else if (errorMsg.includes('user not found')) {
            return { data: null, error: { message: 'No account found with this email address' } }
          }
        }

        return result
      } else {
        // Username login - resolve username -> email via a server route
        // (service role). The email column on public.users is no longer
        // readable by the anon key (2026-07-14 security fix), so the old
        // direct `.from('users').select('email')` here would now fail.
        let resolvedEmail: string | null = null
        try {
          const resp = await fetch('/api/auth/resolve-username', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier }),
          })
          if (resp.ok) resolvedEmail = (await resp.json())?.email ?? null
        } catch {
          resolvedEmail = null
        }
        const userData = resolvedEmail ? { email: resolvedEmail } : null
        const userError = resolvedEmail ? null : { message: 'lookup failed' }

        if (userError || !userData) {
          // Try fallback: attempt direct login in case it's actually an email without @
          const fallbackResult = await supabase.auth.signInWithPassword({
            email: identifier,
            password,
          })

          if (fallbackResult.error) {
            return {
              data: null,
              error: { message: 'Invalid username or password' }
            }
          }
          return fallbackResult
        }

        // Now sign in with the email
        const result = await supabase.auth.signInWithPassword({
          email: userData.email,
          password,
        })

        // Provide better error messages
        if (result.error) {
          const errorMsg = result.error.message.toLowerCase()
          if (errorMsg.includes('invalid login credentials') || errorMsg.includes('invalid password')) {
            return { data: null, error: { message: 'Invalid username or password' } }
          } else if (errorMsg.includes('email not confirmed')) {
            return { data: null, error: { message: 'Please verify your email address before signing in. Check your inbox for the confirmation link.' } }
          }
        }

        return result
      }
    } catch (error) {
      console.error('Sign in error:', error)
      return { data: null, error: { message: 'An error occurred during sign in. Please try again.' } }
    }
  }

  // `next` (a same-site relative path) is forwarded to the callback so OAuth
  // returns the user where they started (e.g. a place page they're claiming).
  const callbackUrl = (next?: string) =>
    `${window.location.origin}/auth/callback${next && /^\/(?!\/)/.test(next) ? `?next=${encodeURIComponent(next)}` : ''}`

  const signInWithGoogle = async (next?: string) => {
    return await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl(next),
      },
    })
  }

  const signInWithFacebook = async (next?: string) => {
    return await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: callbackUrl(next),
      },
    })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return { error: 'No user logged in' }

    try {
      // Always try to upsert (update or insert) with all required fields
      // Use !== undefined checks (not ||) so empty strings are preserved
      const profileData = {
        id: user.id,
        email: user.email || '',
        username: updates.username !== undefined ? updates.username : (profile?.username || user.user_metadata?.username || `user_${user.id.slice(0, 8)}`),
        first_name: updates.first_name !== undefined ? updates.first_name : (profile?.first_name || user.user_metadata?.first_name || ''),
        last_name: updates.last_name !== undefined ? updates.last_name : (profile?.last_name || user.user_metadata?.last_name || ''),
        bio: updates.bio !== undefined ? updates.bio : (profile?.bio || ''),
        avatar_url: updates.avatar_url !== undefined ? updates.avatar_url : (profile?.avatar_url || null),
      }

      const { data, error } = await supabase
        .from('users')
        .upsert(profileData, { onConflict: 'id' })
        .select(PROFILE_COLUMNS)
        .single()

      if (error) throw error

      setProfile(data as any)
      profileCache.current.set(user.id, data as any)
      log.debug('Profile updated successfully')
      
      return { data, error: null }
    } catch (error) {
      console.error('updateProfile error:', error)
      return { data: null, error }
    }
  }

  const validateSession = async (): Promise<boolean> => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error || !session) {
        log.debug('Auth: Session validation failed')
        safeStorage.session.set('auth-status', 'unauthenticated')
        setUser(null)
        setProfile(null)
        setSession(null)
        return false
      }
      
      return true
    } catch (error) {
      console.error('Auth: Session validation error:', error)
      return false
    }
  }

  const value = {
    user,
    profile,
    session,
    loading,
    initialized,
    authReady,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithFacebook,
    signOut,
    updateProfile,
    validateSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}