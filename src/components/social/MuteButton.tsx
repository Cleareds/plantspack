'use client'

import { useState, useEffect } from 'react'
import { VolumeX, Volume2, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

interface MuteButtonProps {
  userId: string
  showText?: boolean
  className?: string
}

export default function MuteButton({ userId, showText = true, className = '' }: MuteButtonProps) {
  const { user } = useAuth()
  const [isMuted, setIsMuted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!user || user.id === userId) {
      setLoading(false)
      return
    }

    checkMuteStatus()
  }, [user, userId])

  const checkMuteStatus = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('user_mutes')
        .select('id')
        .eq('muter_id', user.id)
        .eq('muted_id', userId)
        .maybeSingle()

      if (error) throw error

      setIsMuted(!!data)
    } catch (error) {
      console.error('Error checking mute status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMute = async () => {
    if (!user || submitting) return

    setSubmitting(true)

    try {
      if (isMuted) {
        // Unmute
        const { error } = await supabase
          .from('user_mutes')
          .delete()
          .eq('muter_id', user.id)
          .eq('muted_id', userId)

        if (error) throw error

        setIsMuted(false)
      } else {
        // Mute
        const { error } = await supabase
          .from('user_mutes')
          .insert({
            muter_id: user.id,
            muted_id: userId
          })

        if (error) throw error

        setIsMuted(true)
      }
    } catch (error) {
      console.error('Error updating mute status:', error)
      alert(`Failed to ${isMuted ? 'unmute' : 'mute'} user. Please try again.`)
    } finally {
      setSubmitting(false)
    }
  }

  // Don't show button if not logged in or viewing own profile
  if (!user || user.id === userId || loading) {
    return null
  }

  return (
    <button
      onClick={handleMute}
      disabled={submitting}
      className={`inline-flex items-center justify-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
        isMuted
          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
          : 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200'
      } disabled:opacity-50 ${className}`}
      title={isMuted ? 'Unmute this user' : 'Mute this user'}
    >
      {submitting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isMuted ? (
        <Volume2 className="h-4 w-4" />
      ) : (
        <VolumeX className="h-4 w-4" />
      )}
      {showText && <span>{isMuted ? 'Unmute' : 'Mute'}</span>}
    </button>
  )
}
