const PACIFIC_TZ = 'America/Los_Angeles'

// 'YYYY-MM-DD' for "today" in America/Los_Angeles, regardless of the
// visitor's own device timezone. Mirrors api/_lib/timezone.js — the
// server's /api/availability response is the source of truth for
// today/min/max month; this is used for quick client-side checks
// (e.g. disabling a cell) before that response arrives.
export function getPacificTodayISO() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: PACIFIC_TZ }).format(new Date())
}

export function getPacificCurrentMonth() {
  return getPacificTodayISO().slice(0, 7)
}

export function isValidDateISO(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))
}

export function addMonths(monthISO, n) {
  const [y, m] = monthISO.split('-').map(Number)
  const total = (y * 12 + (m - 1)) + n
  const outYear = Math.floor(total / 12)
  const outMonth = (total % 12) + 1
  return `${outYear}-${String(outMonth).padStart(2, '0')}`
}

// Builds a 6-week (42-cell) Sunday-first month grid. Each cell is either
// null (padding from the adjacent month) or a 'YYYY-MM-DD' string.
export function getMonthGrid(monthISO) {
  const [year, month] = monthISO.split('-').map(Number)
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1))
  const startWeekday = firstOfMonth.getUTCDay() // 0 = Sunday
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()

  const cells = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
  }
  while (cells.length % 7 !== 0 || cells.length < 42) cells.push(null)
  return cells
}

export function formatMonthLabel(monthISO) {
  const [year, month] = monthISO.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(undefined, {
    month: 'long', year: 'numeric', timeZone: 'UTC',
  })
}

export function formatDayLabel(dateISO) {
  const [year, month, day] = dateISO.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC',
  })
}
