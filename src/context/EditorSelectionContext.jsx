import { createContext, useContext, useMemo, useState } from 'react'

// Pure UI-selection state for the Visual Editor tab only — never mounted
// around the real public site, so `useEditorSelection()` returns `null`
// there and every `Editable` becomes a no-op passthrough.
const EditorSelectionContext = createContext(null)

export function EditorSelectionProvider({ children }) {
  const [selectedId, setSelectedId] = useState(null)
  const [hoveredId, setHoveredId] = useState(null)

  const value = useMemo(
    () => ({ selectedId, setSelectedId, hoveredId, setHoveredId }),
    [selectedId, hoveredId]
  )

  return <EditorSelectionContext.Provider value={value}>{children}</EditorSelectionContext.Provider>
}

export function useEditorSelection() {
  return useContext(EditorSelectionContext)
}
