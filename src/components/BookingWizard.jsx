import { useEffect, useState } from 'react'
import {
  Phone, Mail, MapPin, ShieldCheck, Gift, Video, Calendar,
  ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, Loader2,
} from 'lucide-react'
import { useSiteConfig } from '../context/SiteConfigContext.jsx'
import { getPacificCurrentMonth, formatDayLabel } from '../lib/timezone.js'
import MonthCalendar from './MonthCalendar.jsx'
import Field from './Field.jsx'

const GRADES = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9']

export default function BookingWizard() {
  const { config } = useSiteConfig()
  const { contact } = config

  const [step, setStep] = useState(1)
  const [status, setStatus] = useState('idle') // 'idle' | 'sending' | 'sent' | 'error'
  const [errorMessage, setErrorMessage] = useState('')
  const [form, setForm] = useState({
    grade: '', format: '', dateISO: '', dayLabel: '', slotId: '', timeLabel: '',
    parentName: '', studentName: '', email: '', phone: '', notes: '',
    website: '', // honeypot — must stay empty
  })

  const [month, setMonth] = useState(getPacificCurrentMonth())
  const [bounds, setBounds] = useState({ today: '', minMonth: '', maxMonth: '' })
  const [dayStatus, setDayStatus] = useState({})
  const [monthLoading, setMonthLoading] = useState(false)
  const [slots, setSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setMonthLoading(true)
    fetch(`/api/availability?month=${month}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        setBounds({ today: data.today, minMonth: data.minMonth, maxMonth: data.maxMonth })
        setDayStatus(data.days || {})
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setMonthLoading(false) })
    return () => { cancelled = true }
  }, [month])

  const selectDate = (dateISO) => {
    setForm((prev) => ({ ...prev, dateISO, dayLabel: formatDayLabel(dateISO), slotId: '', timeLabel: '' }))
    setSlotsLoading(true)
    fetch(`/api/availability?date=${dateISO}`)
      .then((r) => r.json())
      .then((data) => setSlots(data.slots || []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false))
  }

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const canNext =
    (step === 1 && form.grade) ||
    (step === 2 && form.format) ||
    (step === 3 && form.dateISO && form.slotId)

  const onSubmit = async (e) => {
    e.preventDefault()
    setStatus('sending')
    setErrorMessage('')

    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Note: no date/time fields are sent — the server derives the
          // canonical requested_date/date_label/time from the slot row
          // itself (see supabase/schema.sql: claim_slot_and_book). form.
          // dateISO/dayLabel/timeLabel below are only used for this
          // page's own "Request received!" confirmation text.
          grade: form.grade,
          format: form.format,
          slotId: form.slotId,
          parentName: form.parentName,
          studentName: form.studentName,
          email: form.email,
          phone: form.phone,
          notes: form.notes,
          website: form.website,
        }),
      })

      const result = await res.json().catch(() => ({ ok: false, error: 'Unexpected server response.' }))

      if (!res.ok || !result.ok) {
        if (result.conflict) {
          setErrorMessage('That time slot was just taken by another family. Please choose a different time.')
          setStatus('error')
          setStep(3)
          selectDate(form.dateISO) // refresh the slot list so the taken one disappears
          update('slotId', '')
          update('timeLabel', '')
          return
        }
        setErrorMessage(result.error || 'Something went wrong sending your request. Please try again.')
        setStatus('error')
        return
      }

      setStatus('sent')
    } catch {
      setErrorMessage('Couldn’t reach the server. Check your connection and try again.')
      setStatus('error')
    }
  }

  const steps = [
    { n: 1, label: 'Grade' },
    { n: 2, label: 'Format' },
    { n: 3, label: 'Time' },
    { n: 4, label: 'Details' },
  ]

  return (
    <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-12">
      {/* Left info column */}
      <div className="lg:col-span-5">
        <span className="font-mono text-xs uppercase tracking-[0.25em] text-primary-dark">{config.pages.booking.eyebrow}</span>
        <h1 className="font-display font-extrabold text-4xl sm:text-5xl text-ink mt-4 leading-[1.05] tracking-tight">
          {config.pages.booking.heading1}
          <span className="block font-serif italic font-medium text-primary-dark">{config.pages.booking.heading2}</span>
        </h1>
        <p className="text-muted text-base sm:text-lg mt-6 leading-relaxed max-w-md">{config.pages.booking.sub}</p>

        <div className="mt-10 space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
              <Phone className="h-4.5 w-4.5 text-primary" strokeWidth={2} />
            </span>
            <div>
              <p className="text-xs font-mono uppercase tracking-widest text-muted">Call or text</p>
              <a href={`tel:${contact.phoneTel}`} className="text-ink font-medium hover:text-primary transition">{contact.phone}</a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
              <Mail className="h-4.5 w-4.5 text-primary" strokeWidth={2} />
            </span>
            <div>
              <p className="text-xs font-mono uppercase tracking-widest text-muted">Email</p>
              <a href={`mailto:${contact.email}`} className="text-ink font-medium hover:text-primary transition">{contact.email}</a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
              <MapPin className="h-4.5 w-4.5 text-primary" strokeWidth={2} />
            </span>
            <div>
              <p className="text-xs font-mono uppercase tracking-widest text-muted">Serving</p>
              <p className="text-ink font-medium">{contact.serving}</p>
            </div>
          </div>
        </div>

        <div className="mt-10 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-2 text-sm text-accent-dark font-medium">
          <ShieldCheck className="h-4 w-4" strokeWidth={2} />
          100% free, no card required, ever.
        </div>
      </div>

      {/* Right wizard card */}
      <div className="lg:col-span-7">
        <div className="bg-white border border-divider rounded-5xl p-6 sm:p-10 shadow-xl shadow-primary/5">
          {status === 'sent' ? (
            <div className="flex flex-col items-center text-center py-10">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" strokeWidth={2} />
              </span>
              <h3 className="font-display font-bold text-2xl sm:text-3xl text-ink mt-6">Request received!</h3>
              <p className="text-muted mt-3 max-w-sm leading-relaxed">
                Grade {form.grade} &middot; {form.format} &middot; {form.dayLabel}, {form.timeLabel}. A receipt is on its way to {form.email || 'your inbox'}.
              </p>
              <div className="mt-4 max-w-sm rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-ink/80 leading-relaxed">
                This is a <strong>request</strong>, not a confirmed booking yet. We personally review and confirm every session, and will reach out shortly.
              </div>
              <div className="mt-8 w-full rounded-3xl border border-accent/25 bg-accent/5 p-5 flex flex-col sm:flex-row items-center gap-4 justify-between">
                <p className="text-sm text-ink/80 text-center sm:text-left">
                  This session is completely free. If today helped, you can support the next family.
                </p>
                <a
                  href={`mailto:${contact.donateEmail}?subject=I%27d%20like%20to%20donate`}
                  className="magnetic-btn shrink-0 inline-flex items-center gap-2 bg-accent text-white font-semibold px-5 py-2.5 rounded-full text-sm whitespace-nowrap"
                >
                  <Gift className="h-4 w-4" /> Donate
                </a>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center mb-10">
                {steps.map((s, i) => (
                  <div key={s.n} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center gap-1.5">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-full font-mono text-xs font-semibold transition-colors ${
                          step >= s.n ? 'bg-primary text-white' : 'bg-divider/60 text-muted'
                        }`}
                      >
                        {step > s.n ? <CheckCircle2 className="h-4 w-4" /> : s.n}
                      </span>
                      <span className="font-mono text-[9px] uppercase tracking-widest text-muted hidden sm:block">{s.label}</span>
                    </div>
                    {i < steps.length - 1 && (
                      <span className={`h-px flex-1 mx-2 transition-colors ${step > s.n ? 'bg-primary' : 'bg-divider'}`} />
                    )}
                  </div>
                ))}
              </div>

              <form onSubmit={onSubmit}>
                {/* Honeypot — invisible to real users, catches bots that fill every field */}
                <label className="absolute -left-[9999px] w-px h-px overflow-hidden" aria-hidden="true">
                  Leave this field blank
                  <input
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.website}
                    onChange={(e) => update('website', e.target.value)}
                  />
                </label>

                {step === 1 && (
                  <div>
                    <h3 className="font-display font-bold text-xl text-ink mb-1">What grade is your student in?</h3>
                    <p className="text-muted text-sm mb-6">We tutor kindergarten through 9th grade math. Free, always.</p>
                    <div className="grid grid-cols-5 gap-2.5">
                      {GRADES.map((g) => (
                        <button
                          type="button"
                          key={g}
                          onClick={() => update('grade', g)}
                          className={`h-14 rounded-2xl font-display font-bold text-lg transition-all ${
                            form.grade === g ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-105' : 'bg-background border border-divider text-ink hover:border-primary/40'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div>
                    <h3 className="font-display font-bold text-xl text-ink mb-1">Online or in person?</h3>
                    <p className="text-muted text-sm mb-6">Both formats are completely free.</p>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {[
                        { key: 'Online', Icon: Video, desc: 'Live video call with a shared digital whiteboard.' },
                        { key: 'In-Person', Icon: MapPin, desc: 'Meet at a local library or community space.' },
                      ].map(({ key, Icon, desc }) => (
                        <button
                          type="button"
                          key={key}
                          onClick={() => update('format', key)}
                          className={`text-left rounded-3xl border p-6 transition-all ${
                            form.format === key ? 'border-primary bg-primary/5 shadow-md' : 'border-divider hover:border-primary/40'
                          }`}
                        >
                          <Icon className={`h-6 w-6 mb-3 ${form.format === key ? 'text-primary' : 'text-muted'}`} strokeWidth={2} />
                          <p className="font-display font-semibold text-ink">{key}</p>
                          <p className="text-muted text-sm mt-1 leading-relaxed">{desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div>
                    <h3 className="font-display font-bold text-xl text-ink mb-1">Pick a day and time</h3>
                    <p className="text-muted text-sm mb-6">
                      All times Pacific (America/Los Angeles).
                    </p>

                    <MonthCalendar
                      month={month}
                      today={bounds.today}
                      minMonth={bounds.minMonth}
                      maxMonth={bounds.maxMonth}
                      dayStatus={dayStatus}
                      selectedDate={form.dateISO}
                      onSelectDate={selectDate}
                      onMonthChange={setMonth}
                      loading={monthLoading}
                    />

                    {form.dateISO && (
                      <div className="mt-6">
                        <p className="font-mono text-[10px] uppercase tracking-widest text-muted mb-3">
                          Open times &middot; {form.dayLabel}
                        </p>
                        {slotsLoading ? (
                          <div className="flex items-center gap-2 text-muted text-sm">
                            <Loader2 className="h-4 w-4 animate-spin" /> Loading times&hellip;
                          </div>
                        ) : slots.length === 0 ? (
                          <p className="text-muted text-sm bg-background border border-divider rounded-2xl p-4">
                            No open times on this date. Please pick another day.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2.5">
                            {slots.map((s) => (
                              <button
                                type="button"
                                key={s.id}
                                onClick={() => setForm((prev) => ({ ...prev, slotId: s.id, timeLabel: s.time }))}
                                className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                                  form.slotId === s.id ? 'bg-primary text-white shadow-md shadow-primary/30' : 'bg-background border border-divider text-ink hover:border-primary/40'
                                }`}
                              >
                                <Calendar className="h-3.5 w-3.5" /> {s.time}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {step === 4 && (
                  <div>
                    <h3 className="font-display font-bold text-xl text-ink mb-1">A few last details</h3>
                    <p className="text-muted text-sm mb-6">So we know who to expect, and where to send the confirmation.</p>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Field label="Parent / Guardian Name">
                        <input required value={form.parentName} onChange={(e) => update('parentName', e.target.value)} className="wizard-input" placeholder="Jamie Rivera" />
                      </Field>
                      <Field label="Student's First Name">
                        <input required value={form.studentName} onChange={(e) => update('studentName', e.target.value)} className="wizard-input" placeholder="Sam" />
                      </Field>
                      <Field label="Email">
                        <input required type="email" value={form.email} onChange={(e) => update('email', e.target.value)} className="wizard-input" placeholder="jamie@email.com" />
                      </Field>
                      <Field label="Phone">
                        <input required type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} className="wizard-input" placeholder="(555) 000-0000" />
                      </Field>
                    </div>
                    <div className="mt-4">
                      <Field label="Anything we should know? (optional)">
                        <textarea rows={3} value={form.notes} onChange={(e) => update('notes', e.target.value)} className="wizard-input resize-none" placeholder="e.g. struggling with fractions, needs a patient pace..." />
                      </Field>
                    </div>
                  </div>
                )}

                {status === 'error' && (
                  <div className="mt-6 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <p>{errorMessage}</p>
                  </div>
                )}

                <div className="mt-8 flex items-center justify-between">
                  <button
                    type="button"
                    disabled={status === 'sending'}
                    onClick={() => { setStatus('idle'); setStep((s) => Math.max(1, s - 1)) }}
                    className={`inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink transition disabled:opacity-40 ${step === 1 ? 'invisible' : ''}`}
                  >
                    <ChevronLeft className="h-4 w-4" /> Back
                  </button>

                  {step < 4 ? (
                    <button
                      type="button"
                      disabled={!canNext}
                      onClick={() => { setStatus('idle'); setStep((s) => Math.min(4, s + 1)) }}
                      className="magnetic-btn inline-flex items-center gap-2 bg-primary text-white font-semibold px-6 py-3 rounded-full disabled:opacity-40 disabled:pointer-events-none"
                    >
                      Continue <ChevronRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={status === 'sending'}
                      className="magnetic-btn inline-flex items-center gap-2 bg-primary text-white font-semibold px-6 py-3 rounded-full disabled:opacity-60 disabled:pointer-events-none"
                    >
                      {status === 'sending' ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Sending Request…
                        </>
                      ) : status === 'error' ? (
                        <>Try Again <ChevronRight className="h-4 w-4" /></>
                      ) : (
                        <>Request Free Session <ChevronRight className="h-4 w-4" /></>
                      )}
                    </button>
                  )}
                </div>
              </form>
            </>
          )}
        </div>
      </div>

      <style>{`
        .wizard-input {
          width: 100%;
          border: 1px solid #E3E1DA;
          border-radius: 1rem;
          padding: 0.75rem 1rem;
          font-size: 0.9rem;
          background: #F9F9F7;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .wizard-input:focus {
          outline: none;
          border-color: #1B3A6B;
          box-shadow: 0 0 0 3px rgba(27,58,107,0.12);
          background: #FFFFFF;
        }
      `}</style>
    </div>
  )
}
