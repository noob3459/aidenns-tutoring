import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ArrowRight, ArrowUpRight, Phone } from 'lucide-react'
import { useSiteConfig } from '../context/SiteConfigContext.jsx'
import Editable from '../components/editor/Editable.jsx'
import CustomBlocks from '../components/editor/CustomBlocks.jsx'
import { runAnimationPreset } from '../lib/animationPresets.js'
import { fillGradeTemplate } from '../lib/grades.js'
import GradeShuffler from '../components/GradeShuffler.jsx'
import MathRain from '../components/MathRain.jsx'
import SchedulerDemo from '../components/SchedulerDemo.jsx'
import CountUp from '../components/CountUp.jsx'
import DonateBanner from '../components/DonateBanner.jsx'

const FEATURE_DEMO_COMPONENTS = [GradeShuffler, MathRain, SchedulerDemo]

/* ---------------- Hero ---------------- */
function Hero() {
  const { config } = useSiteConfig()
  const heroRef = useRef(null)
  const g = (text) => fillGradeTemplate(text, config.booking.minGrade, config.booking.maxGrade)

  useEffect(() => {
    const style = config.elementStyles?.['home.hero'] || {}
    const ctx = gsap.context(() => {
      // Three grouped entrance moments, same as before this feature
      // existed, just parameterized by the section's configured preset/speed.
      runAnimationPreset(style.animation || 'slide-up', '.hero-line-1', { speed: style.animationSpeed, delay: 0.3 })
      runAnimationPreset(style.animation || 'slide-up', '.hero-line-2', { speed: style.animationSpeed, delay: 0.5, distance: 60 })
      runAnimationPreset('stagger', '.hero-cta, .hero-meta', { speed: style.animationSpeed, delay: 0.8, stagger: 0.12, distance: 24 })
    }, heroRef)
    return () => ctx.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const particles = ['+', '√', 'π', '÷', '=']

  return (
    <section ref={heroRef} data-editor-id="home.hero" data-editor-kind="section" data-editor-label="Hero Section (Animation)" className="relative min-h-[100dvh] w-full overflow-hidden">
      <div className="absolute inset-0">
        <Editable
          id="home.hero.imageUrl" kind="image" as="img" contentPath="home.hero.imageUrl" label="Hero Background Image"
          src={config.hero.imageUrl}
          alt="Handwritten K-9 math problems, fractions, algebra, and a coordinate graph on paper against a navy background"
          className="w-full h-full object-cover object-center"
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
          <Editable id="home.hero.eyebrow" as="p" contentPath="hero.eyebrow" label="Hero Eyebrow Badge" className="hero-meta inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.28em] text-accent mb-6 border border-accent/40 bg-accent/10 rounded-full px-4 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-slow" />
            {g(config.hero.eyebrow)}
          </Editable>
          <h1 className="font-display font-extrabold text-white leading-[0.95] tracking-tight">
            <Editable id="home.hero.line1" as="span" contentPath="hero.line1" label="Hero Headline (Line 1)" className="hero-line-1 block text-4xl sm:text-5xl md:text-6xl">
              {config.hero.line1}
            </Editable>
            <Editable
              id="home.hero.line2" as="span" contentPath="hero.line2" label="Hero Headline (Line 2)"
              className="hero-line-2 block font-serif italic font-medium text-accent text-6xl sm:text-7xl md:text-8xl lg:text-9xl mt-2"
              style={{ lineHeight: '0.92' }}
            >
              {config.hero.line2}
            </Editable>
          </h1>

          <Editable id="home.hero.subtext" as="p" contentPath="hero.subtext" label="Hero Subtext" className="hero-meta mx-auto max-w-xl text-white/75 text-base sm:text-lg mt-8 leading-relaxed">
            {g(config.hero.subtext)}
          </Editable>

          <div className="hero-cta mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/booking"
              className="magnetic-btn group inline-flex items-center justify-center gap-2 bg-primary text-white font-semibold px-7 py-4 rounded-full shadow-2xl shadow-primary/40"
            >
              <Editable id="home.hero.ctaLabel" as="span" contentPath="home.heroCtaLabel" label="Hero CTA Button">{config.home.heroCtaLabel}</Editable>
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
            <Editable id="home.hero.pillPrefix" as="span" contentPath="hero.pillPrefix" label="Hero Pill Prefix" className="font-serif italic text-accent text-lg leading-none">
              {config.hero.pillPrefix}
            </Editable>
            <Editable id="home.hero.pillText" as="span" contentPath="hero.pillText" label="Hero Pill Text">
              {config.hero.pillText}
            </Editable>
          </div>

          <CustomBlocks sectionId="home.hero" className="space-y-2 mt-6 text-white/80" />
        </div>

        <div className="absolute bottom-8 right-6 sm:right-12 hidden md:flex flex-col items-center gap-2 text-white/50">
          <Editable id="home.hero.scrollLabel" as="span" contentPath="hero.scrollLabel" label="Hero Scroll Label" className="font-mono uppercase text-[10px] tracking-[0.3em]">
            {config.hero.scrollLabel}
          </Editable>
          <div className="h-8 w-px bg-gradient-to-b from-white/50 to-transparent" />
        </div>
      </div>
    </section>
  )
}

/* ---------------- Features ---------------- */
function Features() {
  const sectionRef = useRef(null)
  const { config } = useSiteConfig()
  const cards = config.home.featureCards
  const fs = config.home.featuresSection
  const g = (text) => fillGradeTemplate(text, config.booking.minGrade, config.booking.maxGrade)

  useEffect(() => {
    const style = config.elementStyles?.['home.features.cards'] || {}
    const headingStyle = config.elementStyles?.['home.features.heading'] || {}
    const ctx = gsap.context(() => {
      runAnimationPreset(style.animation || 'stagger', '.feature-card', {
        speed: style.animationSpeed, stagger: 0.15, distance: 40,
        scrollTrigger: { trigger: sectionRef.current, start: 'top 90%', once: true },
      })
      runAnimationPreset(headingStyle.animation || 'stagger', '.feature-heading > *', {
        speed: headingStyle.animationSpeed, stagger: 0.08, distance: 30,
        scrollTrigger: { trigger: sectionRef.current, start: 'top 95%', once: true },
      })
    }, sectionRef)
    return () => ctx.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <section ref={sectionRef} className="relative py-28 sm:py-40 px-6 sm:px-10 lg:px-16">
      <div className="max-w-7xl mx-auto">
        <div data-editor-id="home.features.heading" data-editor-kind="section" data-editor-label="Features Heading (Animation)" className="feature-heading max-w-3xl mb-16 sm:mb-24">
          <Editable id="home.featuresSection.eyebrow" as="span" contentPath="home.featuresSection.eyebrow" label="Features Eyebrow" className="font-mono text-xs uppercase tracking-[0.25em] text-primary-dark">
            {fs.eyebrow}
          </Editable>
          <h2 className="font-display font-extrabold text-4xl sm:text-5xl md:text-6xl text-ink mt-4 leading-[1.05] tracking-tight">
            <Editable id="home.featuresSection.heading1" as="span" contentPath="home.featuresSection.heading1" label="Features Heading (Line 1)">
              {fs.heading1}
            </Editable>
            <Editable id="home.featuresSection.heading2" as="span" contentPath="home.featuresSection.heading2" label="Features Heading (Line 2)" className="block font-serif italic font-medium text-primary-dark mt-1">
              {fs.heading2}
            </Editable>
          </h2>
          <CustomBlocks sectionId="home.features.heading" />
        </div>

        <div data-editor-id="home.features.cards" data-editor-kind="section" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {cards.map((card, idx) => {
            const DemoComponent = FEATURE_DEMO_COMPONENTS[idx]
            return (
              <article
                key={idx}
                data-editor-id="home.features.cards"
                className="feature-card group relative bg-surface border border-divider rounded-5xl p-7 hover:border-primary/40 transition-colors duration-500 shadow-sm hover:shadow-xl hover:shadow-primary/10"
              >
                <div className="flex items-center justify-between mb-6">
                  <Editable id={`home.featureCards.${idx}.eyebrow`} contentPath={`home.featureCards.${idx}.eyebrow`} label={`Feature Card ${idx + 1} Eyebrow`} as="span" className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted" deletableArrayPath="home.featureCards" deletableIndex={idx}>
                    {card.eyebrow}
                  </Editable>
                  <ArrowUpRight className="h-5 w-5 text-ink/30 group-hover:text-primary group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" strokeWidth={1.8} />
                </div>
                {DemoComponent && <DemoComponent />}
                <div className="mt-6">
                  <Editable id={`home.featureCards.${idx}.heading`} contentPath={`home.featureCards.${idx}.heading`} label={`Feature Card ${idx + 1} Heading`} as="h3" className="font-display font-bold text-2xl text-ink leading-tight" deletableArrayPath="home.featureCards" deletableIndex={idx}>
                    {card.heading}
                  </Editable>
                  <Editable id={`home.featureCards.${idx}.sub`} contentPath={`home.featureCards.${idx}.sub`} label={`Feature Card ${idx + 1} Subheading`} as="p" className="font-serif italic text-primary-dark text-sm mt-1" deletableArrayPath="home.featureCards" deletableIndex={idx}>
                    {g(card.sub)}
                  </Editable>
                  <Editable id={`home.featureCards.${idx}.text`} contentPath={`home.featureCards.${idx}.text`} label={`Feature Card ${idx + 1} Body Text`} as="p" className="text-muted text-[15px] mt-4 leading-relaxed" deletableArrayPath="home.featureCards" deletableIndex={idx}>
                    {card.text}
                  </Editable>
                </div>
              </article>
            )
          })}
        </div>
        <CustomBlocks sectionId="home.features.cards" />
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
    { target: config.stats.sessions, suffix: '+', label: config.stats.sessionsLabel, contentPath: 'stats.sessionsLabel' },
    { target: config.stats.freePercent, suffix: '%', label: config.stats.freePercentLabel, contentPath: 'stats.freePercentLabel' },
    { target: config.stats.replyHours, suffix: ' hr', label: config.stats.replyHoursLabel, contentPath: 'stats.replyHoursLabel' },
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
            <Editable id={`stats.${['sessionsLabel', 'freePercentLabel', 'replyHoursLabel'][i]}`} as="p" contentPath={s.contentPath} label={`Stat ${i + 1} Label`} className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary-dark mt-3">
              {s.label}
            </Editable>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ---------------- Final CTA ---------------- */
function FinalCta() {
  const { config } = useSiteConfig()
  const cta = config.home.finalCta
  return (
    <section data-editor-id="home.finalCta" data-editor-kind="section" data-editor-label="Final CTA Section (Animation)" className="relative py-20 sm:py-28 px-6 sm:px-10 lg:px-16">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="font-display font-extrabold text-3xl sm:text-5xl text-ink tracking-tight">
          <Editable id="home.finalCta.heading1" as="span" contentPath="home.finalCta.heading1" label="Final CTA Headline (Line 1)">{cta.heading1}</Editable>
          <Editable id="home.finalCta.heading2" as="span" contentPath="home.finalCta.heading2" label="Final CTA Headline (Line 2)" className="block font-serif italic font-medium text-primary-dark mt-1">
            {cta.heading2}
          </Editable>
        </h2>
        <Link
          to="/booking"
          className="magnetic-btn mt-8 inline-flex items-center gap-2 bg-primary text-white font-semibold px-7 py-4 rounded-full shadow-xl shadow-primary/30"
        >
          <Editable id="home.finalCta.ctaLabel" as="span" contentPath="home.finalCta.ctaLabel" label="Final CTA Button">{cta.ctaLabel}</Editable>
          <ArrowRight className="h-4 w-4" />
        </Link>
        <CustomBlocks sectionId="home.finalCta" />
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
