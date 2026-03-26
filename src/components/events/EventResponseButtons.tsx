'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { Star, CalendarCheck, Users } from 'lucide-react'

type ResponseStatus = 'interested' | 'going' | null

interface Props {
  postId: string
  compact?: boolean
}

export default function EventResponseButtons({ postId, compact = false }: Props) {
  const { user } = useAuth()
  const [myStatus, setMyStatus] = useState<ResponseStatus>(null)
  const [counts, setCounts] = useState({ interested: 0, going: 0 })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchCounts()
    if (user) fetchMyStatus()
  }, [postId, user])

  const fetchCounts = async () => {
    const { data } = await supabase
      .from('event_responses')
      .select('status')
      .eq('post_id', postId)

    if (data) {
      setCounts({
        interested: data.filter(r => r.status === 'interested').length,
        going: data.filter(r => r.status === 'going').length,
      })
    }
  }

  const fetchMyStatus = async () => {
    if (!user) return
    const { data } = await supabase
      .from('event_responses')
      .select('status')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle()

    setMyStatus((data?.status as ResponseStatus) || null)
  }

  const handleResponse = async (status: ResponseStatus) => {
    if (!user || loading) return
    setLoading(true)

    try {
      if (myStatus === status) {
        // Toggle off — remove response
        await supabase
          .from('event_responses')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id)

        // Optimistic update
        setCounts(prev => ({ ...prev, [status!]: Math.max(0, prev[status!] - 1) }))
        setMyStatus(null)
      } else {
        // Upsert response
        const oldStatus = myStatus
        await supabase
          .from('event_responses')
          .upsert(
            { user_id: user.id, post_id: postId, status },
            { onConflict: 'user_id,post_id' }
          )

        // Optimistic update
        setCounts(prev => ({
          interested: prev.interested + (status === 'interested' ? 1 : 0) - (oldStatus === 'interested' ? 1 : 0),
          going: prev.going + (status === 'going' ? 1 : 0) - (oldStatus === 'going' ? 1 : 0),
        }))
        setMyStatus(status)
      }
    } catch (err) {
      console.error('Error updating event response:', err)
      // Refetch to sync
      fetchCounts()
      fetchMyStatus()
    } finally {
      setLoading(false)
    }
  }

  const totalResponses = counts.interested + counts.going

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleResponse('interested') }}
          disabled={!user || loading}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
            myStatus === 'interested'
              ? 'bg-primary/15 text-primary'
              : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
          } ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Star className="h-3 w-3" fill={myStatus === 'interested' ? 'currentColor' : 'none'} />
          {counts.interested > 0 && counts.interested}
        </button>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleResponse('going') }}
          disabled={!user || loading}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
            myStatus === 'going'
              ? 'bg-green-600/15 text-green-700'
              : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
          } ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <CalendarCheck className="h-3 w-3" />
          {counts.going > 0 && counts.going}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <button
          onClick={() => handleResponse('interested')}
          disabled={!user || loading}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${
            myStatus === 'interested'
              ? 'bg-primary text-on-primary'
              : 'ghost-border text-on-surface-variant hover:bg-surface-container'
          } ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Star className="h-4 w-4" fill={myStatus === 'interested' ? 'currentColor' : 'none'} />
          Interested
        </button>
        <button
          onClick={() => handleResponse('going')}
          disabled={!user || loading}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${
            myStatus === 'going'
              ? 'bg-green-600 text-white'
              : 'ghost-border text-on-surface-variant hover:bg-surface-container'
          } ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <CalendarCheck className="h-4 w-4" />
          Going
        </button>
      </div>
      {totalResponses > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
          <Users className="h-3.5 w-3.5" />
          {counts.going > 0 && <span>{counts.going} going</span>}
          {counts.going > 0 && counts.interested > 0 && <span>·</span>}
          {counts.interested > 0 && <span>{counts.interested} interested</span>}
        </div>
      )}
      {!user && (
        <p className="text-xs text-on-surface-variant">Sign in to mark your interest</p>
      )}
    </div>
  )
}
