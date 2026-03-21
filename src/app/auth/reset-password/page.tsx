'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      setError('Please enter your email address')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`
      })

      if (error) throw error

      setSuccess(true)
    } catch (err) {
      console.error('Password reset error:', err)
      setError(err instanceof Error ? err.message : 'Failed to send reset email. Please try again.')
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
            <h2 className="text-2xl font-bold text-on-surface mb-2">Check Your Email</h2>
            <p className="text-on-surface-variant mb-6">
              We&apos;ve sent a password reset link to <strong>{email}</strong>.
              Please check your inbox and follow the instructions to reset your password.
            </p>
            <p className="text-sm text-outline mb-6">
              Didn&apos;t receive the email? Check your spam folder or try again in a few minutes.
            </p>
            <Link
              href="/auth"
              className="inline-flex items-center space-x-2 text-primary hover:text-primary font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Login</span>
            </Link>
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
            <h2 className="text-3xl font-bold text-on-surface mb-2">Reset Password</h2>
            <p className="text-on-surface-variant">
              Enter your email address and we&apos;ll send you a link to reset your password.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-error/5 border border-error/15 rounded-lg">
              <p className="text-sm text-error">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-on-surface-variant mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-outline" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="block w-full pl-10 pr-3 py-2 ghost-border rounded-md focus:ring-1 focus:ring-primary/40 focus:outline-none"
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full silk-gradient hover:opacity-90 disabled:opacity-50 text-on-primary font-medium py-2 px-4 rounded-md transition-colors"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/auth"
              className="inline-flex items-center space-x-2 text-sm text-primary hover:text-primary font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Login</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
