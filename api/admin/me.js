import { hasValidSession, noStore } from '../_lib/adminAuth.js'

export default async function handler(req, res) {
  noStore(res)

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'Method not allowed.' })
  }

  return res.status(200).json({ authed: hasValidSession(req) })
}
