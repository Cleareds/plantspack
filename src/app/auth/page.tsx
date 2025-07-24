'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import LoginForm from '@/components/auth/LoginForm'
import SignupForm from '@/components/auth/SignupForm'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const { user, loading } = useAuth()
  const router = useRouter()

  // Debug logging
  useEffect(() => {
    console.log('🔐 AuthPage rendered')
    console.log('📊 isLogin:', isLogin)
    console.log('👤 user:', !!user)
    console.log('⏳ loading:', loading)
  }, [isLogin, user, loading])

  useEffect(() => {
    if (!loading && user) {
      router.push('/')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  if (user) {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="w-full max-w-md">
        {/* Debug toggle buttons */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => {
              console.log('🔄 Switching to Login')
              setIsLogin(true)
            }}
            className={`px-3 py-1 text-sm rounded ${isLogin ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            Login
          </button>
          <button
            onClick={() => {
              console.log('🔄 Switching to Signup')
              setIsLogin(false)
            }}
            className={`px-3 py-1 text-sm rounded ${!isLogin ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            Signup
          </button>
        </div>

        {isLogin ? (
          <LoginForm onToggle={() => {
            console.log('🔄 LoginForm onToggle called')
            setIsLogin(false)
          }} />
        ) : (
          <SignupForm onToggle={() => {
            console.log('🔄 SignupForm onToggle called')
            setIsLogin(true)
          }} />
        )}
      </div>
    </div>
  )
}