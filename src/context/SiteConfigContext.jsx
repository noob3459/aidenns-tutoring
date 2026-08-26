import { createContext, useContext, useEffect, useMemo, useState } from 'react'

export const DEFAULT_CONFIG = {
  contact: {
    phone: '(949) 795-7036',
    phoneTel: '+19497957036',
    email: 'aidenn@aidennstutoring.org',
    donateEmail: 'donate@aidennstutoring.org',
    serving: 'Online nationwide & in-person in Rancho Cucamonga and Fontana, CA',
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
      ctaLabel: 'Book a Free Session',
      prompt: '',
    },
    approach: {
      eyebrow: '╱ How It Works',
      heading1: 'Three steps.',
      heading2: 'No surprises.',
      sub: 'From a two-minute intake to a confirmed weekly session, every step is free.',
      ctaLabel: 'Book a Free Session',
      prompt: '',
    },
    contact: {
      eyebrow: '╱ Get In Touch',
      heading1: 'Let’s talk',
      heading2: 'math.',
      sub: 'Questions before you book? Reach out any time. We usually reply within a day.',
      ctaLabel: 'Book a Free Session',
      prompt: 'Ready to get started instead?',
    },
    booking: {
      eyebrow: '╱ Book a Free Session',
      heading1: 'Takes about',
      heading2: 'a minute.',
      sub: 'Pick your student’s grade, choose online or in person, and grab an open time slot. No card, no account, no cost.',
      ctaLabel: 'Book a Free Session',
      prompt: '',
    },
    about: {
      eyebrow: '╱ Meet Your Tutor',
      heading1: 'Hi, I’m',
      heading2: 'Aidenn.',
      sub: 'The founder and lead tutor behind Aidenn’s Tutoring.',
      ctaLabel: 'Book a Free Session',
      prompt: '',
    },
  },
  footer: {
    tagline1: 'Math help you can',
    tagline2: 'count on.',
    blurb: 'Aidenn’s Tutoring: free K-9 math tutoring, online and in person, funded by generous donors.',
    communityLine: 'Community-Funded · Est. 2024',
    statusPillText: 'Booking Open · Accepting Students',
    ctaLabel: 'Book a Free Session',
  },
  stats: {
    sessions: 500,
    freePercent: 100,
    replyHours: 24,
  },
  navbar: {
    brandText: 'Aidenn’s Tutoring',
    freeBadgeText: '100% Free',
    ctaLabel: 'Book a Free Session',
    navLinks: [
      { label: 'Home' },
      { label: 'Services' },
      { label: 'Approach' },
      { label: 'About' },
      { label: 'Contact' },
    ],
  },
  donateBanner: {
    heading: 'Every session is 100% free.',
    description: 'Aidenn’s Tutoring is funded entirely by generous donors, not tuition. If it’s helped your family, consider chipping in to keep it free for the next one.',
    ctaLabel: 'Donate to Support a Session',
  },
  home: {
    featureCards: [
      {
        eyebrow: '01 / Personalized',
        heading: 'Built Around Your Child’s Grade',
        sub: 'K-9, matched exactly',
        text: 'Every plan starts with your student’s exact grade and skill level, from early number sense to Algebra I. No generic worksheets, ever.',
      },
      {
        eyebrow: '02 / Live Sessions',
        heading: 'Concepts Click in Real Time',
        sub: 'Shared whiteboard, zero pressure',
        text: 'Watch understanding build live with a shared digital whiteboard and a tutor who adjusts the moment something doesn’t click.',
      },
      {
        eyebrow: '03 / Booking',
        heading: 'Scheduling In Under a Minute',
        sub: 'Pick a time, you’re set',
        text: 'Choose a grade, a format, and an open time slot. A confirmed session lands in your inbox in minutes. Completely free.',
      },
    ],
    finalCta: {
      heading1: 'Ready when you are.',
      heading2: 'Still free.',
      ctaLabel: 'Book a Free Session',
    },
    heroCtaLabel: 'Book a Free Session',
  },
  approach: {
    protocolSteps: [
      {
        title: 'Share Your Goals', tagline: 'Two minutes, that’s it.',
        text: 'Tell us your student’s grade and where they’re stuck: fractions, word problems, algebra, anything. No cost, no obligation, no catch.',
      },
      {
        title: 'We Build a Plan', tagline: 'Made for your student.',
        text: 'A certified educator reviews the goals and designs a session plan targeting the exact skill gaps, matched to what’s being taught in class.',
      },
      {
        title: 'Start Free Sessions', tagline: 'Online or in person.',
        text: 'Meet on a recurring weekly slot that fits your family’s schedule. Every session is completely free, this week, next month, always.',
      },
    ],
    trustBadges: [
      { title: 'Loved by Parents', text: '“My son actually looks forward to math night now.” (a parent, Grade 4)' },
      { title: 'Real Score Improvement', text: 'Students average a full letter-grade jump within one semester of weekly sessions.' },
      { title: 'Certified & Background-Checked', text: 'Every session is led by a certified K-9 educator trained in child-safe tutoring practices.' },
    ],
  },
  services: {
    items: [
      { title: 'Early Math Foundations', text: 'K-2 counting, number sense, and early arithmetic built through hands-on play.' },
      { title: 'Elementary Math', text: 'Grades 3-5: fractions, multiplication, division, and multi-step word problems.' },
      { title: 'Pre-Algebra & Algebra I', text: 'Grades 6-9: variables, equations, functions, and the foundations of algebraic thinking.' },
      { title: 'Homework & Test Prep', text: 'Focused help on current classwork, quizzes, and standardized test prep.' },
      { title: 'Online Sessions', text: 'Live 1:1 video sessions from anywhere, with a shared digital whiteboard.' },
      { title: 'In-Person Sessions', text: 'Face-to-face tutoring at a local library or community space near you.' },
    ],
  },
  booking: {
    steps: [
      { heading: 'What grade is your student in?', sub: 'We tutor kindergarten through 9th grade math. Free, always.' },
      { heading: 'Online or in person?', sub: 'Both formats are completely free.' },
      { heading: 'Pick a day and time', sub: 'All times Pacific (America/Los Angeles).' },
      { heading: 'A few last details', sub: 'So we know who to expect, and where to send the confirmation.' },
    ],
  },
  about: {
    name: 'Aidenn',
    role: 'Founder & Lead Tutor',
    bioParagraphs: [
      { text: 'I started Aidenn’s Tutoring because I believe every K-9 student deserves one-on-one math help, regardless of what their family can afford.' },
      { text: 'Every session is built around your student’s exact grade and skill level, whether that’s early number sense or the first steps into algebra.' },
      { text: 'Outside of tutoring, I’m focused on keeping this program free forever, funded by donations instead of tuition.' },
    ],
    credentials: [
      { title: 'Certified Educator', text: 'Trained and background-checked for child-safe, one-on-one tutoring.' },
      { title: 'K-9 Math Specialist', text: 'Focused exclusively on K-9 math, from counting to Algebra I.' },
      { title: 'Local & Online', text: 'In-person sessions in Rancho Cucamonga and Fontana, CA, plus online nationwide.' },
    ],
  },
  elementStyles: {},
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

  // Local-only merge, no network call — used by the Visual Editor's live
  // preview so edits render instantly while the admin is still deciding
  // whether to keep them. `updateConfig` (above) is what actually persists.
  const applyLocalPatch = (patch) => {
    setConfig((prev) => deepMerge(prev, patch))
  }

  const value = useMemo(
    () => ({ config, updateConfig, applyLocalPatch, resetConfig, lastSaved }),
    [config, lastSaved]
  )

  return <SiteConfigContext.Provider value={value}>{children}</SiteConfigContext.Provider>
}

export function useSiteConfig() {
  const ctx = useContext(SiteConfigContext)
  if (!ctx) throw new Error('useSiteConfig must be used within SiteConfigProvider')
  return ctx
}
