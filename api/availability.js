import { getSupabaseAdmin } from './_lib/supabaseAdmin.js'
import { noStore } from './_lib/adminAuth.js'
import { getPacificTodayISO, getPacificCurrentMonth, addMonths, isValidMonthISO, clampMonth } from './_lib/timezone.js'

const DEFAULT_HORIZON_MONTHS = 6

function monthRange(monthISO) {
  const [y, m] = monthISO.split('-').map(Number)
  const start = `${monthISO}-01`
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const end = `${monthISO}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}

export default async function handler(req, res) {
  noStore(res)

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'Method not allowed.' })
  }

  const horizonMonths = Number(process.env.BOOKING_HORIZON_MONTHS) > 0
    ? Number(process.env.BOOKING_HORIZON_MONTHS)
    : DEFAULT_HORIZON_MONTHS

  const today = getPacificTodayISO()
  const minMonth = getPacificCurrentMonth()
  const maxMonth = addMonths(minMonth, horizonMonths)

  const requestedMonth = typeof req.query.month === 'string' ? req.query.month : minMonth
  const month = isValidMonthISO(requestedMonth) ? clampMonth(requestedMonth, horizonMonths) : minMonth

  let supabase
  try {
    supabase = getSupabaseAdmin()
  } catch (err) {
    console.error('Supabase config error:', err)
    // Sensible default: report the month as having no known availability
    // rather than erroring the whole calendar out.
    return res.status(200).json({ today, minMonth, maxMonth, month, days: {} })
  }

  const { start, end } = monthRange(month)

  const [{ data: closedDays, error: closedErr }, { data: slots, error: slotsErr }] = await Promise.all([
    supabase.from('availability_days').select('day, is_closed').gte('day', start).lte('day', end),
    supabase.from('availability_slots').select('slot_date, status').is('archived_at', null).gte('slot_date', start).lte('slot_date', end),
  ])

  if (closedErr || slotsErr) {
    console.error('Availability query error:', closedErr || slotsErr)
    return res.status(200).json({ today, minMonth, maxMonth, month, days: {} })
  }

  const closedSet = new Set((closedDays || []).filter((d) => d.is_closed).map((d) => d.day))

  const byDate = {}
  for (const s of slots || []) {
    if (!byDate[s.slot_date]) byDate[s.slot_date] = { open: 0, total: 0 }
    byDate[s.slot_date].total += 1
    if (s.status === 'open') byDate[s.slot_date].open += 1
  }

  const days = {}
  for (const date of Object.keys(byDate)) {
    days[date] = byDate[date].open > 0 ? 'available' : 'full'
  }
  // A closed/blackout day always wins, regardless of any slots underneath.
  for (const date of closedSet) {
    days[date] = 'closed'
  }

  return res.status(200).json({ today, minMonth, maxMonth, month, days })
}
