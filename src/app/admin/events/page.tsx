'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, BadgeCheck, Trash2, ExternalLink } from 'lucide-react'
import Link from 'next/link'

export default function AdminEventsPage() {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { fetchEvents() }, [])

  const fetchEvents = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('posts')
      .select('id, title, slug, content, images, is_verified, created_at, event_data, secondary_tags, users(username)')
      .eq('category', 'event')
      .order('created_at', { ascending: false })
      .limit(500)
    setEvents(data || [])
    setLoading(false)
  }

  const toggleVerified = async (id: string, current: boolean) => {
    await supabase.from('posts').update({ is_verified: !current }).eq('id', id)
    setEvents(prev => prev.map(e => e.id === id ? { ...e, is_verified: !current } : e))
  }

  const deleteEvent = async (id: string, title: string) => {
    if (!confirm(`Delete "${title || 'this event'}"?`)) return
    await supabase.from('posts').delete().eq('id', id)
    setEvents(prev => prev.filter(e => e.id !== id))
  }

  const filtered = events.filter(e =>
    !search || (e.title || e.content || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-on-surface">Events ({events.length})</h1>
        <span className="text-sm text-on-surface-variant">{events.filter(e => e.is_verified).length} verified</span>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-outline" />
        <input type="text" placeholder="Search events..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm rounded-lg ghost-border bg-surface-container-lowest focus:ring-1 focus:ring-primary/40 focus:outline-none" />
      </div>

      {loading ? (
        <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-on-surface-variant">No events yet. Events will appear here when users create them.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(e => {
            const ed = e.event_data as any
            return (
              <div key={e.id} className="flex items-center gap-3 p-3 bg-surface-container-lowest rounded-lg ghost-border">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-on-surface truncate">{e.title || e.content?.slice(0, 60)}</span>
                    {e.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                    {ed?.start_time && <span>{new Date(ed.start_time).toLocaleDateString()}</span>}
                    {ed?.location && <><span>•</span><span>{ed.location}</span></>}
                    <span>•</span>
                    <span>by @{e.users?.username}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => toggleVerified(e.id, e.is_verified)}
                    className={`p-1.5 rounded transition-colors ${e.is_verified ? 'text-primary bg-primary/10' : 'text-outline hover:text-primary'}`}>
                    <BadgeCheck className="h-4 w-4" />
                  </button>
                  <Link href={`/post/${e.slug || e.id}`} target="_blank" className="p-1.5 rounded text-outline hover:text-primary">
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                  <button onClick={() => deleteEvent(e.id, e.title)} className="p-1.5 rounded text-outline hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
