import crypto from 'node:crypto'

// Stateless, signed "magic link" tokens embedded in booking emails so the
// owner can confirm/decline/reschedule, and a customer can cancel/reschedule,
// without logging in. Same base64url-payload + HMAC-SHA256-signature shape as
// the admin session cookie in api/_lib/adminAuth.js, but with its own secret
// (BOOKING_ACTION_SECRET) so it can be rotated independently of the admin
// session and isn't weakened by reuse.
//
// There is no revocation list — a token is valid until it expires. That's an
// accepted tradeoff (same one every "magic link" — unsubscribe, password
// reset — makes): the token only lets the holder do what a real state
// transition already allows via update_booking_status/reschedule_booking, so
// the worst case of a leaked token is the same as someone else reading a
// forwarded email.
const TOKEN_TTL_MS = 60 * 24 * 60 * 60 * 1000 // 60 days

function hmacHex(secret, value) {
  return crypto.createHmac('sha256', secret).update(value).digest('hex')
}

function getSecret() {
  const secret = process.env.BOOKING_ACTION_SECRET
  if (!secret) throw new Error('BOOKING_ACTION_SECRET is not configured in environment variables.')
  return secret
}

export function signBookingToken({ bookingId, role }) {
  const secret = getSecret()
  const payload = Buffer.from(JSON.stringify({ b: bookingId, r: role, exp: Date.now() + TOKEN_TTL_MS })).toString('base64url')
  const signature = hmacHex(secret, payload)
  return `${payload}.${signature}`
}

// Returns { bookingId, role } on a valid, unexpired, correctly-signed token,
// or null for anything else (malformed, tampered, expired, missing secret).
export function verifyBookingToken(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null

  let secret
  try {
    secret = getSecret()
  } catch {
    return null
  }

  const [payload, signature] = token.split('.')
  if (!payload || !signature) return null

  const expectedSignature = hmacHex(secret, payload)

  try {
    const sigBuf = Buffer.from(signature, 'hex')
    const expectedBuf = Buffer.from(expectedSignature, 'hex')
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) return null

    const { b, r, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (typeof b !== 'string' || !b) return null
    if (r !== 'admin' && r !== 'client') return null
    if (typeof exp !== 'number' || exp <= Date.now()) return null

    return { bookingId: b, role: r }
  } catch {
    return null
  }
}
