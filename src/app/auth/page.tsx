'use client'

import { useState, useEffect, Suspense } from 'react'
import { useAuth } from '@/lib/auth'
import { useRouter, useSearchParams } from 'next/navigation'
import LoginForm from '@/components/auth/LoginForm'
import SignupForm from '@/components/auth/SignupForm'

function AuthContent() {
  const searchParams = useSearchParams()
  const mode = searchParams.get('mode')
  const errorParam = searchParams.get('error')
  const successParam = searchParams.get('success')
  const [isLogin, setIsLogin] = useState(mode !== 'signup')
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null)
  const { user, initialized } = useAuth()
  const router = useRouter()

  // Show error/success from URL parameters
  useEffect(() => {
    if (errorParam) {
      setGlobalError(decodeURIComponent(errorParam))
    }
    if (successParam) {
      setGlobalSuccess(decodeURIComponent(successParam))
    }
  }, [errorParam, successParam])

  // Redirect authenticated users immediately once auth is initialized
  useEffect(() => {
    if (initialized && user && !isRedirecting) {
      setIsRedirecting(true)
      router.push('/')
    }
  }, [user, initialized, router, isRedirecting])

  // Update form mode when URL parameter changes
  useEffect(() => {
    setIsLogin(mode !== 'signup')
  }, [mode])

  // Don't show anything while redirecting
  if (isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    )
  }

  // Show forms immediately, don't wait for auth to initialize
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="w-full max-w-md">
        {globalError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{globalError}</p>
          </div>
        )}
        {globalSuccess && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">{globalSuccess}</p>
          </div>
        )}
        {isLogin ? (
          <LoginForm onToggle={() => setIsLogin(false)} />
        ) : (
          <SignupForm onToggle={() => setIsLogin(true)} />
        )}
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    }>
      <AuthContent />
    </Suspense>
  )
}