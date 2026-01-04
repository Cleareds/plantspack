'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { Tables } from './supabase'

type UserProfile = Tables<'users'> & { role?: string }

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
      
      setLoading(true)
      setInitialized(false)
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!isMounted) return
        
        if (error) {
          console.error('Auth session error:', error)
          setUser(null)
          setProfile(null)
          setSession(null)
          sessionStorage.setItem('auth-status', 'unauthenticated')
        } else if (session?.user) {
          setSession(session)
          setUser(session.user)
          sessionStorage.setItem('auth-status', 'authenticated')
          
          loadUserProfile(session.user.id).catch(error => {
            console.error('Profile loading failed:', error)
          })
        } else {
          setUser(null)
          setProfile(null)
          setSession(null)
          sessionStorage.setItem('auth-status', 'unauthenticated')
        }
      } catch (error) {
        if (!isMounted) return
        console.error('Auth initialization error:', error)
        setUser(null)
        setProfile(null)
        setSession(null)
        sessionStorage.setItem('auth-status', 'error')
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
        const { data, error } = await supabase
          .from('users')
          .select('*, role')
          .eq('id', userId)
          .maybeSingle()

        if (!error && data) {
          setProfile(data as any)
        } else if (!data) {
          // Profile doesn't exist, try to create it via API route
          console.log('Profile not found, attempting to create one...')

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
                setProfile(result.profile as any)
                console.log('Profile created successfully:', result.profile.username)
              }
            } else {
              const errorData = await response.json()
              console.error('Failed to create profile:', errorData.error)
            }
          } catch (fetchError) {
            console.error('Error calling create-profile API:', fetchError)
          }
        }
      } catch (error) {
        console.error('Profile fetch error:', error)
      }
    }

    // Listen for auth changes (login/logout events) - set up first
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return
      
      if (event === 'SIGNED_OUT') {
        setAuthReady(false)
        setLoading(true)
        setSession(null)
        setUser(null)
        setProfile(null)
        sessionStorage.setItem('auth-status', 'unauthenticated')
      } else {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
        setInitialized(true)
        setAuthReady(true)
        
        if (session?.user) {
          sessionStorage.setItem('auth-status', 'authenticated')
          loadUserProfile(session.user.id).catch(error => {
            console.error('Profile loading failed:', error)
          })
        } else {
          sessionStorage.setItem('auth-status', 'unauthenticated')
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
        avatar_url: updates.avatar_url !== undefined ? updates.avatar_url : (profile?.avatar_url || null),
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