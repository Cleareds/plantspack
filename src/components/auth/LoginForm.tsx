'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { Lock, User, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

interface LoginFormProps {
  onToggle: () => void
}

export default function LoginForm({ onToggle }: LoginFormProps) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { signIn, signInWithGoogle, signInWithFacebook } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await signIn(identifier, password)

    if (error) {
      setError(error.message)
    }

    setLoading(false)
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-surface-container-lowest rounded-lg editorial-shadow p-6">
        {/* Tab switcher */}
        <div className="flex rounded-lg bg-surface-container p-1 mb-6">
          <button
            type="button"
            onClick={onToggle}
            className="flex-1 py-2 text-sm font-medium rounded-md text-on-surface-variant hover:text-on-surface transition-colors"
          >
            Sign Up
          </button>
          <button
            type="button"
            className="flex-1 py-2 text-sm font-medium rounded-md bg-surface text-on-surface shadow-sm"
          >
            Sign In
          </button>
        </div>

        {/* Social OAuth — primary path */}
        <div className="space-y-2 mb-5">
          <button
            type="button"
            onClick={signInWithGoogle}
            className="w-full inline-flex items-center justify-center gap-3 py-2.5 px-4 ghost-border rounded-md editorial-shadow bg-surface-container-lowest text-sm font-medium text-on-surface hover:bg-surface-container-low transition-colors"
          >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>
          <button
            type="button"
            onClick={signInWithFacebook}
            className="w-full inline-flex items-center justify-center gap-3 py-2.5 px-4 ghost-border rounded-md editorial-shadow bg-surface-container-lowest text-sm font-medium text-on-surface hover:bg-surface-container-low transition-colors"
          >
            <svg className="h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Continue with Facebook
          </button>
        </div>

        <div className="relative mb-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-outline-variant/15" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-surface-container-lowest text-outline">Or sign in with email</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-error/5 border border-error/15 text-error rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">
              Email or Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-outline" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full pl-10 pr-4 py-2 ghost-border rounded-md focus:ring-1 focus:ring-primary/40 focus:outline-none"
                placeholder="Enter email or username"
                required
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
                placeholder="Enter password"
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

          <div className="flex items-center justify-end">
            <Link
              href="/auth/reset-password"
              className="text-sm text-primary hover:text-primary font-medium"
            >
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full silk-gradient hover:opacity-90 text-on-primary font-medium py-2 px-4 rounded-md transition duration-200 disabled:opacity-50"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}