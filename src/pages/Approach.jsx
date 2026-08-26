import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { ArrowRight, ShieldCheck, Star, TrendingUp } from 'lucide-react'
import { useSiteConfig } from '../context/SiteConfigContext.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Editable from '../components/editor/Editable.jsx'
import { runAnimationPreset } from '../lib/animationPresets.js'
import { fillGradeTemplate } from '../lib/grades.js'

// Images/alt text stay static (not text-editable in v1) — title/tagline/
// text/meta per step are config-driven.
const PROTOCOL_MEDIA = [
  { image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80', alt: 'Parent filling out a form with a notebook' },
  { image: 'https://images.unsplash.com/photo-1509869175650-a1d97972541a?auto=format&fit=crop&w=1200&q=80', alt: 'Notebook with math equations and a pencil' },
  { image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=1200&q=80', alt: 'Student and tutor working together' },
]

const TRUST_ICONS = [Star, TrendingUp, ShieldCheck]

function Protocol() {
  const containerRef = useRef(null)
  const { config } = useSiteConfig()
  const steps = config.approach.protocolSteps

  // This is a continuous scroll-linked pin/blur effect, not a simple
  // entrance — intentionally excluded from the Visual Editor's animation
  // presets (forcing it through 3 generic presets risks breaking the
  // sticky-stack layout).
  useEffect(() => {
    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray('.protocol-card')
      cards.forEach((card, i) => {
        if (i === cards.length - 1) return
        gsap.to(card, {
          scrollTrigger: {
            trigger: card,
            start: 'top top+=100',
            endTrigger: cards[cards.length - 1],
            end: 'top top+=120',
            scrub: 1,
          },
          scale: 0.92, filter: 'blur(6px) saturate(0.7)', opacity: 0.5, ease: 'none',
        })
      })
    }, containerRef)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={containerRef} className="relative px-4 sm:px-6 py-12">
      <div className="space-y-8">
        {steps.map((step, idx) => {
          const media = PROTOCOL_MEDIA[idx]
          const num = String(idx + 1).padStart(2, '0')
          return (
            <article
              key={idx}
              className="protocol-card sticky top-24 sm:top-28 mx-auto max-w-6xl bg-gradient-to-br from-surface to-background border border-divider rounded-6xl overflow-hidden shadow-2xl shadow-primary/5"
            >
              <div className="grid lg:grid-cols-5 gap-0 min-h-[55vh] lg:min-h-[62vh]">
                <div className="lg:col-span-3 p-8 sm:p-12 lg:p-16 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <Editable id={`approach.protocolSteps.${idx}.meta`} as="span" contentPath={`approach.protocolSteps.${idx}.meta`} label={`Protocol Step ${idx + 1} Meta Label`} className="font-mono text-xs uppercase tracking-[0.25em] text-muted">
                      {step.meta}
                    </Editable>
                    <Editable id="approach.protocolPillText" as="span" contentPath="approach.protocolPillText" label="Protocol Pill Text" className="font-mono text-[10px] uppercase tracking-widest text-primary-dark bg-primary/10 px-2.5 py-1 rounded-full">
                      {config.approach.protocolPillText}
                    </Editable>
                  </div>

                  <div className="my-12">
                    <span className="font-display font-extrabold text-[7rem] sm:text-[10rem] leading-none text-primary/15 -mb-4 block">{num}</span>
                    <Editable
                      id={`approach.protocolSteps.${idx}.title`} as="h3" contentPath={`approach.protocolSteps.${idx}.title`}
                      label={`Protocol Step ${idx + 1} Title`}
                      className="font-display font-bold text-4xl sm:text-5xl md:text-6xl text-ink leading-[1.02] tracking-tight"
                    >
                      {step.title}
                    </Editable>
                    <Editable
                      id={`approach.protocolSteps.${idx}.tagline`} as="p" contentPath={`approach.protocolSteps.${idx}.tagline`}
                      label={`Protocol Step ${idx + 1} Tagline`}
                      className="font-serif italic text-primary-dark text-2xl sm:text-3xl mt-3"
                    >
                      {step.tagline}
                    </Editable>
                  </div>

                  <Editable
                    id={`approach.protocolSteps.${idx}.text`} as="p" contentPath={`approach.protocolSteps.${idx}.text`}
                    label={`Protocol Step ${idx + 1} Body Text`}
                    className="text-muted text-base sm:text-lg leading-relaxed max-w-lg"
                  >
                    {step.text}
                  </Editable>
                </div>

                <div className="lg:col-span-2 relative overflow-hidden min-h-[280px] lg:min-h-full bg-deep">
                  <img src={media.image} alt={media.alt} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-deep/60 via-transparent to-deep/15" />
                  <div className="absolute top-5 left-5 flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full pl-3 pr-4 py-1.5 shadow-lg">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span className="font-mono text-[10px] uppercase tracking-widest text-ink">
                      <Editable id="approach.stepLabelPrefix" as="span" contentPath="approach.stepLabelPrefix" label="Protocol Step Label Prefix">
                        {config.approach.stepLabelPrefix}
                      </Editable> {num}
                    </span>
                  </div>
                  <div className="absolute bottom-4 right-4 font-mono text-[10px] uppercase tracking-widest text-white/70">
                    {num} / <Editable id="approach.stepFooterSuffix" as="span" contentPath="approach.stepFooterSuffix" label="Protocol Step Footer Suffix">{config.approach.stepFooterSuffix}</Editable>
                  </div>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function TrustSignals() {
  const ref = useRef(null)
  const { config } = useSiteConfig()
  const badges = config.approach.trustBadges
  const p = config.pages.approach
  const g = (text) => fillGradeTemplate(text, config.booking.minGrade, config.booking.maxGrade)

  useEffect(() => {
    const style = config.elementStyles?.['approach.trustSignals.badges'] || {}
    const ctx = gsap.context(() => {
      runAnimationPreset(style.animation || 'stagger', '.trust-badge', {
        speed: style.animationSpeed, stagger: 0.12, distance: 24,
        scrollTrigger: { trigger: ref.current, start: 'top 90%', once: true },
      })
    }, ref)
    return () => ctx.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <section ref={ref} className="relative py-20 sm:py-28 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <Editable id="approach.trustSignalsHeading.eyebrow" as="span" contentPath="approach.trustSignalsHeading.eyebrow" label="Trust Signals Eyebrow" className="font-mono text-xs uppercase tracking-[0.25em] text-primary-dark">
            {config.approach.trustSignalsHeading.eyebrow}
          </Editable>
          <Editable id="approach.trustSignalsHeading.heading" as="h2" contentPath="approach.trustSignalsHeading.heading" label="Trust Signals Heading" className="font-display font-extrabold text-3xl sm:text-4xl md:text-5xl text-ink mt-3 tracking-tight">
            {config.approach.trustSignalsHeading.heading}
          </Editable>
        </div>

        <div data-editor-id="approach.trustSignals.badges" data-editor-kind="section" data-editor-label="Trust Badges (Animation)" className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {badges.map((badge, i) => {
            const Icon = TRUST_ICONS[i]
            return (
              <div
                key={i}
                data-editor-id="approach.trustSignals.badges"
                className="trust-badge bg-white border border-divider rounded-4xl p-6 hover:border-primary/40 transition-all duration-700 ease-out shadow-sm"
              >
                <Icon className="h-6 w-6 text-primary mb-3" strokeWidth={1.8} />
                <Editable id={`approach.trustBadges.${i}.title`} as="h3" contentPath={`approach.trustBadges.${i}.title`} label={`Trust Badge ${i + 1} Title`} className="font-display font-bold text-lg text-ink mb-1.5">
                  {badge.title}
                </Editable>
                <Editable id={`approach.trustBadges.${i}.text`} as="p" contentPath={`approach.trustBadges.${i}.text`} label={`Trust Badge ${i + 1} Text`} className="text-muted text-sm leading-relaxed">
                  {g(badge.text)}
                </Editable>
              </div>
            )
          })}
        </div>

        <div className="text-center">
          <Link to="/booking" className="magnetic-btn inline-flex items-center gap-2 bg-primary text-white font-semibold px-7 py-3.5 rounded-full shadow-xl shadow-primary/30">
            <Editable id="approach.trustSignals.ctaLabel" as="span" contentPath="pages.approach.ctaLabel" label="Trust Signals CTA Button">
              {p.ctaLabel}
            </Editable>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}

export default function Approach() {
  const { config } = useSiteConfig()
  const p = config.pages.approach
  return (
    <>
      <PageHeader eyebrow={p.eyebrow} heading1={p.heading1} heading2={p.heading2} sub={p.sub} idPrefix="pages.approach" />
      <Protocol />
      <TrustSignals />
    </>
  )
}
