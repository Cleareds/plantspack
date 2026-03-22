'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { Search } from 'lucide-react'
import EventCard from '@/components/events/EventCard'
import CalendarView from '@/components/events/CalendarView'
import { usePageState } from '@/hooks/usePageState'
import { useScrollRestoration } from '@/hooks/useScrollRestoration'

export default function EventsPage() {
  const { user } = useAuth()
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const [state, setState] = usePageState({
    key: 'events_state',
    defaultValue: { search: '', timeFilter: 'upcoming' as string, location: '', viewMode: 'list' as string },
    userId: user?.id,
  })

  const setSearch = useCallback((s: string) => setState(prev => ({ ...prev, search: s })), [setState])
  const setTimeFilter = useCallback((t: string) => setState(prev => ({ ...prev, timeFilter: t })), [setState])
  const setLocation = useCallback((l: string) => setState(prev => ({ ...prev, location: l })), [setState])
  const setViewMode = useCallback((m: string) => setState(prev => ({ ...prev, viewMode: m })), [setState])

  useScrollRestoration({ key: 'events_scroll' })

  // Calendar state
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const timeFilters = [
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'past', label: 'Past' },
    { value: 'all', label: 'All' },
  ]

  const fetchEvents = async (offset = 0) => {
    try {
      if (offset === 0) setLoading(true)
      else setLoadingMore(true)

      const params = new URLSearchParams()
      if (state.search) params.append('search', state.search)
      if (state.location) params.append('location', state.location)

      if (state.viewMode === 'calendar') {
        const y = calendarMonth.getFullYear()
        const m = String(calendarMonth.getMonth() + 1).padStart(2, '0')
        params.append('month', `${y}-${m}`)
      } else {
        if (state.timeFilter === 'upcoming') params.append('upcoming', 'true')
        else if (state.timeFilter === 'past') params.append('upcoming', 'false')
        params.append('limit', '20')
        params.append('offset', String(offset))
      }

      const response = await fetch(`/api/events?${params}`)
      const data = await response.json()

      if (response.ok) {
        if (offset === 0) {
          setEvents(data.events)
        } else {
          setEvents(prev => [...prev, ...data.events])
        }
        setHasMore(data.hasMore)
      }
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    setSelectedDay(null)
    fetchEvents()
  }, [state.search, state.timeFilter, state.location, state.viewMode, calendarMonth])

  // Filter events by selected day in calendar mode
  const displayEvents = selectedDay && state.viewMode === 'calendar'
    ? events.filter(e => {
        const start = e.event_data?.start_time
        if (!start) return false
        const d = new Date(start)
        return d.getDate() === selectedDay &&
          d.getMonth() === calendarMonth.getMonth() &&
          d.getFullYear() === calendarMonth.getFullYear()
      })
    : events

  return (
    <div className="min-h-screen bg-surface-container-low">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-headline font-bold text-on-surface mb-2 tracking-tight">
            Events
          </h1>
          <p className="text-on-surface-variant">
            Discover vegan events, meetups, and gatherings
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-surface-container-lowest rounded-lg editorial-shadow ghost-border p-4 mb-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-outline" />
                <input
                  type="text"
                  placeholder="Search events..."
                  value={state.search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-outline-variant/15 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              {/* Location */}
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-outline" style={{ fontSize: '20px' }}>location_on</span>
                <input
                  type="text"
                  placeholder="Filter by location..."
                  value={state.location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full md:w-48 pl-10 pr-4 py-2 border border-outline-variant/15 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Time filter pills + View toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {timeFilters.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setTimeFilter(f.value)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                      state.timeFilter === f.value
                        ? 'bg-primary text-on-primary-btn'
                        : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* View toggle */}
              <div className="flex items-center gap-1 bg-surface-container-low rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md transition-colors ${
                    state.viewMode === 'list' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>view_list</span>
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`p-1.5 rounded-md transition-colors ${
                    state.viewMode === 'calendar' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>calendar_month</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar View */}
        {state.viewMode === 'calendar' && !loading && (
          <div className="mb-6">
            <CalendarView
              events={events}
              selectedDay={selectedDay}
              onDaySelect={setSelectedDay}
              currentMonth={calendarMonth}
              onMonthChange={setCalendarMonth}
            />
            {selectedDay && (
              <p className="text-sm text-on-surface-variant mt-3">
                Showing events for {calendarMonth.toLocaleDateString(undefined, { month: 'long' })} {selectedDay}
              </p>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-on-surface-variant">Loading events...</p>
          </div>
        )}

        {/* Events List */}
        {!loading && displayEvents.length > 0 && (
          <>
            <div className="flex flex-col gap-3">
              {displayEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>

            {hasMore && state.viewMode === 'list' && (
              <div className="text-center mt-8">
                <button
                  onClick={() => fetchEvents(events.length)}
                  disabled={loadingMore}
                  className="px-6 py-2.5 bg-primary text-on-primary-btn rounded-full font-medium text-sm hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  {loadingMore ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!loading && displayEvents.length === 0 && (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-6xl text-on-surface-variant/30 mb-4 block">event</span>
            <h3 className="text-lg font-medium text-on-surface mb-2">No events found</h3>
            <p className="text-on-surface-variant">
              {state.search || state.location
                ? 'Try adjusting your search or filters'
                : state.timeFilter === 'past'
                ? 'No past events to show'
                : 'No upcoming events yet. Create one!'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
