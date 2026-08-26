// Full ordered grade range the admin can choose a min/max from — kept in
// one place so BookingWizard's grade selector and the admin's "Grades
// Served" control can never disagree on ordering.
export const ALL_GRADES = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']

export function gradeRange(minGrade, maxGrade) {
  const start = ALL_GRADES.indexOf(minGrade)
  const end = ALL_GRADES.indexOf(maxGrade)
  if (start === -1 || end === -1 || end < start) return ALL_GRADES.slice(0, 10) // K-9 fallback
  return ALL_GRADES.slice(start, end + 1)
}

function ordinalSuffix(n) {
  if (n % 100 >= 11 && n % 100 <= 13) return 'th'
  switch (n % 10) {
    case 1: return 'st'
    case 2: return 'nd'
    case 3: return 'rd'
    default: return 'th'
  }
}

function gradeWord(g) {
  return g === 'K' ? 'kindergarten' : `${g}${ordinalSuffix(Number(g))} grade`
}

// Short form for inline use, e.g. "K-9", "1-9", or "Grade 5" when the
// range is a single grade.
export function gradeRangeLabel(minGrade, maxGrade) {
  if (!minGrade || !maxGrade) return 'K-9'
  if (minGrade === maxGrade) return minGrade === 'K' ? 'Kindergarten' : `Grade ${minGrade}`
  return `${minGrade}-${maxGrade}`
}

// Long/spelled-out form, e.g. "kindergarten through 9th grade", or just
// "5th grade" when the range is a single grade.
export function gradeRangeLongLabel(minGrade, maxGrade) {
  if (!minGrade || !maxGrade) return 'kindergarten through 9th grade'
  if (minGrade === maxGrade) return gradeWord(minGrade)
  return `${gradeWord(minGrade)} through ${gradeWord(maxGrade)}`
}

// Fills the `{grades}`/`{gradesLong}` tokens a site-content string may
// contain with the current grade range — used so marketing copy can
// reference "K-9" (or whatever range is configured) without hardcoding
// it, while the underlying text stays a plain, freely admin-editable
// string. A string with no token is returned unchanged, so this is safe
// to call on every piece of text unconditionally.
export function fillGradeTemplate(text, minGrade, maxGrade) {
  if (typeof text !== 'string' || !text.includes('{grades')) return text
  return text
    .split('{gradesLong}').join(gradeRangeLongLabel(minGrade, maxGrade))
    .split('{grades}').join(gradeRangeLabel(minGrade, maxGrade))
}
