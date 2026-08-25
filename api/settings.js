import { getSupabaseAdmin } from './_lib/supabaseAdmin.js'
import { noStore } from './_lib/adminAuth.js'

export default async function handler(req, res) {
  noStore(res)

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'Method not allowed.' })
  }

  let supabase
  try {
    supabase = getSupabaseAdmin()
  } catch (err) {
    console.error('Supabase config error:', err)
    return res.status(200).json({ ok: true, data: null })
  }

  const { data, error } = await supabase.from('site_settings').select('data').eq('id', 1).maybeSingle()

  if (error || !data) {
    console.error('Settings fetch error:', error)
    return res.status(200).json({ ok: true, data: null })
  }

  return res.status(200).json({ ok: true, data: data.data })
}
