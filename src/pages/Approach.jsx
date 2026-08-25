import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { ArrowRight, ShieldCheck, Star, TrendingUp } from 'lucide-react'
import { useSiteConfig } from '../context/SiteConfigContext.jsx'
import PageHeader from '../components/PageHeader.jsx'

function Protocol() {
  const containerRef = useRef(null)

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

  const steps = [
    {
      num: '01', title: 'Share Your Goals', tagline: 'Two minutes, that’s it.',
      text: 'Tell us your student’s grade and where they’re stuck: fractions, word problems, algebra, anything. No cost, no obligation, no catch.',
      image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80',
      alt: 'Parent filling out a form with a notebook', meta: 'Step 1 / Listen',
    },
    {
      num: '02', title: 'We Build a Plan', tagline: 'Made for your student.',
      text: 'A certified educator reviews the goals and designs a session plan targeting the exact skill gaps, matched to what’s being taught in class.',
      image: 'https://images.unsplash.com/photo-1509869175650-a1d97972541a?auto=format&fit=crop&w=1200&q=80',
      alt: 'Notebook with math equations and a pencil', meta: 'Step 2 / Plan',
    },
    {
      num: '03', title: 'Start Free Sessions', tagline: 'Online or in person.',
      text: 'Meet on a recurring weekly slot that fits your family’s schedule. Every session is completely free, this week, next month, always.',
      image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=1200&q=80',
      alt: 'Student and tutor working together', meta: 'Step 3 / Learn',
    },
  ]

  return (
    <section ref={containerRef} className="relative px-4 sm:px-6 py-12">
      <div className="space-y-8">
        {steps.map((step, idx) => (
          <article
            key={idx}
            className="protocol-card sticky top-24 sm:top-28 mx-auto max-w-6xl bg-gradient-to-br from-surface to-background border border-divider rounded-6xl overflow-hidden shadow-2xl shadow-primary/5"
          >
            <div className="grid lg:grid-cols-5 gap-0 min-h-[55vh] lg:min-h-[62vh]">
              <div className="lg:col-span-3 p-8 sm:p-12 lg:p-16 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs uppercase tracking-[0.25em] text-muted">{step.meta}</span>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-primary-dark bg-primary/10 px-2.5 py-1 rounded-full">
                    Aidenn&rsquo;s Protocol
                  </span>
                </div>

                <div className="my-12">
                  <span className="font-display font-extrabold text-[7rem] sm:text-[10rem] leading-none text-primary/15 -mb-4 block">{step.num}</span>
                  <h3 className="font-display font-bold text-4xl sm:text-5xl md:text-6xl text-ink leading-[1.02] tracking-tight">{step.title}</h3>
                  <p className="font-serif italic text-primary-dark text-2xl sm:text-3xl mt-3">{step.tagline}</p>
                </div>

                <p className="text-muted text-base sm:text-lg leading-relaxed max-w-lg">{step.text}</p>
              </div>

              <div className="lg:col-span-2 relative overflow-hidden min-h-[280px] lg:min-h-full bg-deep">
                <img src={step.image} alt={step.alt} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-deep/60 via-transparent to-deep/15" />
                <div className="absolute top-5 left-5 flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full pl-3 pr-4 py-1.5 shadow-lg">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-ink">Step {step.num}</span>
                </div>
                <div className="absolute bottom-4 right-4 font-mono text-[10px] uppercase tracking-widest text-white/70">{step.num} / Aidenn&rsquo;s Tutoring</div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function TrustSignals() {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect() } },
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const badges = [
    { Icon: Star, title: 'Loved by Parents', text: '“My son actually looks forward to math night now.” (a parent, Grade 4)' },
    { Icon: TrendingUp, title: 'Real Score Improvement', text: 'Students average a full letter-grade jump within one semester of weekly sessions.' },
    { Icon: ShieldCheck, title: 'Certified & Background-Checked', text: 'Every session is led by a certified K-9 educator trained in child-safe tutoring practices.' },
  ]

  return (
    <section ref={ref} className="relative py-20 sm:py-28 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <span className="font-mono text-xs uppercase tracking-[0.25em] text-primary-dark">╱ Why Families Trust Us</span>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl md:text-5xl text-ink mt-3 tracking-tight">More than free.</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {badges.map(({ Icon, title, text }, i) => (
            <div
              key={i}
              style={{ transitionDelay: visible ? `${i * 120}ms` : '0ms' }}
              className={`bg-white border border-divider rounded-4xl p-6 hover:border-primary/40 transition-all duration-700 ease-out shadow-sm ${
                visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}
            >
              <Icon className="h-6 w-6 text-primary mb-3" strokeWidth={1.8} />
              <h3 className="font-display font-bold text-lg text-ink mb-1.5">{title}</h3>
              <p className="text-muted text-sm leading-relaxed">{text}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link to="/booking" className="magnetic-btn inline-flex items-center gap-2 bg-primary text-white font-semibold px-7 py-3.5 rounded-full shadow-xl shadow-primary/30">
            Book a Free Session
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
      <PageHeader eyebrow={p.eyebrow} heading1={p.heading1} heading2={p.heading2} sub={p.sub} />
      <Protocol />
      <TrustSignals />
    </>
  )
}
