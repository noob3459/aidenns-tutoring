import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js'
import {
  verifyPasscode, issueSessionCookie, clearSessionCookie, hasValidSession,
  getClientIp, hashIp, isLoginRateLimited, recordLoginAttempt, checkOrigin, noStore,
} from '../_lib/adminAuth.js'

// Consolidates the three admin auth endpoints (login / logout / me) into
// one deployed function, to stay well under Vercel's Hobby serverless
// function limit. Behavior is otherwise unchanged from the three
// separate files this replaces:
//   GET            -> "me" session check (no auth required to call this)
//   POST {action}  -> 'login' {passcode} | 'logout'
//
// Login and logout are intentionally NOT gated by requireAdmin()/
// hasValidSession() — that would make it impossible to ever log in, and
// logging out with no session should just be a harmless no-op. Both
// still go through the same CSRF/origin check as every other admin
// mutation. Every other privileged admin route continues to require a
// valid session, unaffected by this file.
const ALLOWED_ACTIONS = ['login', 'logout']

export default async function handler(req, res) {
  noStore(res)

  if (req.method === 'GET') {
    return res.status(200).json({ authed: hasValidSession(req) })
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
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

  if (!ALLOWED_ACTIONS.includes(body.action)) {
    return res.status(400).json({ ok: false, error: 'Unknown action.' })
  }

  if (body.action === 'logout') {
    clearSessionCookie(res)
    return res.status(200).json({ ok: true })
  }

  // action === 'login'
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
    // TEMPORARY diagnostic (feature branch only) — lengths and deploy
    // metadata only, never the passcode itself or any derived hash/prefix.
    console.warn('Admin passcode mismatch', {
      submittedLength: typeof body.passcode === 'string' ? body.passcode.length : 0,
      configuredLength: typeof process.env.ADMIN_PASSCODE === 'string' ? process.env.ADMIN_PASSCODE.length : 0,
      vercelEnvironment: process.env.VERCEL_ENV || 'unknown',
      vercelGitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
    })
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
