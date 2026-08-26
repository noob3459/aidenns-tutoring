import { useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useSiteConfig } from '../context/SiteConfigContext.jsx'
import Editable from './editor/Editable.jsx'

const LOGO_CLICK_THRESHOLD = 5
const LOGO_CLICK_RESET_MS = 1500

export default function Footer() {
  const { config } = useSiteConfig()
  const { contact, footer } = config
  const navigate = useNavigate()
  const logoClickCount = useRef(0)
  const logoClickTimer = useRef(null)

  // Hidden admin shortcut: click the footer logo 5 times in a row (within
  // 1.5s of each other) to jump to /admin — intentionally has no visual
  // affordance, so it stays undiscoverable to regular visitors.
  const handleLogoClick = () => {
    logoClickCount.current += 1
    if (logoClickTimer.current) clearTimeout(logoClickTimer.current)

    if (logoClickCount.current >= LOGO_CLICK_THRESHOLD) {
      logoClickCount.current = 0
      navigate('/admin')
      return
    }

    logoClickTimer.current = setTimeout(() => { logoClickCount.current = 0 }, LOGO_CLICK_RESET_MS)
  }

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
              <Editable id="footer.ctaLabel" as="span" contentPath="footer.ctaLabel" label="Footer CTA Button">{footer.ctaLabel}</Editable>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-10">
          <div className="col-span-2">
            <div className="mb-4">
              <Editable
                id="footer.logoUrl" kind="image" as="img" contentPath="footer.logoUrl" label="Footer Logo"
                src={footer.logoUrl} alt="Aidenn's Tutoring" className="h-14 sm:h-16 w-auto"
                onClick={handleLogoClick}
              />
            </div>
            <Editable id="footer.aboutBlurb" as="p" contentPath="footer.aboutBlurb" label="Footer About Blurb" className="text-white/50 text-sm leading-relaxed max-w-xs">
              {footer.aboutBlurb}
            </Editable>
            <Editable id="footer.communityLine" as="p" contentPath="footer.communityLine" label="Footer Community Line" className="font-mono text-[10px] uppercase tracking-widest text-white/30 mt-6">
              {footer.communityLine}
            </Editable>
          </div>

          <div>
            <Editable id="footer.servicesHeading" as="p" contentPath="footer.servicesHeading" label="Footer Services Heading" className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent mb-4">
              {footer.servicesHeading}
            </Editable>
            <ul className="space-y-2.5">
              {config.services.items.slice(0, 4).map((s, i) => (
                <li key={i}>
                  <Link to="/services" className="text-white/65 hover:text-accent transition text-sm">{s.title}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <Editable id="footer.programHeading" as="p" contentPath="footer.programHeading" label="Footer Program Heading" className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent mb-4">
              {footer.programHeading}
            </Editable>
            <ul className="space-y-2.5">
              {[
                { to: '/approach' },
                { to: '/about' },
                { to: '/booking' },
                { to: '/contact' },
              ].map(({ to }, i) => (
                <li key={to}>
                  <Link to={to} className="text-white/65 hover:text-accent transition text-sm">
                    <Editable id={`footer.programLinks.${i}.label`} as="span" contentPath={`footer.programLinks.${i}.label`} label={`Footer Program Link ${i + 1}`} deletableArrayPath="footer.programLinks" deletableIndex={i}>
                      {footer.programLinks[i].label}
                    </Editable>
                  </Link>
                </li>
              ))}
              <li>
                <a href={`mailto:${contact.donateEmail}?subject=I%27d%20like%20to%20donate`} className="text-white/65 hover:text-accent transition text-sm">
                  <Editable id="footer.donateLinkLabel" as="span" contentPath="footer.donateLinkLabel" label="Footer Donate Link">
                    {footer.donateLinkLabel}
                  </Editable>
                </a>
              </li>
            </ul>
          </div>

          <div>
            <Editable id="footer.contactHeading" as="p" contentPath="footer.contactHeading" label="Footer Contact Heading" className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent mb-4">
              {footer.contactHeading}
            </Editable>
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
            <Editable id="footer.statusPillText" as="span" contentPath="footer.statusPillText" label="Footer Status Pill" className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/60">
              {footer.statusPillText}
            </Editable>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-white/50 text-xs font-mono">
            <Link to="/privacy" className="hover:text-accent transition">
              <Editable id="footer.privacyLabel" as="span" contentPath="footer.privacyLabel" label="Footer Privacy Link">{footer.privacyLabel}</Editable>
            </Link>
            <Link to="/terms" className="hover:text-accent transition">
              <Editable id="footer.termsLabel" as="span" contentPath="footer.termsLabel" label="Footer Terms Link">{footer.termsLabel}</Editable>
            </Link>
            <Editable id="footer.copyrightText" as="span" contentPath="footer.copyrightText" label="Footer Copyright Text">{footer.copyrightText}</Editable>
          </div>
        </div>
      </div>
    </footer>
  )
}
