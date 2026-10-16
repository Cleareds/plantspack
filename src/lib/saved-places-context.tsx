'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { track } from '@/lib/analytics'

/**
 * The signed-in user's saved places (favorite_places), loaded once so every
 * card on a hub or dish page can show its saved state without a query each.
 * Writes go straight to Supabase (RLS: users insert / delete their own rows),
 * the same way FavoriteButton on the place page does.
 */
interface SavedPlacesContextValue {
  ready: boolean
  isSaved: (placeId: string) => boolean
  /** Save (true) or unsave (false). Returns the new state. */
  toggle: (placeId: string, from?: string) => Promise<boolean>
  save: (placeId: string, from?: string) => Promise<void>
}

const SavedPlacesContext = createContext<SavedPlacesContextValue>({
  ready: false,
  isSaved: () => false,
  toggle: async () => false,
  save: async () => {},
})

export function SavedPlacesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [ids, setIds] = useState<Set<string>>(() => new Set())
  const [ready, setReady] = useState(false)
  const userId = user?.id
  const idsRef = useRef(ids)
  idsRef.current = ids

  useEffect(() => {
    if (!userId) {
      setIds(new Set())
      setReady(false)
      return
    }
    let cancelled = false
    supabase
      .from('favorite_places')
      .select('place_id')
      .eq('user_id', userId)
      .then(({ data }) => {
        if (cancelled) return
        setIds(new Set((data || []).map((r: { place_id: string }) => r.place_id)))
        setReady(true)
      })
    return () => { cancelled = true }
  }, [userId])

  const isSaved = useCallback((placeId: string) => ids.has(placeId), [ids])

  const toggle = useCallback(async (placeId: string, from?: string): Promise<boolean> => {
    if (!userId) return false
    const wasSaved = idsRef.current.has(placeId)
    // Optimistic
    setIds(prev => {
      const next = new Set(prev)
      if (wasSaved) next.delete(placeId); else next.add(placeId)
      return next
    })
    try {
      if (wasSaved) {
        const { error } = await supabase.from('favorite_places').delete().eq('place_id', placeId).eq('user_id', userId)
        if (error) throw error
        return false
      }
      const { error } = await supabase.from('favorite_places').insert({ place_id: placeId, user_id: userId })
      // 23505 = already saved (another tab, or the place page): keep the saved state.
      if (error && error.code !== '23505') throw error
      track('place_saved', { from: from || 'web' })
      return true
    } catch {
      // Revert
      setIds(prev => {
        const next = new Set(prev)
        if (wasSaved) next.add(placeId); else next.delete(placeId)
        return next
      })
      return wasSaved
    }
  }, [userId])

  const save = useCallback(async (placeId: string, from?: string) => {
    if (!idsRef.current.has(placeId)) await toggle(placeId, from)
  }, [toggle])

  const value = useMemo(() => ({ ready, isSaved, toggle, save }), [ready, isSaved, toggle, save])
  return <SavedPlacesContext.Provider value={value}>{children}</SavedPlacesContext.Provider>
}

export function useSavedPlaces() {
  return useContext(SavedPlacesContext)
}
