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

  // Calls the v2 function — never the legacy 11-parameter
  // claim_slot_and_book. Params match public.claim_slot_and_book_v2(uuid,
  // text, text, text, text, text, text, text) exactly — no date/time
  // fields are sent, because the database derives the booking's
  // requested_date/date_label/time from the locked slot row itself.
  // There is nothing here for a caller to forge; see supabase/schema.sql
  // for the full rationale. (Phased rollout: once this deployment is
  // verified, the legacy function is removed via
  // supabase/cleanup-legacy-claim-function.sql — see that file.)
  const { data: booking, error: claimError } = await supabase
    .rpc('claim_slot_and_book_v2', {
      p_slot_id: clean.slot_id,
      p_parent_name: clean.parent_name,
      p_student_name: clean.student_name,
      p_grade: clean.grade,
      p_format: clean.format,
      p_email: clean.email,
      p_phone: clean.phone,
      p_notes: clean.notes,
    })
    .single()

  if (claimError) {
    // slot_unavailable (already booked) or a plain unique-constraint hit —
    // both mean "someone else just took this slot."
    if (claimError.message?.includes('slot_unavailable') || claimError.code === '23505') {
      return res.status(409).json({
        ok: false,
        error: 'That day and time was just taken by another family. Please pick a different time.',
        conflict: true,
      })
    }
    if (claimError.message?.includes('slot_not_found')) {
      return res.status(409).json({
        ok: false,
        error: 'That time slot no longer exists. Please pick a different time.',
        conflict: true,
      })
    }
    if (claimError.message?.includes('date_closed')) {
      return res.status(409).json({
        ok: false,
        error: 'That date was just closed. Please pick a different day.',
        conflict: true,
      })
    }
    if (claimError.message?.includes('slot_past_date')) {
      return res.status(409).json({
        ok: false,
        error: 'That date has already passed. Please pick an upcoming day.',
        conflict: true,
      })
    }
    // Defense-in-depth validation inside the DB function rejected
    // something (invalid_grade, invalid_format, invalid_email, etc).
    // This shouldn't happen in normal use since validateBooking() above
    // already checks all of these — surfacing it as a 400 rather than a
    // 500 in case it ever does.
    if (claimError.message?.startsWith('invalid_')) {
      return res.status(400).json({ ok: false, error: 'Some of the submitted details were invalid. Please review and try again.' })
    }
    console.error('Supabase claim_slot_and_book_v2 error:', claimError)
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
