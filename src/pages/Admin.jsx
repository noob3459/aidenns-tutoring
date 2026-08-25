import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Sigma, Lock, LogOut, ExternalLink, Save, Check, Plus, X,
  Phone as PhoneIcon, CalendarClock, FileText, AlertTriangle, ShieldAlert,
} from 'lucide-react'
import { useSiteConfig } from '../context/SiteConfigContext.jsx'

const ADMIN_PASSCODE = 'mathrocks26'
const SESSION_KEY = 'aidenns_admin_authed'
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/* ---------------- Login gate ---------------- */
function LoginGate({ onSuccess }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    if (value === ADMIN_PASSCODE) {
      window.sessionStorage.setItem(SESSION_KEY, '1')
      onSuccess()
    } else {
      setError(true)
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
            onChange={(e) => { setValue(e.target.value); setError(false) }}
            className="w-full rounded-2xl bg-white/10 border border-white/15 px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-primary/60"
            placeholder="Enter passcode"
          />
          {error && <p className="text-accent text-xs mt-2">Incorrect passcode. Try again.</p>}
          <button type="submit" className="magnetic-btn w-full mt-5 bg-primary text-white font-semibold py-3 rounded-2xl">
            Unlock
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

function SaveBar({ onSave, saved }) {
  return (
    <div className="flex items-center gap-3 mt-8 pt-6 border-t border-divider">
      <button type="button" onClick={onSave} className="magnetic-btn inline-flex items-center gap-2 bg-primary text-white font-semibold px-6 py-3 rounded-full text-sm">
        <Save className="h-4 w-4" /> Save Changes
      </button>
      {saved && (
        <span className="inline-flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
          <Check className="h-4 w-4" /> Saved
        </span>
      )}
    </div>
  )
}

/* ---------------- Tab: Contact & Links ---------------- */
function ContactTab({ config, updateConfig }) {
  const [form, setForm] = useState(config.contact)
  const [saved, setSaved] = useState(false)
  const set = (k, v) => { setForm((p) => ({ ...p, [k]: v })); setSaved(false) }

  const save = () => {
    updateConfig({ contact: form })
    setSaved(true)
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
      <SaveBar onSave={save} saved={saved} />
    </div>
  )
}

/* ---------------- Tab: Availability ---------------- */
function AvailabilityTab({ config, updateConfig }) {
  const [weekdays, setWeekdays] = useState(config.availability.weekdays)
  const [blackoutDates, setBlackoutDates] = useState(config.availability.blackoutDates)
  const [timeSlots, setTimeSlots] = useState(config.availability.timeSlots)
  const [newDate, setNewDate] = useState('')
  const [newSlot, setNewSlot] = useState('')
  const [saved, setSaved] = useState(false)

  const toggleDay = (d) => {
    setWeekdays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()))
    setSaved(false)
  }
  const addDate = () => {
    if (newDate && !blackoutDates.includes(newDate)) {
      setBlackoutDates((prev) => [...prev, newDate].sort())
      setNewDate('')
      setSaved(false)
    }
  }
  const removeDate = (d) => { setBlackoutDates((prev) => prev.filter((x) => x !== d)); setSaved(false) }
  const addSlot = () => {
    const trimmed = newSlot.trim()
    if (trimmed && !timeSlots.includes(trimmed)) {
      setTimeSlots((prev) => [...prev, trimmed])
      setNewSlot('')
      setSaved(false)
    }
  }
  const removeSlot = (t) => { setTimeSlots((prev) => prev.filter((x) => x !== t)); setSaved(false) }

  const save = () => {
    updateConfig({ availability: { weekdays, blackoutDates, timeSlots } })
    setSaved(true)
  }

  return (
    <div>
      <h2 className="font-display font-bold text-xl text-ink mb-1">Booking Availability</h2>
      <p className="text-muted text-sm mb-6">Controls which days and times show up in the booking wizard.</p>

      <div className="mb-8">
        <p className="text-xs font-mono uppercase tracking-widest text-muted mb-3">Available Weekdays</p>
        <div className="flex flex-wrap gap-2">
          {WEEKDAY_LABELS.map((label, d) => (
            <button
              key={d}
              type="button"
              onClick={() => toggleDay(d)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                weekdays.includes(d) ? 'bg-primary text-white shadow-md shadow-primary/30' : 'bg-background border border-divider text-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <p className="text-xs font-mono uppercase tracking-widest text-muted mb-3">Blackout Dates (holidays, breaks)</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {blackoutDates.length === 0 && <span className="text-muted text-sm">None added.</span>}
          {blackoutDates.map((d) => (
            <span key={d} className="inline-flex items-center gap-2 bg-background border border-divider rounded-full px-3 py-1.5 text-sm">
              {d}
              <button type="button" onClick={() => removeDate(d)} className="text-muted hover:text-accent-dark"><X className="h-3.5 w-3.5" /></button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="admin-input flex-1" />
          <button type="button" onClick={addDate} className="inline-flex items-center gap-1.5 bg-primary/10 text-primary-dark font-medium px-4 rounded-2xl text-sm shrink-0">
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </div>

      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-muted mb-3">Time Slots</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {timeSlots.map((t) => (
            <span key={t} className="inline-flex items-center gap-2 bg-background border border-divider rounded-full px-3 py-1.5 text-sm">
              {t}
              <button type="button" onClick={() => removeSlot(t)} className="text-muted hover:text-accent-dark"><X className="h-3.5 w-3.5" /></button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={newSlot} onChange={(e) => setNewSlot(e.target.value)} placeholder="e.g. 4:00 PM" className="admin-input flex-1" />
          <button type="button" onClick={addSlot} className="inline-flex items-center gap-1.5 bg-primary/10 text-primary-dark font-medium px-4 rounded-2xl text-sm shrink-0">
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </div>

      <SaveBar onSave={save} saved={saved} />
    </div>
  )
}

/* ---------------- Tab: Site Content ---------------- */
function ContentTab({ config, updateConfig }) {
  const [hero, setHero] = useState(config.hero)
  const [pages, setPages] = useState(config.pages)
  const [footer, setFooter] = useState(config.footer)
  const [stats, setStats] = useState(config.stats)
  const [saved, setSaved] = useState(false)

  const setPageField = (page, key, value) => {
    setPages((prev) => ({ ...prev, [page]: { ...prev[page], [key]: value } }))
    setSaved(false)
  }

  const save = () => {
    updateConfig({ hero, pages, footer, stats: {
      sessions: Number(stats.sessions) || 0,
      freePercent: Number(stats.freePercent) || 0,
      replyHours: Number(stats.replyHours) || 0,
    } })
    setSaved(true)
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

      <div className="mb-2">
        <p className="text-xs font-mono uppercase tracking-widest text-primary-dark mb-3">Stats Strip</p>
        <div className="grid sm:grid-cols-3 gap-4">
          <Input label="Sessions taught" type="number" value={stats.sessions} onChange={(e) => { setStats({ ...stats, sessions: e.target.value }); setSaved(false) }} />
          <Input label="Free percent" type="number" value={stats.freePercent} onChange={(e) => { setStats({ ...stats, freePercent: e.target.value }); setSaved(false) }} />
          <Input label="Avg. reply (hrs)" type="number" value={stats.replyHours} onChange={(e) => { setStats({ ...stats, replyHours: e.target.value }); setSaved(false) }} />
        </div>
      </div>

      <SaveBar onSave={save} saved={saved} />
    </div>
  )
}

/* ---------------- Tab: Danger Zone ---------------- */
function DangerTab({ resetConfig }) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  const doReset = () => {
    resetConfig()
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
            <p className="font-display font-semibold text-ink">Reset all settings to defaults</p>
            <p className="text-muted text-sm mt-1 leading-relaxed">
              This clears every edit made in this admin panel, including contact info, availability, and all page text, back to the original template values.
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

/* ---------------- Admin Console ---------------- */
function AdminConsole() {
  const { config, updateConfig, resetConfig, lastSaved } = useSiteConfig()
  const [tab, setTab] = useState('contact')

  const logout = () => {
    window.sessionStorage.removeItem(SESSION_KEY)
    window.location.reload()
  }

  const tabs = [
    { key: 'contact', label: 'Contact & Links', Icon: PhoneIcon },
    { key: 'availability', label: 'Availability', Icon: CalendarClock },
    { key: 'content', label: 'Site Content', Icon: FileText },
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

      <div className="max-w-6xl mx-auto px-6 py-3">
        <div className="flex items-start gap-2.5 rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-xs sm:text-sm text-accent-dark">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            Site content and settings here save to <strong>this browser only</strong> (via local storage), not to a shared server.
            They&rsquo;ll appear here and in this browser&rsquo;s copy of the site immediately, but won&rsquo;t sync to other visitors until a real backend is connected.
            {lastSaved && <span className="block mt-1 text-accent-dark/70">Last change: {lastSaved.toLocaleString()}</span>}
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pb-24 grid lg:grid-cols-[220px_1fr] gap-8 mt-4">
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

        <div className="bg-white border border-divider rounded-5xl p-6 sm:p-10 shadow-sm">
          {tab === 'contact' && <ContactTab config={config} updateConfig={updateConfig} />}
          {tab === 'availability' && <AvailabilityTab config={config} updateConfig={updateConfig} />}
          {tab === 'content' && <ContentTab config={config} updateConfig={updateConfig} />}
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
  const [authed, setAuthed] = useState(() => window.sessionStorage.getItem(SESSION_KEY) === '1')

  if (!authed) return <LoginGate onSuccess={() => setAuthed(true)} />
  return <AdminConsole />
}
