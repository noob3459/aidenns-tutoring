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
