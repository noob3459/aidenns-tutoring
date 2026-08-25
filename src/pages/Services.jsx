import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { ArrowRight } from 'lucide-react'
import { useSiteConfig } from '../context/SiteConfigContext.jsx'
import { SERVICES_FULL } from '../data/services.js'
import PageHeader from '../components/PageHeader.jsx'

function ServicesGrid() {
  const ref = useRef(null)
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.svc-tile', {
        scrollTrigger: { trigger: ref.current, start: 'top 90%', once: true },
        y: 30, opacity: 0, duration: 0.7, ease: 'power3.out', stagger: 0.06,
      })
    }, ref)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={ref} className="relative py-8 sm:py-12 px-6 sm:px-10 lg:px-16 pb-24">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {SERVICES_FULL.map((svc, i) => {
            const Icon = svc.icon
            return (
              <div
                key={i}
                className="svc-tile group bg-deep text-white p-7 sm:p-9 rounded-4xl relative overflow-hidden hover:shadow-2xl hover:shadow-primary/10 transition-shadow duration-500"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="h-12 w-12 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center group-hover:bg-accent group-hover:scale-110 transition-all duration-500">
                    <Icon className="h-5 w-5 text-accent group-hover:text-deep" strokeWidth={2} />
                  </div>
                  <span className="font-mono text-[9px] font-semibold uppercase tracking-widest text-accent bg-accent/15 border border-accent/30 rounded-full px-2.5 py-1">
                    Free
                  </span>
                </div>
                <h3 className="font-display font-bold text-xl sm:text-2xl mb-3">{svc.title}</h3>
                <p className="text-white/55 text-sm leading-relaxed">{svc.text}</p>
              </div>
            )
          })}
        </div>

        <div className="text-center mt-16">
          <Link to="/booking" className="magnetic-btn inline-flex items-center gap-2 bg-primary text-white font-semibold px-7 py-3.5 rounded-full shadow-xl shadow-primary/30">
            Book a Free Session
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
      <PageHeader eyebrow={p.eyebrow} heading1={p.heading1} heading2={p.heading2} sub={p.sub} />
      <ServicesGrid />
    </>
  )
}
