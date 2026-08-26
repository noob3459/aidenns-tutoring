// Mirrors src/lib/grades.js's ALL_GRADES and api/_lib/validateSettings.js's
// GRADE_VALUES — the admin's Grades Served range can extend up to 12, so
// this must accept the same full range or bookings for grades 10-12 are
// rejected here even though the wizard legitimately offered them.
const GRADES = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
const FORMATS = ['Online', 'In-Person']

function isNonEmptyString(v, max = 200) {
  return typeof v === 'string' && v.trim().length > 0 && v.trim().length <= max
}

function isEmail(v) {
  return typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
}

function isPhone(v) {
  return typeof v === 'string' && v.replace(/\D/g, '').length >= 7
}

function isUUID(v) {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

export function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]))
}

// Validates + sanitizes the raw request body into a clean object matching
// the parameters of the `claim_slot_and_book` database function.
//
// Deliberately absent: requestedDate / requestedDateLabel / requestedTime.
// The database derives all three from the locked slot row itself
// (see claim_slot_and_book in supabase/schema.sql) — the client is never
// trusted to supply them, so there's nothing to validate here. This
// function only validates what the database function actually accepts.
// Returns { errors: string[], clean: object }.
export function validateBooking(body) {
  const errors = []
  const clean = {}

  if (!isUUID(body.slotId)) errors.push('Please select a valid time slot.')
  else clean.slot_id = body.slotId

  if (!GRADES.includes(body.grade)) errors.push('Please select a valid grade.')
  else clean.grade = body.grade

  if (!FORMATS.includes(body.format)) errors.push('Please select a valid session format.')
  else clean.format = body.format

  if (!isNonEmptyString(body.parentName, 120)) errors.push('Parent/guardian name is required.')
  else clean.parent_name = body.parentName.trim().slice(0, 120)

  if (!isNonEmptyString(body.studentName, 120)) errors.push("Student's name is required.")
  else clean.student_name = body.studentName.trim().slice(0, 120)

  if (!isEmail(body.email)) errors.push('A valid email address is required.')
  else clean.email = body.email.trim().toLowerCase().slice(0, 200)

  if (!isPhone(body.phone)) errors.push('A valid phone number is required.')
  else clean.phone = String(body.phone).trim().slice(0, 30)

  clean.notes = isNonEmptyString(body.notes, 1000) ? body.notes.trim().slice(0, 1000) : ''

  return { errors, clean }
}
