import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { CalendarClock, Check, Loader2, ShieldAlert } from 'lucide-react'
import MonthCalendar from '../components/MonthCalendar.jsx'
import { getPacificCurrentMonth, getPacificTodayISO, formatDayLabel } from '../lib/timezone.js'

// Standalone page (no site chrome — see src/main.jsx, declared as a sibling
// route to /admin) that a "Confirm / Decline / Reschedule" (owner) or
// "Cancel / Reschedule" (customer) email link points at. No login: the
// signed, role-scoped token in the URL is the credential (see
// api/_lib/bookingTokens.js and api/booking-action.js). Loading the page is
// read-only — every actual state change requires an explicit click on one of
// the buttons rendered here.

async function actionFetch(url, options = {}) {
  const res = await fetch(url, options)
  const data = await res.json().catch(() => ({ ok: false, error: 'Unexpected server response.' }))
  return { res, data }
}

// Which single-click actions make sense for this role at this booking's
// current status. The POST endpoint re-validates regardless — this only
// decides what to show.
function availableActions(role, status) {
  if (role === 'admin' && status === 'pending') return ['confirm', 'decline', 'reschedule']
  if (status === 'pending' || status === 'confirmed') return ['cancel', 'reschedule']
  return []
}

const ACTION_COPY = {
  confirm: { label: 'Confirm Session', bg: 'bg-emerald-600 hover:bg-emerald-700', status: 'confirmed' },
  decline: { label: 'Decline Request', bg: 'bg-red-600 hover:bg-red-700', status: 'declined' },
  cancel: { label: 'Cancel Session', bg: 'bg-red-600 hover:bg-red-700', status: 'cancelled' },
}

function Card({ children }) {
  return (
    <div className="min-h-screen bg-deep flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center mb-6">
          <img src="/images/aidenns-tutoring-email-logo.png" alt="Aidenn's Tutoring" className="h-12 w-12 rounded-full mb-3" />
          <h1 className="font-display font-bold text-xl text-white">Aidenn&rsquo;s Tutoring</h1>
        </div>
        <div className="bg-white border border-white/10 rounded-3xl p-6 sm:p-8">{children}</div>
        <Link to="/" className="block text-center text-white/40 text-xs mt-6 hover:text-white/70 transition">← Back to site</Link>
      </div>
    </div>
  )
}

function Summary({ booking }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-mono uppercase tracking-widest text-muted mb-2">Booking</p>
      <h2 className="font-display font-bold text-lg text-ink mb-1">{booking.student_name}</h2>
      <p className="text-sm text-muted mb-3">Grade {booking.grade} &middot; {booking.format}</p>
      <p className="inline-flex items-center gap-1.5 text-sm font-medium text-primary bg-background border border-divider rounded-full px-3 py-1.5">
        <CalendarClock className="h-3.5 w-3.5" /> {booking.requested_date_label} &middot; {booking.requested_time}
      </p>
    </div>
  )
}

function ReschedulePanel({ token, onDone }) {
  const [month, setMonth] = useState(getPacificCurrentMonth())
  const [monthDays, setMonthDays] = useState({})
  const [monthLoading, setMonthLoading] = useState(false)
  const [date, setDate] = useState(null)
  const [slots, setSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setMonthLoading(true)
    fetch(`/api/availability?month=${month}`).then((r) => r.json())
      .then((data) => setMonthDays(data.days || {}))
      .finally(() => setMonthLoading(false))
  }, [month])

  const selectDate = (dateISO) => {
    setDate(dateISO)
    setSlotsLoading(true)
    fetch(`/api/availability?date=${dateISO}`).then((r) => r.json())
      .then((data) => setSlots(data.slots || []))
      .finally(() => setSlotsLoading(false))
  }

  const pickSlot = async (slotId) => {
    setSubmitting(true)
    setError('')
    const { data } = await actionFetch('/api/booking-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, action: 'reschedule', newSlotId: slotId }),
    })
    setSubmitting(false)
    if (!data.ok) { setError(data.error || 'Could not reschedule that booking.'); return }
    onDone(data.booking)
  }

  return (
    <div>
      <MonthCalendar
        month={month}
        today={getPacificTodayISO()}
        minMonth={getPacificCurrentMonth()}
        dayStatus={monthDays}
        selectedDate={date}
        onSelectDate={selectDate}
        onMonthChange={setMonth}
        loading={monthLoading}
      />
      {date && (
        <div className="mt-4">
          <p className="text-xs font-mono uppercase tracking-widest text-muted mb-2">Open times &middot; {formatDayLabel(date)}</p>
          {slotsLoading ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-muted">No open times that day.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {slots.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  disabled={submitting}
                  onClick={() => pickSlot(s.id)}
                  className="text-sm font-medium bg-background border border-divider text-ink px-3.5 py-2 rounded-full hover:border-primary/40 disabled:opacity-50"
                >
                  {s.time}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
    </div>
  )
}

export default function ManageBooking() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const initialAction = params.get('action') || ''

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [role, setRole] = useState(null)
  const [booking, setBooking] = useState(null)
  const [mode, setMode] = useState(null) // null | 'reschedule'
  const [pendingAction, setPendingAction] = useState('')
  const [actionError, setActionError] = useState('')
  const [done, setDone] = useState(null) // final status message once acted

  useEffect(() => {
    if (!token) { setLoadError('This link is missing its access token.'); setLoading(false); return }
    actionFetch(`/api/booking-action?token=${encodeURIComponent(token)}`).then(({ data }) => {
      if (!data.ok) { setLoadError(data.error || 'This link has expired or is invalid.'); return }
      setRole(data.role)
      setBooking(data.booking)
      if (initialAction === 'reschedule') setMode('reschedule')
    }).finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const runAction = async (action) => {
    setPendingAction(action)
    setActionError('')
    const { data } = await actionFetch('/api/booking-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, action }),
    })
    setPendingAction('')
    if (!data.ok) { setActionError(data.error || 'Something went wrong. Please try again.'); return }
    setBooking(data.booking)
    setDone(ACTION_COPY[action]?.status || data.booking.status)
  }

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-8 text-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </Card>
    )
  }

  if (loadError) {
    return (
      <Card>
        <div className="text-center py-4">
          <ShieldAlert className="h-8 w-8 text-red-500 mx-auto mb-3" />
          <p className="text-ink font-medium mb-1">Can&rsquo;t open this link</p>
          <p className="text-sm text-muted">{loadError}</p>
        </div>
      </Card>
    )
  }

  if (done) {
    return (
      <Card>
        <div className="text-center py-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 mx-auto mb-3">
            <Check className="h-5 w-5 text-emerald-600" />
          </span>
          <p className="text-ink font-medium mb-1">
            {done === 'confirmed' && 'Session confirmed.'}
            {done === 'declined' && 'Request declined.'}
            {done === 'cancelled' && 'Session cancelled.'}
            {!['confirmed', 'declined', 'cancelled'].includes(done) && 'Done.'}
          </p>
          <p className="text-sm text-muted">An email confirming this has been sent.</p>
        </div>
      </Card>
    )
  }

  const actions = availableActions(role, booking.status)

  if (mode === 'reschedule') {
    return (
      <Card>
        <Summary booking={booking} />
        <ReschedulePanel token={token} onDone={(b) => { setBooking(b); setDone('rescheduled') }} />
        <button type="button" onClick={() => setMode(null)} className="text-xs text-muted mt-4 hover:text-ink">← Back</button>
      </Card>
    )
  }

  return (
    <Card>
      <Summary booking={booking} />
      {actions.length === 0 ? (
        <p className="text-sm text-muted">
          This booking is already <strong className="text-ink">{booking.status}</strong> — there&rsquo;s nothing left to change here.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2.5">
          {actions.map((action) => action === 'reschedule' ? (
            <button
              key={action}
              type="button"
              onClick={() => setMode('reschedule')}
              className="text-sm font-semibold bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-full transition"
            >
              Reschedule
            </button>
          ) : (
            <button
              key={action}
              type="button"
              disabled={pendingAction === action}
              onClick={() => runAction(action)}
              className={`text-sm font-semibold text-white px-4 py-2.5 rounded-full transition disabled:opacity-60 ${ACTION_COPY[action].bg}`}
            >
              {pendingAction === action ? 'Working…' : ACTION_COPY[action].label}
            </button>
          ))}
        </div>
      )}
      {actionError && <p className="text-red-600 text-sm mt-3">{actionError}</p>}
    </Card>
  )
}
