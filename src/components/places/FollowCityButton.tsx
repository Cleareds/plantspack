'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

interface FollowCityButtonProps {
  cityName: string
  countryName: string
  currentScore?: number
  currentGrade?: string
}

export default function FollowCityButton({ cityName, countryName, currentScore, currentGrade }: FollowCityButtonProps) {
  const { user } = useAuth()
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

  if (!user || !checked) return null

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
