import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useSiteConfig } from '../context/SiteConfigContext.jsx'
import { SERVICES_FULL } from '../data/services.js'

export default function Footer() {
  const { config } = useSiteConfig()
  const { contact, footer } = config

  return (
    <footer className="relative bg-deep text-white rounded-t-6xl mt-12 overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-15" />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-64 w-[40rem] rounded-full bg-primary/20 blur-3xl" />

      <div className="relative px-6 sm:px-10 lg:px-16 pt-20 pb-10 max-w-7xl mx-auto">
        <div className="border-b border-white/10 pb-12 mb-12">
          <h2 className="font-display font-extrabold text-5xl sm:text-7xl md:text-8xl leading-[0.92] tracking-tight">
            {footer.tagline1}
            <span className="font-serif italic font-medium text-accent block">{footer.tagline2}</span>
          </h2>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mt-8 gap-6">
            <p className="text-white/50 max-w-md">{footer.blurb}</p>
            <Link to="/booking" className="magnetic-btn inline-flex items-center gap-2 bg-primary text-white font-semibold px-7 py-3.5 rounded-full self-start sm:self-auto">
              Book a Free Session
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-10">
          <div className="col-span-2">
            <div className="mb-4">
              <img
                src="/images/aidenns-tutoring-logo-premium.png"
                alt="Aidenn's Tutoring"
                className="h-14 sm:h-16 w-auto"
              />
            </div>
            <p className="text-white/50 text-sm leading-relaxed max-w-xs">
              Certified K-9 math tutoring for every family, no tuition, no hidden fees, ever.
            </p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-white/30 mt-6">
              Community-Funded &middot; Est. 2024
            </p>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent mb-4">Services</p>
            <ul className="space-y-2.5">
              {SERVICES_FULL.slice(0, 4).map((s, i) => (
                <li key={i}>
                  <Link to="/services" className="text-white/65 hover:text-accent transition text-sm">{s.title}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent mb-4">Program</p>
            <ul className="space-y-2.5">
              <li><Link to="/approach" className="text-white/65 hover:text-accent transition text-sm">Approach</Link></li>
              <li><Link to="/booking" className="text-white/65 hover:text-accent transition text-sm">Book a Session</Link></li>
              <li><Link to="/contact" className="text-white/65 hover:text-accent transition text-sm">Contact</Link></li>
              <li><a href={`mailto:${contact.donateEmail}?subject=I%27d%20like%20to%20donate`} className="text-white/65 hover:text-accent transition text-sm">Donate</a></li>
            </ul>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent mb-4">Contact</p>
            <ul className="space-y-2.5">
              <li><a href={`tel:${contact.phoneTel}`} className="text-white/65 hover:text-accent transition text-sm">{contact.phone}</a></li>
              <li><a href={`mailto:${contact.email}`} className="text-white/65 hover:text-accent transition text-sm">{contact.email}</a></li>
              <li className="text-white/65 text-sm">{contact.serving}</li>
            </ul>
          </div>
        </div>

        <div className="mt-14 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping" />
              <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/60">
              Booking Open &middot; Accepting Students
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-white/50 text-xs font-mono">
            <Link to="/privacy" className="hover:text-accent transition">Privacy</Link>
            <Link to="/terms" className="hover:text-accent transition">Terms</Link>
            <span>&copy; 2026 Aidenn&rsquo;s Tutoring</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
