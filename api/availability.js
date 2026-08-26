import { getSupabaseAdmin } from './_lib/supabaseAdmin.js'
import { noStore } from './_lib/adminAuth.js'
import {
  getPacificTodayISO, getPacificCurrentMonth, addMonths,
  isValidMonthISO, isValidDateISO, clampMonth, getPacificNowTimeString,
} from './_lib/timezone.js'

// Consolidates the two public availability endpoints (month view + a
// single date's open slots) into one deployed function, to stay well
// under Vercel's Hobby serverless function limit. Response shapes are
// unchanged from the two files this replaces:
//   ?month=YYYY-MM   -> { today, minMonth, maxMonth, month, days }
//   ?date=YYYY-MM-DD -> { slots: [{ id, time }] }
// No auth required — this is the public read path the booking calendar
// uses; every query still excludes archived slots and closed dates,
// same as before.

const DEFAULT_HORIZON_MONTHS = 6

function monthRange(monthISO) {
  const [y, m] = monthISO.split('-').map(Number)
  const start = `${monthISO}-01`
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const end = `${monthISO}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}

function formatTimeLabel(time24) {
  // time24 like "15:30:00" -> "3:30 PM"
  const [hStr, mStr] = time24.split(':')
  let h = Number(hStr)
  const suffix = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${mStr} ${suffix}`
}

async function getDateSlots(res, supabase, date) {
  if (!isValidDateISO(date)) {
    return res.status(400).json({ ok: false, error: 'A valid date is required.' })
  }

  const today = getPacificTodayISO()
  if (date < today) {
    return res.status(200).json({ slots: [] })
  }

  const { data: dayOverride } = await supabase
    .from('availability_days')
    .select('is_closed')
    .eq('day', date)
    .maybeSingle()

  if (dayOverride?.is_closed) {
    return res.status(200).json({ slots: [] })
  }

  const { data: slots, error } = await supabase
    .from('availability_slots')
    .select('id, start_time')
    .eq('slot_date', date)
    .eq('status', 'open')
    .is('archived_at', null)
    .order('start_time', { ascending: true })

  if (error) {
    console.error('Slot query error:', error)
    return res.status(200).json({ slots: [] })
  }

  // Same-day guard: `date < today` above only rules out past *days* —
  // today's own slots still need today's already-elapsed times filtered
  // out, or a family loading the page at 2pm could still pick 12pm.
  const visibleSlots = date === today
    ? (slots || []).filter((s) => s.start_time > getPacificNowTimeString())
    : (slots || [])

  return res.status(200).json({
    slots: visibleSlots.map((s) => ({ id: s.id, time: formatTimeLabel(s.start_time) })),
  })
}

async function getMonthAvailability(res, supabase, requestedMonth) {
  const horizonMonths = Number(process.env.BOOKING_HORIZON_MONTHS) > 0
    ? Number(process.env.BOOKING_HORIZON_MONTHS)
    : DEFAULT_HORIZON_MONTHS

  const today = getPacificTodayISO()
  const minMonth = getPacificCurrentMonth()
  const maxMonth = addMonths(minMonth, horizonMonths)
  const month = isValidMonthISO(requestedMonth) ? clampMonth(requestedMonth, horizonMonths) : minMonth

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

export default async function handler(req, res) {
  noStore(res)

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'Method not allowed.' })
  }

  let supabase
  try {
    supabase = getSupabaseAdmin()
  } catch (err) {
    console.error('Supabase config error:', err)
    if (req.query.date) return res.status(200).json({ slots: [] })
    const minMonth = getPacificCurrentMonth()
    return res.status(200).json({
      today: getPacificTodayISO(), minMonth,
      maxMonth: addMonths(minMonth, DEFAULT_HORIZON_MONTHS),
      month: minMonth, days: {},
    })
  }

  if (req.query.date) return getDateSlots(res, supabase, req.query.date)
  return getMonthAvailability(res, supabase, req.query.month)
}
