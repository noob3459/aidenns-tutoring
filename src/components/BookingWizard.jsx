import { useEffect, useState } from 'react'
import {
  Phone, Mail, MapPin, ShieldCheck, Gift, Video, Calendar,
  ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, Loader2,
} from 'lucide-react'
import { useSiteConfig } from '../context/SiteConfigContext.jsx'
import { getPacificCurrentMonth, formatDayLabel } from '../lib/timezone.js'
import { gradeRange, fillGradeTemplate } from '../lib/grades.js'
import MonthCalendar from './MonthCalendar.jsx'
import Field from './Field.jsx'
import Editable from './editor/Editable.jsx'

const FORMAT_ICONS = { Online: Video, 'In-Person': MapPin }

export default function BookingWizard() {
  const { config } = useSiteConfig()
  const { contact } = config
  const bookingSteps = config.booking.steps
  const b = config.booking
  const GRADES = gradeRange(b.minGrade, b.maxGrade)
  const g = (text) => fillGradeTemplate(text, b.minGrade, b.maxGrade)

  const [step, setStep] = useState(1)
  const [status, setStatus] = useState('idle') // 'idle' | 'sending' | 'sent' | 'error'
  const [errorKind, setErrorKind] = useState(null) // 'conflict' | 'generic' | 'network' | 'unexpected' | null
  const [serverErrorMessage, setServerErrorMessage] = useState('')
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

  const errorMessage = serverErrorMessage || b.errors[errorKind] || ''

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
    setErrorKind(null)
    setServerErrorMessage('')

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

      const result = await res.json().catch(() => ({ ok: false, error: null, unexpected: true }))

      if (!res.ok || !result.ok) {
        if (result.conflict) {
          setErrorKind('conflict')
          setServerErrorMessage('')
          setStatus('error')
          setStep(3)
          selectDate(form.dateISO) // refresh the slot list so the taken one disappears
          update('slotId', '')
          update('timeLabel', '')
          return
        }
        if (result.unexpected) {
          setErrorKind('unexpected')
          setServerErrorMessage('')
        } else if (result.error) {
          setServerErrorMessage(result.error)
        } else {
          setErrorKind('generic')
        }
        setStatus('error')
        return
      }

      setStatus('sent')
    } catch {
      setErrorKind('network')
      setServerErrorMessage('')
      setStatus('error')
    }
  }

  const stepIndicator = b.stepIndicatorLabels.map((s, i) => ({ n: i + 1, label: s.label }))

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
              <Editable id="contact.phoneLabel" as="p" contentPath="contact.phoneLabel" label="Contact Phone Label" className="text-xs font-mono uppercase tracking-widest text-muted">
                {contact.phoneLabel}
              </Editable>
              <a href={`tel:${contact.phoneTel}`} className="text-ink font-medium hover:text-primary transition">{contact.phone}</a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
              <Mail className="h-4.5 w-4.5 text-primary" strokeWidth={2} />
            </span>
            <div>
              <Editable id="contact.emailLabel" as="p" contentPath="contact.emailLabel" label="Contact Email Label" className="text-xs font-mono uppercase tracking-widest text-muted">
                {contact.emailLabel}
              </Editable>
              <a href={`mailto:${contact.email}`} className="text-ink font-medium hover:text-primary transition">{contact.email}</a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
              <MapPin className="h-4.5 w-4.5 text-primary" strokeWidth={2} />
            </span>
            <div>
              <Editable id="contact.servingLabel" as="p" contentPath="contact.servingLabel" label="Contact Serving Label" className="text-xs font-mono uppercase tracking-widest text-muted">
                {contact.servingLabel}
              </Editable>
              <p className="text-ink font-medium">{contact.serving}</p>
            </div>
          </div>
        </div>

        <div className="mt-10 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-2 text-sm text-accent-dark font-medium">
          <ShieldCheck className="h-4 w-4" strokeWidth={2} />
          <Editable id="booking.freeNote" as="span" contentPath="booking.freeNote" label="Booking Free Note">{b.freeNote}</Editable>
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
              <Editable id="booking.confirmation.heading" as="h3" contentPath="booking.confirmation.heading" label="Confirmation Heading" className="font-display font-bold text-2xl sm:text-3xl text-ink mt-6">
                {b.confirmation.heading}
              </Editable>
              <p className="text-muted mt-3 max-w-sm leading-relaxed">
                Grade {form.grade} &middot; {form.format} &middot; {form.dayLabel}, {form.timeLabel}.{' '}
                <Editable id="booking.confirmation.receiptPrefix" as="span" contentPath="booking.confirmation.receiptPrefix" label="Confirmation Receipt Prefix">
                  {b.confirmation.receiptPrefix}
                </Editable>{' '}
                {form.email || (
                  <Editable id="booking.confirmation.receiptFallback" as="span" contentPath="booking.confirmation.receiptFallback" label="Confirmation Receipt Fallback">
                    {b.confirmation.receiptFallback}
                  </Editable>
                )}.
              </p>
              <div className="mt-4 max-w-sm rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-ink/80 leading-relaxed">
                <Editable id="booking.confirmation.notice" as="span" contentPath="booking.confirmation.notice" label="Confirmation Notice">
                  {b.confirmation.notice}
                </Editable>
              </div>
              <div className="mt-8 w-full rounded-3xl border border-accent/25 bg-accent/5 p-5 flex flex-col sm:flex-row items-center gap-4 justify-between">
                <Editable id="booking.confirmation.donatePrompt" as="p" contentPath="booking.confirmation.donatePrompt" label="Confirmation Donate Prompt" className="text-sm text-ink/80 text-center sm:text-left">
                  {b.confirmation.donatePrompt}
                </Editable>
                <a
                  href={`mailto:${contact.donateEmail}?subject=I%27d%20like%20to%20donate`}
                  className="magnetic-btn shrink-0 inline-flex items-center gap-2 bg-accent text-white font-semibold px-5 py-2.5 rounded-full text-sm whitespace-nowrap"
                >
                  <Gift className="h-4 w-4" />
                  <Editable id="booking.confirmation.donateButtonLabel" as="span" contentPath="booking.confirmation.donateButtonLabel" label="Confirmation Donate Button">
                    {b.confirmation.donateButtonLabel}
                  </Editable>
                </a>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center mb-10">
                {stepIndicator.map((s, i) => (
                  <div key={s.n} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center gap-1.5">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-full font-mono text-xs font-semibold transition-colors ${
                          step >= s.n ? 'bg-primary text-white' : 'bg-divider/60 text-muted'
                        }`}
                      >
                        {step > s.n ? <CheckCircle2 className="h-4 w-4" /> : s.n}
                      </span>
                      <Editable id={`booking.stepIndicatorLabels.${i}.label`} as="span" contentPath={`booking.stepIndicatorLabels.${i}.label`} label={`Step Indicator ${i + 1} Label`} className="font-mono text-[9px] uppercase tracking-widest text-muted hidden sm:block">
                        {s.label}
                      </Editable>
                    </div>
                    {i < stepIndicator.length - 1 && (
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
                    <Editable id="booking.steps.0.heading" as="h3" contentPath="booking.steps.0.heading" label="Booking Step 1 Heading" className="font-display font-bold text-xl text-ink mb-1">
                      {bookingSteps[0].heading}
                    </Editable>
                    <Editable id="booking.steps.0.sub" as="p" contentPath="booking.steps.0.sub" label="Booking Step 1 Subtext" className="text-muted text-sm mb-6">
                      {g(bookingSteps[0].sub)}
                    </Editable>
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
                    <Editable id="booking.steps.1.heading" as="h3" contentPath="booking.steps.1.heading" label="Booking Step 2 Heading" className="font-display font-bold text-xl text-ink mb-1">
                      {bookingSteps[1].heading}
                    </Editable>
                    <Editable id="booking.steps.1.sub" as="p" contentPath="booking.steps.1.sub" label="Booking Step 2 Subtext" className="text-muted text-sm mb-6">
                      {g(bookingSteps[1].sub)}
                    </Editable>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {b.formatOptions.map(({ label, text }, i) => {
                        const Icon = FORMAT_ICONS[label] || Video
                        return (
                          <button
                            type="button"
                            key={label}
                            onClick={() => update('format', label)}
                            className={`text-left rounded-3xl border p-6 transition-all ${
                              form.format === label ? 'border-primary bg-primary/5 shadow-md' : 'border-divider hover:border-primary/40'
                            }`}
                          >
                            <Icon className={`h-6 w-6 mb-3 ${form.format === label ? 'text-primary' : 'text-muted'}`} strokeWidth={2} />
                            <Editable id={`booking.formatOptions.${i}.label`} as="p" contentPath={`booking.formatOptions.${i}.label`} label={`Format Option ${i + 1} Label`} className="font-display font-semibold text-ink">
                              {label}
                            </Editable>
                            <Editable id={`booking.formatOptions.${i}.text`} as="p" contentPath={`booking.formatOptions.${i}.text`} label={`Format Option ${i + 1} Text`} className="text-muted text-sm mt-1 leading-relaxed">
                              {text}
                            </Editable>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div>
                    <Editable id="booking.steps.2.heading" as="h3" contentPath="booking.steps.2.heading" label="Booking Step 3 Heading" className="font-display font-bold text-xl text-ink mb-1">
                      {bookingSteps[2].heading}
                    </Editable>
                    <Editable id="booking.steps.2.sub" as="p" contentPath="booking.steps.2.sub" label="Booking Step 3 Subtext" className="text-muted text-sm mb-6">
                      {g(bookingSteps[2].sub)}
                    </Editable>

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
                          <Editable id="booking.openTimesPrefix" as="span" contentPath="booking.openTimesPrefix" label="Open Times Prefix">{b.openTimesPrefix}</Editable> &middot; {form.dayLabel}
                        </p>
                        {slotsLoading ? (
                          <div className="flex items-center gap-2 text-muted text-sm">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <Editable id="booking.loadingTimesText" as="span" contentPath="booking.loadingTimesText" label="Loading Times Text">{b.loadingTimesText}</Editable>
                          </div>
                        ) : slots.length === 0 ? (
                          <Editable id="booking.noSlotsText" as="p" contentPath="booking.noSlotsText" label="No Slots Text" className="text-muted text-sm bg-background border border-divider rounded-2xl p-4">
                            {b.noSlotsText}
                          </Editable>
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
                    <Editable id="booking.steps.3.heading" as="h3" contentPath="booking.steps.3.heading" label="Booking Step 4 Heading" className="font-display font-bold text-xl text-ink mb-1">
                      {bookingSteps[3].heading}
                    </Editable>
                    <Editable id="booking.steps.3.sub" as="p" contentPath="booking.steps.3.sub" label="Booking Step 4 Subtext" className="text-muted text-sm mb-6">
                      {g(bookingSteps[3].sub)}
                    </Editable>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Field label={<Editable id="booking.fieldLabels.parentName" as="span" contentPath="booking.fieldLabels.parentName" label="Parent Name Field Label">{b.fieldLabels.parentName}</Editable>}>
                        <input required value={form.parentName} onChange={(e) => update('parentName', e.target.value)} className="wizard-input" placeholder="Jamie Rivera" />
                      </Field>
                      <Field label={<Editable id="booking.fieldLabels.studentName" as="span" contentPath="booking.fieldLabels.studentName" label="Student Name Field Label">{b.fieldLabels.studentName}</Editable>}>
                        <input required value={form.studentName} onChange={(e) => update('studentName', e.target.value)} className="wizard-input" placeholder="Sam" />
                      </Field>
                      <Field label={<Editable id="booking.fieldLabels.email" as="span" contentPath="booking.fieldLabels.email" label="Email Field Label">{b.fieldLabels.email}</Editable>}>
                        <input required type="email" value={form.email} onChange={(e) => update('email', e.target.value)} className="wizard-input" placeholder="jamie@email.com" />
                      </Field>
                      <Field label={<Editable id="booking.fieldLabels.phone" as="span" contentPath="booking.fieldLabels.phone" label="Phone Field Label">{b.fieldLabels.phone}</Editable>}>
                        <input required type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} className="wizard-input" placeholder="(555) 000-0000" />
                      </Field>
                    </div>
                    <div className="mt-4">
                      <Field label={<Editable id="booking.fieldLabels.notes" as="span" contentPath="booking.fieldLabels.notes" label="Notes Field Label">{b.fieldLabels.notes}</Editable>}>
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
                    <ChevronLeft className="h-4 w-4" /> {b.buttonLabels.back}
                  </button>

                  {step < 4 ? (
                    <button
                      type="button"
                      disabled={!canNext}
                      onClick={() => { setStatus('idle'); setStep((s) => Math.min(4, s + 1)) }}
                      className="magnetic-btn inline-flex items-center gap-2 bg-primary text-white font-semibold px-6 py-3 rounded-full disabled:opacity-40 disabled:pointer-events-none"
                    >
                      {b.buttonLabels.continueLabel} <ChevronRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={status === 'sending'}
                      className="magnetic-btn inline-flex items-center gap-2 bg-primary text-white font-semibold px-6 py-3 rounded-full disabled:opacity-60 disabled:pointer-events-none"
                    >
                      {status === 'sending' ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> {b.buttonLabels.sending}
                        </>
                      ) : status === 'error' ? (
                        <>{b.buttonLabels.tryAgain} <ChevronRight className="h-4 w-4" /></>
                      ) : (
                        <>{b.buttonLabels.submit} <ChevronRight className="h-4 w-4" /></>
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
