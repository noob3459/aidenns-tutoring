import { createContext, useContext, useEffect, useMemo, useState } from 'react'

export const DEFAULT_CONFIG = {
  contact: {
    phone: '(949) 795-7036',
    phoneTel: '+19497957036',
    email: 'aidenn@aidennstutoring.com',
    donateEmail: 'aidenn@aidennstutoring.com',
    serving: 'Online nationwide & in-person in Rancho Cucamonga and Fontana, CA',
    hours: 'Mon-Fri · 3:00-7:00 PM',
    phoneLabel: 'Call or Text',
    emailLabel: 'Email',
    servingLabel: 'Serving',
    hoursLabel: 'Hours',
    zoomLink: '',
  },
  hero: {
    eyebrow: '{grades} Math Homework Help · 100% Free',
    line1: 'Stuck on Math Homework?',
    line2: 'Get Help. Free.',
    subtext: 'One-on-one help with whatever your {grades} student is working on right now — no set curriculum, just clear explanations using my own practice problems and methods, online or in person.',
    imageUrl: '/images/hero-image-v2.png',
    pillPrefix: '$0',
    pillText: 'per session, every session, forever.',
    scrollLabel: 'Scroll',
  },
  pages: {
    services: {
      eyebrow: '╱ How I Can Help',
      heading1: 'Whatever they’re',
      heading2: 'stuck on.',
      sub: 'No curriculum, no set lesson plan — just focused help on the {grades} math your student is working on right now.',
      ctaLabel: 'Book a Free Session',
      prompt: '',
    },
    approach: {
      eyebrow: '╱ How It Works',
      heading1: 'Three steps.',
      heading2: 'No surprises.',
      sub: 'Tell me what they’re stuck on, and I’ll walk through it with my own practice problems until it clicks.',
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
    blurb: 'Aidenn’s Tutoring: free homework help for {grades} math, whatever they’re stuck on, funded by generous donors.',
    communityLine: 'Community-Funded · Est. 2024',
    statusPillText: 'Booking Open · Accepting Students',
    ctaLabel: 'Book a Free Session',
    aboutBlurb: 'Free, one-on-one help with {grades} math homework — no curriculum, just clear explanations when something isn’t clicking.',
    servicesHeading: 'Services',
    programHeading: 'Program',
    contactHeading: 'Contact',
    donateLinkLabel: 'Donate',
    privacyLabel: 'Privacy',
    termsLabel: 'Terms',
    copyrightText: '© 2026 Aidenn’s Tutoring',
    logoUrl: '/images/aidenns-tutoring-logo-premium.png',
    programLinks: [
      { label: 'Approach' },
      { label: 'About' },
      { label: 'Book a Session' },
      { label: 'Contact' },
    ],
  },
  stats: {
    sessions: 500,
    freePercent: 100,
    replyHours: 24,
    sessionsLabel: 'sessions taught',
    freePercentLabel: 'free, always',
    replyHoursLabel: 'avg. reply time',
  },
  navbar: {
    brandText: 'Aidenn’s Tutoring',
    freeBadgeText: '100% Free',
    ctaLabel: 'Book a Free Session',
    logoUrl: '/images/aidenns-tutoring-logo-mark.png',
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
        heading: 'Help With What They’re Actually Stuck On',
        sub: '{grades}, no curriculum required',
        text: 'No fixed lesson plan. Bring the homework, the topic, or the test that’s giving them trouble, and we work through it using my own practice problems and methods.',
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
    featuresSection: {
      eyebrow: '╱ The Aidenn’s Tutoring Difference',
      heading1: 'Tutoring that',
      heading2: 'actually fits.',
    },
    heroCtaLabel: 'Book a Free Session',
  },
  approach: {
    protocolPillText: 'Aidenn’s Protocol',
    stepLabelPrefix: 'Step',
    stepFooterSuffix: 'Aidenn’s Tutoring',
    protocolSteps: [
      {
        title: 'Tell Me What’s Stuck', tagline: 'Two minutes, that’s it.',
        text: 'Tell me your student’s grade and exactly what they’re stuck on: a homework set, one confusing topic, a test coming up. No cost, no obligation, no catch.',
        meta: 'Step 1 / Listen',
        imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80',
      },
      {
        title: 'I Pull Together the Right Help', tagline: 'Made for that exact problem.',
        text: 'No fixed curriculum to work through. I put together practice problems and explanations aimed at the specific thing that isn’t clicking yet.',
        meta: 'Step 2 / Plan',
        imageUrl: 'https://images.unsplash.com/photo-1509869175650-a1d97972541a?auto=format&fit=crop&w=1200&q=80',
      },
      {
        title: 'Start Free Sessions', tagline: 'Online or in person.',
        text: 'Meet on a recurring weekly slot that fits your family’s schedule. Every session is completely free, this week, next month, always.',
        meta: 'Step 3 / Learn',
        imageUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=1200&q=80',
      },
    ],
    trustBadges: [
      { title: 'Loved by Parents', text: '“My son actually looks forward to math night now.” (a parent, Grade 4)' },
      { title: 'Real Confidence Gains', text: 'Families consistently report better grades and less homework stress within weeks of starting.' },
      { title: 'Background-Checked & Trusted', text: 'Every session is led by a background-checked tutor experienced helping {grades} students work through whatever math they’re stuck on.' },
    ],
    trustSignalsHeading: {
      eyebrow: '╱ Why Families Trust Us',
      heading: 'More than free.',
    },
  },
  services: {
    badgeText: 'Free',
    items: [
      { title: 'Concept Breakdown', text: 'Stuck on one topic, like fractions or word problems? We rebuild it from scratch with practice problems made for exactly where they’re stuck.' },
      { title: 'Homework Help', text: 'Bring whatever’s due tonight, a worksheet, a problem set, a review packet, and we work through it together, step by step.' },
      { title: 'Test & Quiz Prep', text: 'Review exactly what’s on the upcoming test, with practice problems modeled on your student’s actual class.' },
      { title: 'Ongoing Support', text: 'Weekly sessions that follow whatever your student is covering in class right now. No fixed curriculum, just consistent help.' },
      { title: 'Online Sessions', text: 'Live 1:1 video sessions from anywhere, with a shared digital whiteboard.' },
      { title: 'In-Person Sessions', text: 'Face-to-face tutoring at a local library or community space near you.' },
    ],
  },
  booking: {
    minGrade: 'K',
    maxGrade: '9',
    steps: [
      { heading: 'What grade is your student in?', sub: 'I help {gradesLong} students with their math homework. Free, always.' },
      { heading: 'Online or in person?', sub: 'Both formats are completely free.' },
      { heading: 'Pick a day and time', sub: 'All times Pacific (America/Los Angeles).' },
      { heading: 'A few last details', sub: 'So we know who to expect, and where to send the confirmation.' },
    ],
    stepIndicatorLabels: [
      { label: 'Grade' },
      { label: 'Format' },
      { label: 'Time' },
      { label: 'Details' },
    ],
    freeNote: '100% free, no card required, ever.',
    formatOptions: [
      { label: 'Online', text: 'Live video call with a shared digital whiteboard.' },
      { label: 'In-Person', text: 'Meet at a local library or community space.' },
    ],
    openTimesPrefix: 'Open times',
    loadingTimesText: 'Loading times…',
    noSlotsText: 'No open times on this date. Please pick another day.',
    fieldLabels: {
      parentName: 'Parent / Guardian Name',
      studentName: 'Student’s First Name',
      email: 'Email',
      phone: 'Phone',
      notes: 'Anything we should know? (optional)',
    },
    buttonLabels: {
      back: 'Back',
      continueLabel: 'Continue',
      sending: 'Sending Request…',
      tryAgain: 'Try Again',
      submit: 'Request Free Session',
    },
    confirmation: {
      heading: 'Request received!',
      receiptPrefix: 'A receipt is on its way to',
      receiptFallback: 'your inbox',
      notice: 'This is a request, not a confirmed booking yet. We personally review and confirm every session, and will reach out shortly.',
      donatePrompt: 'This session is completely free. If today helped, you can support the next family.',
      donateButtonLabel: 'Donate',
    },
    errors: {
      conflict: 'That time slot was just taken by another family. Please choose a different time.',
      generic: 'Something went wrong sending your request. Please try again.',
      network: 'Couldn’t reach the server. Check your connection and try again.',
      unexpected: 'Unexpected server response.',
    },
  },
  about: {
    name: 'Aidenn',
    role: 'Founder & Lead Tutor',
    bioParagraphs: [
      { text: 'I started Aidenn’s Tutoring because I believe every {grades} student deserves help the moment they get stuck on math homework, regardless of what their family can afford.' },
      { text: 'There’s no fixed curriculum here. Every session is built around whatever your student is actually working on right now, a homework set, one confusing topic, an upcoming test, using my own practice problems and explanations.' },
      { text: 'Outside of tutoring, I’m focused on keeping this program free forever, funded by donations instead of tuition.' },
    ],
    credentials: [
      { title: 'Trusted by Many', text: 'Relied on by families across the community for safe, one-on-one tutoring.' },
      { title: 'Homework Help Specialist', text: 'Focused on helping {grades} students work through whatever math they’re currently stuck on, no set curriculum.' },
      { title: 'Local & Online', text: 'In-person sessions in Rancho Cucamonga and Fontana, CA, plus online nationwide.' },
    ],
  },
  legal: {
    privacyHeading: 'Privacy Policy',
    privacyParagraphs: [
      { text: 'Aidenn’s Tutoring is a free {grades} math homework help service. We collect only what’s needed to schedule and run sessions: a parent or guardian’s name, email, phone number, and the student’s grade level.' },
      { text: 'Booking details are used solely to confirm sessions and send reminders. We never sell or share family information with third parties, and student information is never used for marketing.' },
      { text: 'You may request deletion of your family’s information at any time by contacting us using the details on the Contact page.' },
      { text: 'This policy may be updated periodically to reflect how the program operates. Continued use of the booking system after changes means you accept the current policy.' },
    ],
    termsHeading: 'Terms of Service',
    termsParagraphs: [
      { text: 'Sessions booked through Aidenn’s Tutoring are provided free of charge to {grades} students. Donations are entirely optional and go toward keeping the program free for every family.' },
      { text: 'Please arrive on time for scheduled sessions and give at least 24 hours’ notice to reschedule or cancel, so the time slot can be offered to another student.' },
      { text: 'In-person sessions require a parent or guardian to remain reachable for the duration of the session. Online sessions are held over video call using the link provided at booking.' },
      { text: 'Aidenn’s Tutoring reserves the right to pause or decline bookings if capacity is reached. Every effort is made to offer an alternate time.' },
    ],
  },
  elementStyles: {},
  customBlocks: [],
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

// deepMerge always produces a new object reference for any top-level key
// it actually touches, so reference inequality is a cheap, reliable way to
// tell which top-level sections changed between two config snapshots —
// used to keep dirtyKeys correct across undo/redo without a deep diff.
function diffTopLevelKeys(a, b) {
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})])
  const diff = []
  for (const key of keys) {
    if (a?.[key] !== b?.[key]) diff.push(key)
  }
  return diff
}

const HISTORY_LIMIT = 50

const SiteConfigContext = createContext(null)

export function SiteConfigProvider({ children }) {
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [lastSaved, setLastSaved] = useState(null)
  // Undo/redo + dirty-section tracking for the Visual Editor's local
  // draft — unused (and harmless) on the real public site's own provider
  // instance, since nothing there ever calls applyLocalPatch/undo/redo.
  const [history, setHistory] = useState([])
  const [future, setFuture] = useState([])
  const [dirtyKeys, setDirtyKeys] = useState(() => new Set())

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
        setDirtyKeys(new Set())
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
  // Every local edit — text/color/font/animation, image replace, add/
  // delete — goes through this one function, which is what lets undo/redo
  // and dirty-tracking work for all of them without each call site having
  // to remember to record history itself.
  const applyLocalPatch = (patch) => {
    setHistory([...history, config].slice(-HISTORY_LIMIT))
    setFuture([]) // a new edit invalidates whatever redo path existed
    setDirtyKeys(new Set([...dirtyKeys, ...Object.keys(patch)]))
    setConfig(deepMerge(config, patch))
  }

  const undo = () => {
    if (!history.length) return
    const prevConfig = history[history.length - 1]
    setHistory(history.slice(0, -1))
    setFuture([...future, config].slice(-HISTORY_LIMIT))
    setDirtyKeys(new Set([...dirtyKeys, ...diffTopLevelKeys(prevConfig, config)]))
    setConfig(prevConfig)
  }

  const redo = () => {
    if (!future.length) return
    const nextConfig = future[future.length - 1]
    setFuture(future.slice(0, -1))
    setHistory([...history, config].slice(-HISTORY_LIMIT))
    setDirtyKeys(new Set([...dirtyKeys, ...diffTopLevelKeys(nextConfig, config)]))
    setConfig(nextConfig)
  }

  const value = useMemo(
    () => ({
      config, updateConfig, applyLocalPatch, resetConfig, lastSaved,
      undo, redo, canUndo: history.length > 0, canRedo: future.length > 0,
      dirtyKeys,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config, lastSaved, history, future, dirtyKeys]
  )

  return <SiteConfigContext.Provider value={value}>{children}</SiteConfigContext.Provider>
}

export function useSiteConfig() {
  const ctx = useContext(SiteConfigContext)
  if (!ctx) throw new Error('useSiteConfig must be used within SiteConfigProvider')
  return ctx
}
