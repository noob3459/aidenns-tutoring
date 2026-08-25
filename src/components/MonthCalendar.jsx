import { useMemo, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getMonthGrid, formatMonthLabel, addMonths } from '../lib/timezone.js'

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/**
 * Shared premium month-grid calendar used by the public booking flow and
 * the admin availability dashboard.
 *
 * dayStatus: { [dateISO]: 'available' | 'full' | 'closed' } — anything not
 * present is treated as "no availability defined" (styled like closed).
 * Past-date and today styling is derived here from `today`/`month`, not
 * passed in, so both callers stay in sync automatically.
 */
export default function MonthCalendar({
  month,
  today,
  minMonth,
  maxMonth,
  dayStatus = {},
  selectedDate,
  onSelectDate,
  onMonthChange,
  renderBadge,
  loading = false,
  allowSelectAnyStatus = false,
}) {
  const cells = useMemo(() => getMonthGrid(month), [month])
  const cellRefs = useRef({})

  const canGoBack = !minMonth || month > minMonth
  const canGoForward = !maxMonth || month < maxMonth

  const focusCell = (index) => {
    const cell = cells[index]
    if (cell && cellRefs.current[cell]) cellRefs.current[cell].focus()
  }

  const onKeyDown = (e, index) => {
    const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
    if (moves[e.key] !== undefined) {
      e.preventDefault()
      let next = index + moves[e.key]
      next = Math.max(0, Math.min(cells.length - 1, next))
      focusCell(next)
    }
  }

  const statusFor = (dateISO) => {
    if (dateISO < today) return 'past'
    if (dateISO === selectedDate) return 'selected'
    return dayStatus[dateISO] || 'closed'
  }

  const isInteractive = (dateISO, status) =>
    dateISO >= today && (allowSelectAnyStatus ? status !== 'past' : status === 'available')

  const cellClasses = (status, isToday, interactive) => {
    const base = 'relative flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl text-sm font-medium transition-all duration-200'
    const clickable = interactive ? 'cursor-pointer hover:border-accent hover:bg-accent/5' : 'cursor-not-allowed'
    switch (status) {
      case 'selected':
        return `${base} bg-primary text-white shadow-md shadow-primary/30 scale-105`
      case 'available':
        return `${base} bg-white border border-divider text-ink ${clickable}`
      case 'full':
        return `${base} bg-background border border-divider text-muted/60 line-through ${clickable}`
      case 'past':
        return `${base} text-muted/30 cursor-not-allowed`
      case 'closed':
      default:
        return `${base} border border-transparent text-muted/40 ${clickable} ${isToday ? '' : ''}`
    }
  }

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          disabled={!canGoBack}
          onClick={() => onMonthChange(addMonths(month, -1))}
          aria-label="Previous month"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-divider text-ink hover:border-primary/40 hover:bg-primary/5 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-divider disabled:hover:bg-transparent transition-all"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h3 className="font-display font-bold text-base sm:text-lg text-ink" aria-live="polite">
          {formatMonthLabel(month)}
        </h3>
        <button
          type="button"
          disabled={!canGoForward}
          onClick={() => onMonthChange(addMonths(month, 1))}
          aria-label="Next month"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-divider text-ink hover:border-primary/40 hover:bg-primary/5 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-divider disabled:hover:bg-transparent transition-all"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <table role="grid" aria-label={`Availability for ${formatMonthLabel(month)}`} className="w-full border-separate border-spacing-1">
        <thead>
          <tr>
            {WEEKDAY_LABELS.map((d) => (
              <th key={d} scope="col" className="font-mono text-[10px] uppercase tracking-widest text-muted pb-2 font-normal">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={loading ? 'opacity-50 pointer-events-none transition-opacity' : 'transition-opacity'}>
          {Array.from({ length: cells.length / 7 }).map((_, row) => (
            <tr key={row}>
              {cells.slice(row * 7, row * 7 + 7).map((dateISO, col) => {
                const index = row * 7 + col
                if (!dateISO) return <td key={col} />
                const status = statusFor(dateISO)
                const isToday = dateISO === today
                const interactive = isInteractive(dateISO, status)
                const dayNum = Number(dateISO.slice(8, 10))
                const label = `${dateISO}${status === 'selected' ? ', selected' : ''}${status === 'full' ? ', fully booked' : ''}${status === 'closed' ? ', unavailable' : ''}${status === 'past' ? ', past' : ''}${isToday ? ', today' : ''}`

                return (
                  <td key={col} className="p-0 text-center">
                    <button
                      type="button"
                      ref={(el) => { if (el) cellRefs.current[dateISO] = el }}
                      tabIndex={dateISO === (selectedDate || today) ? 0 : -1}
                      onKeyDown={(e) => onKeyDown(e, index)}
                      disabled={!interactive}
                      aria-disabled={!interactive}
                      aria-pressed={status === 'selected'}
                      aria-label={label}
                      onClick={() => interactive && onSelectDate(dateISO)}
                      className={cellClasses(status, isToday, interactive)}
                    >
                      {dayNum}
                      {isToday && status !== 'selected' && (
                        <span className="absolute bottom-1 h-1 w-1 rounded-full bg-accent" aria-hidden="true" />
                      )}
                      {renderBadge?.(dateISO, status)}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-4 font-mono text-[10px] uppercase tracking-widest text-muted">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-white border border-divider" /> Available</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> Selected</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-background border border-divider" /> Full</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-accent" /> Today</span>
      </div>
    </div>
  )
}
