import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js'
import { requireAdmin } from '../_lib/adminAuth.js'

const ALLOWED_STATUSES = ['pending', 'confirmed', 'declined', 'completed', 'cancelled']

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed.' })
  }

  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
  body = body && typeof body === 'object' ? body : {}

  if (typeof body.bookingId !== 'string' || !body.bookingId) {
    return res.status(400).json({ ok: false, error: 'bookingId is required.' })
  }
  if (!ALLOWED_STATUSES.includes(body.status)) {
    return res.status(400).json({ ok: false, error: 'Invalid status.' })
  }

  let supabase
  try {
    supabase = getSupabaseAdmin()
  } catch (err) {
    console.error('Supabase config error:', err)
    return res.status(500).json({ ok: false, error: 'The admin system is temporarily unavailable.' })
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
