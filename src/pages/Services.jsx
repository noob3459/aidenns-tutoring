import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { ArrowRight } from 'lucide-react'
import { useSiteConfig } from '../context/SiteConfigContext.jsx'
import { SERVICE_ICONS } from '../data/services.js'
import PageHeader from '../components/PageHeader.jsx'
import Editable from '../components/editor/Editable.jsx'
import CustomBlocks from '../components/editor/CustomBlocks.jsx'
import { runAnimationPreset } from '../lib/animationPresets.js'

function ServicesGrid() {
  const ref = useRef(null)
  const { config } = useSiteConfig()
  const items = config.services.items
  const p = config.pages.services

  useEffect(() => {
    const style = config.elementStyles?.['services.grid'] || {}
    const ctx = gsap.context(() => {
      runAnimationPreset(style.animation || 'stagger', '.svc-tile', {
        speed: style.animationSpeed, stagger: 0.06, distance: 30,
        scrollTrigger: { trigger: ref.current, start: 'top 90%', once: true },
      })
    }, ref)
    return () => ctx.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <section ref={ref} className="relative py-8 sm:py-12 px-6 sm:px-10 lg:px-16 pb-24">
      <div className="max-w-7xl mx-auto">
        <div data-editor-id="services.grid" data-editor-kind="section" data-editor-label="Services Grid (Animation)" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((svc, i) => {
            const Icon = SERVICE_ICONS[i]
            return (
              <div
                key={i}
                data-editor-id="services.grid"
                className="svc-tile group bg-deep text-white p-7 sm:p-9 rounded-4xl relative overflow-hidden hover:shadow-2xl hover:shadow-primary/10 transition-shadow duration-500"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="h-12 w-12 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center group-hover:bg-accent group-hover:scale-110 transition-all duration-500">
                    {Icon && <Icon className="h-5 w-5 text-accent group-hover:text-deep" strokeWidth={2} />}
                  </div>
                  <Editable id="services.badgeText" as="span" contentPath="services.badgeText" label="Services Badge Text" className="font-mono text-[9px] font-semibold uppercase tracking-widest text-accent bg-accent/15 border border-accent/30 rounded-full px-2.5 py-1">
                    {config.services.badgeText}
                  </Editable>
                </div>
                <Editable id={`services.items.${i}.title`} as="h3" contentPath={`services.items.${i}.title`} label={`Service ${i + 1} Title`} className="font-display font-bold text-xl sm:text-2xl mb-3" deletableArrayPath="services.items" deletableIndex={i}>
                  {svc.title}
                </Editable>
                <Editable id={`services.items.${i}.text`} as="p" contentPath={`services.items.${i}.text`} label={`Service ${i + 1} Text`} className="text-white/55 text-sm leading-relaxed" deletableArrayPath="services.items" deletableIndex={i}>
                  {svc.text}
                </Editable>
              </div>
            )
          })}
        </div>
        <CustomBlocks sectionId="services.grid" className="max-w-3xl mx-auto space-y-3 mt-8" />

        <div className="text-center mt-16">
          <Link to="/booking" className="magnetic-btn inline-flex items-center gap-2 bg-primary text-white font-semibold px-7 py-3.5 rounded-full shadow-xl shadow-primary/30">
            <Editable id="services.grid.ctaLabel" as="span" contentPath="pages.services.ctaLabel" label="Services Page CTA Button">
              {p.ctaLabel}
            </Editable>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}

export default function Services() {
  const { config } = useSiteConfig()
  const p = config.pages.services
  return (
    <>
      <PageHeader eyebrow={p.eyebrow} heading1={p.heading1} heading2={p.heading2} sub={p.sub} idPrefix="pages.services" />
      <ServicesGrid />
    </>
  )
}
