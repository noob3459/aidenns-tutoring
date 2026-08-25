import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js'
import { requireAdmin } from '../_lib/adminAuth.js'
import { isValidDateISO } from '../_lib/timezone.js'

const MAX_TARGET_DATES = 60

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed.' })
  }

  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
  body = body && typeof body === 'object' ? body : {}

  if (!isValidDateISO(body.sourceDate)) {
    return res.status(400).json({ ok: false, error: 'Invalid source date.' })
  }
  const targetDates = Array.isArray(body.targetDates) ? body.targetDates.filter(isValidDateISO) : []
  if (!targetDates.length) {
    return res.status(400).json({ ok: false, error: 'At least one valid target date is required.' })
  }
  if (targetDates.length > MAX_TARGET_DATES) {
    return res.status(400).json({ ok: false, error: `Please copy to ${MAX_TARGET_DATES} dates or fewer at a time.` })
  }

  let supabase
  try {
    supabase = getSupabaseAdmin()
  } catch (err) {
    console.error('Supabase config error:', err)
    return res.status(500).json({ ok: false, error: 'The admin system is temporarily unavailable.' })
  }

  const { data: sourceSlots, error: sourceErr } = await supabase
    .from('availability_slots')
    .select('start_time, duration_minutes')
    .eq('slot_date', body.sourceDate)

  if (sourceErr) {
    console.error('Copy source lookup error:', sourceErr)
    return res.status(500).json({ ok: false, error: 'Could not read the source date.' })
  }
  if (!sourceSlots?.length) {
    return res.status(400).json({ ok: false, error: 'The source date has no slots to copy.' })
  }

  const rows = targetDates.flatMap((date) =>
    sourceSlots.map((s) => ({ slot_date: date, start_time: s.start_time, duration_minutes: s.duration_minutes }))
  )

  const { data, error } = await supabase
    .from('availability_slots')
    .upsert(rows, { onConflict: 'slot_date,start_time', ignoreDuplicates: true })
    .select()

  if (error) {
    console.error('Copy insert error:', error)
    return res.status(500).json({ ok: false, error: 'Could not copy availability.' })
  }

  return res.status(200).json({ ok: true, created: data?.length || 0, requested: rows.length })
}
