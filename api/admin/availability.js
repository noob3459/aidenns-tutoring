import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js'
import { requireAdmin } from '../_lib/adminAuth.js'
import { isValidMonthISO, isValidDateISO, getPacificTodayISO } from '../_lib/timezone.js'

// Consolidates seven admin availability endpoints into one deployed
// function (to stay well under Vercel's Hobby serverless function
// limit): month view, date view, recurring-rule list, add-slot,
// generate-slots, archive-slot, restore-slot, set-day (close/notes),
// copy-to-dates, create-rule, delete-rule, generate-from-rules. Every
// action below is a verbatim port of what used to be its own file —
// same validation, same error messages, same Supabase calls — just
// reorganized under one handler with an explicit action allowlist.
//
// GET  ?month=YYYY-MM | ?date=YYYY-MM-DD | ?rules=1 | ?history=1 | ?requests=1
// POST { action: <one of ALLOWED_ACTIONS>, ...fields }
//
// requireAdmin() (session + CSRF/origin check) gates the entire handler,
// same as every file this replaces.

const MAX_TARGET_DATES = 60
const MAX_WEEKS = 26

const ALLOWED_ACTIONS = [
  'add-slot', 'generate-slots', 'archive-slot', 'restore-slot',
  'set-day', 'copy', 'create-rule', 'delete-rule', 'generate-from-rules',
]

function monthRange(monthISO) {
  const [y, m] = monthISO.split('-').map(Number)
  const start = `${monthISO}-01`
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const end = `${monthISO}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}

function isValidTime(v) {
  return typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v)
}

/* ---------------- GET: reads ---------------- */

async function getDateDetail(res, supabase, date) {
  if (!isValidDateISO(date)) return res.status(400).json({ ok: false, error: 'Invalid date.' })

  // The admin's single-date view intentionally includes archived slots
  // (unlike every other query here) — this is the one place historical
  // scheduling data stays reviewable, per design.
  const [{ data: dayOverride }, { data: slots, error: slotsErr }] = await Promise.all([
    supabase.from('availability_days').select('is_closed, notes').eq('day', date).maybeSingle(),
    supabase.from('availability_slots').select('id, start_time, duration_minutes, status, archived_at').eq('slot_date', date).order('start_time'),
  ])
  if (slotsErr) return res.status(500).json({ ok: false, error: 'Could not load that date.' })

  const slotIds = (slots || []).map((s) => s.id)
  let bookings = []
  if (slotIds.length) {
    const { data } = await supabase
      .from('bookings')
      .select('id, slot_id, status, parent_name, student_name, grade, format, email, phone, notes')
      .in('slot_id', slotIds)
      .in('status', ['pending', 'confirmed', 'declined', 'completed', 'cancelled'])
    bookings = data || []
  }
  const bookingBySlot = Object.fromEntries(bookings.map((b) => [b.slot_id, b]))

  return res.status(200).json({
    date,
    isClosed: dayOverride?.is_closed || false,
    notes: dayOverride?.notes || '',
    slots: (slots || []).map((s) => ({ ...s, booking: bookingBySlot[s.id] || null })),
  })
}

async function getMonthSummary(res, supabase, month) {
  const targetMonth = isValidMonthISO(month) ? month : null
  if (!targetMonth) return res.status(400).json({ ok: false, error: 'Invalid month.' })

  const { start, end } = monthRange(targetMonth)
  const [{ data: closedDays }, { data: slots, error: slotsErr }] = await Promise.all([
    supabase.from('availability_days').select('day, is_closed, notes').gte('day', start).lte('day', end),
    // Month-overview counts reflect the ACTIVE schedule only — archived
    // slots are excluded here (still visible in the date detail view).
    supabase.from('availability_slots').select('id, slot_date, status').is('archived_at', null).gte('slot_date', start).lte('slot_date', end),
  ])
  if (slotsErr) return res.status(500).json({ ok: false, error: 'Could not load that month.' })

  const slotIds = (slots || []).map((s) => s.id)
  let bookings = []
  if (slotIds.length) {
    const { data } = await supabase.from('bookings').select('slot_id, status').in('slot_id', slotIds)
    bookings = data || []
  }
  const bookingStatusBySlot = Object.fromEntries(bookings.map((b) => [b.slot_id, b.status]))
  const closedByDay = Object.fromEntries((closedDays || []).map((d) => [d.day, d]))

  const summary = {}
  for (const s of slots || []) {
    if (!summary[s.slot_date]) summary[s.slot_date] = { open: 0, requested: 0, confirmed: 0, completed: 0, total: 0 }
    summary[s.slot_date].total += 1
    if (s.status === 'open') summary[s.slot_date].open += 1
    else {
      const bStatus = bookingStatusBySlot[s.id]
      if (bStatus === 'pending') summary[s.slot_date].requested += 1
      else if (bStatus === 'confirmed') summary[s.slot_date].confirmed += 1
      else if (bStatus === 'completed') summary[s.slot_date].completed += 1
    }
  }
  for (const day of Object.keys(closedByDay)) {
    if (!summary[day]) summary[day] = { open: 0, requested: 0, confirmed: 0, completed: 0, total: 0 }
    summary[day].isClosed = closedByDay[day].is_closed
    summary[day].hasNotes = Boolean(closedByDay[day].notes)
  }

  return res.status(200).json({ month: targetMonth, days: summary })
}

async function getRules(res, supabase) {
  const { data, error } = await supabase
    .from('recurring_availability_rules')
    .select('*')
    .order('weekday')
    .order('start_time')
  if (error) return res.status(500).json({ ok: false, error: 'Could not load recurring rules.' })
  return res.status(200).json({ rules: data || [] })
}

const BOOKING_HISTORY_MAX = 300

// Sessions that have already happened: confirmed or completed bookings
// dated today or earlier, newest first. Deliberately includes
// 'confirmed' (not just 'completed') — a past session left confirmed
// but never explicitly marked completed is still history, not upcoming.
async function getBookingHistory(res, supabase) {
  const today = getPacificTodayISO()
  const { data, error } = await supabase
    .from('bookings')
    .select('id, parent_name, student_name, grade, format, requested_date, requested_date_label, requested_time, email, phone, notes, status, created_at')
    .in('status', ['confirmed', 'completed'])
    .lte('requested_date', today)
    .order('requested_date', { ascending: false })
    // requested_time is a display string (e.g. "3:30 PM", no leading
    // zero) — not safely sortable as text once hours reach 10-12, so
    // created_at (a real timestamp) is the tiebreaker instead.
    .order('created_at', { ascending: false })
    .limit(BOOKING_HISTORY_MAX)

  if (error) {
    console.error('Booking history query error:', error)
    return res.status(500).json({ ok: false, error: 'Could not load booking history.' })
  }
  return res.status(200).json({ bookings: data || [] })
}

const CANCELLED_HISTORY_MAX = 300

// Cancelled and declined bookings, most recently changed first — this is
// what the dashboard's "delete history" tools operate on. Unlike
// getBookingHistory (confirmed/completed, restricted to past dates),
// these can be any date — a booking is cancelled/declined the moment the
// admin or customer acts, regardless of whether the session itself was
// upcoming or already happened.
async function getCancelledHistory(res, supabase) {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, parent_name, student_name, grade, format, requested_date, requested_date_label, requested_time, email, phone, notes, status, created_at')
    .in('status', ['cancelled', 'declined'])
    .order('created_at', { ascending: false })
    .limit(CANCELLED_HISTORY_MAX)

  if (error) {
    console.error('Cancelled history query error:', error)
    return res.status(500).json({ ok: false, error: 'Could not load cancelled bookings.' })
  }
  return res.status(200).json({ bookings: data || [] })
}

const BOOKING_REQUESTS_MAX = 300

// Every pending request awaiting a decision, any date, soonest first —
// so the admin dashboard's Booking Requests section always surfaces
// what needs a decision (accept / reschedule / decline) next. Confirmed
// bookings already have their own management (reschedule/cancel/
// complete) in the per-date Availability detail view, so this stays
// scoped to exactly the "needs a decision" set.
async function getBookingRequests(res, supabase) {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, slot_id, parent_name, student_name, grade, format, requested_date, requested_date_label, requested_time, email, phone, notes, status, created_at')
    .eq('status', 'pending')
    .order('requested_date', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(BOOKING_REQUESTS_MAX)

  if (error) {
    console.error('Booking requests query error:', error)
    return res.status(500).json({ ok: false, error: 'Could not load booking requests.' })
  }
  return res.status(200).json({ bookings: data || [] })
}

/* ---------------- POST: actions ---------------- */

async function addSlot(res, supabase, body) {
  if (!isValidDateISO(body.date)) return res.status(400).json({ ok: false, error: 'Invalid date.' })
  const duration = Number(body.durationMinutes)
  if (!Number.isFinite(duration) || duration <= 0 || duration > 240) {
    return res.status(400).json({ ok: false, error: 'Invalid duration.' })
  }
  if (!isValidTime(body.startTime)) return res.status(400).json({ ok: false, error: 'Invalid start time.' })

  const rows = [{ slot_date: body.date, start_time: `${body.startTime}:00`, duration_minutes: duration }]

  const { data, error } = await supabase
    .from('availability_slots')
    .upsert(rows, { onConflict: 'slot_date,start_time', ignoreDuplicates: true })
    .select()

  if (error) {
    console.error('Slot create error:', error)
    return res.status(500).json({ ok: false, error: 'Could not save that availability.' })
  }
  return res.status(200).json({ ok: true, created: data?.length || 0, requested: rows.length })
}

async function generateSlots(res, supabase, body) {
  if (!isValidDateISO(body.date)) return res.status(400).json({ ok: false, error: 'Invalid date.' })
  const duration = Number(body.durationMinutes)
  if (!Number.isFinite(duration) || duration <= 0 || duration > 240) {
    return res.status(400).json({ ok: false, error: 'Invalid duration.' })
  }
  if (!isValidTime(body.startTime) || !isValidTime(body.endTime)) {
    return res.status(400).json({ ok: false, error: 'Invalid start/end time.' })
  }
  const [sh, sm] = body.startTime.split(':').map(Number)
  const [eh, em] = body.endTime.split(':').map(Number)
  const startMin = sh * 60 + sm
  const endMin = eh * 60 + em
  if (endMin <= startMin) return res.status(400).json({ ok: false, error: 'End time must be after start time.' })

  const rows = []
  for (let t = startMin; t + duration <= endMin; t += duration) {
    const h = String(Math.floor(t / 60)).padStart(2, '0')
    const m = String(t % 60).padStart(2, '0')
    rows.push({ slot_date: body.date, start_time: `${h}:${m}:00`, duration_minutes: duration })
  }
  if (!rows.length) return res.status(400).json({ ok: false, error: 'That window produces no slots at that duration.' })

  const { data, error } = await supabase
    .from('availability_slots')
    .upsert(rows, { onConflict: 'slot_date,start_time', ignoreDuplicates: true })
    .select()

  if (error) {
    console.error('Slot create error:', error)
    return res.status(500).json({ ok: false, error: 'Could not save that availability.' })
  }
  return res.status(200).json({ ok: true, created: data?.length || 0, requested: rows.length })
}

// "Removing" a slot ARCHIVES it — the row is never deleted. A slot with
// a pending/confirmed booking cannot be archived at all (must be
// declined/cancelled first); a slot behind a completed/declined/
// cancelled booking can be archived — its history stays fully intact,
// just hidden from the public site and admin month counts.
async function archiveSlot(res, supabase, body) {
  if (typeof body.slotId !== 'string' || !body.slotId) {
    return res.status(400).json({ ok: false, error: 'slotId is required.' })
  }

  const { data: activeBooking } = await supabase
    .from('bookings')
    .select('id, status, parent_name, student_name')
    .eq('slot_id', body.slotId)
    .in('status', ['pending', 'confirmed'])
    .maybeSingle()

  if (activeBooking) {
    return res.status(409).json({
      ok: false,
      error: 'This slot has an active booking. Decline or cancel it first, then archive the slot.',
      booking: activeBooking,
    })
  }

  const { error } = await supabase
    .from('availability_slots')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', body.slotId)

  if (error) {
    console.error('Slot archive error:', error)
    return res.status(500).json({ ok: false, error: 'Could not archive that slot.' })
  }
  return res.status(200).json({ ok: true })
}

async function restoreSlot(res, supabase, body) {
  if (typeof body.slotId !== 'string' || !body.slotId) {
    return res.status(400).json({ ok: false, error: 'slotId is required.' })
  }
  // Restoring can collide with an active slot that already occupies the
  // same (date, start_time) — the unique constraint will reject that,
  // surfaced below as a normal error rather than a silent no-op.
  const { error } = await supabase
    .from('availability_slots')
    .update({ archived_at: null })
    .eq('id', body.slotId)
  if (error) {
    console.error('Slot restore error:', error)
    const msg = error.code === '23505'
      ? 'Another active slot already exists at that exact date and time.'
      : 'Could not restore that slot.'
    return res.status(400).json({ ok: false, error: msg })
  }
  return res.status(200).json({ ok: true })
}

async function setDay(res, supabase, body) {
  if (!isValidDateISO(body.date)) return res.status(400).json({ ok: false, error: 'Invalid date.' })
  const isClosed = Boolean(body.isClosed)
  const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 2000) : ''

  const { error } = await supabase
    .from('availability_days')
    .upsert({ day: body.date, is_closed: isClosed, notes, updated_at: new Date().toISOString() }, { onConflict: 'day' })

  if (error) {
    console.error('Day override save error:', error)
    return res.status(500).json({ ok: false, error: 'Could not save that date.' })
  }
  return res.status(200).json({ ok: true })
}

async function copySlots(res, supabase, body) {
  if (!isValidDateISO(body.sourceDate)) {
    return res.status(400).json({ ok: false, error: 'Invalid source date.' })
  }
  const targetDates = Array.isArray(body.targetDates) ? body.targetDates.filter(isValidDateISO) : []
  if (!targetDates.length) {
    return res.status(400).json({ ok: false, error: 'At least one valid target date is required.' })
  }
  if (targetDates.length > MAX_TARGET_DATES) {
    return res.status(400).json({ ok: false, error: `Please copy to ${MAX_TARGET_DATES} dates or fewer at a time.` })
  }

  const { data: sourceSlots, error: sourceErr } = await supabase
    .from('availability_slots')
    .select('start_time, duration_minutes')
    .eq('slot_date', body.sourceDate)

  if (sourceErr) {
    console.error('Copy source lookup error:', sourceErr)
    return res.status(500).json({ ok: false, error: 'Could not read the source date.' })
  }
  if (!sourceSlots?.length) {
    return res.status(400).json({ ok: false, error: 'The source date has no slots to copy.' })
  }

  const rows = targetDates.flatMap((date) =>
    sourceSlots.map((s) => ({ slot_date: date, start_time: s.start_time, duration_minutes: s.duration_minutes }))
  )

  const { data, error } = await supabase
    .from('availability_slots')
    .upsert(rows, { onConflict: 'slot_date,start_time', ignoreDuplicates: true })
    .select()

  if (error) {
    console.error('Copy insert error:', error)
    return res.status(500).json({ ok: false, error: 'Could not copy availability.' })
  }
  return res.status(200).json({ ok: true, created: data?.length || 0, requested: rows.length })
}

async function createRule(res, supabase, body) {
  const weekday = Number(body.weekday)
  const duration = Number(body.durationMinutes)
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
    return res.status(400).json({ ok: false, error: 'Invalid weekday.' })
  }
  if (!isValidTime(body.startTime) || !isValidTime(body.endTime)) {
    return res.status(400).json({ ok: false, error: 'Invalid start/end time.' })
  }
  if (body.startTime >= body.endTime) {
    return res.status(400).json({ ok: false, error: 'End time must be after start time.' })
  }
  if (!Number.isFinite(duration) || duration <= 0 || duration > 240) {
    return res.status(400).json({ ok: false, error: 'Invalid duration.' })
  }

  const { data, error } = await supabase
    .from('recurring_availability_rules')
    .insert({
      weekday, start_time: `${body.startTime}:00`, end_time: `${body.endTime}:00`,
      duration_minutes: duration, active: true,
    })
    .select()
    .single()

  if (error) {
    console.error('Recurring rule create error:', error)
    return res.status(500).json({ ok: false, error: 'Could not save that rule.' })
  }
  return res.status(200).json({ ok: true, rule: data })
}

async function deleteRule(res, supabase, body) {
  if (typeof body.ruleId !== 'string' || !body.ruleId) {
    return res.status(400).json({ ok: false, error: 'ruleId is required.' })
  }
  const { error } = await supabase.from('recurring_availability_rules').delete().eq('id', body.ruleId)
  if (error) return res.status(500).json({ ok: false, error: 'Could not remove that rule.' })
  return res.status(200).json({ ok: true })
}

async function generateFromRules(res, supabase, body) {
  const weeks = Number(body.weeks)
  if (!Number.isInteger(weeks) || weeks <= 0 || weeks > MAX_WEEKS) {
    return res.status(400).json({ ok: false, error: `weeks must be between 1 and ${MAX_WEEKS}.` })
  }

  let ruleQuery = supabase.from('recurring_availability_rules').select('*').eq('active', true)
  if (typeof body.ruleId === 'string' && body.ruleId) ruleQuery = ruleQuery.eq('id', body.ruleId)
  const { data: rules, error: rulesErr } = await ruleQuery

  if (rulesErr) return res.status(500).json({ ok: false, error: 'Could not load recurring rules.' })
  if (!rules?.length) return res.status(400).json({ ok: false, error: 'No active recurring rules to generate from.' })

  const todayISO = getPacificTodayISO()
  const [ty, tm, td] = todayISO.split('-').map(Number)
  const startDate = new Date(Date.UTC(ty, tm - 1, td))
  const totalDays = weeks * 7

  const candidateDates = []
  for (let i = 1; i <= totalDays; i++) {
    const d = new Date(startDate)
    d.setUTCDate(d.getUTCDate() + i)
    candidateDates.push({ iso: d.toISOString().slice(0, 10), weekday: d.getUTCDay() })
  }

  const datesInRange = candidateDates.map((c) => c.iso)
  const { data: closedDays } = await supabase
    .from('availability_days')
    .select('day')
    .in('day', datesInRange)
    .eq('is_closed', true)
  const closedSet = new Set((closedDays || []).map((d) => d.day))

  const rows = []
  for (const rule of rules) {
    const [sh, sm] = rule.start_time.split(':').map(Number)
    const [eh, em] = rule.end_time.split(':').map(Number)
    const startMin = sh * 60 + sm
    const endMin = eh * 60 + em

    for (const cand of candidateDates) {
      if (cand.weekday !== rule.weekday || closedSet.has(cand.iso)) continue
      for (let t = startMin; t + rule.duration_minutes <= endMin; t += rule.duration_minutes) {
        const h = String(Math.floor(t / 60)).padStart(2, '0')
        const m = String(t % 60).padStart(2, '0')
        rows.push({ slot_date: cand.iso, start_time: `${h}:${m}:00`, duration_minutes: rule.duration_minutes })
      }
    }
  }

  if (!rows.length) return res.status(200).json({ ok: true, created: 0, requested: 0 })

  const { data, error } = await supabase
    .from('availability_slots')
    .upsert(rows, { onConflict: 'slot_date,start_time', ignoreDuplicates: true })
    .select()

  if (error) {
    console.error('Generate insert error:', error)
    return res.status(500).json({ ok: false, error: 'Could not generate slots.' })
  }
  return res.status(200).json({ ok: true, created: data?.length || 0, requested: rows.length })
}

/* ---------------- dispatch ---------------- */

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return

  let supabase
  try {
    supabase = getSupabaseAdmin()
  } catch (err) {
    console.error('Supabase config error:', err)
    return res.status(500).json({ ok: false, error: 'The admin system is temporarily unavailable.' })
  }

  if (req.method === 'GET') {
    if (req.query.date) return getDateDetail(res, supabase, req.query.date)
    if (req.query.month) return getMonthSummary(res, supabase, req.query.month)
    if (req.query.rules) return getRules(res, supabase)
    if (req.query.history) return getBookingHistory(res, supabase)
    if (req.query.requests) return getBookingRequests(res, supabase)
    if (req.query.cancelled) return getCancelledHistory(res, supabase)
    return res.status(400).json({ ok: false, error: 'Specify month, date, rules, history, requests, or cancelled.' })
  }

  if (req.method === 'POST') {
    let body = req.body
    if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
    body = body && typeof body === 'object' ? body : {}

    if (!ALLOWED_ACTIONS.includes(body.action)) {
      return res.status(400).json({ ok: false, error: 'Unknown action.' })
    }

    switch (body.action) {
      case 'add-slot': return addSlot(res, supabase, body)
      case 'generate-slots': return generateSlots(res, supabase, body)
      case 'archive-slot': return archiveSlot(res, supabase, body)
      case 'restore-slot': return restoreSlot(res, supabase, body)
      case 'set-day': return setDay(res, supabase, body)
      case 'copy': return copySlots(res, supabase, body)
      case 'create-rule': return createRule(res, supabase, body)
      case 'delete-rule': return deleteRule(res, supabase, body)
      case 'generate-from-rules': return generateFromRules(res, supabase, body)
    }
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ ok: false, error: 'Method not allowed.' })
}
