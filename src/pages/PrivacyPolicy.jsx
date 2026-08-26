import { useSiteConfig } from '../context/SiteConfigContext.jsx'
import Editable from '../components/editor/Editable.jsx'
import { fillGradeTemplate } from '../lib/grades.js'

export default function PrivacyPolicy() {
  const { config } = useSiteConfig()
  const { legal } = config
  const g = (text) => fillGradeTemplate(text, config.booking.minGrade, config.booking.maxGrade)

  return (
    <div className="pt-36 sm:pt-44 pb-20 px-6 sm:px-10">
      <div className="max-w-3xl mx-auto">
        <Editable id="legal.privacyHeading" as="h1" contentPath="legal.privacyHeading" label="Privacy Policy Heading" className="font-display text-4xl sm:text-5xl font-bold tracking-tighter mb-8">
          {legal.privacyHeading}
        </Editable>
        <div className="space-y-6 text-muted leading-relaxed">
          {legal.privacyParagraphs.map((para, i) => (
            <Editable key={i} id={`legal.privacyParagraphs.${i}.text`} as="p" contentPath={`legal.privacyParagraphs.${i}.text`} label={`Privacy Paragraph ${i + 1}`}>
              {g(para.text)}
            </Editable>
          ))}
        </div>
      </div>
    </div>
  )
}
