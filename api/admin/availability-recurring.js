import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js'
import { requireAdmin } from '../_lib/adminAuth.js'

function isValidTime(v) {
  return typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v)
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

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('recurring_availability_rules')
      .select('*')
      .order('weekday')
      .order('start_time')
    if (error) return res.status(500).json({ ok: false, error: 'Could not load recurring rules.' })
    return res.status(200).json({ rules: data || [] })
  }

  if (req.method === 'POST') {
    let body = req.body
    if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
    body = body && typeof body === 'object' ? body : {}

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

  if (req.method === 'DELETE') {
    const id = req.query.id
    if (typeof id !== 'string' || !id) return res.status(400).json({ ok: false, error: 'id is required.' })

    const { error } = await supabase.from('recurring_availability_rules').delete().eq('id', id)
    if (error) return res.status(500).json({ ok: false, error: 'Could not remove that rule.' })
    return res.status(200).json({ ok: true })
  }

  res.setHeader('Allow', 'GET, POST, DELETE')
  return res.status(405).json({ ok: false, error: 'Method not allowed.' })
}
