import crypto from 'node:crypto'
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js'
import { requireAdmin } from '../_lib/adminAuth.js'
import { validateSettings } from '../_lib/validateSettings.js'
import { applyBookingStatus, applyReschedule } from '../_lib/bookingActions.js'

// Consolidates admin site-settings (read/update), booking status
// transitions, rescheduling, and Visual Editor image uploads into one
// deployed function, to stay well under Vercel's Hobby serverless
// function limit.
//
// GET             -> current site_settings
// POST { action: 'update-settings', ...patch }  -> validated, merged, saved
// POST { action: 'booking-status', bookingId, status } -> POST
//   { action: 'reschedule-booking', bookingId, newSlotId } -> both delegate
//   to ../_lib/bookingActions.js, which calls the update_booking_status /
//   reschedule_booking DB functions and sends the matching email
//   (confirmation only ever carries the Zoom link, gated the same way as
//   before). That module is shared with api/booking-action.js — the public,
//   token-authenticated route the "Confirm/Decline/Reschedule" and
//   "Cancel/Reschedule" email links point at — so both entry points run the
//   exact same transition + email logic.
// POST { action: 'upload-image', contentType, dataBase64 } -> uploads to
//   the site-images Storage bucket (service_role only — see
//   supabase/schema.sql), returns the public URL
// POST { action: 'delete-booking', bookingId } / { action: 'delete-cancelled-bookings' }
//   -> permanently deletes cancelled/declined booking row(s). Scoped to
//   those two terminal statuses server-side (via the .in() filter on the
//   delete itself, not a separate read-then-check) so a stale/forged
//   bookingId can never delete an active pending/confirmed/completed
//   booking. This is the one place in the app that physically deletes a
//   booking — availability_slots rows are never deleted (see
//   supabase/schema.sql), but bookings themselves have no archive concept,
//   and the admin dashboard's cancelled-history view is explicitly meant
//   to be cleared out over time.

const ALLOWED_ACTIONS = [
  'update-settings', 'booking-status', 'reschedule-booking', 'upload-image',
  'delete-booking', 'delete-cancelled-bookings',
]
const DELETABLE_STATUSES = ['cancelled', 'declined']
const ALLOWED_STATUSES = ['pending', 'confirmed', 'declined', 'completed', 'cancelled']

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

  const { booking, error } = await applyBookingStatus(supabase, body.bookingId, body.status)
  if (error) return res.status(error.status).json({ ok: false, error: error.message })

  return res.status(200).json({ ok: true, booking })
}

async function rescheduleBooking(res, supabase, body) {
  if (typeof body.bookingId !== 'string' || !body.bookingId) {
    return res.status(400).json({ ok: false, error: 'bookingId is required.' })
  }
  if (typeof body.newSlotId !== 'string' || !body.newSlotId) {
    return res.status(400).json({ ok: false, error: 'newSlotId is required.' })
  }

  const { booking, error } = await applyReschedule(supabase, body.bookingId, body.newSlotId)
  if (error) return res.status(error.status).json({ ok: false, error: error.message })

  return res.status(200).json({ ok: true, booking })
}

async function deleteBooking(res, supabase, body) {
  if (typeof body.bookingId !== 'string' || !body.bookingId) {
    return res.status(400).json({ ok: false, error: 'bookingId is required.' })
  }

  const { data, error } = await supabase
    .from('bookings')
    .delete()
    .eq('id', body.bookingId)
    .in('status', DELETABLE_STATUSES)
    .select('id')

  if (error) {
    console.error('Booking delete error:', error)
    return res.status(500).json({ ok: false, error: 'Could not delete that booking.' })
  }
  if (!data?.length) {
    return res.status(404).json({ ok: false, error: 'Booking not found, or it isn’t cancelled/declined.' })
  }
  return res.status(200).json({ ok: true })
}

async function deleteCancelledBookings(res, supabase) {
  const { data, error } = await supabase
    .from('bookings')
    .delete()
    .in('status', DELETABLE_STATUSES)
    .select('id')

  if (error) {
    console.error('Bulk booking delete error:', error)
    return res.status(500).json({ ok: false, error: 'Could not delete cancelled bookings.' })
  }
  return res.status(200).json({ ok: true, deleted: data?.length || 0 })
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
    if (body.action === 'delete-booking') return deleteBooking(res, supabase, body)
    if (body.action === 'delete-cancelled-bookings') return deleteCancelledBookings(res, supabase)
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ ok: false, error: 'Method not allowed.' })
}
