import { getSupabaseAdmin } from './_lib/supabaseAdmin.js'
import { verifyBookingToken } from './_lib/bookingTokens.js'
import { applyBookingStatus, applyReschedule } from './_lib/bookingActions.js'
import { noStore } from './_lib/adminAuth.js'

// Public, token-gated booking management — the landing page a "Confirm /
// Decline / Reschedule" (owner) or "Cancel / Reschedule" (customer) email
// link points at. No login: the signed, role-scoped token IS the
// credential (see api/_lib/bookingTokens.js). No Origin/CSRF check either —
// unlike the admin session cookie, this isn't an ambient credential a
// third-party page could ride along with; forging a request still requires
// the actual signed token.
//
// GET  ?token=...                                   -> read-only booking summary
// POST { token, action, newSlotId? }                -> perform the action
//   action: 'confirm' | 'decline' | 'cancel' | 'reschedule'
//   admin-role tokens may confirm/decline/reschedule; client-role tokens may
//   cancel/reschedule — enforced here regardless of what the page shows.

const ROLE_ACTIONS = {
  admin: { confirm: 'confirmed', decline: 'declined' },
  client: { cancel: 'cancelled' },
}

export default async function handler(req, res) {
  noStore(res)

  let supabase
  try {
    supabase = getSupabaseAdmin()
  } catch (err) {
    console.error('Supabase config error:', err)
    return res.status(500).json({ ok: false, error: 'This is temporarily unavailable.' })
  }

  if (req.method === 'GET') {
    const claim = verifyBookingToken(req.query?.token)
    if (!claim) return res.status(400).json({ ok: false, error: 'This link has expired or is invalid.' })

    const { data, error } = await supabase
      .from('bookings')
      .select('id, parent_name, student_name, grade, format, requested_date_label, requested_time, status')
      .eq('id', claim.bookingId)
      .maybeSingle()

    if (error) {
      console.error('Booking lookup error:', error)
      return res.status(500).json({ ok: false, error: 'Could not load that booking.' })
    }
    if (!data) return res.status(404).json({ ok: false, error: 'Booking not found.' })

    return res.status(200).json({ ok: true, role: claim.role, booking: data })
  }

  if (req.method === 'POST') {
    let body = req.body
    if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
    body = body && typeof body === 'object' ? body : {}

    const claim = verifyBookingToken(body.token)
    if (!claim) return res.status(400).json({ ok: false, error: 'This link has expired or is invalid.' })

    if (body.action === 'reschedule') {
      if (typeof body.newSlotId !== 'string' || !body.newSlotId) {
        return res.status(400).json({ ok: false, error: 'A new time slot is required.' })
      }
      const { booking, error } = await applyReschedule(supabase, claim.bookingId, body.newSlotId)
      if (error) return res.status(error.status).json({ ok: false, error: error.message })
      return res.status(200).json({ ok: true, booking })
    }

    const newStatus = ROLE_ACTIONS[claim.role]?.[body.action]
    if (!newStatus) return res.status(403).json({ ok: false, error: 'That action isn’t available on this link.' })

    const { booking, error } = await applyBookingStatus(supabase, claim.bookingId, newStatus)
    if (error) return res.status(error.status).json({ ok: false, error: error.message })
    return res.status(200).json({ ok: true, booking })
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ ok: false, error: 'Method not allowed.' })
}
