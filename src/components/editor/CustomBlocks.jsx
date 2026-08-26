import { useSiteConfig } from '../../context/SiteConfigContext.jsx'
import Editable from './Editable.jsx'

// Renders whatever admin-added text blocks belong to `sectionId`, appended
// after a section's normal content. Rendered unconditionally (not gated
// on edit mode) so blocks show on the real public site once saved, not
// just in the Visual Editor preview. Each block's Editable id doubles as
// its `elementStyles` key (color/font-size) and, via `kind="custom-text"`,
// tells the side panel it's deletable by id rather than by array index.
export default function CustomBlocks({ sectionId, className = '' }) {
  const { config } = useSiteConfig()
  const blocks = config.customBlocks || []

  const matches = blocks
    .map((block, trueIndex) => ({ block, trueIndex }))
    .filter(({ block }) => block.sectionId === sectionId)

  if (!matches.length) return null

  return (
    <div className={className || 'space-y-3 mt-4'}>
      {matches.map(({ block, trueIndex }) => (
        <Editable
          key={block.id}
          id={`customBlocks.${block.id}`}
          kind="custom-text"
          as="p"
          contentPath={`customBlocks.${trueIndex}.text`}
          label="Custom Text Block"
        >
          {block.text}
        </Editable>
      ))}
    </div>
  )
}
