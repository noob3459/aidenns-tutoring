import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'aidenns-tutoring-site-config-v1'

export const DEFAULT_CONFIG = {
  contact: {
    phone: '(555) 010-2947',
    phoneTel: '+15550102947',
    email: 'hello@aidennstutoring.org',
    donateEmail: 'donate@aidennstutoring.org',
    serving: 'Online nationwide & in-person locally',
    hours: 'Mon-Fri · 3:00-7:00 PM',
  },
  hero: {
    eyebrow: 'K-9 Math Tutoring · 100% Free',
    line1: 'Premium Math Tutoring.',
    line2: 'Always Free.',
    subtext: 'One-on-one K-9 math tutoring from a certified educator, online or in person. No tuition, no hidden fees, ever.',
  },
  pages: {
    services: {
      eyebrow: '╱ Everything We Offer',
      heading1: 'Every grade,',
      heading2: 'one tutor.',
      sub: 'K-9 math, covered start to finish, online or in person, always at no cost.',
    },
    approach: {
      eyebrow: '╱ How It Works',
      heading1: 'Three steps.',
      heading2: 'No surprises.',
      sub: 'From a two-minute intake to a confirmed weekly session, every step is free.',
    },
    contact: {
      eyebrow: '╱ Get In Touch',
      heading1: 'Let’s talk',
      heading2: 'math.',
      sub: 'Questions before you book? Reach out any time. We usually reply within a day.',
    },
    booking: {
      eyebrow: '╱ Book a Free Session',
      heading1: 'Takes about',
      heading2: 'a minute.',
      sub: 'Pick your student’s grade, choose online or in person, and grab an open time slot. No card, no account, no cost.',
    },
  },
  footer: {
    tagline1: 'Math help you can',
    tagline2: 'count on.',
    blurb: 'Aidenn’s Tutoring: free K-9 math tutoring, online and in person, funded by generous donors.',
  },
  stats: {
    sessions: 500,
    freePercent: 100,
    replyHours: 24,
  },
  availability: {
    // 0 = Sunday ... 6 = Saturday
    weekdays: [1, 2, 3, 4, 5],
    blackoutDates: [],
    timeSlots: ['3:30 PM', '4:15 PM', '5:00 PM', '5:45 PM', '6:30 PM'],
  },
}

function deepMerge(base, patch) {
  if (typeof patch !== 'object' || patch === null || Array.isArray(patch)) {
    return patch === undefined ? base : patch
  }
  const out = { ...base }
  for (const key of Object.keys(patch)) {
    out[key] = deepMerge(base?.[key], patch[key])
  }
  return out
}

function loadConfig() {
  if (typeof window === 'undefined') return DEFAULT_CONFIG
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_CONFIG
    const parsed = JSON.parse(raw)
    return deepMerge(DEFAULT_CONFIG, parsed)
  } catch {
    return DEFAULT_CONFIG
  }
}

const SiteConfigContext = createContext(null)

export function SiteConfigProvider({ children }) {
  const [config, setConfig] = useState(loadConfig)
  const [lastSaved, setLastSaved] = useState(null)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    } catch {
      // localStorage unavailable (private browsing, etc.) — edits stay in-memory for this session
    }
  }, [config])

  const updateConfig = (patch) => {
    setConfig((prev) => deepMerge(prev, patch))
    setLastSaved(new Date())
  }

  const resetConfig = () => {
    setConfig(DEFAULT_CONFIG)
    setLastSaved(new Date())
  }

  const value = useMemo(() => ({ config, updateConfig, resetConfig, lastSaved }), [config, lastSaved])

  return <SiteConfigContext.Provider value={value}>{children}</SiteConfigContext.Provider>
}

export function useSiteConfig() {
  const ctx = useContext(SiteConfigContext)
  if (!ctx) throw new Error('useSiteConfig must be used within SiteConfigProvider')
  return ctx
}
