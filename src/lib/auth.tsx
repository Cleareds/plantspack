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
    const initializeAuth = async () => {
      console.log('Auth: Initializing authentication...')
      setLoading(true)
      setInitialized(false)
      setAuthReady(false)
      
      try {
        // First try cached data for instant UI (no validation yet)
        const cachedUser = sessionStorage.getItem('sb-user')
        const cachedProfile = sessionStorage.getItem('sb-profile')
        const cachedSession = sessionStorage.getItem('sb-session')
        const cacheTimestamp = sessionStorage.getItem('sb-cache-time')
        
        // Check if cache is recent (1 hour)
        const isCacheRecent = cacheTimestamp && 
          (Date.now() - parseInt(cacheTimestamp)) < (60 * 60 * 1000)
        
        if (cachedUser && cachedProfile && cachedSession && isCacheRecent) {
          console.log('Auth: Loading cached data for instant UI...')
          try {
            const userData = JSON.parse(cachedUser)
            const profileData = JSON.parse(cachedProfile)
            const sessionData = JSON.parse(cachedSession)
            
            // Set cached data immediately for instant UI
            setUser(userData)
            setProfile(profileData)
            setSession(sessionData)
          } catch (parseError) {
            console.error('Auth: Cache parse error:', parseError)
          }
        }
        
        // Always verify with database for definitive auth state
        console.log('Auth: Verifying session with database...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth: Session verification error:', error)
          clearAuthCache()
          setUser(null)
          setProfile(null)
          setSession(null)
        } else if (session?.user) {
          console.log('Auth: Valid session found, loading profile...')
          setSession(session)
          setUser(session.user)
          
          // Cache session data
          sessionStorage.setItem('sb-user', JSON.stringify(session.user))
          sessionStorage.setItem('sb-session', JSON.stringify(session))
          sessionStorage.setItem('sb-cache-time', Date.now().toString())
          
          // Fetch profile
          await loadUserProfile(session.user.id)
        } else {
          console.log('Auth: No active session')
          clearAuthCache()
          setUser(null)
          setProfile(null)
          setSession(null)
        }
      } catch (error) {
        console.error('Auth: Initialization error:', error)
        clearAuthCache()
        setUser(null)
        setProfile(null)
        setSession(null)
      } finally {
        setLoading(false)
        setInitialized(true)
        setAuthReady(true) // Components can now safely fetch data
        console.log('Auth: Initialization complete - authReady = true')
      }
    }

    const loadUserProfile = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single()

        if (!error && data) {
          setProfile(data)
          sessionStorage.setItem('sb-profile', JSON.stringify(data))
        } else if (error) {
          console.error('Profile fetch error:', error)
        }
      } catch (error) {
        console.error('Profile fetch error:', error)
      }
    }

    const clearAuthCache = () => {
      sessionStorage.removeItem('sb-user')
      sessionStorage.removeItem('sb-profile')
      sessionStorage.removeItem('sb-session')
      sessionStorage.removeItem('sb-cache-time')
    }

    initializeAuth()
    
    // Listen for auth changes (login/logout events)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth: State changed:', event, !!session?.user)
      
      // Reset auth ready state during transitions
      setAuthReady(false)
      setLoading(true)
      
      try {
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          // Update cache on auth changes
          sessionStorage.setItem('sb-user', JSON.stringify(session.user))
          sessionStorage.setItem('sb-session', JSON.stringify(session))
          sessionStorage.setItem('sb-cache-time', Date.now().toString())
          
          // Load profile
          await loadUserProfile(session.user.id)
        } else {
          // Clear cache on logout
          clearAuthCache()
          setProfile(null)
        }
      } catch (error) {
        console.error('Auth: State change error:', error)
      } finally {
        setLoading(false)
        setAuthReady(true) // Ready for components to fetch data
        console.log('Auth: State change complete - authReady = true')
      }
    })

    return () => {
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
      // Update cache with new profile data
      sessionStorage.setItem('sb-profile', JSON.stringify(data))
      sessionStorage.setItem('sb-cache-time', Date.now().toString())
      
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
        console.log('Auth: Session validation failed, clearing cache')
        sessionStorage.removeItem('sb-user')
        sessionStorage.removeItem('sb-profile')
        sessionStorage.removeItem('sb-session')
        sessionStorage.removeItem('sb-cache-time')
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