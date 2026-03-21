'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return 'Password must be at least 8 characters long'
    }
    if (!/[A-Z]/.test(pwd)) {
      return 'Password must contain at least one uppercase letter'
    }
    if (!/[a-z]/.test(pwd)) {
      return 'Password must contain at least one lowercase letter'
    }
    if (!/[0-9]/.test(pwd)) {
      return 'Password must contain at least one number'
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) {
      return 'Password must contain at least one special character'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!password || !confirmPassword) {
      setError('Please fill in all fields')
      return
    }

    const passwordError = validatePassword(password)
    if (passwordError) {
      setError(passwordError)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) throw error

      setSuccess(true)

      // Redirect to home page after 2 seconds
      setTimeout(() => {
        router.push('/')
      }, 2000)
    } catch (err) {
      console.error('Password update error:', err)
      setError(err instanceof Error ? err.message : 'Failed to update password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-surface">
        <div className="w-full max-w-md">
          <div className="bg-surface-container-lowest rounded-lg editorial-shadow ghost-border p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-surface-container-low rounded-full mb-4">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-on-surface mb-2">Password Updated!</h2>
            <p className="text-on-surface-variant mb-4">
              Your password has been successfully updated. Redirecting you to the home page...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-surface">
      <div className="w-full max-w-md">
        <div className="bg-surface-container-lowest rounded-lg editorial-shadow ghost-border p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-on-surface mb-2">Set New Password</h2>
            <p className="text-on-surface-variant">
              Create a strong password to secure your account.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-error/5 border border-error/15 rounded-lg">
              <p className="text-sm text-error">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-on-surface-variant mb-1">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-outline" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="block w-full pl-10 pr-10 py-2 ghost-border rounded-md focus:ring-1 focus:ring-primary/40 focus:outline-none"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-outline hover:text-on-surface-variant" />
                  ) : (
                    <Eye className="h-5 w-5 text-outline hover:text-on-surface-variant" />
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-outline">
                Must be at least 8 characters with uppercase, lowercase, number, and special character
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-on-surface-variant mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-outline" />
                </div>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="block w-full pl-10 pr-10 py-2 ghost-border rounded-md focus:ring-1 focus:ring-primary/40 focus:outline-none"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-outline hover:text-on-surface-variant" />
                  ) : (
                    <Eye className="h-5 w-5 text-outline hover:text-on-surface-variant" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full silk-gradient hover:opacity-90 disabled:opacity-50 text-on-primary font-medium py-2 px-4 rounded-md transition-colors"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/auth"
              className="text-sm text-primary hover:text-primary font-medium"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
