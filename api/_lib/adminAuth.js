import crypto from 'node:crypto'

const SESSION_COOKIE = 'aidenns_admin_session'
const SESSION_TTL_MS = 12 * 60 * 60 * 1000 // 12 hours
const LOGIN_ATTEMPT_LIMIT = 5
const LOGIN_ATTEMPT_WINDOW_MIN = 15
const LOGIN_ATTEMPT_CLEANUP_HOURS = 1

function hmacHex(secret, value) {
  return crypto.createHmac('sha256', secret).update(value).digest('hex')
}

// Fixed-length digest compare — never compares raw user input directly
// with crypto.timingSafeEqual, which throws on unequal-length buffers.
// HMAC-SHA256 output is always 32 bytes regardless of input length, so
// this sidesteps that entirely while still being constant-time.
export function safeEquals(a, b) {
  const bufA = Buffer.from(String(a))
  const bufB = Buffer.from(String(b))
  const digestA = crypto.createHash('sha256').update(bufA).digest()
  const digestB = crypto.createHash('sha256').update(bufB).digest()
  return crypto.timingSafeEqual(digestA, digestB)
}

// Hardcoded server-only passcode — never imported by, or reachable from,
// any file under /src, so it cannot end up in the client bundle. Rotate
// by editing this constant directly (never via chat, never via an env
// var, never logged) and redeploying.
const ADMIN_PASSCODE = 'Aidennq26'

export function verifyPasscode(submitted) {
  if (typeof submitted !== 'string' || submitted.length === 0) return false
  return safeEquals(submitted, ADMIN_PASSCODE)
}

// --- Session cookie (signed, httpOnly, never contains the passcode) ----

export function issueSessionCookie(res) {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret) throw new Error('ADMIN_SESSION_SECRET is not configured.')

  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + SESSION_TTL_MS })).toString('base64url')
  const signature = hmacHex(secret, payload)
  const token = `${payload}.${signature}`

  const isProd = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production'
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ]
  if (isProd) parts.push('Secure')
  res.setHeader('Set-Cookie', parts.join('; '))
}

export function clearSessionCookie(res) {
  const isProd = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production'
  const parts = [`${SESSION_COOKIE}=`, 'HttpOnly', 'Path=/', 'SameSite=Lax', 'Max-Age=0']
  if (isProd) parts.push('Secure')
  res.setHeader('Set-Cookie', parts.join('; '))
}

function parseCookies(req) {
  const header = req.headers.cookie
  if (!header) return {}
  return Object.fromEntries(
    header.split(';').map((pair) => {
      const idx = pair.indexOf('=')
      if (idx === -1) return [pair.trim(), '']
      return [pair.slice(0, idx).trim(), decodeURIComponent(pair.slice(idx + 1).trim())]
    })
  )
}

export function hasValidSession(req) {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret) return false

  const token = parseCookies(req)[SESSION_COOKIE]
  if (!token || typeof token !== 'string' || !token.includes('.')) return false

  const [payload, signature] = token.split('.')
  const expectedSignature = hmacHex(secret, payload)

  try {
    const sigBuf = Buffer.from(signature, 'hex')
    const expectedBuf = Buffer.from(expectedSignature, 'hex')
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) return false

    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    return typeof exp === 'number' && exp > Date.now()
  } catch {
    return false
  }
}

// --- IP hashing for rate-limiting (raw IPs are never stored) -----------

export function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for']
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim()
  if (Array.isArray(fwd) && fwd.length) return fwd[0].trim()
  return req.socket?.remoteAddress || 'unknown'
}

export function hashIp(ip) {
  const secret = process.env.IP_HASH_SECRET
  if (!secret) throw new Error('IP_HASH_SECRET is not configured.')
  return hmacHex(secret, ip)
}

// Cleans stale rows, then reports whether this ip_hash is currently
// rate-limited. Keyed per-IP-hash (not a single global counter) so one
// attacker spamming failed logins cannot lock out the real administrator
// from a different network.
export async function isLoginRateLimited(supabase, ipHash) {
  const cleanupCutoff = new Date(Date.now() - LOGIN_ATTEMPT_CLEANUP_HOURS * 60 * 60 * 1000).toISOString()
  await supabase.from('admin_login_attempts').delete().lt('created_at', cleanupCutoff)

  const windowStart = new Date(Date.now() - LOGIN_ATTEMPT_WINDOW_MIN * 60 * 1000).toISOString()
  const { count, error } = await supabase
    .from('admin_login_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .eq('success', false)
    .gte('created_at', windowStart)

  if (error) return false // fail open on a counting error — don't lock everyone out over a DB hiccup
  return typeof count === 'number' && count >= LOGIN_ATTEMPT_LIMIT
}

export async function recordLoginAttempt(supabase, ipHash, success) {
  await supabase.from('admin_login_attempts').insert({ ip_hash: ipHash, success })
}

// --- CSRF: validate Origin on every mutating admin request --------------

export function isAllowedOrigin(origin) {
  if (!origin) return false
  if (origin === 'http://localhost:5173' || origin === 'http://localhost:3000') return true
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true

  const configured = (process.env.ALLOWED_ADMIN_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return configured.includes(origin)
}

export function checkOrigin(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return true
  return isAllowedOrigin(req.headers.origin)
}

// --- Response headers -----------------------------------------------

export function noStore(res) {
  res.setHeader('Cache-Control', 'no-store')
}

// Shared guard for every /api/admin/* handler: CSRF/origin check first,
// then session validity. Writes the error response itself and returns
// false so callers can just `if (!requireAdmin(req, res)) return`.
export function requireAdmin(req, res) {
  noStore(res)
  if (!checkOrigin(req)) {
    res.status(403).json({ ok: false, error: 'Request blocked.' })
    return false
  }
  if (!hasValidSession(req)) {
    res.status(401).json({ ok: false, error: 'Not signed in.' })
    return false
  }
  return true
}
