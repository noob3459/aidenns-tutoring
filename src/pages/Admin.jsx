import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Sigma, Lock, LogOut, ExternalLink, Save, Check, Plus,
  Phone as PhoneIcon, CalendarClock, FileText, AlertTriangle, ShieldAlert,
  Loader2, Trash2, Archive, RotateCcw, Copy, RefreshCw, Paintbrush, Undo2, Redo2,
} from 'lucide-react'
import { useSiteConfig, SiteConfigProvider } from '../context/SiteConfigContext.jsx'
import { EditorSelectionProvider } from '../context/EditorSelectionContext.jsx'
import MonthCalendar from '../components/MonthCalendar.jsx'
import EditorPreviewFrame, { PREVIEW_PAGES } from '../components/editor/EditorPreviewFrame.jsx'
import EditorSidePanel from '../components/editor/EditorSidePanel.jsx'
import { getPacificCurrentMonth, getPacificTodayISO, formatDayLabel, isValidDateISO } from '../lib/timezone.js'
import { ALL_GRADES } from '../lib/grades.js'

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

async function adminFetch(url, options = {}) {
  const res = await fetch(url, { ...options, credentials: 'same-origin' })
  const data = await res.json().catch(() => ({ ok: false, error: 'Unexpected server response.' }))
  return { res, data }
}

/* ---------------- Login gate ---------------- */
function LoginGate({ onSuccess }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    const { res, data } = await adminFetch('/api/admin/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', passcode: value }),
    })
    setSubmitting(false)
    if (res.ok && data.ok) {
      onSuccess()
    } else {
      setError(data.error || 'Incorrect passcode.')
    }
  }

  return (
    <div className="min-h-screen bg-deep flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-8">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary mb-4">
            <Lock className="h-5 w-5 text-white" strokeWidth={2.4} />
          </span>
          <h1 className="font-display font-bold text-2xl text-white">Admin Access</h1>
          <p className="text-white/50 text-sm mt-1.5">Aidenn&rsquo;s Tutoring &middot; Site Settings</p>
        </div>
        <form onSubmit={submit} className="bg-white/5 border border-white/10 rounded-3xl p-6">
          <label className="block text-xs font-mono uppercase tracking-widest text-white/50 mb-2">Passcode</label>
          <input
            type="password"
            autoFocus
            value={value}
            onChange={(e) => { setValue(e.target.value); setError('') }}
            className="w-full rounded-2xl bg-white/10 border border-white/15 px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-primary/60"
            placeholder="Enter passcode"
          />
          {error && <p className="text-accent text-xs mt-2">{error}</p>}
          <button type="submit" disabled={submitting} className="magnetic-btn w-full mt-5 bg-primary text-white font-semibold py-3 rounded-2xl disabled:opacity-60">
            {submitting ? 'Checking…' : 'Unlock'}
          </button>
        </form>
        <Link to="/" className="block text-center text-white/40 text-xs mt-6 hover:text-white/70 transition">← Back to site</Link>
      </div>
    </div>
  )
}

/* ---------------- Shared bits ---------------- */
function Input({ label, ...props }) {
  return (
    <label className="block">
      <span className="block text-xs font-mono uppercase tracking-widest text-muted mb-2">{label}</span>
      <input {...props} className="admin-input" />
    </label>
  )
}

function TextArea({ label, ...props }) {
  return (
    <label className="block">
      <span className="block text-xs font-mono uppercase tracking-widest text-muted mb-2">{label}</span>
      <textarea {...props} className="admin-input resize-none" />
    </label>
  )
}

function SaveBar({ onSave, saved, error }) {
  return (
    <div className="mt-8 pt-6 border-t border-divider">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onSave} className="magnetic-btn inline-flex items-center gap-2 bg-primary text-white font-semibold px-6 py-3 rounded-full text-sm">
          <Save className="h-4 w-4" /> Save Changes
        </button>
        {saved && (
          <span className="inline-flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
            <Check className="h-4 w-4" /> Saved
          </span>
        )}
      </div>
      {error && (
        <p className="mt-2.5 flex items-start gap-1.5 text-red-600 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /> {error}
        </p>
      )}
    </div>
  )
}

/* ---------------- Tab: Contact & Links ---------------- */
function ContactTab({ config, updateConfig }) {
  const [form, setForm] = useState(config.contact)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => { setForm((p) => ({ ...p, [k]: v })); setSaved(false) }

  const save = async () => {
    setError('')
    const result = await updateConfig({ contact: form })
    if (result.ok) setSaved(true)
    else setError(result.error || 'Could not save. Please try again.')
  }

  return (
    <div>
      <h2 className="font-display font-bold text-xl text-ink mb-1">Contact & Links</h2>
      <p className="text-muted text-sm mb-6">Shown in the navbar, footer, contact page, and booking wizard site-wide.</p>
      <div className="grid sm:grid-cols-2 gap-4">
        <Input label="Phone (display)" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="(555) 010-2947" />
        <Input label="Phone (tel: link, E.164)" value={form.phoneTel} onChange={(e) => set('phoneTel', e.target.value)} placeholder="+15550102947" />
        <Input label="Contact Email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="hello@yoursite.org" />
        <Input label="Donation Email" value={form.donateEmail} onChange={(e) => set('donateEmail', e.target.value)} placeholder="donate@yoursite.org" />
        <Input label="Serving Area" value={form.serving} onChange={(e) => set('serving', e.target.value)} placeholder="Online nationwide & in-person locally" />
        <Input label="Hours" value={form.hours} onChange={(e) => set('hours', e.target.value)} placeholder="Mon-Fri · 3:00-7:00 PM" />
      </div>
      <SaveBar onSave={save} saved={saved} error={error} />
    </div>
  )
}

/* ---------------- Tab: Availability (calendar-backed) ---------------- */
function StatusPill({ status }) {
  const styles = {
    pending: 'bg-accent/15 text-accent-dark border-accent/30',
    confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    completed: 'bg-primary/10 text-primary-dark border-primary/20',
    declined: 'bg-divider/40 text-muted border-divider',
    cancelled: 'bg-red-50 text-red-600 border-red-200',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-widest border ${styles[status] || styles.declined}`}>
      {status}
    </span>
  )
}

function AvailabilityTab() {
  const todayISO = getPacificTodayISO()
  const [month, setMonth] = useState(getPacificCurrentMonth())
  const [monthDays, setMonthDays] = useState({})
  const [monthLoading, setMonthLoading] = useState(false)

  const [selectedDate, setSelectedDate] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')

  const [addTime, setAddTime] = useState('15:30')
  const [addDuration, setAddDuration] = useState(30)
  const [genStart, setGenStart] = useState('15:00')
  const [genEnd, setGenEnd] = useState('18:00')
  const [genDuration, setGenDuration] = useState(30)
  const [copyTargets, setCopyTargets] = useState('')
  const [busy, setBusy] = useState(false)

  const [rules, setRules] = useState([])
  const [rulesLoading, setRulesLoading] = useState(false)
  const [ruleForm, setRuleForm] = useState({ weekday: 1, startTime: '15:00', endTime: '18:00', durationMinutes: 30 })
  const [generateWeeks, setGenerateWeeks] = useState(8)

  const loadMonth = (m) => {
    setMonthLoading(true)
    adminFetch(`/api/admin/availability?month=${m}`)
      .then(({ data }) => setMonthDays(data.days || {}))
      .finally(() => setMonthLoading(false))
  }

  const loadDetail = (date) => {
    setDetailLoading(true)
    setDetailError('')
    adminFetch(`/api/admin/availability?date=${date}`)
      .then(({ data }) => setDetail(data))
      .finally(() => setDetailLoading(false))
  }

  const loadRules = () => {
    setRulesLoading(true)
    adminFetch('/api/admin/availability?rules=1')
      .then(({ data }) => setRules(data.rules || []))
      .finally(() => setRulesLoading(false))
  }

  useEffect(() => { loadMonth(month) }, [month])
  useEffect(() => { loadRules() }, [])
  useEffect(() => { if (selectedDate) loadDetail(selectedDate) }, [selectedDate])

  // Derive a coarse status per date for the calendar (available/full/closed)
  const dayStatus = Object.fromEntries(
    Object.entries(monthDays).map(([date, d]) => [
      date,
      d.isClosed ? 'closed' : d.open > 0 ? 'available' : d.total > 0 ? 'full' : 'closed',
    ])
  )

  const refreshAll = () => {
    loadMonth(month)
    if (selectedDate) loadDetail(selectedDate)
  }

  const toggleClosed = async (isClosed) => {
    setBusy(true)
    await adminFetch('/api/admin/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set-day', date: selectedDate, isClosed, notes: detail?.notes || '' }),
    })
    setBusy(false)
    refreshAll()
  }

  const saveNotes = async (notes) => {
    setBusy(true)
    await adminFetch('/api/admin/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set-day', date: selectedDate, isClosed: detail?.isClosed || false, notes }),
    })
    setBusy(false)
    refreshAll()
  }

  const addSlot = async () => {
    setBusy(true)
    setDetailError('')
    const { data } = await adminFetch('/api/admin/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add-slot', date: selectedDate, startTime: addTime, durationMinutes: Number(addDuration) }),
    })
    setBusy(false)
    if (!data.ok) setDetailError(data.error)
    refreshAll()
  }

  const generateSlots = async () => {
    setBusy(true)
    setDetailError('')
    const { data } = await adminFetch('/api/admin/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'generate-slots', date: selectedDate, startTime: genStart, endTime: genEnd, durationMinutes: Number(genDuration) }),
    })
    setBusy(false)
    if (!data.ok) setDetailError(data.error)
    refreshAll()
  }

  // "Remove" archives — the slot row is never deleted, so a completed/
  // declined/cancelled booking's history (and its slot_id reference)
  // stays fully intact. Blocked server-side if a pending/confirmed
  // booking still references the slot.
  const archiveSlot = async (slotId) => {
    setBusy(true)
    setDetailError('')
    const { data } = await adminFetch('/api/admin/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'archive-slot', slotId }),
    })
    setBusy(false)
    if (!data.ok) setDetailError(data.error)
    refreshAll()
  }

  const restoreSlot = async (slotId) => {
    setBusy(true)
    setDetailError('')
    const { data } = await adminFetch('/api/admin/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'restore-slot', slotId }),
    })
    setBusy(false)
    if (!data.ok) setDetailError(data.error)
    refreshAll()
  }

  const copyToTargets = async () => {
    const targetDates = copyTargets.split(',').map((s) => s.trim()).filter(isValidDateISO)
    if (!targetDates.length) { setDetailError('Enter one or more valid dates (YYYY-MM-DD), comma-separated.'); return }
    setBusy(true)
    setDetailError('')
    const { data } = await adminFetch('/api/admin/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'copy', sourceDate: selectedDate, targetDates }),
    })
    setBusy(false)
    if (!data.ok) setDetailError(data.error)
    else setCopyTargets('')
    refreshAll()
  }

  const changeBookingStatus = async (bookingId, status) => {
    setBusy(true)
    await adminFetch('/api/admin/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'booking-status', bookingId, status }),
    })
    setBusy(false)
    refreshAll()
  }

  const createRule = async () => {
    setBusy(true)
    const { data } = await adminFetch('/api/admin/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create-rule', ...ruleForm }),
    })
    setBusy(false)
    if (data.ok) loadRules()
  }

  const removeRule = async (id) => {
    setBusy(true)
    await adminFetch('/api/admin/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete-rule', ruleId: id }),
    })
    setBusy(false)
    loadRules()
  }

  const generateFromRules = async () => {
    setBusy(true)
    const { data } = await adminFetch('/api/admin/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'generate-from-rules', weeks: Number(generateWeeks) }),
    })
    setBusy(false)
    if (data.ok) { refreshAll() }
  }

  return (
    <div>
      <h2 className="font-display font-bold text-xl text-ink mb-1">Booking Availability</h2>
      <p className="text-muted text-sm mb-6">Click a date to manage its time slots, close it, or review its bookings.</p>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="min-w-0 overflow-x-auto">
          <MonthCalendar
            month={month}
            today={todayISO}
            minMonth={getPacificCurrentMonth()}
            maxMonth={undefined}
            allowSelectAnyStatus
            dayStatus={dayStatus}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onMonthChange={setMonth}
            loading={monthLoading}
            renderBadge={(date) => {
              const d = monthDays[date]
              if (!d) return null
              const bits = []
              if (d.requested) bits.push(`${d.requested}r`)
              if (d.confirmed) bits.push(`${d.confirmed}c`)
              return bits.length ? (
                <span className="absolute -top-1 -right-1 bg-accent text-deep text-[8px] font-bold rounded-full px-1 leading-tight">
                  {bits.join(' ')}
                </span>
              ) : null
            }}
          />
        </div>

        <div className="min-w-0">
          {!selectedDate ? (
            <div className="h-full flex items-center justify-center text-center text-muted text-sm bg-background border border-dashed border-divider rounded-3xl p-8">
              Select a date on the calendar to manage its availability.
            </div>
          ) : detailLoading ? (
            <div className="flex items-center gap-2 text-muted text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Loading&hellip;</div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-ink">{formatDayLabel(selectedDate)}</h3>
                <label className="inline-flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" checked={detail?.isClosed || false} onChange={(e) => toggleClosed(e.target.checked)} />
                  Closed / blackout
                </label>
              </div>

              <TextArea
                label="Private admin notes (never shown publicly)"
                rows={2}
                defaultValue={detail?.notes || ''}
                onBlur={(e) => saveNotes(e.target.value)}
              />

              {detailError && (
                <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {detailError}
                </div>
              )}

              <div>
                <p className="text-xs font-mono uppercase tracking-widest text-muted mb-2">Slots</p>
                <div className="space-y-2">
                  {(detail?.slots || []).filter((s) => !s.archived_at).length === 0 && <p className="text-muted text-sm">No active slots.</p>}
                  {(detail?.slots || []).filter((s) => !s.archived_at).map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-2 bg-background border border-divider rounded-xl px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{s.start_time.slice(0, 5)}</span>
                        <span className="text-muted text-xs">{s.duration_minutes}min</span>
                        {s.booking ? <StatusPill status={s.booking.status} /> : <StatusPill status="open" />}
                      </div>
                      <button type="button" onClick={() => archiveSlot(s.id)} disabled={busy} title="Archive (never deletes — keeps history)" className="text-muted hover:text-red-600 transition">
                        <Archive className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {(detail?.slots || []).filter((s) => s.archived_at).length > 0 && (
                <details className="text-sm">
                  <summary className="text-xs font-mono uppercase tracking-widest text-muted cursor-pointer select-none">
                    Archived ({(detail?.slots || []).filter((s) => s.archived_at).length}) &mdash; history is kept, never deleted
                  </summary>
                  <div className="space-y-2 mt-2">
                    {(detail?.slots || []).filter((s) => s.archived_at).map((s) => (
                      <div key={s.id} className="flex items-center justify-between gap-2 bg-background/60 border border-divider/60 rounded-xl px-3 py-2 text-sm opacity-70">
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{s.start_time.slice(0, 5)}</span>
                          <span className="text-muted text-xs">{s.duration_minutes}min</span>
                          {s.booking && <StatusPill status={s.booking.status} />}
                        </div>
                        <button type="button" onClick={() => restoreSlot(s.id)} disabled={busy} title="Restore to active" className="text-muted hover:text-emerald-600 transition">
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {(detail?.slots || []).filter((s) => s.booking).length > 0 && (
                <div>
                  <p className="text-xs font-mono uppercase tracking-widest text-muted mb-2">Bookings</p>
                  <div className="space-y-2">
                    {(detail?.slots || []).filter((s) => s.booking).map((s) => (
                      <div key={s.booking.id} className="bg-white border border-divider rounded-xl p-3 text-sm">
                        <p className="font-medium text-ink">{s.booking.parent_name} &middot; {s.booking.student_name} (Grade {s.booking.grade})</p>
                        <p className="text-muted text-xs mt-0.5">{s.booking.email} &middot; {s.booking.phone} &middot; {s.booking.format}</p>
                        {s.booking.notes && <p className="text-muted text-xs mt-1 italic">&ldquo;{s.booking.notes}&rdquo;</p>}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {s.booking.status === 'pending' && (
                            <>
                              <button onClick={() => changeBookingStatus(s.booking.id, 'confirmed')} className="text-xs bg-emerald-500 text-white px-2.5 py-1 rounded-full">Confirm</button>
                              <button onClick={() => changeBookingStatus(s.booking.id, 'declined')} className="text-xs bg-divider text-ink px-2.5 py-1 rounded-full">Decline</button>
                            </>
                          )}
                          {s.booking.status === 'confirmed' && (
                            <>
                              <button onClick={() => changeBookingStatus(s.booking.id, 'completed')} className="text-xs bg-primary text-white px-2.5 py-1 rounded-full">Mark Completed</button>
                              <button onClick={() => changeBookingStatus(s.booking.id, 'cancelled')} className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full">Cancel</button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-divider">
                <div className="min-w-0">
                  <p className="text-xs font-mono uppercase tracking-widest text-muted mb-2">Add one slot</p>
                  <div className="flex flex-wrap gap-2">
                    <input type="time" value={addTime} onChange={(e) => setAddTime(e.target.value)} className="admin-input min-w-28 flex-1" />
                    <input type="number" min={5} max={240} value={addDuration} onChange={(e) => setAddDuration(e.target.value)} className="admin-input w-20 shrink-0" title="Duration (min)" />
                    <button onClick={addSlot} disabled={busy} className="shrink-0 bg-primary/10 text-primary-dark px-3 rounded-2xl"><Plus className="h-4 w-4" /></button>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-mono uppercase tracking-widest text-muted mb-2">Generate a range</p>
                  <div className="flex flex-wrap gap-2">
                    <input type="time" value={genStart} onChange={(e) => setGenStart(e.target.value)} className="admin-input min-w-28 flex-1" />
                    <input type="time" value={genEnd} onChange={(e) => setGenEnd(e.target.value)} className="admin-input min-w-28 flex-1" />
                    <button onClick={generateSlots} disabled={busy} className="shrink-0 bg-primary/10 text-primary-dark px-3 rounded-2xl"><Plus className="h-4 w-4" /></button>
                  </div>
                  <input type="number" min={5} max={240} value={genDuration} onChange={(e) => setGenDuration(e.target.value)} className="admin-input mt-2 w-24" title="Duration (min)" />
                </div>
              </div>

              <div>
                <p className="text-xs font-mono uppercase tracking-widest text-muted mb-2">Copy this date&rsquo;s slots to&hellip;</p>
                <div className="flex flex-wrap gap-2">
                  <input
                    value={copyTargets}
                    onChange={(e) => setCopyTargets(e.target.value)}
                    placeholder="2026-09-01, 2026-09-08, ..."
                    className="admin-input min-w-0 flex-1"
                  />
                  <button onClick={copyToTargets} disabled={busy} className="shrink-0 bg-primary/10 text-primary-dark px-3 rounded-2xl"><Copy className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-10 pt-8 border-t border-divider">
        <h3 className="font-display font-bold text-lg text-ink mb-1">Recurring Weekly Availability</h3>
        <p className="text-muted text-sm mb-4">Define a weekly pattern, then generate concrete slots for upcoming weeks. Generating never overwrites existing slots or bookings.</p>

        <div className="space-y-2 mb-4">
          {rulesLoading && <Loader2 className="h-4 w-4 animate-spin text-muted" />}
          {!rulesLoading && rules.length === 0 && <p className="text-muted text-sm">No recurring rules yet.</p>}
          {rules.map((r) => (
            <div key={r.id} className="flex items-center justify-between bg-background border border-divider rounded-xl px-3 py-2 text-sm">
              <span>{WEEKDAY_NAMES[r.weekday]} &middot; {r.start_time.slice(0, 5)}&ndash;{r.end_time.slice(0, 5)} &middot; {r.duration_minutes}min slots</span>
              <button onClick={() => removeRule(r.id)} className="text-muted hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 mb-3">
          <select value={ruleForm.weekday} onChange={(e) => setRuleForm({ ...ruleForm, weekday: Number(e.target.value) })} className="admin-input min-w-0">
            {WEEKDAY_NAMES.map((w, i) => <option key={w} value={i}>{w}</option>)}
          </select>
          <input type="time" value={ruleForm.startTime} onChange={(e) => setRuleForm({ ...ruleForm, startTime: e.target.value })} className="admin-input min-w-0" />
          <input type="time" value={ruleForm.endTime} onChange={(e) => setRuleForm({ ...ruleForm, endTime: e.target.value })} className="admin-input min-w-0" />
          <input type="number" min={5} max={240} value={ruleForm.durationMinutes} onChange={(e) => setRuleForm({ ...ruleForm, durationMinutes: Number(e.target.value) })} className="admin-input min-w-0" title="Duration (min)" />
          <button onClick={createRule} disabled={busy} className="min-w-0 col-span-2 lg:col-span-1 inline-flex items-center justify-center gap-1.5 bg-primary/10 text-primary-dark rounded-2xl text-sm font-medium"><Plus className="h-4 w-4" /> Add Rule</button>
        </div>

        <div className="flex items-center gap-2">
          <input type="number" min={1} max={26} value={generateWeeks} onChange={(e) => setGenerateWeeks(e.target.value)} className="admin-input w-24" />
          <button onClick={generateFromRules} disabled={busy} className="magnetic-btn inline-flex items-center gap-2 bg-primary text-white font-semibold px-5 py-2.5 rounded-full text-sm">
            <RefreshCw className="h-4 w-4" /> Generate Slots for Next {generateWeeks} Weeks
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------------- Tab: Site Content ---------------- */
function ContentTab({ config, updateConfig }) {
  const [hero, setHero] = useState(config.hero)
  const [pages, setPages] = useState(config.pages)
  const [footer, setFooter] = useState(config.footer)
  const [stats, setStats] = useState(config.stats)
  const [booking, setBooking] = useState(config.booking)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const setPageField = (page, key, value) => {
    setPages((prev) => ({ ...prev, [page]: { ...prev[page], [key]: value } }))
    setSaved(false)
  }

  const setGrade = (key, value) => {
    setBooking((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const save = async () => {
    setError('')
    const result = await updateConfig({ hero, pages, footer, stats: {
      sessions: Number(stats.sessions) || 0,
      freePercent: Number(stats.freePercent) || 0,
      replyHours: Number(stats.replyHours) || 0,
    }, booking })
    if (result.ok) setSaved(true)
    else setError(result.error || 'Could not save. Please try again.')
  }

  const pageGroups = [
    { key: 'services', title: 'Services Page' },
    { key: 'approach', title: 'Approach Page' },
    { key: 'contact', title: 'Contact Page' },
    { key: 'booking', title: 'Booking Page' },
  ]

  return (
    <div>
      <h2 className="font-display font-bold text-xl text-ink mb-1">Site Content</h2>
      <p className="text-muted text-sm mb-6">Edit the copy shown across the homepage, section headers, footer, and stats.</p>

      <div className="mb-8">
        <p className="text-xs font-mono uppercase tracking-widest text-primary-dark mb-3">Home Hero</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Eyebrow badge" value={hero.eyebrow} onChange={(e) => { setHero({ ...hero, eyebrow: e.target.value }); setSaved(false) }} />
          <Input label="Headline Line 1" value={hero.line1} onChange={(e) => { setHero({ ...hero, line1: e.target.value }); setSaved(false) }} />
          <Input label="Headline Line 2 (Italic Accent)" value={hero.line2} onChange={(e) => { setHero({ ...hero, line2: e.target.value }); setSaved(false) }} />
          <TextArea label="Subtext" rows={2} value={hero.subtext} onChange={(e) => { setHero({ ...hero, subtext: e.target.value }); setSaved(false) }} />
        </div>
      </div>

      {pageGroups.map(({ key, title }) => (
        <div key={key} className="mb-8">
          <p className="text-xs font-mono uppercase tracking-widest text-primary-dark mb-3">{title}</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Eyebrow" value={pages[key].eyebrow} onChange={(e) => setPageField(key, 'eyebrow', e.target.value)} />
            <Input label="Heading Line 1" value={pages[key].heading1} onChange={(e) => setPageField(key, 'heading1', e.target.value)} />
            <Input label="Heading Line 2 (Italic Accent)" value={pages[key].heading2} onChange={(e) => setPageField(key, 'heading2', e.target.value)} />
            <TextArea label="Subtext" rows={2} value={pages[key].sub} onChange={(e) => setPageField(key, 'sub', e.target.value)} />
          </div>
        </div>
      ))}

      <div className="mb-8">
        <p className="text-xs font-mono uppercase tracking-widest text-primary-dark mb-3">Footer</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Tagline Line 1" value={footer.tagline1} onChange={(e) => { setFooter({ ...footer, tagline1: e.target.value }); setSaved(false) }} />
          <Input label="Tagline Line 2 (Italic Accent)" value={footer.tagline2} onChange={(e) => { setFooter({ ...footer, tagline2: e.target.value }); setSaved(false) }} />
          <TextArea label="Blurb" rows={2} value={footer.blurb} onChange={(e) => { setFooter({ ...footer, blurb: e.target.value }); setSaved(false) }} />
        </div>
      </div>

      <div className="mb-8">
        <p className="text-xs font-mono uppercase tracking-widest text-primary-dark mb-3">Stats Strip</p>
        <div className="grid sm:grid-cols-3 gap-4">
          <Input label="Sessions taught" type="number" value={stats.sessions} onChange={(e) => { setStats({ ...stats, sessions: e.target.value }); setSaved(false) }} />
          <Input label="Free percent" type="number" value={stats.freePercent} onChange={(e) => { setStats({ ...stats, freePercent: e.target.value }); setSaved(false) }} />
          <Input label="Avg. reply (hrs)" type="number" value={stats.replyHours} onChange={(e) => { setStats({ ...stats, replyHours: e.target.value }); setSaved(false) }} />
        </div>
      </div>

      <div className="mb-2">
        <p className="text-xs font-mono uppercase tracking-widest text-primary-dark mb-3">Grades Served</p>
        <p className="text-muted text-sm mb-3">Controls which grade buttons appear in step 1 of the booking wizard.</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-xs font-mono uppercase tracking-widest text-muted mb-2">Youngest grade</span>
            <select value={booking.minGrade} onChange={(e) => setGrade('minGrade', e.target.value)} className="admin-input">
              {ALL_GRADES.map((g) => <option key={g} value={g}>{g === 'K' ? 'Kindergarten' : `Grade ${g}`}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="block text-xs font-mono uppercase tracking-widest text-muted mb-2">Oldest grade</span>
            <select value={booking.maxGrade} onChange={(e) => setGrade('maxGrade', e.target.value)} className="admin-input">
              {ALL_GRADES.map((g) => <option key={g} value={g}>{g === 'K' ? 'Kindergarten' : `Grade ${g}`}</option>)}
            </select>
          </label>
        </div>
      </div>

      <SaveBar onSave={save} saved={saved} error={error} />
    </div>
  )
}

/* ---------------- Tab: Danger Zone ---------------- */
function DangerTab({ resetConfig }) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  const doReset = async () => {
    await resetConfig()
    setConfirmOpen(false)
  }

  return (
    <div>
      <h2 className="font-display font-bold text-xl text-ink mb-1">Danger Zone</h2>
      <p className="text-muted text-sm mb-6">Irreversible actions. Proceed carefully.</p>

      <div className="rounded-3xl border border-red-200 bg-red-50/60 p-6">
        <div className="flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-display font-semibold text-ink">Reset site text to defaults</p>
            <p className="text-muted text-sm mt-1 leading-relaxed">
              This clears every edit made to contact info and page text back to the original template values.
              It does not touch availability, slots, or bookings.
            </p>
            {!confirmOpen ? (
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="mt-4 inline-flex items-center gap-2 bg-white border border-red-300 text-red-600 font-medium px-5 py-2.5 rounded-full text-sm hover:bg-red-100 transition"
              >
                Reset to Defaults
              </button>
            ) : (
              <div className="mt-4 flex items-center gap-3">
                <button type="button" onClick={doReset} className="inline-flex items-center gap-2 bg-red-600 text-white font-medium px-5 py-2.5 rounded-full text-sm">
                  Confirm Reset
                </button>
                <button type="button" onClick={() => setConfirmOpen(false)} className="text-sm text-muted font-medium">
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------------- Tab: Visual Editor ---------------- */
function UndoRedoControls() {
  const { undo, redo, canUndo, canRedo } = useSiteConfig()
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={undo}
        disabled={!canUndo}
        title="Undo"
        className="inline-flex items-center justify-center h-9 w-9 rounded-full border border-divider text-ink/70 hover:border-primary/40 disabled:opacity-30 disabled:hover:border-divider transition"
      >
        <Undo2 className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={redo}
        disabled={!canRedo}
        title="Redo"
        className="inline-flex items-center justify-center h-9 w-9 rounded-full border border-divider text-ink/70 hover:border-primary/40 disabled:opacity-30 disabled:hover:border-divider transition"
      >
        <Redo2 className="h-4 w-4" />
      </button>
    </div>
  )
}

function VisualEditorTab() {
  const [pageKey, setPageKey] = useState('home')

  return (
    <SiteConfigProvider>
      <EditorSelectionProvider>
        <div>
          <h2 className="font-display font-bold text-xl text-ink mb-1">Visual Editor</h2>
          <p className="text-muted text-sm mb-6">
            Click any element in the preview below to select it, then edit its text, color, font size, or
            entrance animation on the right. Nothing is saved until you press Save Changes.
          </p>

          <div className="flex flex-wrap items-center gap-2 mb-6">
            {PREVIEW_PAGES.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setPageKey(key)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  pageKey === key ? 'bg-primary text-white' : 'bg-background border border-divider text-ink/70 hover:border-primary/40'
                }`}
              >
                {label}
              </button>
            ))}
            <span className="ml-auto">
              <UndoRedoControls />
            </span>
          </div>

          <EditorPreviewFrame pageKey={pageKey} />
          <EditorSidePanel />
        </div>
      </EditorSelectionProvider>
    </SiteConfigProvider>
  )
}

/* ---------------- Admin Console ---------------- */
function AdminConsole() {
  const { config, updateConfig, resetConfig } = useSiteConfig()
  const [tab, setTab] = useState('contact')

  const logout = async () => {
    await fetch('/api/admin/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    })
    window.location.reload()
  }

  const tabs = [
    { key: 'contact', label: 'Contact & Links', Icon: PhoneIcon },
    { key: 'availability', label: 'Availability', Icon: CalendarClock },
    { key: 'content', label: 'Site Content', Icon: FileText },
    { key: 'editor', label: 'Visual Editor', Icon: Paintbrush },
    { key: 'danger', label: 'Danger Zone', Icon: AlertTriangle },
  ]

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-deep text-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
              <Sigma className="h-4 w-4 text-white" strokeWidth={2.4} />
            </span>
            <span className="font-display font-bold text-sm sm:text-base">Aidenn&rsquo;s Tutoring Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" target="_blank" className="hidden sm:inline-flex items-center gap-1.5 text-white/60 hover:text-white text-sm transition">
              View Site <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <button onClick={logout} className="inline-flex items-center gap-1.5 text-white/60 hover:text-white text-sm transition">
              <LogOut className="h-3.5 w-3.5" /> Log Out
            </button>
          </div>
        </div>
      </header>

      <div className={tab === 'editor'
        ? 'px-4 sm:px-6 pb-24 grid lg:grid-cols-[220px_1fr] gap-6 mt-6'
        : 'max-w-6xl mx-auto px-6 pb-24 grid lg:grid-cols-[220px_1fr] gap-8 mt-6'
      }>
        <nav className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
          {tabs.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium whitespace-nowrap transition-colors ${
                tab === key ? 'bg-primary text-white shadow-md shadow-primary/30' : 'text-ink/60 hover:bg-primary/5'
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </nav>

        <div className={tab === 'editor' ? 'min-w-0' : 'min-w-0 bg-white border border-divider rounded-5xl p-6 sm:p-10 shadow-sm'}>
          {tab === 'contact' && <ContactTab config={config} updateConfig={updateConfig} />}
          {tab === 'availability' && <AvailabilityTab />}
          {tab === 'content' && <ContentTab config={config} updateConfig={updateConfig} />}
          {tab === 'editor' && <VisualEditorTab />}
          {tab === 'danger' && <DangerTab resetConfig={resetConfig} />}
        </div>
      </div>

      <style>{`
        .admin-input {
          width: 100%;
          border: 1px solid #E3E1DA;
          border-radius: 1rem;
          padding: 0.7rem 1rem;
          font-size: 0.9rem;
          background: #F9F9F7;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .admin-input:focus {
          outline: none;
          border-color: #1B3A6B;
          box-shadow: 0 0 0 3px rgba(27,58,107,0.12);
          background: #FFFFFF;
        }
      `}</style>
    </div>
  )
}

/* ---------------- Page entry (auth gate) ---------------- */
export default function Admin() {
  const [authState, setAuthState] = useState('checking') // 'checking' | 'authed' | 'unauthed'

  useEffect(() => {
    fetch('/api/admin/session')
      .then((r) => r.json())
      .then((data) => setAuthState(data.authed ? 'authed' : 'unauthed'))
      .catch(() => setAuthState('unauthed'))
  }, [])

  if (authState === 'checking') {
    return (
      <div className="min-h-screen bg-deep flex items-center justify-center">
        <Loader2 className="h-6 w-6 text-white/50 animate-spin" />
      </div>
    )
  }

  if (authState === 'unauthed') return <LoginGate onSuccess={() => setAuthState('authed')} />
  return <AdminConsole />
}
