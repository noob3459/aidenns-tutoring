import { getSupabaseAdmin } from './_lib/supabaseAdmin.js'
import { sendOwnerNotification, sendParentReceipt } from './_lib/mailer.js'
import { validateBooking } from './_lib/validate.js'

const RATE_LIMIT_WINDOW_MIN = 10
const RATE_LIMIT_MAX = 3

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed.' })
  }

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = {} }
  }
  body = body && typeof body === 'object' ? body : {}

  // Honeypot: real users never see or fill this field. Bots that blindly
  // fill every input will trip it. Respond 200 with no side effects so the
  // bot doesn't learn anything from the response.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return res.status(200).json({ ok: true })
  }

  const { errors, clean } = validateBooking(body)
  if (errors.length) {
    return res.status(400).json({ ok: false, error: errors[0], errors })
  }

  let supabase
  try {
    supabase = getSupabaseAdmin()
  } catch (err) {
    console.error('Supabase config error:', err)
    return res.status(500).json({ ok: false, error: 'The booking system is temporarily unavailable. Please call or email us directly.' })
  }

  try {
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MIN * 60 * 1000).toISOString()
    const { count, error: countError } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('email', clean.email)
      .gte('created_at', windowStart)

    if (!countError && typeof count === 'number' && count >= RATE_LIMIT_MAX) {
      return res.status(429).json({
        ok: false,
        error: 'Too many requests from this email recently. Please try again later, or call/text us directly.',
      })
    }
  } catch (err) {
    // Rate-limit check failing shouldn't block a legitimate booking — log and continue.
    console.error('Rate-limit check failed:', err)
  }

  const { data: booking, error: insertError } = await supabase
    .from('bookings')
    .insert({ ...clean, status: 'pending' })
    .select()
    .single()

  if (insertError) {
    if (insertError.code === '23505') {
      return res.status(409).json({
        ok: false,
        error: 'That day and time was just taken by another family. Please pick a different time.',
        conflict: true,
      })
    }
    console.error('Supabase insert error:', insertError)
    return res.status(500).json({ ok: false, error: 'Something went wrong saving your request. Please try again.' })
  }

  try {
    await Promise.all([sendOwnerNotification(booking), sendParentReceipt(booking)])
  } catch (mailErr) {
    // The request is already saved in Supabase — don't fail the whole
    // request just because an email hiccupped. Log it so it can be
    // investigated, but still tell the parent it was received.
    console.error('Email send failed:', mailErr)
  }

  return res.status(200).json({ ok: true, bookingId: booking.id })
}
