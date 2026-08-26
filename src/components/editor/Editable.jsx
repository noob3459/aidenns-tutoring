import { useEditorSelection } from '../../context/EditorSelectionContext.jsx'
import { useSiteConfig } from '../../context/SiteConfigContext.jsx'

// Wraps a piece of real site markup so it becomes selectable/stylable in
// the Visual Editor. Outside the editor (i.e. on the real public site,
// which never mounts an EditorSelectionProvider) `useEditorSelection()`
// resolves to `null` and this renders `children` completely unchanged —
// zero markup/behavior difference for real visitors.
//
// `kind="text"` elements accept color/font-size overrides from
// `config.elementStyles`; `kind="custom-text"` is identical but marks an
// admin-added block (from `customBlocks`) as deletable by id rather than
// by array index; `kind="image"` renders a real `<img>` whose `src` comes
// from `contentPath` (no color/font-size — an image has neither);
// `kind="section"` elements are wrapping containers used only for
// grouping an animation preset (see animationPresets.js) and for
// anchoring "+ Add Text Box". `deletableArrayPath`/`deletableIndex` mark
// a `kind="text"` element as one item in a deletable array (e.g. one
// feature card) — the side panel reads these off the DOM to build a
// "Delete This Item" action.
export default function Editable({
  id, kind = 'text', as: Tag = 'div', contentPath, label, className = '', style, children,
  deletableArrayPath, deletableIndex, ...rest
}) {
  const editor = useEditorSelection()
  const { config } = useSiteConfig()

  if (!editor) {
    return (
      <Tag className={className} style={style} {...rest}>
        {children}
      </Tag>
    )
  }

  const override = config.elementStyles?.[id] || {}

  const mergedStyle = { ...style }
  if (kind === 'text' || kind === 'custom-text') {
    if (override.color) mergedStyle.color = override.color
    if (override.fontSize) mergedStyle.fontSize = `${override.fontSize}px`
  }

  return (
    <Tag
      className={className}
      style={mergedStyle}
      data-editor-id={id}
      data-editor-kind={kind}
      data-editor-content-path={contentPath || ''}
      data-editor-label={label || ''}
      data-editor-array-path={deletableArrayPath || ''}
      data-editor-array-index={deletableIndex ?? ''}
      {...rest}
    >
      {children}
    </Tag>
  )
}
