import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js'
import { requireAdmin } from '../_lib/adminAuth.js'
import { getPacificTodayISO } from '../_lib/timezone.js'

const MAX_WEEKS = 26

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed.' })
  }

  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
  body = body && typeof body === 'object' ? body : {}

  const weeks = Number(body.weeks)
  if (!Number.isInteger(weeks) || weeks <= 0 || weeks > MAX_WEEKS) {
    return res.status(400).json({ ok: false, error: `weeks must be between 1 and ${MAX_WEEKS}.` })
  }

  let supabase
  try {
    supabase = getSupabaseAdmin()
  } catch (err) {
    console.error('Supabase config error:', err)
    return res.status(500).json({ ok: false, error: 'The admin system is temporarily unavailable.' })
  }

  let ruleQuery = supabase.from('recurring_availability_rules').select('*').eq('active', true)
  if (typeof body.ruleId === 'string' && body.ruleId) ruleQuery = ruleQuery.eq('id', body.ruleId)
  const { data: rules, error: rulesErr } = await ruleQuery

  if (rulesErr) return res.status(500).json({ ok: false, error: 'Could not load recurring rules.' })
  if (!rules?.length) return res.status(400).json({ ok: false, error: 'No active recurring rules to generate from.' })

  const todayISO = getPacificTodayISO()
  const [ty, tm, td] = todayISO.split('-').map(Number)
  const startDate = new Date(Date.UTC(ty, tm - 1, td))
  const totalDays = weeks * 7

  const candidateDates = []
  for (let i = 1; i <= totalDays; i++) {
    const d = new Date(startDate)
    d.setUTCDate(d.getUTCDate() + i)
    candidateDates.push({ iso: d.toISOString().slice(0, 10), weekday: d.getUTCDay() })
  }

  const datesInRange = candidateDates.map((c) => c.iso)
  const { data: closedDays } = await supabase
    .from('availability_days')
    .select('day')
    .in('day', datesInRange)
    .eq('is_closed', true)
  const closedSet = new Set((closedDays || []).map((d) => d.day))

  const rows = []
  for (const rule of rules) {
    const [sh, sm] = rule.start_time.split(':').map(Number)
    const [eh, em] = rule.end_time.split(':').map(Number)
    const startMin = sh * 60 + sm
    const endMin = eh * 60 + em

    for (const cand of candidateDates) {
      if (cand.weekday !== rule.weekday || closedSet.has(cand.iso)) continue
      for (let t = startMin; t + rule.duration_minutes <= endMin; t += rule.duration_minutes) {
        const h = String(Math.floor(t / 60)).padStart(2, '0')
        const m = String(t % 60).padStart(2, '0')
        rows.push({ slot_date: cand.iso, start_time: `${h}:${m}:00`, duration_minutes: rule.duration_minutes })
      }
    }
  }

  if (!rows.length) return res.status(200).json({ ok: true, created: 0, requested: 0 })

  const { data, error } = await supabase
    .from('availability_slots')
    .upsert(rows, { onConflict: 'slot_date,start_time', ignoreDuplicates: true })
    .select()

  if (error) {
    console.error('Generate insert error:', error)
    return res.status(500).json({ ok: false, error: 'Could not generate slots.' })
  }

  return res.status(200).json({ ok: true, created: data?.length || 0, requested: rows.length })
}
