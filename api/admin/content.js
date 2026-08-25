import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js'
import { requireAdmin } from '../_lib/adminAuth.js'
import { validateSettings } from '../_lib/validateSettings.js'

// Consolidates admin site-settings (read/update) and booking status
// transitions into one deployed function, to stay well under Vercel's
// Hobby serverless function limit.
//
// GET             -> current site_settings
// POST { action: 'update-settings', ...patch }  -> validated, merged, saved
// POST { action: 'booking-status', bookingId, status } -> calls the
//   update_booking_status DB function (same transactional state-machine
//   enforcement as before — unchanged)

const ALLOWED_ACTIONS = ['update-settings', 'booking-status']
const ALLOWED_STATUSES = ['pending', 'confirmed', 'declined', 'completed', 'cancelled']

function deepMerge(base, patch) {
  if (typeof patch !== 'object' || patch === null || Array.isArray(patch)) {
    return patch === undefined ? base : patch
  }
  const out = { ...base }
  for (const key of Object.keys(patch)) {
    if (patch[key] !== null) out[key] = deepMerge(base?.[key], patch[key])
  }
  return out
}

async function updateSettings(req, res, supabase, body) {
  // eslint-disable-next-line no-unused-vars
  const { action, ...patch } = body
  const rawLength = typeof req.headers['content-length'] === 'string' ? Number(req.headers['content-length']) : undefined

  const { errors, clean } = validateSettings(patch, rawLength)
  if (errors.length) {
    return res.status(400).json({ ok: false, error: errors[0], errors })
  }

  const { data: existing, error: fetchErr } = await supabase.from('site_settings').select('data').eq('id', 1).maybeSingle()
  if (fetchErr) return res.status(500).json({ ok: false, error: 'Could not load current settings.' })

  const merged = deepMerge(existing?.data || {}, clean)

  const { error: saveErr } = await supabase
    .from('site_settings')
    .upsert({ id: 1, data: merged, updated_at: new Date().toISOString() }, { onConflict: 'id' })

  if (saveErr) {
    console.error('Settings save error:', saveErr)
    return res.status(500).json({ ok: false, error: 'Could not save settings.' })
  }

  return res.status(200).json({ ok: true, data: merged })
}

async function bookingStatus(res, supabase, body) {
  if (typeof body.bookingId !== 'string' || !body.bookingId) {
    return res.status(400).json({ ok: false, error: 'bookingId is required.' })
  }
  if (!ALLOWED_STATUSES.includes(body.status)) {
    return res.status(400).json({ ok: false, error: 'Invalid status.' })
  }

  const { data, error } = await supabase
    .rpc('update_booking_status', { p_booking_id: body.bookingId, p_new_status: body.status })
    .single()

  if (error) {
    if (error.message?.includes('booking_not_found')) {
      return res.status(404).json({ ok: false, error: 'Booking not found.' })
    }
    console.error('Booking status update error:', error)
    return res.status(500).json({ ok: false, error: 'Could not update that booking.' })
  }

  return res.status(200).json({ ok: true, booking: data })
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
    const { data, error } = await supabase.from('site_settings').select('data').eq('id', 1).maybeSingle()
    if (error) return res.status(500).json({ ok: false, error: 'Could not load settings.' })
    return res.status(200).json({ ok: true, data: data?.data || null })
  }

  if (req.method === 'POST') {
    let body = req.body
    if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
    body = body && typeof body === 'object' ? body : {}

    if (!ALLOWED_ACTIONS.includes(body.action)) {
      return res.status(400).json({ ok: false, error: 'Unknown action.' })
    }

    if (body.action === 'update-settings') return updateSettings(req, res, supabase, body)
    if (body.action === 'booking-status') return bookingStatus(res, supabase, body)
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ ok: false, error: 'Method not allowed.' })
}
