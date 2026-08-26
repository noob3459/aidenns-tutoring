import { useEffect, useRef, useState } from 'react'
import { Check, ImagePlus, MousePointerClick, Plus, RefreshCw, Save, Trash2 } from 'lucide-react'
import { useSiteConfig } from '../../context/SiteConfigContext.jsx'
import { useEditorSelection } from '../../context/EditorSelectionContext.jsx'
import { getAtPath, setAtPath } from '../../lib/configPaths.js'
import { ANIMATION_PRESET_NAMES, ANIMATION_PRESET_LABELS, runAnimationPreset } from '../../lib/animationPresets.js'

function rgbToHex(rgbString) {
  const m = rgbString?.match(/\d+/g)
  if (!m || m.length < 3) return '#1b3a6b'
  return '#' + m.slice(0, 3).map((n) => Math.max(0, Math.min(255, Number(n))).toString(16).padStart(2, '0')).join('')
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Could not read that file.'))
    reader.readAsDataURL(file)
  })
}

export default function EditorSidePanel() {
  const { config, applyLocalPatch, updateConfig, dirtyKeys } = useSiteConfig()
  const { selectedId, setSelectedId } = useEditorSelection()
  const fileInputRef = useRef(null)

  const [meta, setMeta] = useState(null) // { kind, contentPath, label, deletableArrayPath, deletableIndex, defaultColor, defaultFontSize }
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  useEffect(() => {
    setSaved(false)
    setUploadError('')
    if (!selectedId) { setMeta(null); return }
    const node = document.querySelector(`[data-editor-id="${selectedId}"]`)
    if (!node) { setMeta(null); return }
    const computed = window.getComputedStyle(node)
    const arrayPath = node.getAttribute('data-editor-array-path') || ''
    const arrayIndexRaw = node.getAttribute('data-editor-array-index')
    setMeta({
      kind: node.getAttribute('data-editor-kind') || 'text',
      contentPath: node.getAttribute('data-editor-content-path') || '',
      label: node.getAttribute('data-editor-label') || selectedId,
      deletableArrayPath: arrayPath || null,
      deletableIndex: arrayPath && arrayIndexRaw !== '' ? Number(arrayIndexRaw) : null,
      defaultColor: rgbToHex(computed.color),
      defaultFontSize: Math.round(parseFloat(computed.fontSize)) || 16,
    })
  }, [selectedId, config])

  // Every local edit routes through applyLocalPatch, which already
  // records history and tracks dirtyKeys centrally (SiteConfigContext) —
  // nothing here needs to track dirtiness itself.
  const commitText = (value) => {
    if (!meta?.contentPath) return
    applyLocalPatch(setAtPath(config, meta.contentPath, value))
  }

  const commitStyle = (field, value) => {
    const existing = config.elementStyles?.[selectedId] || {}
    applyLocalPatch({ elementStyles: { ...config.elementStyles, [selectedId]: { ...existing, [field]: value } } })
  }

  const handleSave = async () => {
    if (dirtyKeys.size === 0) return
    setSaving(true)
    const patch = {}
    for (const key of dirtyKeys) patch[key] = config[key]
    const result = await updateConfig(patch)
    setSaving(false)
    if (result.ok) setSaved(true)
  }

  const handleReplay = () => {
    if (!selectedId) return
    const nodes = document.querySelectorAll(`[data-editor-id="${selectedId}"]`)
    if (!nodes.length) return
    const style = config.elementStyles?.[selectedId] || {}
    runAnimationPreset(style.animation || 'fade-in', nodes, { speed: style.animationSpeed })
  }

  const handleAddTextBox = () => {
    if (!selectedId) return
    const newBlock = { id: crypto.randomUUID(), sectionId: selectedId, text: 'New text — click to edit.' }
    applyLocalPatch({ customBlocks: [...(config.customBlocks || []), newBlock] })
  }

  const handleDeleteCustomBlock = () => {
    if (!selectedId?.startsWith('customBlocks.')) return
    const blockId = selectedId.slice('customBlocks.'.length)
    applyLocalPatch({ customBlocks: (config.customBlocks || []).filter((b) => b.id !== blockId) })
    setSelectedId(null)
  }

  const handleDeleteItem = () => {
    if (!meta?.deletableArrayPath || meta.deletableIndex == null) return
    const arr = getAtPath(config, meta.deletableArrayPath) || []
    const next = arr.filter((_, i) => i !== meta.deletableIndex)
    applyLocalPatch(setAtPath(config, meta.deletableArrayPath, next))
    setSelectedId(null)
  }

  const handleImageFile = async (file) => {
    if (!file || !meta?.contentPath) return
    setUploading(true)
    setUploadError('')
    try {
      const dataUrl = await readFileAsDataUrl(file)
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upload-image', contentType: file.type, dataBase64: dataUrl }),
      })
      const data = await res.json().catch(() => ({ ok: false }))
      if (!res.ok || !data.ok) {
        setUploadError(data.error || 'Upload failed.')
        return
      }
      commitText(data.url)
    } catch {
      setUploadError('Upload failed. Check your connection and try again.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <aside className="fixed top-24 right-6 z-[150] w-80 max-h-[calc(100vh-8rem)] overflow-y-auto bg-white border border-divider rounded-3xl shadow-2xl shadow-primary/10 p-5">
      <h3 className="font-display font-bold text-ink text-sm uppercase tracking-widest mb-1">Element Inspector</h3>

      {!selectedId || !meta ? (
        <div className="flex flex-col items-center text-center gap-2 py-10 text-muted">
          <MousePointerClick className="h-6 w-6" strokeWidth={1.6} />
          <p className="text-sm">Click any element in the preview to select and edit it.</p>
        </div>
      ) : (
        <div className="space-y-5 mt-4">
          <p className="text-xs font-mono uppercase tracking-widest text-primary-dark">{meta.label}</p>

          {(meta.kind === 'text' || meta.kind === 'custom-text') && meta.contentPath && (
            <>
              <label className="block">
                <span className="block text-xs font-mono uppercase tracking-widest text-muted mb-1.5">Text</span>
                <textarea
                  rows={3}
                  className="w-full rounded-xl border border-divider px-3 py-2 text-sm resize-none focus:outline-none focus:border-primary/60"
                  value={getAtPath(config, meta.contentPath) ?? ''}
                  onChange={(e) => commitText(e.target.value)}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="block text-xs font-mono uppercase tracking-widest text-muted mb-1.5">Color</span>
                  <input
                    type="color"
                    className="w-full h-9 rounded-lg border border-divider cursor-pointer"
                    value={config.elementStyles?.[selectedId]?.color || meta.defaultColor}
                    onChange={(e) => commitStyle('color', e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="block text-xs font-mono uppercase tracking-widest text-muted mb-1.5">Font Size</span>
                  <input
                    type="number" min={10} max={96}
                    className="w-full rounded-lg border border-divider px-2 py-1.5 text-sm"
                    value={config.elementStyles?.[selectedId]?.fontSize ?? meta.defaultFontSize}
                    onChange={(e) => commitStyle('fontSize', Number(e.target.value))}
                  />
                </label>
              </div>
            </>
          )}

          {meta.kind === 'image' && meta.contentPath && (
            <div className="space-y-3">
              {getAtPath(config, meta.contentPath) && (
                <img src={getAtPath(config, meta.contentPath)} alt="" className="w-full h-32 object-cover rounded-xl border border-divider" />
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(e) => handleImageFile(e.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full inline-flex items-center justify-center gap-2 border border-divider rounded-xl py-2.5 text-sm font-medium text-ink hover:border-primary/40 transition disabled:opacity-50"
              >
                <ImagePlus className="h-4 w-4" /> {uploading ? 'Uploading…' : 'Upload New Image'}
              </button>
              {uploadError && <p className="text-red-600 text-xs">{uploadError}</p>}
            </div>
          )}

          {meta.kind === 'section' && (
            <>
              <label className="block">
                <span className="block text-xs font-mono uppercase tracking-widest text-muted mb-1.5">Entrance Animation</span>
                <select
                  className="w-full rounded-lg border border-divider px-3 py-2 text-sm"
                  value={config.elementStyles?.[selectedId]?.animation || 'stagger'}
                  onChange={(e) => commitStyle('animation', e.target.value)}
                >
                  {ANIMATION_PRESET_NAMES.map((name) => (
                    <option key={name} value={name}>{ANIMATION_PRESET_LABELS[name]}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="block text-xs font-mono uppercase tracking-widest text-muted mb-1.5">
                  Speed &middot; {(config.elementStyles?.[selectedId]?.animationSpeed || 1).toFixed(2)}x
                </span>
                <input
                  type="range" min={0.25} max={3} step={0.05}
                  className="w-full"
                  value={config.elementStyles?.[selectedId]?.animationSpeed || 1}
                  onChange={(e) => commitStyle('animationSpeed', Number(e.target.value))}
                />
              </label>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={handleReplay}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-dark hover:text-primary transition"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Replay animation
                </button>
              </div>
              <button
                type="button"
                onClick={handleAddTextBox}
                className="w-full inline-flex items-center justify-center gap-2 border border-divider rounded-xl py-2.5 text-sm font-medium text-ink hover:border-primary/40 transition"
              >
                <Plus className="h-4 w-4" /> Add Text Box
              </button>
            </>
          )}

          {meta.kind === 'custom-text' && (
            <button
              type="button"
              onClick={handleDeleteCustomBlock}
              className="w-full inline-flex items-center justify-center gap-2 border border-red-200 text-red-600 rounded-xl py-2.5 text-sm font-medium hover:bg-red-50 transition"
            >
              <Trash2 className="h-4 w-4" /> Delete This Block
            </button>
          )}

          {meta.deletableArrayPath && meta.deletableIndex != null && (
            <button
              type="button"
              onClick={handleDeleteItem}
              className="w-full inline-flex items-center justify-center gap-2 border border-red-200 text-red-600 rounded-xl py-2.5 text-sm font-medium hover:bg-red-50 transition"
            >
              <Trash2 className="h-4 w-4" /> Delete This Item
            </button>
          )}

          <div className="flex items-center gap-3 pt-4 border-t border-divider">
            <button
              type="button"
              onClick={handleSave}
              disabled={dirtyKeys.size === 0 || saving}
              className="magnetic-btn inline-flex items-center gap-2 bg-primary text-white font-semibold px-5 py-2.5 rounded-full text-sm disabled:opacity-50"
            >
              <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save Changes'}
            </button>
            {saved && (
              <span className="inline-flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
                <Check className="h-4 w-4" /> Saved
              </span>
            )}
          </div>
        </div>
      )}
    </aside>
  )
}
