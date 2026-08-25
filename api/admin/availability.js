import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js'
import { requireAdmin } from '../_lib/adminAuth.js'
import { isValidMonthISO, isValidDateISO } from '../_lib/timezone.js'

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

async function handleGet(req, res, supabase) {
  const { date, month } = req.query

  if (date) {
    if (!isValidDateISO(date)) return res.status(400).json({ ok: false, error: 'Invalid date.' })

    // The admin's single-date view intentionally includes archived slots
    // (unlike every other query in this file) — this is the one place
    // historical scheduling data stays reviewable, per design.
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

  const targetMonth = isValidMonthISO(month) ? month : null
  if (!targetMonth) return res.status(400).json({ ok: false, error: 'Invalid month.' })

  const { start, end } = monthRange(targetMonth)
  const [{ data: closedDays }, { data: slots, error: slotsErr }] = await Promise.all([
    supabase.from('availability_days').select('day, is_closed, notes').gte('day', start).lte('day', end),
    // Month-overview counts reflect the ACTIVE schedule only — archived
    // slots are excluded here (they're still visible when drilling into
    // a specific date's detail view above).
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

async function handlePost(req, res, supabase) {
  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
  body = body && typeof body === 'object' ? body : {}

  if (body.mode === 'restore') {
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

  if (!isValidDateISO(body.date)) return res.status(400).json({ ok: false, error: 'Invalid date.' })

  const duration = Number(body.durationMinutes)
  if (!Number.isFinite(duration) || duration <= 0 || duration > 240) {
    return res.status(400).json({ ok: false, error: 'Invalid duration.' })
  }

  let rows = []
  if (body.mode === 'generate') {
    if (!isValidTime(body.startTime) || !isValidTime(body.endTime)) {
      return res.status(400).json({ ok: false, error: 'Invalid start/end time.' })
    }
    const [sh, sm] = body.startTime.split(':').map(Number)
    const [eh, em] = body.endTime.split(':').map(Number)
    const startMin = sh * 60 + sm
    const endMin = eh * 60 + em
    if (endMin <= startMin) return res.status(400).json({ ok: false, error: 'End time must be after start time.' })

    for (let t = startMin; t + duration <= endMin; t += duration) {
      const h = String(Math.floor(t / 60)).padStart(2, '0')
      const m = String(t % 60).padStart(2, '0')
      rows.push({ slot_date: body.date, start_time: `${h}:${m}:00`, duration_minutes: duration })
    }
    if (!rows.length) return res.status(400).json({ ok: false, error: 'That window produces no slots at that duration.' })
  } else {
    if (!isValidTime(body.startTime)) return res.status(400).json({ ok: false, error: 'Invalid start time.' })
    rows = [{ slot_date: body.date, start_time: `${body.startTime}:00`, duration_minutes: duration }]
  }

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

// "Removing" a slot ARCHIVES it — the row is never deleted. This is the
// only path the admin UI's "Remove slot" button calls. A slot with a
// pending/confirmed booking cannot be archived at all (must be
// declined/cancelled first); a slot behind a completed/declined/
// cancelled booking can be archived — its history stays fully intact,
// just hidden from the public site and admin month counts.
async function handleArchive(req, res, supabase) {
  const slotId = req.query.slotId
  if (typeof slotId !== 'string' || !slotId) {
    return res.status(400).json({ ok: false, error: 'slotId is required.' })
  }

  const { data: activeBooking } = await supabase
    .from('bookings')
    .select('id, status, parent_name, student_name')
    .eq('slot_id', slotId)
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
    .eq('id', slotId)

  if (error) {
    console.error('Slot archive error:', error)
    return res.status(500).json({ ok: false, error: 'Could not archive that slot.' })
  }

  return res.status(200).json({ ok: true })
}

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return

  let supabase
  try {
    supabase = getSupabaseAdmin()
  } catch (err) {
    console.error('Supabase config error:', err)
    return res.status(500).json({ ok: false, error: 'The admin system is temporarily unavailable.' })
  }

  if (req.method === 'GET') return handleGet(req, res, supabase)
  if (req.method === 'POST') return handlePost(req, res, supabase)
  if (req.method === 'DELETE') return handleArchive(req, res, supabase)

  res.setHeader('Allow', 'GET, POST, DELETE')
  return res.status(405).json({ ok: false, error: 'Method not allowed.' })
}
