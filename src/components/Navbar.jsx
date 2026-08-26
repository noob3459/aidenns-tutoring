import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Menu, X, ArrowUpRight } from 'lucide-react'
import { useSiteConfig } from '../context/SiteConfigContext.jsx'
import Editable from './editor/Editable.jsx'

// Destinations stay static (not editable in v1) — only the labels shown
// for each link are config-driven, indexed to match config.navbar.navLinks.
const NAV_HREFS = ['/', '/services', '/approach', '/about', '/contact']

export default function Navbar() {
  const { config } = useSiteConfig()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const navLinks = config.navbar.navLinks.map((link, i) => ({ label: link.label, href: NAV_HREFS[i] }))

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <nav
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 glass-dark border border-white/10 transition-shadow duration-500 ${
          scrolled ? 'shadow-lg shadow-black/30' : 'shadow-md shadow-black/20'
        } rounded-full px-4 sm:px-6 py-2.5 w-[calc(100%-2rem)] max-w-5xl`}
      >
        <div className="flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 group shrink-0">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-full overflow-hidden shrink-0">
              <img
                src="/images/aidenns-tutoring-logo-mark.png"
                alt="Aidenn's Tutoring logo"
                className="h-full w-full object-cover"
              />
              <span className="absolute inset-0 rounded-full ring-2 ring-accent/40 group-hover:ring-accent/60 transition pointer-events-none" />
            </span>
            <Editable id="navbar.brandText" as="span" contentPath="navbar.brandText" label="Navbar Brand Text" className="font-display font-bold tracking-tight text-lg text-white">
              {config.navbar.brandText}
            </Editable>
          </Link>

          <Editable
            id="navbar.freeBadgeText" as="span" contentPath="navbar.freeBadgeText" label="Navbar Free Badge"
            className="hidden md:inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] px-2.5 py-1 rounded-full border border-accent/50 bg-accent/15 text-accent"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            {config.navbar.freeBadgeText}
          </Editable>

          <div className="hidden lg:flex items-center gap-7 ml-auto mr-2">
            {navLinks.map((link, i) => (
              <NavLink
                key={link.href}
                to={link.href}
                className={({ isActive }) =>
                  `text-sm font-medium tracking-tight lift-on-hover transition-colors ${
                    isActive ? 'text-accent' : 'text-white/85 hover:text-white'
                  }`
                }
              >
                <Editable id={`navbar.navLinks.${i}.label`} as="span" contentPath={`navbar.navLinks.${i}.label`} label={`Nav Link ${i + 1} Label`}>
                  {link.label}
                </Editable>
              </NavLink>
            ))}
          </div>

          <Link
            to="/booking"
            className="hidden lg:inline-flex magnetic-btn items-center gap-1.5 bg-accent hover:bg-accent-dark text-deep px-4 py-2 rounded-full text-sm font-bold shadow-lg shadow-accent/30 shrink-0"
          >
            <Editable id="navbar.ctaLabel" as="span" contentPath="navbar.ctaLabel" label="Navbar CTA Button">
              {config.navbar.ctaLabel}
            </Editable>
            <ArrowUpRight className="h-4 w-4" strokeWidth={2.5} />
          </Link>

          <button
            onClick={() => setOpen(true)}
            className="lg:hidden p-2 rounded-full text-white hover:bg-white/10 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </nav>

      <div
        className={`fixed inset-0 z-[60] transition-all duration-500 lg:hidden ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="absolute inset-0 bg-deep/90 backdrop-blur-2xl" onClick={() => setOpen(false)} />
        <div
          className={`absolute top-0 left-0 right-0 bg-background rounded-b-5xl px-6 pt-8 pb-12 transition-transform duration-500 ${
            open ? 'translate-y-0' : '-translate-y-full'
          }`}
        >
          <div className="flex items-center justify-between mb-10">
            <span className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full overflow-hidden shrink-0">
                <img
                  src="/images/aidenns-tutoring-logo-mark.png"
                  alt="Aidenn's Tutoring logo"
                  className="h-full w-full object-cover"
                />
              </span>
              <span className="font-display font-bold text-xl text-ink">{config.navbar.brandText}</span>
            </span>
            <button onClick={() => setOpen(false)} className="p-2 rounded-full bg-divider/40">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.href}
                to={link.href}
                onClick={() => setOpen(false)}
                className="font-display text-3xl font-semibold text-ink py-3 border-b border-divider"
              >
                {link.label}
              </NavLink>
            ))}
          </div>
          <Link
            to="/booking"
            onClick={() => setOpen(false)}
            className="mt-8 magnetic-btn flex items-center justify-center gap-2 bg-primary text-white px-6 py-4 rounded-full font-semibold w-full"
          >
            {config.navbar.ctaLabel}
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </>
  )
}
