'use client'

import { useState, useEffect } from 'react'
import { Shield, ShieldOff, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

interface BlockButtonProps {
  userId: string
  showText?: boolean
  className?: string
}

export default function BlockButton({ userId, showText = true, className = '' }: BlockButtonProps) {
  const { user } = useAuth()
  const [isBlocked, setIsBlocked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    if (!user || user.id === userId) {
      setLoading(false)
      return
    }

    checkBlockStatus()
  }, [user, userId])

  const checkBlockStatus = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('user_blocks')
        .select('id')
        .eq('blocker_id', user.id)
        .eq('blocked_id', userId)
        .maybeSingle()

      if (error) throw error

      setIsBlocked(!!data)
    } catch (error) {
      console.error('Error checking block status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBlock = async () => {
    if (!user || submitting) return

    setSubmitting(true)

    try {
      if (isBlocked) {
        // Unblock
        const { error } = await supabase
          .from('user_blocks')
          .delete()
          .eq('blocker_id', user.id)
          .eq('blocked_id', userId)

        if (error) throw error

        setIsBlocked(false)
        setShowConfirm(false)
      } else {
        // Block
        const { error } = await supabase
          .from('user_blocks')
          .insert({
            blocker_id: user.id,
            blocked_id: userId
          })

        if (error) throw error

        setIsBlocked(true)
        setShowConfirm(false)
      }
    } catch (error) {
      console.error('Error updating block status:', error)
      alert(`Failed to ${isBlocked ? 'unblock' : 'block'} user. Please try again.`)
    } finally {
      setSubmitting(false)
    }
  }

  // Don't show button if not logged in or viewing own profile
  if (!user || user.id === userId || loading) {
    return null
  }

  return (
    <>
      <button
        onClick={() => {
          if (isBlocked) {
            handleBlock() // Unblock immediately
          } else {
            setShowConfirm(true) // Show confirmation for blocking
          }
        }}
        disabled={submitting}
        className={`inline-flex items-center justify-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          isBlocked
            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
            : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
        } disabled:opacity-50 ${className}`}
        title={isBlocked ? 'Unblock this user' : 'Block this user'}
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isBlocked ? (
          <ShieldOff className="h-4 w-4" />
        ) : (
          <Shield className="h-4 w-4" />
        )}
        {showText && <span>{isBlocked ? 'Unblock' : 'Block'}</span>}
      </button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
              <Shield className="h-6 w-6 text-red-600" />
            </div>

            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
              Block this user?
            </h3>

            <p className="text-sm text-gray-600 text-center mb-6">
              They won't be able to see your posts or interact with you. You won't see their content either.
            </p>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleBlock}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {submitting ? 'Blocking...' : 'Block User'}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
