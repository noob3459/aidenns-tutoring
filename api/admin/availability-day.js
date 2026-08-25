import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js'
import { requireAdmin } from '../_lib/adminAuth.js'
import { isValidDateISO } from '../_lib/timezone.js'

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed.' })
  }

  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
  body = body && typeof body === 'object' ? body : {}

  if (!isValidDateISO(body.date)) return res.status(400).json({ ok: false, error: 'Invalid date.' })

  const isClosed = Boolean(body.isClosed)
  const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 2000) : ''

  let supabase
  try {
    supabase = getSupabaseAdmin()
  } catch (err) {
    console.error('Supabase config error:', err)
    return res.status(500).json({ ok: false, error: 'The admin system is temporarily unavailable.' })
  }

  const { error } = await supabase
    .from('availability_days')
    .upsert({ day: body.date, is_closed: isClosed, notes, updated_at: new Date().toISOString() }, { onConflict: 'day' })

  if (error) {
    console.error('Day override save error:', error)
    return res.status(500).json({ ok: false, error: 'Could not save that date.' })
  }

  return res.status(200).json({ ok: true })
}
