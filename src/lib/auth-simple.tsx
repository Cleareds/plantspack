'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { Tables } from './supabase'
import { log } from '@/lib/logger'

type UserProfile = Tables<'users'>

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
  initialized: boolean
  signUp: (email: string, password: string, userData: { username: string; firstName?: string; lastName?: string }) => Promise<any>
  signIn: (email: string, password: string) => Promise<any>
  signInWithGoogle: () => Promise<any>
  signInWithFacebook: () => Promise<any>
  signOut: () => Promise<any>
  updateProfile: (updates: Partial<UserProfile>) => Promise<any>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  const fetchProfile = async (userId: string) => {
    try {
      log.debug('Fetching profile for user:', userId)
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Profile fetch error:', error)
        return null
      }

      log.debug('Profile fetched successfully:', data)
      return data
    } catch (error) {
      console.error('Error fetching profile:', error)
      return null
    }
  }

  const clearBrowserCache = () => {
    try {
      // Clear localStorage related to our app
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase') || key.includes('vegan')) {
          localStorage.removeItem(key)
        }
      })
      
      // Clear sessionStorage related to our app  
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase') || key.includes('vegan')) {
          sessionStorage.removeItem(key)
        }
      })
    } catch (error) {
      log.debug('Could not clear browser cache:', error)
    }
  }

  const initializeAuth = async () => {
    try {
      log.debug('🔄 Starting auth initialization...')
      setLoading(true)
      setInitialized(false)

      // Clear any cached data to prevent stale state
      clearBrowserCache()

      // Add a small delay to ensure proper state reset
      await new Promise(resolve => setTimeout(resolve, 100))

      // Get current session - force fresh fetch, no cache
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('❌ Session error:', error)
        setUser(null)
        setProfile(null)
        setSession(null)
        setLoading(false)
        setInitialized(true)
        return
      }

      log.debug('📝 Session data:', session?.user?.id ? `User found: ${session.user.id}` : 'No user')
      
      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        log.debug('🔄 Fetching user profile...')
        // Fetch user profile
        const profileData = await fetchProfile(session.user.id)
        setProfile(profileData)
        log.debug('✅ Profile loaded:', profileData?.username || 'No username')
      } else {
        setProfile(null)
        log.debug('ℹ️ No user session found')
      }

    } catch (error) {
      console.error('❌ Auth initialization error:', error)
      setUser(null)
      setProfile(null)
      setSession(null)
    } finally {
      setLoading(false)
      setInitialized(true)
      log.debug('✅ Auth initialization complete - initialized:', true)
    }
  }

  // Initialize auth on mount
  useEffect(() => {
    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      log.debug('🔄 Auth state changed:', event, session?.user?.id ? 'User present' : 'No user')

      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        const profileData = await fetchProfile(session.user.id)
        setProfile(profileData)
      } else {
        setProfile(null)
      }
    })

    // Listen for visibility changes to refresh auth when tab becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        log.debug('🔄 Tab became visible, refreshing auth...')
        initializeAuth()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signUp = async (email: string, password: string, userData: { username: string; firstName?: string; lastName?: string }) => {
    try {
      log.debug('🔄 Signing up user...')
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
        console.error('❌ Sign up error:', error)
        return { data, error }
      }
      
      if (data?.user) {
        log.debug('✅ User signed up, creating profile...')
        // Wait a bit then create profile
        setTimeout(async () => {
          try {
            const { error: profileError } = await supabase
              .from('users')
              .upsert({
                id: data.user!.id,
                email: data.user!.email || '',
                username: userData.username,
                first_name: userData.firstName || '',
                last_name: userData.lastName || '',
                bio: '',
                avatar_url: null,
              }, { onConflict: 'id' })
            
            if (profileError) {
              console.error('❌ Profile creation error:', profileError)
            } else {
              log.debug('✅ Profile created successfully')
            }
          } catch (profileError) {
            console.error('❌ Profile creation error:', profileError)
          }
        }, 1000)
      }
      
      return { data, error }
    } catch (error) {
      console.error('❌ Sign up error:', error)
      return { data: null, error }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      log.debug('🔄 Signing in user...')
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        console.error('❌ Sign in error:', error)
      } else {
        log.debug('✅ User signed in successfully')
      }
      
      return { data, error }
    } catch (error) {
      console.error('❌ Sign in error:', error)
      return { data: null, error }
    }
  }

  const signInWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  const signInWithFacebook = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  const signOut = async () => {
    try {
      log.debug('🔄 Signing out user...')
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('❌ Sign out error:', error)
      } else {
        log.debug('✅ User signed out successfully')
        setUser(null)
        setProfile(null)
        setSession(null)
      }
      
      return { error }
    } catch (error) {
      console.error('❌ Sign out error:', error)
      return { error }
    }
  }

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) {
      console.error('❌ No user logged in for profile update')
      return { error: 'No user logged in' }
    }

    try {
      log.debug('🔄 Updating profile...', updates)
      
      const profileData = {
        id: user.id,
        email: user.email || '',
        username: updates.username || profile?.username || `user_${user.id.slice(0, 8)}`,
        first_name: updates.first_name !== undefined ? updates.first_name : (profile?.first_name || ''),
        last_name: updates.last_name !== undefined ? updates.last_name : (profile?.last_name || ''),
        bio: updates.bio !== undefined ? updates.bio : (profile?.bio || ''),
        avatar_url: updates.avatar_url !== undefined ? updates.avatar_url : profile?.avatar_url,
        ...updates
      }

      log.debug('📝 Profile data to update:', profileData)

      const { data, error } = await supabase
        .from('users')
        .upsert(profileData, { onConflict: 'id' })
        .select()
        .single()

      if (error) {
        console.error('❌ Profile update error:', error)
        throw error
      }
      
      log.debug('✅ Profile updated successfully:', data)
      setProfile(data)
      
      return { data, error: null }
    } catch (error) {
      console.error('❌ Profile update error:', error)
      return { data: null, error }
    }
  }

  const value = {
    user,
    profile,
    session,
    loading,
    initialized,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithFacebook,
    signOut,
    updateProfile,
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