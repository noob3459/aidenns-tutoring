const GRADES = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9']
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

function isISODate(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))
}

export function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]))
}

// Validates + sanitizes the raw request body into a clean object matching
// the `bookings` table columns. Returns { errors: string[], clean: object }.
export function validateBooking(body) {
  const errors = []
  const clean = {}

  if (!GRADES.includes(body.grade)) errors.push('Please select a valid grade.')
  else clean.grade = body.grade

  if (!FORMATS.includes(body.format)) errors.push('Please select a valid session format.')
  else clean.format = body.format

  if (!isISODate(body.requestedDate)) errors.push('Please select a valid date.')
  else clean.requested_date = body.requestedDate

  if (!isNonEmptyString(body.requestedDateLabel, 60)) errors.push('Missing date label.')
  else clean.requested_date_label = body.requestedDateLabel.trim().slice(0, 60)

  if (!isNonEmptyString(body.requestedTime, 30)) errors.push('Please select a valid time.')
  else clean.requested_time = body.requestedTime.trim().slice(0, 30)

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
