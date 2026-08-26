import { useSiteConfig } from '../context/SiteConfigContext.jsx'
import Editable from '../components/editor/Editable.jsx'

export default function Terms() {
  const { config } = useSiteConfig()
  const { legal } = config

  return (
    <div className="pt-36 sm:pt-44 pb-20 px-6 sm:px-10">
      <div className="max-w-3xl mx-auto">
        <Editable id="legal.termsHeading" as="h1" contentPath="legal.termsHeading" label="Terms of Service Heading" className="font-display text-4xl sm:text-5xl font-bold tracking-tighter mb-8">
          {legal.termsHeading}
        </Editable>
        <div className="space-y-6 text-muted leading-relaxed">
          {legal.termsParagraphs.map((para, i) => (
            <Editable key={i} id={`legal.termsParagraphs.${i}.text`} as="p" contentPath={`legal.termsParagraphs.${i}.text`} label={`Terms Paragraph ${i + 1}`}>
              {para.text}
            </Editable>
          ))}
        </div>
      </div>
    </div>
  )
}
