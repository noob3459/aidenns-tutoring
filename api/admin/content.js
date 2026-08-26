import crypto from 'node:crypto'
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js'
import { requireAdmin } from '../_lib/adminAuth.js'
import { validateSettings } from '../_lib/validateSettings.js'
import { sendConfirmationEmail, sendRescheduleEmail } from '../_lib/mailer.js'

// Consolidates admin site-settings (read/update), booking status
// transitions, rescheduling, and Visual Editor image uploads into one
// deployed function, to stay well under Vercel's Hobby serverless
// function limit.
//
// GET             -> current site_settings
// POST { action: 'update-settings', ...patch }  -> validated, merged, saved
// POST { action: 'booking-status', bookingId, status } -> calls the
//   update_booking_status DB function (same transactional state-machine
//   enforcement as before — unchanged); confirming a booking also emails
//   the parent the confirmation (with the Zoom link, if online) — the
//   only point in the whole flow where the family receives that link
// POST { action: 'reschedule-booking', bookingId, newSlotId } -> calls
//   the reschedule_booking DB function, then emails the parent the new
//   time (still gated the same way: only includes the Zoom link if the
//   booking is confirmed)
// POST { action: 'upload-image', contentType, dataBase64 } -> uploads to
//   the site-images Storage bucket (service_role only — see
//   supabase/schema.sql), returns the public URL

const ALLOWED_ACTIONS = ['update-settings', 'booking-status', 'reschedule-booking', 'upload-image']
const ALLOWED_STATUSES = ['pending', 'confirmed', 'declined', 'completed', 'cancelled']

// Best-effort site_settings read for the admin's Zoom Personal Meeting
// Room link. Never throws — a settings-read hiccup just means the email
// goes out without a Zoom link, same as if the admin never set one.
async function getZoomLink(supabase) {
  try {
    const { data } = await supabase.from('site_settings').select('data').eq('id', 1).maybeSingle()
    return data?.data?.contact?.zoomLink || ''
  } catch (err) {
    console.error('Zoom link lookup failed:', err)
    return ''
  }
}

const IMAGE_BUCKET = 'site-images'
const ALLOWED_IMAGE_TYPES = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
}
const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5MB, checked post-decode

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
    if (error.message?.includes('invalid_transition')) {
      return res.status(409).json({ ok: false, error: 'That booking can no longer move to that status.' })
    }
    console.error('Booking status update error:', error)
    return res.status(500).json({ ok: false, error: 'Could not update that booking.' })
  }

  // The confirmation email is the ONE point in the whole flow where the
  // family receives the Zoom link — never at request time. A send
  // failure here never fails the request: the status change already
  // succeeded and is the source of truth.
  if (body.status === 'confirmed') {
    const zoomLink = await getZoomLink(supabase)
    try {
      await sendConfirmationEmail(data, zoomLink)
    } catch (err) {
      console.error('Confirmation email failed:', err)
    }
  }

  return res.status(200).json({ ok: true, booking: data })
}

async function rescheduleBooking(res, supabase, body) {
  if (typeof body.bookingId !== 'string' || !body.bookingId) {
    return res.status(400).json({ ok: false, error: 'bookingId is required.' })
  }
  if (typeof body.newSlotId !== 'string' || !body.newSlotId) {
    return res.status(400).json({ ok: false, error: 'newSlotId is required.' })
  }

  const { data, error } = await supabase
    .rpc('reschedule_booking', { p_booking_id: body.bookingId, p_new_slot_id: body.newSlotId })
    .single()

  if (error) {
    if (error.message?.includes('booking_not_found')) {
      return res.status(404).json({ ok: false, error: 'Booking not found.' })
    }
    if (error.message?.includes('not_reschedulable')) {
      return res.status(409).json({ ok: false, error: 'That booking can no longer be rescheduled.' })
    }
    if (error.message?.includes('slot_not_found')) {
      return res.status(409).json({ ok: false, error: 'That time slot no longer exists.' })
    }
    if (error.message?.includes('same_slot')) {
      return res.status(400).json({ ok: false, error: 'That is already this booking’s current time.' })
    }
    if (error.message?.includes('slot_unavailable')) {
      return res.status(409).json({ ok: false, error: 'That time is already taken. Please pick another.' })
    }
    if (error.message?.includes('slot_past_date')) {
      return res.status(409).json({ ok: false, error: 'That date has already passed.' })
    }
    if (error.message?.includes('slot_past_time')) {
      return res.status(409).json({ ok: false, error: 'That time has already passed today.' })
    }
    console.error('Reschedule error:', error)
    return res.status(500).json({ ok: false, error: 'Could not reschedule that booking.' })
  }

  const zoomLink = await getZoomLink(supabase)
  try {
    await sendRescheduleEmail(data, zoomLink)
  } catch (err) {
    console.error('Reschedule email failed:', err)
  }

  return res.status(200).json({ ok: true, booking: data })
}

// The client's own filename is never used for the storage key — a fresh
// random name is always generated server-side, so there's no path-
// traversal/overwrite risk from a malicious or accidental filename.
async function uploadImage(res, supabase, body) {
  const ext = ALLOWED_IMAGE_TYPES[body.contentType]
  if (!ext) {
    return res.status(400).json({ ok: false, error: 'Unsupported image type. Use PNG, JPEG, WEBP, or GIF.' })
  }
  if (typeof body.dataBase64 !== 'string' || !body.dataBase64) {
    return res.status(400).json({ ok: false, error: 'Image data is required.' })
  }

  // Tolerate a full data: URL (data:image/png;base64,....) as well as a
  // bare base64 payload — FileReader.readAsDataURL produces the former.
  const raw = body.dataBase64.includes(',') ? body.dataBase64.split(',').pop() : body.dataBase64

  let buffer
  try {
    buffer = Buffer.from(raw, 'base64')
  } catch {
    return res.status(400).json({ ok: false, error: 'Invalid image data.' })
  }

  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) {
    return res.status(400).json({ ok: false, error: `Image must be under ${MAX_IMAGE_BYTES / (1024 * 1024)}MB.` })
  }

  const path = `${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, buffer, {
    contentType: body.contentType,
    upsert: false,
  })

  if (error) {
    console.error('Image upload error:', error)
    return res.status(500).json({ ok: false, error: 'Could not upload that image.' })
  }

  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path)
  return res.status(200).json({ ok: true, url: data.publicUrl })
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
    if (body.action === 'reschedule-booking') return rescheduleBooking(res, supabase, body)
    if (body.action === 'upload-image') return uploadImage(res, supabase, body)
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ ok: false, error: 'Method not allowed.' })
}
