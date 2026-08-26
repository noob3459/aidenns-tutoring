import { Gift } from 'lucide-react'
import { useSiteConfig } from '../context/SiteConfigContext.jsx'
import Editable from './editor/Editable.jsx'

export default function DonateBanner() {
  const { config } = useSiteConfig()
  const { donateBanner } = config
  return (
    <section id="support" className="relative py-10 sm:py-12 px-6 sm:px-10 lg:px-16">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 rounded-4xl border border-accent/25 bg-gradient-to-r from-primary/[0.04] to-accent/[0.08] p-8 sm:p-10">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent/15 border border-accent/30">
              <Gift className="h-6 w-6 text-accent-dark" strokeWidth={2} />
            </span>
            <div>
              <Editable id="donateBanner.heading" as="h3" contentPath="donateBanner.heading" label="Donate Banner Heading" className="font-display font-bold text-xl sm:text-2xl text-ink">
                {donateBanner.heading}
              </Editable>
              <Editable id="donateBanner.description" as="p" contentPath="donateBanner.description" label="Donate Banner Description" className="text-muted text-sm sm:text-base mt-1.5 max-w-xl leading-relaxed">
                {donateBanner.description}
              </Editable>
            </div>
          </div>
          <a
            href={`mailto:${config.contact.donateEmail}?subject=I%27d%20like%20to%20donate`}
            className="magnetic-btn shrink-0 inline-flex items-center gap-2 bg-accent text-white font-semibold px-6 py-3.5 rounded-full shadow-lg shadow-accent/30 whitespace-nowrap"
          >
            <Gift className="h-4 w-4" />
            <Editable id="donateBanner.ctaLabel" as="span" contentPath="donateBanner.ctaLabel" label="Donate Banner CTA Button">
              {donateBanner.ctaLabel}
            </Editable>
          </a>
        </div>
      </div>
    </section>
  )
}
