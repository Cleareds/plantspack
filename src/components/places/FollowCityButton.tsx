'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { useAuthSheet } from '@/components/auth/AuthSheet'
import { clearPendingAction, peekPendingAction } from '@/lib/pending-action'

interface FollowCityButtonProps {
  cityName: string
  countryName: string
  currentScore?: number
  currentGrade?: string
  /** GA4 source for the sign-up prompt: hub_follow (default) or dish_follow. */
  from?: string
}

export default function FollowCityButton({ cityName, countryName, currentScore, currentGrade, from = 'hub_follow' }: FollowCityButtonProps) {
  const { user } = useAuth()
  const { openAuthSheet } = useAuthSheet()
  const [following, setFollowing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase
      .from('user_followed_cities')
      .select('id')
      .eq('user_id', user.id)
      .eq('city', cityName)
      .eq('country', countryName)
      .maybeSingle()
      .then(({ data }) => {
        setFollowing(!!data)
        setChecked(true)
      })
  }, [user, cityName, countryName])

  const handleToggle = async () => {
    setLoading(true)
    setFollowing(prev => !prev) // Optimistic

    try {
      const res = await fetch('/api/cities/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: cityName, country: countryName, currentScore, currentGrade }),
      })
      if (!res.ok) setFollowing(prev => !prev) // Revert on error
    } catch {
      setFollowing(prev => !prev)
    } finally {
      setLoading(false)
    }
  }

  // Opening a followed city marks it seen, so "Since your last visit" on the
  // homepage counts only what arrives after this visit (the app does the same
  // through markCityVisited). Once per mount; the endpoint is a no-op for
  // cities the person does not follow.
  useEffect(() => {
    if (!user || !checked || !following) return
    fetch('/api/cities/followed/seen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city: cityName, country: countryName }),
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, checked])

  // A guest who clicked Follow before signing in: complete it once.
  useEffect(() => {
    if (!user || !checked) return
    const p = peekPendingAction()
    if (p?.type === 'follow' && p.city === cityName && p.country === countryName) {
      clearPendingAction()
      if (!following) handleToggle()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, checked])

  if (!user) {
    // Guests used to get nothing (the button returned null). Now the click
    // opens the sign-in sheet and the follow completes after sign-in.
    return (
      <button
        type="button"
        onClick={() => openAuthSheet({
          reason: `Follow ${cityName} to see new vegan places and score changes`,
          from,
          pending: { type: 'follow', city: cityName, country: countryName, score: currentScore, grade: currentGrade },
        })}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ghost-border text-on-surface-variant hover:bg-surface-container-low"
      >
        <BellOff className="h-3.5 w-3.5" />
        Follow City
      </button>
    )
  }
  if (!checked) return null

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
        following
          ? 'bg-primary/10 text-primary ghost-border'
          : 'ghost-border text-on-surface-variant hover:bg-surface-container-low'
      }`}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : following ? (
        <Bell className="h-3.5 w-3.5" />
      ) : (
        <BellOff className="h-3.5 w-3.5" />
      )}
      {following ? 'Following' : 'Follow City'}
    </button>
  )
}
