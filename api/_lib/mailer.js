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

const SITE_URL = (process.env.SITE_URL || 'https://aidennstutoring.org').replace(/\/$/, '')
const LOGO_URL = `${SITE_URL}/images/aidenns-tutoring-email-logo.png`

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

// Recipients who should get a copy of every booking status-change email
// (confirm / decline / reschedule) sent to a customer, so the owner always
// has a record of what changed without having to check the admin dashboard.
function ownerCcList() {
  const primary = process.env.BOOKING_NOTIFICATION_TO || MAIL_REPLY_TO
  const seen = new Set()
  const out = []
  for (const addr of [primary, ...parseBccList(process.env.BOOKING_NOTIFICATION_BCC)]) {
    const key = addr.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(addr)
  }
  return out
}

// ---------------------------------------------------------------------
// Shared HTML email chrome. Table-based layout with only inline styles —
// deliberately avoids flexbox/grid, which many email clients (Outlook
// desktop especially) don't support — so this renders consistently
// everywhere, not just in whatever client the recipient happens to use.
// ---------------------------------------------------------------------

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif"
const NAVY = '#152B52'
const PRIMARY = '#1B3A6B'
const INK = '#1F2430'
const MUTED = '#6B7280'
const DIVIDER = '#E3E1DA'
const BACKGROUND = '#F4F3EF'
const SURFACE = '#F9F9F7'

function wrapEmail(bodyHtml) {
  return `
<div style="background:${BACKGROUND};padding:32px 16px;font-family:${FONT};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;border-collapse:collapse;">
    <tr>
      <td style="background:${NAVY};border-radius:20px 20px 0 0;padding:28px 32px;text-align:center;">
        <img src="${LOGO_URL}" width="40" height="40" alt="Aidenn&rsquo;s Tutoring" style="display:inline-block;width:40px;height:40px;border-radius:50%;border:1px solid rgba(255,255,255,0.25);" />
        <div style="color:#fff;font-weight:700;font-size:16px;margin-top:12px;letter-spacing:0.01em;">Aidenn&rsquo;s Tutoring</div>
      </td>
    </tr>
    <tr>
      <td style="background:#ffffff;padding:36px 32px;border-left:1px solid ${DIVIDER};border-right:1px solid ${DIVIDER};">
        ${bodyHtml}
      </td>
    </tr>
    <tr>
      <td style="background:${SURFACE};border:1px solid ${DIVIDER};border-top:none;border-radius:0 0 20px 20px;padding:18px 32px;text-align:center;">
        <p style="margin:0;font-size:12px;color:${MUTED};">Aidenn&rsquo;s Tutoring &middot; 100% free, always</p>
      </td>
    </tr>
  </table>
</div>`
}

function heading(text) {
  return `<h1 style="margin:0 0 18px;font-family:${FONT};font-size:21px;font-weight:700;color:${INK};letter-spacing:-0.01em;">${escapeHtml(text)}</h1>`
}

// Short "what this is for" eyebrow shown under the heading of every
// booking email, so the subject matter is clear at a glance without
// having to read into the body — e.g. "Math Help · Grade 7".
function sessionTag(booking) {
  return `<p style="margin:-10px 0 20px;font-family:${FONT};font-size:12.5px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:${PRIMARY};">Math Help &middot; Grade ${escapeHtml(String(booking.grade))}</p>`
}

function sessionTagText(booking) {
  return `Math Help · Grade ${booking.grade}`
}

function paragraph(html, extraStyle = '') {
  return `<p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:1.6;color:${INK};${extraStyle}">${html}</p>`
}

function callout(html, { bg = '#FFF7ED', border = '#FED7AA', color = INK } = {}) {
  return `<div style="margin:0 0 20px;background:${bg};border:1px solid ${border};border-radius:12px;padding:14px 18px;font-family:${FONT};font-size:14px;line-height:1.55;color:${color};">${html}</div>`
}

function button(href, label, { bg = PRIMARY } = {}) {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;background:${bg};color:#ffffff;text-decoration:none;font-family:${FONT};font-weight:600;font-size:14px;padding:12px 26px;border-radius:999px;">${escapeHtml(label)}</a>`
}

// A compact "pill row" summarizing grade / format / date+time — the
// three facts every recipient needs at a glance, styled as small badges
// rather than a plain label:value table.
function summaryPills(booking) {
  const pills = [
    booking.format,
    `${booking.requested_date_label} &middot; ${booking.requested_time}`,
  ]
  return `<div style="margin:0 0 20px;">${pills.map((p) => `
    <span style="display:inline-block;background:${SURFACE};border:1px solid ${DIVIDER};border-radius:999px;padding:6px 14px;margin:0 6px 8px 0;font-family:${FONT};font-size:12.5px;font-weight:600;color:${PRIMARY};">${p}</span>`).join('')}</div>`
}

function detailTable(rows) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-family:${FONT};font-size:14px;">
    ${rows.map(([label, value, isLink]) => `
      <tr>
        <td style="padding:6px 14px 6px 0;color:${MUTED};white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td>
        <td style="padding:6px 0;font-weight:600;color:${INK};">${isLink ? `<a href="${escapeHtml(String(value))}" style="color:${PRIMARY};">${escapeHtml(String(value))}</a>` : escapeHtml(String(value))}</td>
      </tr>`).join('')}
  </table>`
}

function zoomBlock(zoomLink) {
  return `<div style="margin:0 0 20px;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:14px;padding:20px;text-align:center;">
    <p style="margin:0 0 12px;font-family:${FONT};font-size:14px;color:${INK};">Join your session here:</p>
    ${button(zoomLink, 'Join on Zoom', { bg: '#2563EB' })}
  </div>`
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

// ---------------------------------------------------------------------
// Owner notification — sent the moment a request comes in. Zoom link
// (if set) is shown here purely for the admin's own reference; the
// family never sees it until the admin actually confirms the session
// (see sendConfirmationEmail below) — that gating is the point of this
// whole email set, not just the parent-facing copy.
// ---------------------------------------------------------------------
export async function sendOwnerNotification(booking, zoomLink) {
  const to = process.env.BOOKING_NOTIFICATION_TO || MAIL_REPLY_TO
  const bcc = parseBccList(process.env.BOOKING_NOTIFICATION_BCC)

  const rows = [
    ['Parent / Guardian', booking.parent_name],
    ['Student', booking.student_name],
    ['Email', booking.email],
    ['Phone', booking.phone],
    ['Notes', booking.notes || '(none)'],
    ['Booking ID', booking.id],
  ]
  if (booking.format === 'Online' && zoomLink) rows.splice(4, 0, ['Zoom Link', zoomLink, true])

  const text = [
    'New free session request. Action needed to confirm.',
    '',
    sessionTagText(booking),
    `${booking.format} · ${booking.requested_date_label} at ${booking.requested_time}`,
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    'This is a REQUEST only. Reply to this email (goes straight to the parent) or use the admin dashboard to confirm, reschedule, or decline.',
  ].join('\n')

  const html = wrapEmail([
    heading('New Free Session Request'),
    sessionTag(booking),
    summaryPills(booking),
    detailTable(rows),
    paragraph('Reply directly to this email to reach the parent, or head to the admin dashboard to confirm, reschedule, or decline.', `color:${MUTED};margin-top:20px;`),
  ].join(''))

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

// ---------------------------------------------------------------------
// Parent receipt — sent the moment a request comes in. Deliberately
// carries NO Zoom link: the family only receives that once the session
// is actually confirmed (sendConfirmationEmail), never at the request
// stage, so a session someone never confirms can't leak a join link.
// ---------------------------------------------------------------------
export async function sendParentReceipt(booking) {
  const text = [
    `Hi ${booking.parent_name},`,
    '',
    sessionTagText(booking),
    `Thanks for requesting a free math session for ${booking.student_name} (Grade ${booking.grade}) on ${booking.requested_date_label} at ${booking.requested_time}, ${booking.format.toLowerCase()}.`,
    '',
    'Your request has been received, but it is NOT confirmed yet. Aidenn personally reviews and confirms every session — you’ll hear back directly (with the Zoom link, if online) once it’s confirmed.',
    '',
    'If you don’t hear back within a day or two, feel free to reply to this email directly.',
    '',
    'Aidenn’s Tutoring',
  ].join('\n')

  const html = wrapEmail([
    heading('Request Received!'),
    sessionTag(booking),
    paragraph(`Hi ${escapeHtml(booking.parent_name)},`),
    paragraph(`Thanks for requesting a free math session for <strong>${escapeHtml(booking.student_name)}</strong>.`),
    summaryPills(booking),
    callout('<strong>This isn&rsquo;t confirmed yet.</strong> Aidenn personally reviews and confirms every session &mdash; you&rsquo;ll hear back directly (with the Zoom link, if online) once it&rsquo;s confirmed.'),
    paragraph('If you don&rsquo;t hear back within a day or two, just reply to this email.', `color:${MUTED};`),
    paragraph('Aidenn&rsquo;s Tutoring', 'margin:0;'),
  ].join(''))

  return send({
    to: booking.email,
    replyTo: MAIL_REPLY_TO,
    subject: `We received your request: Aidenn's Tutoring`,
    text,
    html,
  })
}

// ---------------------------------------------------------------------
// Confirmation — sent to the parent the moment the admin accepts a
// pending request. This is the ONLY email that ever carries the Zoom
// link, and only for Online sessions with a link configured.
// ---------------------------------------------------------------------
export async function sendConfirmationEmail(booking, zoomLink) {
  const includeZoom = booking.format === 'Online' && Boolean(zoomLink)

  const text = [
    `Hi ${booking.parent_name},`,
    '',
    sessionTagText(booking),
    `Good news — ${booking.student_name}'s free math session is confirmed for ${booking.requested_date_label} at ${booking.requested_time}, ${booking.format.toLowerCase()}.`,
    ...(includeZoom ? ['', `Join here: ${zoomLink}`] : []),
    '',
    'See you then! Reply to this email if anything changes on your end.',
    '',
    'Aidenn’s Tutoring',
  ].join('\n')

  const html = wrapEmail([
    heading('Your Session Is Confirmed!'),
    sessionTag(booking),
    paragraph(`Hi ${escapeHtml(booking.parent_name)},`),
    paragraph(`Good news — <strong>${escapeHtml(booking.student_name)}</strong>'s free math session is confirmed.`),
    summaryPills(booking),
    includeZoom ? zoomBlock(zoomLink) : (booking.format === 'In-Person' ? callout('See you at the agreed location — reply to this email if you need directions or a reminder.', { bg: SURFACE, border: DIVIDER, color: MUTED }) : ''),
    paragraph('Reply to this email any time if your plans change.', `color:${MUTED};`),
    paragraph('Aidenn&rsquo;s Tutoring', 'margin:0;'),
  ].join(''))

  return send({
    to: booking.email,
    bcc: ownerCcList(),
    replyTo: MAIL_REPLY_TO,
    subject: `Confirmed: ${booking.student_name}'s session on ${booking.requested_date_label}`,
    text,
    html,
  })
}

// ---------------------------------------------------------------------
// Decline — sent to the parent whenever an admin declines a pending
// request. BCCs the owner so there's a record of the decision.
// ---------------------------------------------------------------------
export async function sendDeclineEmail(booking) {
  const text = [
    `Hi ${booking.parent_name},`,
    '',
    sessionTagText(booking),
    `We're sorry, but we're unable to confirm ${booking.student_name}'s requested session for ${booking.requested_date_label} at ${booking.requested_time}, ${booking.format.toLowerCase()}.`,
    '',
    'Feel free to reply to this email or submit a new request for a different time — we’d love to help.',
    '',
    'Aidenn’s Tutoring',
  ].join('\n')

  const html = wrapEmail([
    heading('Unable To Confirm Your Request'),
    sessionTag(booking),
    paragraph(`Hi ${escapeHtml(booking.parent_name)},`),
    paragraph(`We&rsquo;re sorry, but we&rsquo;re unable to confirm <strong>${escapeHtml(booking.student_name)}</strong>&rsquo;s requested session.`),
    summaryPills(booking),
    callout('Feel free to reply to this email or submit a new request for a different time &mdash; we&rsquo;d love to help.', { bg: SURFACE, border: DIVIDER, color: MUTED }),
    paragraph('Aidenn&rsquo;s Tutoring', 'margin:0;'),
  ].join(''))

  return send({
    to: booking.email,
    bcc: ownerCcList(),
    replyTo: MAIL_REPLY_TO,
    subject: `Update on your request: ${booking.student_name}'s session`,
    text,
    html,
  })
}

// ---------------------------------------------------------------------
// Reschedule — sent to the parent whenever an admin moves a booking to
// a different slot, whether it was pending or already confirmed. Only
// shows the Zoom link if the booking is (still) confirmed and online —
// a rescheduled-but-still-pending request stays link-free, same rule
// as the initial receipt.
// ---------------------------------------------------------------------
export async function sendRescheduleEmail(booking, zoomLink) {
  const includeZoom = booking.status === 'confirmed' && booking.format === 'Online' && Boolean(zoomLink)

  const text = [
    `Hi ${booking.parent_name},`,
    '',
    sessionTagText(booking),
    `${booking.student_name}'s free math session has been moved to a new time: ${booking.requested_date_label} at ${booking.requested_time}, ${booking.format.toLowerCase()}.`,
    booking.status === 'confirmed' ? 'This session is confirmed.' : 'This session is still pending confirmation.',
    ...(includeZoom ? ['', `Join here: ${zoomLink}`] : []),
    '',
    'Reply to this email if the new time doesn’t work.',
    '',
    'Aidenn’s Tutoring',
  ].join('\n')

  const html = wrapEmail([
    heading('Your Session Time Has Changed'),
    sessionTag(booking),
    paragraph(`Hi ${escapeHtml(booking.parent_name)},`),
    paragraph(`<strong>${escapeHtml(booking.student_name)}</strong>'s free math session has been moved to a new time.`),
    summaryPills(booking),
    booking.status === 'confirmed'
      ? callout('This session is confirmed at the new time.', { bg: '#ECFDF5', border: '#A7F3D0', color: INK })
      : callout('This session is still pending confirmation at the new time.'),
    includeZoom ? zoomBlock(zoomLink) : '',
    paragraph('Reply to this email if the new time doesn&rsquo;t work.', `color:${MUTED};`),
    paragraph('Aidenn&rsquo;s Tutoring', 'margin:0;'),
  ].join(''))

  return send({
    to: booking.email,
    bcc: ownerCcList(),
    replyTo: MAIL_REPLY_TO,
    subject: `Time changed: ${booking.student_name}'s session is now ${booking.requested_date_label}`,
    text,
    html,
  })
}
