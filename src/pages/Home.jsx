import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ArrowRight, ArrowUpRight, Phone } from 'lucide-react'
import { useSiteConfig } from '../context/SiteConfigContext.jsx'
import GradeShuffler from '../components/GradeShuffler.jsx'
import MathRain from '../components/MathRain.jsx'
import SchedulerDemo from '../components/SchedulerDemo.jsx'
import CountUp from '../components/CountUp.jsx'
import DonateBanner from '../components/DonateBanner.jsx'

/* ---------------- Hero ---------------- */
function Hero() {
  const { config } = useSiteConfig()
  const heroRef = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.hero-line-1', { y: 40, opacity: 0, duration: 1, ease: 'power3.out', delay: 0.3 })
      gsap.from('.hero-line-2', { y: 60, opacity: 0, duration: 1.2, ease: 'power3.out', delay: 0.5 })
      gsap.from('.hero-cta, .hero-meta', { y: 24, opacity: 0, duration: 0.8, ease: 'power3.out', delay: 0.8, stagger: 0.12 })
    }, heroRef)
    return () => ctx.revert()
  }, [])

  const particles = ['+', '√', 'π', '÷', '=']

  return (
    <section ref={heroRef} className="relative min-h-[100dvh] w-full overflow-hidden">
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=2400&q=80"
          alt="Bright modern desk with notebook and workbook"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-deep/88 via-deep/55 to-primary/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-deep via-deep/30 to-transparent" />
      </div>

      <div className="absolute inset-0 pointer-events-none hidden sm:block">
        {particles.map((p, i) => (
          <span
            key={p}
            className="absolute font-mono font-semibold text-accent/70 animate-float select-none"
            style={{ top: `${18 + i * 9}%`, right: `${8 + (i % 3) * 7}%`, fontSize: `${14 + (i % 3) * 6}px`, animationDelay: `${i * 0.9}s` }}
          >
            {p}
          </span>
        ))}
      </div>

      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center text-center">
        <div className="px-6 sm:px-10 lg:px-16 max-w-4xl">
          <p className="hero-meta inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.28em] text-accent mb-6 border border-accent/40 bg-accent/10 rounded-full px-4 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-slow" />
            {config.hero.eyebrow}
          </p>
          <h1 className="font-display font-extrabold text-white leading-[0.95] tracking-tight">
            <span className="hero-line-1 block text-4xl sm:text-5xl md:text-6xl">{config.hero.line1}</span>
            <span className="hero-line-2 block font-serif italic font-medium text-accent text-6xl sm:text-7xl md:text-8xl lg:text-9xl mt-2" style={{ lineHeight: '0.92' }}>
              {config.hero.line2}
            </span>
          </h1>

          <p className="hero-meta mx-auto max-w-xl text-white/75 text-base sm:text-lg mt-8 leading-relaxed">
            {config.hero.subtext}
          </p>

          <div className="hero-cta mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/booking"
              className="magnetic-btn group inline-flex items-center justify-center gap-2 bg-primary text-white font-semibold px-7 py-4 rounded-full shadow-2xl shadow-primary/40"
            >
              Book a Free Session
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href={`tel:${config.contact.phoneTel}`}
              className="lift-on-hover inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-md text-white border border-white/20 font-medium px-7 py-4 rounded-full"
            >
              <Phone className="h-4 w-4" />
              {config.contact.phone}
            </a>
          </div>

          <div className="hero-cta mt-8 inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/15 px-5 py-2.5 text-white/90 text-sm">
            <span className="font-serif italic text-accent text-lg leading-none">$0</span>
            per session, every session, forever.
          </div>
        </div>

        <div className="absolute bottom-8 right-6 sm:right-12 hidden md:flex flex-col items-center gap-2 text-white/50">
          <span className="font-mono uppercase text-[10px] tracking-[0.3em]">Scroll</span>
          <div className="h-8 w-px bg-gradient-to-b from-white/50 to-transparent" />
        </div>
      </div>
    </section>
  )
}

/* ---------------- Features ---------------- */
function Features() {
  const sectionRef = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.feature-card', {
        scrollTrigger: { trigger: sectionRef.current, start: 'top 90%', once: true },
        y: 40, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.15,
      })
      gsap.from('.feature-heading > *', {
        scrollTrigger: { trigger: sectionRef.current, start: 'top 95%', once: true },
        y: 30, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.08,
      })
    }, sectionRef)
    return () => ctx.revert()
  }, [])

  const cards = [
    {
      eyebrow: '01 / Personalized',
      heading: 'Built Around Your Child’s Grade',
      sub: 'K-9, matched exactly',
      text: 'Every plan starts with your student’s exact grade and skill level, from early number sense to Algebra I. No generic worksheets, ever.',
      Component: GradeShuffler,
    },
    {
      eyebrow: '02 / Live Sessions',
      heading: 'Concepts Click in Real Time',
      sub: 'Shared whiteboard, zero pressure',
      text: 'Watch understanding build live with a shared digital whiteboard and a tutor who adjusts the moment something doesn’t click.',
      Component: MathRain,
    },
    {
      eyebrow: '03 / Booking',
      heading: 'Scheduling In Under a Minute',
      sub: 'Pick a time, you’re set',
      text: 'Choose a grade, a format, and an open time slot. A confirmed session lands in your inbox in minutes. Completely free.',
      Component: SchedulerDemo,
    },
  ]

  return (
    <section ref={sectionRef} className="relative py-28 sm:py-40 px-6 sm:px-10 lg:px-16">
      <div className="max-w-7xl mx-auto">
        <div className="feature-heading max-w-3xl mb-16 sm:mb-24">
          <span className="font-mono text-xs uppercase tracking-[0.25em] text-primary-dark">╱ The Aidenn’s Tutoring Difference</span>
          <h2 className="font-display font-extrabold text-4xl sm:text-5xl md:text-6xl text-ink mt-4 leading-[1.05] tracking-tight">
            Tutoring that
            <span className="block font-serif italic font-medium text-primary-dark mt-1">actually fits.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {cards.map((card, idx) => (
            <article
              key={idx}
              className="feature-card group relative bg-surface border border-divider rounded-5xl p-7 hover:border-primary/40 transition-colors duration-500 shadow-sm hover:shadow-xl hover:shadow-primary/10"
            >
              <div className="flex items-center justify-between mb-6">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">{card.eyebrow}</span>
                <ArrowUpRight className="h-5 w-5 text-ink/30 group-hover:text-primary group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" strokeWidth={1.8} />
              </div>
              <card.Component />
              <div className="mt-6">
                <h3 className="font-display font-bold text-2xl text-ink leading-tight">{card.heading}</h3>
                <p className="font-serif italic text-primary-dark text-sm mt-1">{card.sub}</p>
                <p className="text-muted text-[15px] mt-4 leading-relaxed">{card.text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------------- Stats strip (condensed Pillars) ---------------- */
function StatsStrip() {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  const { config } = useSiteConfig()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect() } },
      { threshold: 0.2 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const stats = [
    { target: config.stats.sessions, suffix: '+', label: 'sessions taught' },
    { target: config.stats.freePercent, suffix: '%', label: 'free, always' },
    { target: config.stats.replyHours, suffix: ' hr', label: 'avg. reply time' },
  ]

  return (
    <section ref={ref} className="relative py-20 sm:py-28 px-6 sm:px-10 lg:px-16 overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-50" />
      <div className="relative max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-px bg-divider rounded-5xl overflow-hidden border border-divider shadow-xl shadow-primary/5">
        {stats.map((s, i) => (
          <div
            key={i}
            style={{ transitionDelay: visible ? `${i * 150}ms` : '0ms' }}
            className={`bg-surface p-8 sm:p-10 text-center transition-all duration-1000 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="flex items-end justify-center gap-1 leading-none">
              <span className="font-display font-extrabold text-5xl sm:text-6xl text-ink tabular-nums tracking-tight">
                <CountUp target={s.target} duration={1600 + i * 200} />
              </span>
              <span className="font-serif italic font-medium text-2xl sm:text-3xl text-primary-dark mb-1">{s.suffix}</span>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary-dark mt-3">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ---------------- Final CTA ---------------- */
function FinalCta() {
  return (
    <section className="relative py-20 sm:py-28 px-6 sm:px-10 lg:px-16">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="font-display font-extrabold text-3xl sm:text-5xl text-ink tracking-tight">
          Ready when you are.
          <span className="block font-serif italic font-medium text-primary-dark mt-1">Still free.</span>
        </h2>
        <Link
          to="/booking"
          className="magnetic-btn mt-8 inline-flex items-center gap-2 bg-primary text-white font-semibold px-7 py-4 rounded-full shadow-xl shadow-primary/30"
        >
          Book a Free Session
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  )
}

export default function Home() {
  useEffect(() => {
    const t = setTimeout(() => ScrollTrigger.refresh(), 300)
    return () => clearTimeout(t)
  }, [])

  return (
    <>
      <Hero />
      <Features />
      <StatsStrip />
      <DonateBanner />
      <FinalCta />
    </>
  )
}
