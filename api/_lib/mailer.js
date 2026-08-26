import { Resend } from 'resend'
import { escapeHtml } from './validate.js'

let resendClient = null

// Server-only Resend client. This file lives under /api and must NEVER be
// imported from anything in /src — importing it client-side would ship the
// Resend API key to every visitor's browser.
function getResendClient() {
  if (resendClient) return resendClient

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured in environment variables.')
  }

  resendClient = new Resend(apiKey)
  return resendClient
}

const MAIL_FROM = process.env.MAIL_FROM || 'Aidenn’s Tutoring <aidenn@aidennstutoring.org>'
const MAIL_REPLY_TO = process.env.MAIL_REPLY_TO || 'aidenn@aidennstutoring.org'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Safely parses a comma-separated BCC address list from an env var: trims
// each entry, drops empties, validates the format, and de-duplicates
// (case-insensitive). A malformed entry is silently skipped rather than
// sent to Resend or allowed to throw.
function parseBccList(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return []
  const seen = new Set()
  const out = []
  for (const entry of raw.split(',')) {
    const addr = entry.trim()
    if (!addr || !EMAIL_RE.test(addr)) continue
    const key = addr.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(addr)
  }
  return out
}

function detailLines(b, zoomLink) {
  const lines = [
    ['Parent / Guardian', b.parent_name],
    ['Student', b.student_name],
    ['Grade', b.grade],
    ['Format', b.format],
    ['Requested', `${b.requested_date_label} at ${b.requested_time}`],
    ['Email', b.email],
    ['Phone', b.phone],
    ['Notes', b.notes || '(none)'],
    ['Booking ID', b.id],
  ]
  if (b.format === 'Online' && zoomLink) lines.splice(4, 0, ['Zoom Link', zoomLink])
  return lines
}

async function send({ to, bcc, replyTo, subject, text, html }) {
  const payload = { from: MAIL_FROM, to, replyTo, subject, text, html }
  if (bcc && bcc.length) payload.bcc = bcc

  const { data, error } = await getResendClient().emails.send(payload)
  if (error) {
    throw new Error(`Resend error: ${error.message || JSON.stringify(error)}`)
  }
  return data?.id || null
}

export async function sendOwnerNotification(booking, zoomLink) {
  const to = process.env.BOOKING_NOTIFICATION_TO || MAIL_REPLY_TO
  const bcc = parseBccList(process.env.BOOKING_NOTIFICATION_BCC)
  const lines = detailLines(booking, zoomLink)

  const text = [
    'New free session request. Action needed to confirm.',
    '',
    ...lines.map(([label, value]) => `${label}: ${value}`),
    '',
    'This is a REQUEST only. Reply to this email (goes straight to the parent) to confirm the time, then mark it "confirmed" in Supabase.',
  ].join('\n')

  const html = `
    <h2 style="font-family:sans-serif;">New Free Session Request</h2>
    <p style="font-family:sans-serif;color:#b45309;"><strong>Action needed:</strong> this is a request only. Nothing is confirmed yet.</p>
    <table style="font-family:sans-serif;border-collapse:collapse;">
      ${lines.map(([label, value]) => `
        <tr>
          <td style="padding:4px 12px 4px 0;color:#666;">${escapeHtml(label)}</td>
          <td style="padding:4px 0;font-weight:600;">${
            label === 'Zoom Link' ? `<a href="${escapeHtml(value)}">${escapeHtml(value)}</a>` : escapeHtml(String(value))
          }</td>
        </tr>`).join('')}
    </table>
    <p style="font-family:sans-serif;">Reply directly to this email to reach the parent, then update the booking's status in Supabase once confirmed.</p>
  `

  // Owner notification intentionally replies to the parent, not MAIL_REPLY_TO,
  // so hitting "reply" reaches the family directly.
  return send({
    to,
    bcc,
    replyTo: booking.email,
    subject: `New session request: ${booking.student_name} (Grade ${booking.grade})`,
    text,
    html,
  })
}

export async function sendParentReceipt(booking, zoomLink) {
  const includeZoom = booking.format === 'Online' && Boolean(zoomLink)

  const text = [
    `Hi ${booking.parent_name},`,
    '',
    `Thanks for requesting a free math session for ${booking.student_name} (Grade ${booking.grade}) on ${booking.requested_date_label} at ${booking.requested_time}, ${booking.format.toLowerCase()}.`,
    '',
    'Your request has been received, but it is NOT confirmed yet. Aidenn personally reviews and confirms every session — you’ll hear back directly once it’s confirmed.',
    ...(includeZoom ? ['', `Once confirmed, join here: ${zoomLink}`] : []),
    '',
    'If you don’t hear back within a day or two, feel free to reply to this email directly.',
    '',
    'Aidenn’s Tutoring',
  ].join('\n')

  const html = `
    <p style="font-family:sans-serif;">Hi ${escapeHtml(booking.parent_name)},</p>
    <p style="font-family:sans-serif;">Thanks for requesting a free math session for <strong>${escapeHtml(booking.student_name)}</strong> (Grade ${escapeHtml(booking.grade)}) on
      <strong>${escapeHtml(booking.requested_date_label)} at ${escapeHtml(booking.requested_time)}</strong>, ${escapeHtml(booking.format.toLowerCase())}.</p>
    <p style="font-family:sans-serif;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:10px 14px;">
      <strong>Your request has been received, but it is not confirmed yet.</strong> Aidenn personally reviews and confirms every session — you'll hear back directly once it's confirmed.
    </p>
    ${includeZoom ? `
    <p style="font-family:sans-serif;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px 14px;">
      Once confirmed, join your session here: <a href="${escapeHtml(zoomLink)}">${escapeHtml(zoomLink)}</a>
    </p>` : ''}
    <p style="font-family:sans-serif;">If you don't hear back within a day or two, just reply to this email.</p>
    <p style="font-family:sans-serif;">Aidenn&rsquo;s Tutoring</p>
  `

  return send({
    to: booking.email,
    replyTo: MAIL_REPLY_TO,
    subject: `We received your request: Aidenn's Tutoring`,
    text,
    html,
  })
}
