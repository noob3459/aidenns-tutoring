import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { Heart, Users, PiggyBank } from 'lucide-react'
import { useSiteConfig } from '../context/SiteConfigContext.jsx'
import PageHeader from '../components/PageHeader.jsx'
import DonateBanner from '../components/DonateBanner.jsx'
import Editable from '../components/editor/Editable.jsx'
import { runAnimationPreset } from '../lib/animationPresets.js'
import { fillGradeTemplate } from '../lib/grades.js'

const REASON_ICONS = [Heart, Users, PiggyBank]

function WhyDonate() {
  const ref = useRef(null)
  const { config } = useSiteConfig()
  const { reasons } = config.donate
  const g = (text) => fillGradeTemplate(text, config.booking.minGrade, config.booking.maxGrade)

  useEffect(() => {
    const style = config.elementStyles?.['donate.reasons'] || {}
    const ctx = gsap.context(() => {
      runAnimationPreset(style.animation || 'stagger', '.reason-card', {
        speed: style.animationSpeed, stagger: 0.12, distance: 30,
        scrollTrigger: { trigger: ref.current, start: 'top 90%', once: true },
      })
    }, ref)
    return () => ctx.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <section ref={ref} className="relative px-6 sm:px-10 lg:px-16 pb-16">
      <div className="max-w-5xl mx-auto">
        <div data-editor-id="donate.reasons" data-editor-kind="section" data-editor-label="Why Donate (Animation)" className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {reasons.map((r, i) => {
            const Icon = REASON_ICONS[i]
            return (
              <div
                key={i}
                data-editor-id="donate.reasons"
                className="reason-card bg-white border border-divider rounded-4xl p-7 hover:border-primary/40 transition-all duration-500 shadow-sm"
              >
                {Icon && <Icon className="h-6 w-6 text-primary mb-3" strokeWidth={1.8} />}
                <Editable
                  id={`donate.reasons.${i}.title`} as="h3" contentPath={`donate.reasons.${i}.title`}
                  label={`Donate Reason ${i + 1} Title`} className="font-display font-bold text-lg text-ink mb-1.5"
                  deletableArrayPath="donate.reasons" deletableIndex={i}
                >
                  {r.title}
                </Editable>
                <Editable
                  id={`donate.reasons.${i}.text`} as="p" contentPath={`donate.reasons.${i}.text`}
                  label={`Donate Reason ${i + 1} Text`} className="text-muted text-sm leading-relaxed"
                  deletableArrayPath="donate.reasons" deletableIndex={i}
                >
                  {g(r.text)}
                </Editable>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default function Donate() {
  const { config } = useSiteConfig()
  const p = config.pages.donate

  return (
    <>
      <PageHeader eyebrow={p.eyebrow} heading1={p.heading1} heading2={p.heading2} sub={p.sub} idPrefix="pages.donate" />
      <WhyDonate />
      <DonateBanner />
    </>
  )
}
