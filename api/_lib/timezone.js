const PACIFIC_TZ = 'America/Los_Angeles'

// 'YYYY-MM-DD' for "today" in America/Los_Angeles, regardless of the
// server's own system timezone. Intl resolves the IANA zone's actual
// offset for this instant, so DST transitions are handled correctly with
// no manual offset math.
export function getPacificTodayISO() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: PACIFIC_TZ }).format(new Date())
}

// 'YYYY-MM' for the current Pacific month.
export function getPacificCurrentMonth() {
  return getPacificTodayISO().slice(0, 7)
}

// 'YYYY-MM' + n months, wrapping year boundaries correctly.
export function addMonths(monthISO, n) {
  const [y, m] = monthISO.split('-').map(Number)
  const total = (y * 12 + (m - 1)) + n
  const outYear = Math.floor(total / 12)
  const outMonth = (total % 12) + 1
  return `${outYear}-${String(outMonth).padStart(2, '0')}`
}

export function isValidMonthISO(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}$/.test(v) && Number(v.slice(5, 7)) >= 1 && Number(v.slice(5, 7)) <= 12
}

export function isValidDateISO(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))
}

// Clamp a requested month into [currentMonth, currentMonth + horizonMonths].
export function clampMonth(monthISO, horizonMonths) {
  const min = getPacificCurrentMonth()
  const max = addMonths(min, horizonMonths)
  if (monthISO < min) return min
  if (monthISO > max) return max
  return monthISO
}
