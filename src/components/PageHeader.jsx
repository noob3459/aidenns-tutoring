import Editable from './editor/Editable.jsx'
import { useSiteConfig } from '../context/SiteConfigContext.jsx'
import { fillGradeTemplate } from '../lib/grades.js'

// `idPrefix` is the page's config path root, e.g. "pages.services" —
// used to build both the element id and the content path for each field
// (they're the same string here since `pages.*` was already the existing
// config shape before the Visual Editor existed).
export default function PageHeader({ eyebrow, heading1, heading2, sub, idPrefix }) {
  const { config } = useSiteConfig()
  const g = (text) => fillGradeTemplate(text, config.booking.minGrade, config.booking.maxGrade)

  return (
    <div className="relative pt-40 sm:pt-48 pb-16 sm:pb-24 px-6 sm:px-10 lg:px-16 overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-64 w-[40rem] rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="relative max-w-4xl mx-auto text-center">
        <Editable id={`${idPrefix}.eyebrow`} as="span" contentPath={`${idPrefix}.eyebrow`} label="Page Eyebrow" className="font-mono text-xs uppercase tracking-[0.25em] text-primary-dark">
          {g(eyebrow)}
        </Editable>
        <h1 className="font-display font-extrabold text-4xl sm:text-6xl md:text-7xl text-ink mt-4 leading-[1.05] tracking-tight">
          <Editable id={`${idPrefix}.heading1`} as="span" contentPath={`${idPrefix}.heading1`} label="Page Heading (Line 1)">
            {g(heading1)}
          </Editable>
          <Editable id={`${idPrefix}.heading2`} as="span" contentPath={`${idPrefix}.heading2`} label="Page Heading (Line 2)" className="block font-serif italic font-medium text-primary-dark mt-1">
            {g(heading2)}
          </Editable>
        </h1>
        {sub && (
          <Editable id={`${idPrefix}.sub`} as="p" contentPath={`${idPrefix}.sub`} label="Page Subtext" className="text-muted text-base sm:text-lg mt-6 max-w-xl mx-auto leading-relaxed">
            {g(sub)}
          </Editable>
        )}
      </div>
    </div>
  )
}
