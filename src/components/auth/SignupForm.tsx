'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { Mail, Lock, User, Eye, EyeOff, Check, X, Loader2 } from 'lucide-react'

interface SignupFormProps {
  onToggle: () => void
}

export default function SignupForm({ onToggle }: SignupFormProps) {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  // GDPR Planet49 (2019): marketing opt-in checkbox must NOT be pre-ticked.
  // We default to false and require an affirmative tick from the user.
  const [newsletterOptIn, setNewsletterOptIn] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
  const [usernameError, setUsernameError] = useState('')
  const successRef = useRef<HTMLDivElement>(null)

  const { signUp, signInWithGoogle, signInWithFacebook} = useAuth()

  useEffect(() => {
    if (success && successRef.current) {
      successRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [success])

  // Debounced username availability check
  const checkUsernameAvailability = useCallback(async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameStatus('idle')
      setUsernameError('')
      return
    }

    setUsernameStatus('checking')
    setUsernameError('')

    try {
      const response = await fetch(`/api/auth/check-username?username=${encodeURIComponent(username)}`)
      const data = await response.json()

      if (response.ok) {
        if (data.available) {
          setUsernameStatus('available')
        } else {
          setUsernameStatus('taken')
          setUsernameError(data.error || 'Username is already taken')
        }
      } else {
        setUsernameStatus('invalid')
        setUsernameError(data.error || 'Failed to check username')
      }
    } catch (err) {
      setUsernameStatus('idle')
      setUsernameError('')
    }
  }, [])

  // Debounce username check
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (username) {
        checkUsernameAvailability(username)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [username, checkUsernameAvailability])


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setLoading(true)
      setError('')
      setSuccess('')

      // Client-side validation
      if (!email || !username || !password) {
        setError('Please fill in all required fields')
        setLoading(false)
        return
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match')
        setLoading(false)
        return
      }

      if (password.length < 6) {
        setError('Password must be at least 6 characters')
        setLoading(false)
        return
      }

      // Check username availability (client-side check)
      if (usernameStatus === 'taken') {
        setError('Username is already taken. Please choose another.')
        setLoading(false)
        return
      }

      if (usernameStatus === 'invalid') {
        setError('Username format is invalid. Use 3-20 characters (letters, numbers, _ or -)')
        setLoading(false)
        return
      }

      if (!agreedToTerms) {
        setError('You must agree to the Terms of Service and Privacy Policy to create an account.')
        setLoading(false)
        return
      }

      // Call server-side signup API with validation
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          username,
          firstName,
          lastName,
          newsletter_opt_in: newsletterOptIn,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Server-side validation errors or signup failures
        setError(data.error || 'Registration failed. Please try again.')
        setLoading(false)
        return
      }

      // Success!
      if (data.emailConfirmationRequired) {
        // Email confirmation is enabled
        setSuccess('Account created! Please check your email to verify your address before signing in.')
        setEmail('')
        setPassword('')
        setConfirmPassword('')
        setUsername('')
        setFirstName('')
        setLastName('')
      } else {
        // Email confirmation is disabled - user is immediately logged in
        setSuccess('Account created successfully! Redirecting...')

        // Reload to trigger auth state change and redirect
        setTimeout(() => {
          window.location.href = '/'
        }, 1500)
      }
    } catch (err) {
      console.error('Signup error:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-surface-container-lowest rounded-lg editorial-shadow p-6">
        <h2 className="text-2xl font-bold text-center text-on-surface mb-6">
          Join PlantsPack
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-error/5 border border-error/15 text-error rounded">
            {error}
          </div>
        )}

        {success && (
          <div ref={successRef} className="mb-4 p-3 bg-surface-container-low border border-primary/15 text-primary rounded">
            {success}
          </div>
        )}


        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-outline" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 ghost-border rounded-md focus:ring-1 focus:ring-primary/40 focus:outline-none"
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-outline" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                className={`w-full pl-10 pr-10 py-2 border rounded-md focus:ring-1 focus:ring-primary/40 focus:outline-none ${
                  usernameStatus === 'available' ? 'border-primary' :
                  usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'border-error' :
                  'border-outline-variant/15'
                }`}
                placeholder="Choose a username"
                required
              />
              {/* Status indicator */}
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {usernameStatus === 'checking' && (
                  <Loader2 className="h-5 w-5 text-outline animate-spin" />
                )}
                {usernameStatus === 'available' && (
                  <Check className="h-5 w-5 text-primary" />
                )}
                {(usernameStatus === 'taken' || usernameStatus === 'invalid') && (
                  <X className="h-5 w-5 text-error" />
                )}
              </div>
            </div>
            {/* Error message */}
            {usernameError && (
              <p className="mt-1 text-sm text-error">{usernameError}</p>
            )}
            {usernameStatus === 'available' && (
              <p className="mt-1 text-sm text-primary">Username is available!</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-1">
                First Name <span className="text-outline font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-2 ghost-border rounded-md focus:ring-1 focus:ring-primary/40 focus:outline-none"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-1">
                Last Name <span className="text-outline font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-2 ghost-border rounded-md focus:ring-1 focus:ring-primary/40 focus:outline-none"
                placeholder="Optional"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-outline" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-2 ghost-border rounded-md focus:ring-1 focus:ring-primary/40 focus:outline-none"
                placeholder="Create password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-outline hover:text-on-surface-variant"
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-outline" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 ghost-border rounded-md focus:ring-1 focus:ring-primary/40 focus:outline-none"
                placeholder="Confirm password"
                required
              />
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <label className="flex items-start gap-2 text-sm text-on-surface-variant cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-outline-variant/40 text-primary focus:ring-primary"
                required
              />
              <span>
                I agree to the{' '}
                <Link href="/legal/terms" target="_blank" className="text-primary hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/legal/privacy" target="_blank" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm text-on-surface-variant cursor-pointer">
              <input
                type="checkbox"
                checked={newsletterOptIn}
                onChange={(e) => setNewsletterOptIn(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-outline-variant/40 text-primary focus:ring-primary"
              />
              <span>
                Email me the PlantsPack newsletter — new vegan places near me plus top spots worldwide.
                Optional; unsubscribe anytime.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full silk-gradient hover:opacity-90 text-on-primary font-medium py-2 px-4 rounded-md transition duration-200 disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline-variant/15" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-surface-container-lowest text-outline">Or continue with</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              onClick={signInWithGoogle}
              className="w-full inline-flex justify-center py-2 px-4 ghost-border rounded-md editorial-shadow bg-surface-container-lowest text-sm font-medium text-outline hover:bg-surface-container-low"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="ml-2">Google</span>
            </button>

            <button
              onClick={signInWithFacebook}
              className="w-full inline-flex justify-center py-2 px-4 ghost-border rounded-md editorial-shadow bg-surface-container-lowest text-sm font-medium text-outline hover:bg-surface-container-low"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span className="ml-2">Facebook</span>
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-on-surface-variant">
          Already have an account?{' '}
          <button
            onClick={onToggle}
            className="font-medium text-primary hover:text-primary"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  )
}