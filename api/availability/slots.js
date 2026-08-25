import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js'
import { noStore } from '../_lib/adminAuth.js'
import { getPacificTodayISO, isValidDateISO } from '../_lib/timezone.js'

function formatTimeLabel(time24) {
  // time24 like "15:30:00" -> "3:30 PM"
  const [hStr, mStr] = time24.split(':')
  let h = Number(hStr)
  const suffix = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${mStr} ${suffix}`
}

export default async function handler(req, res) {
  noStore(res)

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'Method not allowed.' })
  }

  const date = req.query.date
  if (!isValidDateISO(date)) {
    return res.status(400).json({ ok: false, error: 'A valid date is required.' })
  }

  const today = getPacificTodayISO()
  if (date < today) {
    return res.status(200).json({ slots: [] })
  }

  let supabase
  try {
    supabase = getSupabaseAdmin()
  } catch (err) {
    console.error('Supabase config error:', err)
    return res.status(200).json({ slots: [] })
  }

  const { data: dayOverride } = await supabase
    .from('availability_days')
    .select('is_closed')
    .eq('day', date)
    .maybeSingle()

  if (dayOverride?.is_closed) {
    return res.status(200).json({ slots: [] })
  }

  const { data: slots, error } = await supabase
    .from('availability_slots')
    .select('id, start_time')
    .eq('slot_date', date)
    .eq('status', 'open')
    .is('archived_at', null)
    .order('start_time', { ascending: true })

  if (error) {
    console.error('Slot query error:', error)
    return res.status(200).json({ slots: [] })
  }

  return res.status(200).json({
    slots: (slots || []).map((s) => ({ id: s.id, time: formatTimeLabel(s.start_time) })),
  })
}
