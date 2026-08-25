import { clearSessionCookie, checkOrigin, noStore } from '../_lib/adminAuth.js'

export default async function handler(req, res) {
  noStore(res)

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed.' })
  }

  if (!checkOrigin(req)) {
    return res.status(403).json({ ok: false, error: 'Request blocked.' })
  }

  clearSessionCookie(res)
  return res.status(200).json({ ok: true })
}
