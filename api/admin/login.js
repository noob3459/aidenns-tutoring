import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js'
import {
  verifyPasscode, issueSessionCookie, getClientIp, hashIp,
  isLoginRateLimited, recordLoginAttempt, checkOrigin, noStore,
} from '../_lib/adminAuth.js'

export default async function handler(req, res) {
  noStore(res)

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed.' })
  }

  if (!checkOrigin(req)) {
    return res.status(403).json({ ok: false, error: 'Request blocked.' })
  }

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = {} }
  }
  body = body && typeof body === 'object' ? body : {}

  let supabase
  try {
    supabase = getSupabaseAdmin()
  } catch (err) {
    console.error('Supabase config error:', err)
    return res.status(500).json({ ok: false, error: 'The admin system is temporarily unavailable.' })
  }

  const ipHash = hashIp(getClientIp(req))

  const limited = await isLoginRateLimited(supabase, ipHash)
  if (limited) {
    return res.status(429).json({ ok: false, error: 'Too many attempts. Please try again later.' })
  }

  // Never log `body.passcode` here, on success or failure.
  const ok = verifyPasscode(body.passcode)
  await recordLoginAttempt(supabase, ipHash, ok)

  if (!ok) {
    return res.status(401).json({ ok: false, error: 'Incorrect passcode.' })
  }

  try {
    issueSessionCookie(res)
  } catch (err) {
    console.error('Session config error:', err)
    return res.status(500).json({ ok: false, error: 'The admin system is temporarily unavailable.' })
  }

  return res.status(200).json({ ok: true })
}
