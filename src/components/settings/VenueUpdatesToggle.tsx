'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

/**
 * "Updates from places": monthly in-app messages from Partner venues in a
 * city you follow or a place you saved. On by default; saved immediately.
 */
export default function VenueUpdatesToggle() {
  const { user } = useAuth()
  const [on, setOn] = useState<boolean | null>(null)
  const sb = supabase as any

  useEffect(() => {
    if (!user) return
    sb.from('user_preferences').select('venue_updates').eq('user_id', user.id).maybeSingle()
      .then(({ data }: { data: { venue_updates: boolean } | null }) => setOn(data ? data.venue_updates !== false : true))
  }, [user])

  if (!user || on === null) return null

  const toggle = async (value: boolean) => {
    setOn(value)
    const { data: row } = await sb.from('user_preferences').select('id').eq('user_id', user.id).maybeSingle()
    const { error } = row
      ? await sb.from('user_preferences').update({ venue_updates: value }).eq('user_id', user.id)
      : await sb.from('user_preferences').insert({ user_id: user.id, venue_updates: value })
    if (error) setOn(!value)
  }

  return (
    <div className="bg-surface-container-lowest rounded-lg editorial-shadow ghost-border p-6 flex items-center justify-between gap-4">
      <div>
        <p className="font-medium text-on-surface">Updates from places</p>
        <p className="text-sm text-outline">A short monthly message from vegan places in cities you follow or places you saved, in your PlantsPack notifications.</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
        <input type="checkbox" checked={on} onChange={(e) => toggle(e.target.checked)} className="sr-only peer" aria-label="Updates from places" />
        <div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-outline-variant after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
      </label>
    </div>
  )
}
