import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { ArrowRight, GraduationCap, ShieldCheck, Sigma, MapPin } from 'lucide-react'
import { useSiteConfig } from '../context/SiteConfigContext.jsx'
import PageHeader from '../components/PageHeader.jsx'
import Editable from '../components/editor/Editable.jsx'
import CustomBlocks from '../components/editor/CustomBlocks.jsx'
import { runAnimationPreset } from '../lib/animationPresets.js'
import { fillGradeTemplate } from '../lib/grades.js'

const CREDENTIAL_ICONS = [ShieldCheck, Sigma, MapPin]

function Profile() {
  const ref = useRef(null)
  const { config } = useSiteConfig()
  const about = config.about
  const g = (text) => fillGradeTemplate(text, config.booking.minGrade, config.booking.maxGrade)

  useEffect(() => {
    const identityStyle = config.elementStyles?.['about.identity'] || {}
    const bioStyle = config.elementStyles?.['about.bio'] || {}
    const ctx = gsap.context(() => {
      runAnimationPreset(identityStyle.animation || 'slide-up', '.about-identity', {
        speed: identityStyle.animationSpeed,
        scrollTrigger: { trigger: ref.current, start: 'top 85%', once: true },
      })
      runAnimationPreset(bioStyle.animation || 'stagger', '.about-bio-para', {
        speed: bioStyle.animationSpeed, stagger: 0.12, distance: 24,
        scrollTrigger: { trigger: ref.current, start: 'top 75%', once: true },
      })
    }, ref)
    return () => ctx.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <section ref={ref} className="relative px-6 sm:px-10 lg:px-16 pb-16">
      <div className="max-w-4xl mx-auto">
        <div
          data-editor-id="about.identity" data-editor-kind="section" data-editor-label="About Identity (Animation)"
          className="about-identity flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-10"
        >
          <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
            <GraduationCap className="h-10 w-10 text-primary" strokeWidth={1.8} />
          </span>
          <div className="text-center sm:text-left">
            <Editable id="about.name" as="p" contentPath="about.name" label="About Page Name" className="font-display font-bold text-2xl text-ink">
              {about.name}
            </Editable>
            <Editable id="about.role" as="p" contentPath="about.role" label="About Page Role" className="font-serif italic text-primary-dark text-lg mt-0.5">
              {about.role}
            </Editable>
          </div>
        </div>

        <div data-editor-id="about.bio" data-editor-kind="section" data-editor-label="About Bio (Animation)" className="space-y-5 max-w-2xl mx-auto sm:mx-0">
          {about.bioParagraphs.map((para, i) => (
            <Editable
              key={i} id={`about.bioParagraphs.${i}.text`} as="p" contentPath={`about.bioParagraphs.${i}.text`}
              label={`Bio Paragraph ${i + 1}`}
              className="about-bio-para text-muted text-base sm:text-lg leading-relaxed"
              deletableArrayPath="about.bioParagraphs" deletableIndex={i}
            >
              {g(para.text)}
            </Editable>
          ))}
        </div>
      </div>
    </section>
  )
}

function Credentials() {
  const ref = useRef(null)
  const { config } = useSiteConfig()
  const credentials = config.about.credentials
  const p = config.pages.about
  const g = (text) => fillGradeTemplate(text, config.booking.minGrade, config.booking.maxGrade)

  useEffect(() => {
    const style = config.elementStyles?.['about.credentials'] || {}
    const ctx = gsap.context(() => {
      runAnimationPreset(style.animation || 'stagger', '.credential-card', {
        speed: style.animationSpeed, stagger: 0.12, distance: 24,
        scrollTrigger: { trigger: ref.current, start: 'top 90%', once: true },
      })
    }, ref)
    return () => ctx.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <section ref={ref} className="relative py-16 sm:py-20 px-6 sm:px-10 lg:px-16">
      <div className="max-w-5xl mx-auto">
        <div data-editor-id="about.credentials" data-editor-kind="section" data-editor-label="Credentials Grid (Animation)" className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          {credentials.map((c, i) => {
            const Icon = CREDENTIAL_ICONS[i]
            return (
              <div
                key={i}
                data-editor-id="about.credentials"
                className="credential-card bg-white border border-divider rounded-4xl p-6 hover:border-primary/40 transition-colors duration-500 shadow-sm"
              >
                {Icon && <Icon className="h-6 w-6 text-primary mb-3" strokeWidth={1.8} />}
                <Editable id={`about.credentials.${i}.title`} as="h3" contentPath={`about.credentials.${i}.title`} label={`Credential ${i + 1} Title`} className="font-display font-bold text-lg text-ink mb-1.5" deletableArrayPath="about.credentials" deletableIndex={i}>
                  {g(c.title)}
                </Editable>
                <Editable id={`about.credentials.${i}.text`} as="p" contentPath={`about.credentials.${i}.text`} label={`Credential ${i + 1} Text`} className="text-muted text-sm leading-relaxed" deletableArrayPath="about.credentials" deletableIndex={i}>
                  {g(c.text)}
                </Editable>
              </div>
            )
          })}
        </div>
        <CustomBlocks sectionId="about.credentials" className="max-w-3xl mx-auto space-y-3 mb-12" />

        <div className="text-center">
          <Link to="/booking" className="magnetic-btn inline-flex items-center gap-2 bg-primary text-white font-semibold px-7 py-3.5 rounded-full shadow-xl shadow-primary/30">
            <Editable id="pages.about.ctaLabel" as="span" contentPath="pages.about.ctaLabel" label="About Page CTA Button">
              {p.ctaLabel}
            </Editable>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}

export default function AboutMe() {
  const { config } = useSiteConfig()
  const p = config.pages.about
  return (
    <>
      <PageHeader eyebrow={p.eyebrow} heading1={p.heading1} heading2={p.heading2} sub={p.sub} idPrefix="pages.about" />
      <Profile />
      <Credentials />
    </>
  )
}
