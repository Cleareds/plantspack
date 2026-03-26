'use client'

type CalendarEvent = {
  id: string
  title?: string | null
  event_data?: {
    start_time?: string
    title?: string
  } | null
}

type Props = {
  events: CalendarEvent[]
  selectedDay: number | null
  onDaySelect: (day: number | null) => void
  currentMonth: Date
  onMonthChange: (date: Date) => void
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function CalendarView({ events, selectedDay, onDaySelect, currentMonth, onMonthChange }: Props) {
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Build map of days → events for that day
  const eventsByDay = new Map<number, CalendarEvent[]>()
  for (const e of events) {
    const start = e.event_data?.start_time
    if (start) {
      const d = new Date(start)
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate()
        if (!eventsByDay.has(day)) eventsByDay.set(day, [])
        eventsByDay.get(day)!.push(e)
      }
    }
  }

  const prevMonth = () => onMonthChange(new Date(year, month - 1, 1))
  const nextMonth = () => onMonthChange(new Date(year, month + 1, 1))

  const monthLabel = currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  return (
    <div className="bg-surface-container-lowest rounded-2xl editorial-shadow ghost-border p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-2 hover:bg-surface-container rounded-lg transition-colors">
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '20px' }}>chevron_left</span>
        </button>
        <h3 className="font-semibold text-on-surface text-sm">{monthLabel}</h3>
        <button onClick={nextMonth} className="p-2 hover:bg-surface-container rounded-lg transition-colors">
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '20px' }}>chevron_right</span>
        </button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_NAMES.map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-on-surface-variant uppercase py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for offset */}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[4.5rem]" />
        ))}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const dayEvents = eventsByDay.get(day) || []
          const hasEvents = dayEvents.length > 0
          const isSelected = selectedDay === day
          const isToday = new Date().getDate() === day &&
            new Date().getMonth() === month &&
            new Date().getFullYear() === year

          return (
            <button
              key={day}
              onClick={() => onDaySelect(isSelected ? null : day)}
              className={`min-h-[4.5rem] flex flex-col items-start p-1 rounded-lg text-xs font-medium transition-colors ${
                isSelected
                  ? 'bg-primary/10 ring-2 ring-primary'
                  : isToday
                  ? 'bg-primary/5 ring-1 ring-primary/30'
                  : hasEvents
                  ? 'hover:bg-surface-container'
                  : 'hover:bg-surface-container-low'
              }`}
            >
              <span className={`text-[11px] mb-0.5 ${
                isSelected ? 'text-primary font-bold'
                : isToday ? 'text-primary font-bold'
                : hasEvents ? 'text-on-surface font-semibold'
                : 'text-on-surface-variant/60'
              }`}>
                {day}
              </span>
              {/* Event bars */}
              <div className="flex flex-col gap-0.5 w-full min-w-0 overflow-hidden">
                {dayEvents.slice(0, 2).map((ev) => {
                  const label = ev.title || ev.event_data?.title || 'Event'
                  return (
                    <div
                      key={ev.id}
                      className="w-full bg-primary/15 text-primary rounded px-1 py-px truncate text-[9px] leading-tight font-medium"
                      title={label}
                    >
                      {label}
                    </div>
                  )
                })}
                {dayEvents.length > 2 && (
                  <span className="text-[9px] text-on-surface-variant pl-0.5">+{dayEvents.length - 2} more</span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
