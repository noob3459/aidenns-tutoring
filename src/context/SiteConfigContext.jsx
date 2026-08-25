import { createContext, useContext, useEffect, useMemo, useState } from 'react'

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

const SiteConfigContext = createContext(null)

export function SiteConfigProvider({ children }) {
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [lastSaved, setLastSaved] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/settings')
      .then((r) => r.json())
      .then((res) => {
        if (cancelled) return
        // Sensible default: if Supabase has nothing yet (or is temporarily
        // unreachable), the DEFAULT_CONFIG already set above stays in place.
        if (res?.ok && res.data) setConfig((prev) => deepMerge(prev, res.data))
      })
      .catch(() => {
        // Same fallback — keep whatever is currently in state (DEFAULT_CONFIG).
      })
    return () => { cancelled = true }
  }, [])

  const updateConfig = async (patch) => {
    // Optimistic local update so the admin's own browser reflects the
    // change immediately, regardless of network latency.
    setConfig((prev) => deepMerge(prev, patch))
    try {
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-settings', ...patch }),
      })
      const data = await res.json().catch(() => ({ ok: false }))
      if (res.ok && data.ok && data.data) {
        setConfig((prev) => deepMerge(prev, data.data))
        setLastSaved(new Date())
        return { ok: true }
      }
      console.error('Failed to save settings:', data.error)
      return { ok: false, error: data.error }
    } catch (err) {
      console.error('Failed to save settings:', err)
      return { ok: false, error: 'Network error' }
    }
  }

  const resetConfig = () => updateConfig(DEFAULT_CONFIG)

  const value = useMemo(() => ({ config, updateConfig, resetConfig, lastSaved }), [config, lastSaved])

  return <SiteConfigContext.Provider value={value}>{children}</SiteConfigContext.Provider>
}

export function useSiteConfig() {
  const ctx = useContext(SiteConfigContext)
  if (!ctx) throw new Error('useSiteConfig must be used within SiteConfigProvider')
  return ctx
}
