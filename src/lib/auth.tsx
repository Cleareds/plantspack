'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { Tables } from './supabase'

type UserProfile = Tables<'users'>

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
  initialized: boolean
  authReady: boolean  // New: true when auth is stable and components can fetch data
  signUp: (email: string, password: string, userData: { username: string; firstName?: string; lastName?: string }) => Promise<any>
  signIn: (email: string, password: string) => Promise<any>
  signInWithGoogle: () => Promise<any>
  signInWithFacebook: () => Promise<any>
  signOut: () => Promise<any>
  updateProfile: (updates: Partial<UserProfile>) => Promise<any>
  validateSession: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    let isMounted = true // Prevent state updates if component unmounts
    
    const initializeAuth = async () => {
      if (!isMounted) return
      
      console.log('Auth: Fast initialization starting... [NEW CODE v2]')
      setLoading(true)
      setInitialized(false)
      
      let currentSession = null
      
      try {
        // Always fetch fresh auth data from Supabase - no caching
        console.log('📡 Auth: Fetching session from Supabase...')
        const { data: { session }, error } = await supabase.auth.getSession()
        currentSession = session
        
        if (!isMounted) return
        
        if (error) {
          console.error('❌ Auth: Session error:', error)
          setUser(null)
          setProfile(null)
          setSession(null)
          sessionStorage.setItem('auth-status', 'unauthenticated')
        } else if (session?.user) {
          console.log('Auth: Using cached session data')
          setSession(session)
          setUser(session.user)
          sessionStorage.setItem('auth-status', 'authenticated')
          
          // Load profile in background - don't block auth initialization
          loadUserProfile(session.user.id).catch(error => {
            console.error('Profile loading failed:', error)
          })
        } else {
          console.log('ℹ️ Auth: No active session')
          setUser(null)
          setProfile(null)
          setSession(null)
          sessionStorage.setItem('auth-status', 'unauthenticated')
        }
      } catch (error) {
        if (!isMounted) return
        console.error('❌ Auth: Initialization error:', error)
        setUser(null)
        setProfile(null)
        setSession(null)
        sessionStorage.setItem('auth-status', 'error')
      } finally {
        if (isMounted) {
          setLoading(false)
          setInitialized(true)
          setAuthReady(true)
          console.log('Auth: State changed: INITIAL_SESSION', !!currentSession?.user)
          console.log('Auth: authReady set to TRUE in initialization')
          console.log('Auth: Initialization forcing re-render...')
        }
      }
    }

    const loadUserProfile = async (userId: string) => {
      try {
        console.log('Auth: Fetching fresh profile for user:', userId)
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single()

        if (!error && data) {
          setProfile(data)
          console.log('Auth: Profile loaded successfully')
        } else if (error) {
          console.error('Profile fetch error:', error)
        }
      } catch (error) {
        console.error('Profile fetch error:', error)
      }
    }

    // Listen for auth changes (login/logout events) - set up first
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth: State changed [NEW CODE v2]:', event, !!session?.user, 'isMounted:', isMounted)
      console.log('Auth: About to check isMounted condition...')
      
      if (!isMounted) {
        console.log('Auth: Component unmounted, exiting state change handler')
        return
      }
      
      console.log('Auth: isMounted check passed, continuing...')
      
      // Only reset auth state for actual sign out events, not sign in or initial session
      if (event === 'SIGNED_OUT') {
        console.log('Auth: Resetting authReady to FALSE for event:', event)
        setAuthReady(false)
        setLoading(true)
      } else {
        console.log('Auth: Processing authenticated event:', event)
        // For INITIAL_SESSION, SIGNED_IN, TOKEN_REFRESHED, ensure authReady is true
        console.log('Auth: authReady set to TRUE for event:', event)
        console.log('Auth: Background validation passed')
        
        // Batch state updates to ensure re-render
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
        setInitialized(true)
        setAuthReady(true)
        console.log('Auth: State updates completed for event:', event)
      }
      
      // Handle profile loading separately to avoid affecting auth state
      if (session?.user) {
        sessionStorage.setItem('auth-status', 'authenticated')
        console.log('Auth: Loading user profile for:', session.user.id)
        // Load profile in background - don't block auth state change
        loadUserProfile(session.user.id).then(() => {
          console.log('Auth: Profile loading completed')
        }).catch(error => {
          console.error('Profile loading failed:', error)
        })
      } else {
        sessionStorage.setItem('auth-status', 'unauthenticated')
        setProfile(null)
      }
      
      console.log('Auth: State change handler completed for event:', event)
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
      
      if (data?.user) {
        // Always try to create user profile, regardless of confirmation status
        // Wait a bit for the trigger to potentially create the profile first
        await new Promise(resolve => setTimeout(resolve, 500))
        
        try {
          const { error: profileError } = await supabase
            .from('users')
            .upsert({
              id: data.user.id,
              email: data.user.email || '',
              username: userData.username,
              first_name: userData.firstName || '',
              last_name: userData.lastName || '',
              bio: '',
              avatar_url: null,
            }, { onConflict: 'id' })
          
          if (profileError) {
            console.error('Error creating user profile:', profileError)
          }
        } catch (profileError) {
          console.error('Error creating user profile:', profileError)
        }
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
        return await supabase.auth.signInWithPassword({
          email: identifier,
          password,
        })
      } else {
        // Username login - first get the email associated with the username
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('email')
          .eq('username', identifier)
          .single()

        if (userError) {
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

        if (!userData) {
          return { 
            data: null, 
            error: { message: 'Username not found' } 
          }
        }

        // Now sign in with the email
        return await supabase.auth.signInWithPassword({
          email: userData.email,
          password,
        })
      }
    } catch (error) {
      return { data: null, error }
    }
  }

  const signInWithGoogle = async () => {
    return await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  const signInWithFacebook = async () => {
    return await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  const signOut = async () => {
    return await supabase.auth.signOut()
  }

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return { error: 'No user logged in' }

    try {
      // Always try to upsert (update or insert) with all required fields
      const profileData = {
        id: user.id,
        email: user.email || '',
        username: updates.username || profile?.username || user.user_metadata?.username || `user_${user.id.slice(0, 8)}`,
        first_name: updates.first_name || profile?.first_name || user.user_metadata?.first_name || '',
        last_name: updates.last_name || profile?.last_name || user.user_metadata?.last_name || '',
        bio: updates.bio !== undefined ? updates.bio : (profile?.bio || ''),
        ...updates // This ensures any passed updates override the defaults
      }

      const { data, error } = await supabase
        .from('users')
        .upsert(profileData, { onConflict: 'id' })
        .select()
        .single()

      if (error) throw error
      
      setProfile(data)
      console.log('Profile updated successfully')
      
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
        console.log('Auth: Session validation failed')
        sessionStorage.setItem('auth-status', 'unauthenticated')
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

  console.log('Auth Provider rendering with authReady:', authReady, 'initialized:', initialized, 'loading:', loading)
  
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