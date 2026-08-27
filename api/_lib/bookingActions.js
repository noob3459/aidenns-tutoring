import { sendConfirmationEmail, sendDeclineEmail, sendCancelEmail, sendRescheduleEmail } from './mailer.js'

// Shared status-transition / reschedule logic used by BOTH the admin-session
// route (api/admin/content.js) and the public token-authenticated route
// (api/booking-action.js), so the RPC calls, error mapping, and post-success
// emails only exist in one place regardless of who triggered the change.

// Best-effort site_settings read for the admin's Zoom Personal Meeting Room
// link. Never throws — a settings-read hiccup just means the email goes out
// without a Zoom link, same as if the admin never set one.
export async function getZoomLink(supabase) {
  try {
    const { data } = await supabase.from('site_settings').select('data').eq('id', 1).maybeSingle()
    return data?.data?.contact?.zoomLink || ''
  } catch (err) {
    console.error('Zoom link lookup failed:', err)
    return ''
  }
}

// Applies a booking status transition via the update_booking_status RPC
// (the same atomic, transaction-locked state machine described in
// supabase/schema.sql), then sends whichever customer-facing email matches
// the new status. A send failure never undoes or fails the transition — the
// status change already succeeded and is the source of truth.
export async function applyBookingStatus(supabase, bookingId, newStatus) {
  const { data, error } = await supabase
    .rpc('update_booking_status', { p_booking_id: bookingId, p_new_status: newStatus })
    .single()

  if (error) {
    if (error.message?.includes('booking_not_found')) {
      return { error: { status: 404, message: 'Booking not found.' } }
    }
    if (error.message?.includes('invalid_transition')) {
      return { error: { status: 409, message: 'That booking can no longer move to that status.' } }
    }
    console.error('Booking status update error:', error)
    return { error: { status: 500, message: 'Could not update that booking.' } }
  }

  if (newStatus === 'confirmed') {
    const zoomLink = await getZoomLink(supabase)
    try {
      await sendConfirmationEmail(data, zoomLink)
    } catch (err) {
      console.error('Confirmation email failed:', err)
    }
  } else if (newStatus === 'declined') {
    try {
      await sendDeclineEmail(data)
    } catch (err) {
      console.error('Decline email failed:', err)
    }
  } else if (newStatus === 'cancelled') {
    try {
      await sendCancelEmail(data)
    } catch (err) {
      console.error('Cancel email failed:', err)
    }
  }

  return { booking: data }
}

// Moves a booking to a different open slot via the reschedule_booking RPC,
// then emails the parent the new time.
export async function applyReschedule(supabase, bookingId, newSlotId) {
  const { data, error } = await supabase
    .rpc('reschedule_booking', { p_booking_id: bookingId, p_new_slot_id: newSlotId })
    .single()

  if (error) {
    if (error.message?.includes('booking_not_found')) {
      return { error: { status: 404, message: 'Booking not found.' } }
    }
    if (error.message?.includes('not_reschedulable')) {
      return { error: { status: 409, message: 'That booking can no longer be rescheduled.' } }
    }
    if (error.message?.includes('slot_not_found')) {
      return { error: { status: 409, message: 'That time slot no longer exists.' } }
    }
    if (error.message?.includes('same_slot')) {
      return { error: { status: 400, message: 'That is already this booking’s current time.' } }
    }
    if (error.message?.includes('slot_unavailable')) {
      return { error: { status: 409, message: 'That time is already taken. Please pick another.' } }
    }
    if (error.message?.includes('slot_past_date')) {
      return { error: { status: 409, message: 'That date has already passed.' } }
    }
    if (error.message?.includes('slot_past_time')) {
      return { error: { status: 409, message: 'That time has already passed today.' } }
    }
    console.error('Reschedule error:', error)
    return { error: { status: 500, message: 'Could not reschedule that booking.' } }
  }

  const zoomLink = await getZoomLink(supabase)
  try {
    await sendRescheduleEmail(data, zoomLink)
  } catch (err) {
    console.error('Reschedule email failed:', err)
  }

  return { booking: data }
}
