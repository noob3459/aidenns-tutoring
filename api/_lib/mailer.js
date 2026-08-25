import nodemailer from 'nodemailer'
import { escapeHtml } from './validate.js'

let transporter = null

function getTransporter() {
  if (transporter) return transporter

  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD

  if (!user || !pass) {
    throw new Error('GMAIL_USER / GMAIL_APP_PASSWORD are not configured in environment variables.')
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  })
  return transporter
}

function detailLines(b) {
  return [
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
}

export async function sendOwnerNotification(booking) {
  const to = process.env.BOOKING_NOTIFICATION_EMAIL || process.env.GMAIL_USER
  const lines = detailLines(booking)

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
          <td style="padding:4px 0;font-weight:600;">${escapeHtml(String(value))}</td>
        </tr>`).join('')}
    </table>
    <p style="font-family:sans-serif;">Reply directly to this email to reach the parent, then update the booking's status in Supabase once confirmed.</p>
  `

  await getTransporter().sendMail({
    from: `"Aidenn's Tutoring" <${process.env.GMAIL_USER}>`,
    to,
    replyTo: booking.email,
    subject: `New session request: ${booking.student_name} (Grade ${booking.grade})`,
    text,
    html,
  })
}

export async function sendParentReceipt(booking) {
  const text = [
    `Hi ${booking.parent_name},`,
    '',
    `Thanks for requesting a free math session for ${booking.student_name} (Grade ${booking.grade}) on ${booking.requested_date_label} at ${booking.requested_time}, ${booking.format.toLowerCase()}.`,
    '',
    'This is a REQUEST, not a confirmed booking yet. We will personally reach out to confirm the time.',
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
      <strong>This is a request, not a confirmed booking yet.</strong> We'll personally reach out to confirm the time.
    </p>
    <p style="font-family:sans-serif;">If you don't hear back within a day or two, just reply to this email.</p>
    <p style="font-family:sans-serif;">Aidenn&rsquo;s Tutoring</p>
  `

  await getTransporter().sendMail({
    from: `"Aidenn's Tutoring" <${process.env.GMAIL_USER}>`,
    to: booking.email,
    subject: `We received your request: Aidenn's Tutoring`,
    text,
    html,
  })
}
