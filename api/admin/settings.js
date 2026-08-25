import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js'
import { requireAdmin } from '../_lib/adminAuth.js'
import { validateSettings } from '../_lib/validateSettings.js'

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

  if (req.method === 'PUT') {
    let body = req.body
    if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
    const rawLength = typeof req.headers['content-length'] === 'string' ? Number(req.headers['content-length']) : undefined

    const { errors, clean } = validateSettings(body, rawLength)
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

  res.setHeader('Allow', 'GET, PUT')
  return res.status(405).json({ ok: false, error: 'Method not allowed.' })
}
