import { Link } from 'react-router-dom'
import { Phone, Mail, MapPin, Clock, ArrowRight } from 'lucide-react'
import { useSiteConfig } from '../context/SiteConfigContext.jsx'
import PageHeader from '../components/PageHeader.jsx'
import DonateBanner from '../components/DonateBanner.jsx'
import Editable from '../components/editor/Editable.jsx'

export default function Contact() {
  const { config } = useSiteConfig()
  const { contact, pages } = config
  const p = pages.contact

  const cards = [
    { Icon: Phone, label: contact.phoneLabel, contentPath: 'contact.phoneLabel', value: contact.phone, href: `tel:${contact.phoneTel}` },
    { Icon: Mail, label: contact.emailLabel, contentPath: 'contact.emailLabel', value: contact.email, href: `mailto:${contact.email}` },
    { Icon: MapPin, label: contact.servingLabel, contentPath: 'contact.servingLabel', value: contact.serving, href: null },
    { Icon: Clock, label: contact.hoursLabel, contentPath: 'contact.hoursLabel', value: contact.hours, href: null },
  ]

  return (
    <>
      <PageHeader eyebrow={p.eyebrow} heading1={p.heading1} heading2={p.heading2} sub={p.sub} idPrefix="pages.contact" />

      <section className="relative px-6 sm:px-10 lg:px-16 pb-16">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-5">
          {cards.map(({ Icon, label, contentPath, value, href }, i) => {
            const inner = (
              <div className="bg-white border border-divider rounded-4xl p-7 h-full hover:border-primary/40 transition-colors shadow-sm">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                  <Icon className="h-5 w-5 text-primary" strokeWidth={2} />
                </span>
                <Editable id={contentPath} as="p" contentPath={contentPath} label={`Contact Card ${i + 1} Label`} className="font-mono text-[10px] uppercase tracking-widest text-muted mb-1">
                  {label}
                </Editable>
                <p className="font-display font-semibold text-lg text-ink">{value}</p>
              </div>
            )
            return href ? (
              <a key={i} href={href} className="block">{inner}</a>
            ) : (
              <div key={i}>{inner}</div>
            )
          })}
        </div>

        <div className="max-w-5xl mx-auto text-center mt-14">
          <Editable id="pages.contact.prompt" as="p" contentPath="pages.contact.prompt" label="Contact Page Prompt Text" className="text-muted mb-4">
            {p.prompt}
          </Editable>
          <Link to="/booking" className="magnetic-btn inline-flex items-center gap-2 bg-primary text-white font-semibold px-7 py-3.5 rounded-full shadow-xl shadow-primary/30">
            <Editable id="pages.contact.ctaLabel" as="span" contentPath="pages.contact.ctaLabel" label="Contact Page CTA Button">
              {p.ctaLabel}
            </Editable>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <DonateBanner />
    </>
  )
}
