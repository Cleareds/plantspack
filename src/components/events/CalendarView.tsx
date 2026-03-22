'use client'

type CalendarEvent = {
  id: string
  event_data?: {
    start_time?: string
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

  // Build set of days that have events
  const eventDays = new Set<number>()
  for (const e of events) {
    const start = e.event_data?.start_time
    if (start) {
      const d = new Date(start)
      if (d.getFullYear() === year && d.getMonth() === month) {
        eventDays.add(d.getDate())
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
          <div key={`empty-${i}`} className="aspect-square" />
        ))}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const hasEvents = eventDays.has(day)
          const isSelected = selectedDay === day
          const isToday = new Date().getDate() === day &&
            new Date().getMonth() === month &&
            new Date().getFullYear() === year

          return (
            <button
              key={day}
              onClick={() => onDaySelect(isSelected ? null : day)}
              className={`aspect-square flex flex-col items-center justify-center rounded-lg text-xs font-medium transition-colors relative ${
                isSelected
                  ? 'bg-primary text-on-primary'
                  : isToday
                  ? 'bg-primary/10 text-primary font-bold'
                  : hasEvents
                  ? 'hover:bg-surface-container text-on-surface'
                  : 'text-on-surface-variant/60 hover:bg-surface-container-low'
              }`}
            >
              {day}
              {hasEvents && !isSelected && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
