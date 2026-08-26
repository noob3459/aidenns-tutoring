import { useEffect, useRef, useState } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useEditorSelection } from '../../context/EditorSelectionContext.jsx'
import Navbar from '../Navbar.jsx'
import Footer from '../Footer.jsx'
import Home from '../../pages/Home.jsx'
import Services from '../../pages/Services.jsx'
import Approach from '../../pages/Approach.jsx'
import AboutMe from '../../pages/AboutMe.jsx'
import Contact from '../../pages/Contact.jsx'
import Booking from '../../pages/Booking.jsx'
import PrivacyPolicy from '../../pages/PrivacyPolicy.jsx'
import Terms from '../../pages/Terms.jsx'

export const PREVIEW_PAGES = [
  { key: 'home', label: 'Home', Component: Home },
  { key: 'services', label: 'Services', Component: Services },
  { key: 'approach', label: 'Approach', Component: Approach },
  { key: 'about', label: 'About', Component: AboutMe },
  { key: 'contact', label: 'Contact', Component: Contact },
  { key: 'booking', label: 'Booking', Component: Booking },
  { key: 'privacy', label: 'Privacy', Component: PrivacyPolicy },
  { key: 'terms', label: 'Terms', Component: Terms },
]

function ClickCaptureLayer({ children }) {
  const { setSelectedId, setHoveredId } = useEditorSelection()
  const containerRef = useRef(null)
  const [selectedRect, setSelectedRect] = useState(null)
  const [hoveredRect, setHoveredRect] = useState(null)
  const selectedNodeRef = useRef(null)
  const hoveredNodeRef = useRef(null)

  const recomputeRects = () => {
    setSelectedRect(selectedNodeRef.current ? selectedNodeRef.current.getBoundingClientRect() : null)
    setHoveredRect(hoveredNodeRef.current ? hoveredNodeRef.current.getBoundingClientRect() : null)
  }

  useEffect(() => {
    window.addEventListener('scroll', recomputeRects, { passive: true, capture: true })
    window.addEventListener('resize', recomputeRects, { passive: true })
    return () => {
      window.removeEventListener('scroll', recomputeRects, { capture: true })
      window.removeEventListener('resize', recomputeRects)
    }
  }, [])

  const handleClick = (e) => {
    const target = e.target.closest('[data-editor-id]')
    if (!target) {
      setSelectedId(null)
      selectedNodeRef.current = null
      setSelectedRect(null)
      return
    }
    // Blocks real navigation/form submission on the real component tree —
    // capture-phase stopPropagation runs before a descendant <Link>'s own
    // bubble-phase click handler ever fires.
    e.preventDefault()
    e.stopPropagation()
    setSelectedId(target.getAttribute('data-editor-id'))
    selectedNodeRef.current = target
    setSelectedRect(target.getBoundingClientRect())
  }

  const handleMouseOver = (e) => {
    const target = e.target.closest('[data-editor-id]')
    if (!target || target === hoveredNodeRef.current) return
    hoveredNodeRef.current = target
    setHoveredId(target.getAttribute('data-editor-id'))
    setHoveredRect(target.getBoundingClientRect())
  }

  const handleMouseOut = (e) => {
    const related = e.relatedTarget
    if (related && hoveredNodeRef.current?.contains(related)) return
    hoveredNodeRef.current = null
    setHoveredId(null)
    setHoveredRect(null)
  }

  return (
    <div
      ref={containerRef}
      onClickCapture={handleClick}
      onMouseOver={handleMouseOver}
      onMouseOut={handleMouseOut}
    >
      {children}
      {hoveredRect && (
        <div
          className="pointer-events-none fixed z-[200] rounded-md ring-2 ring-accent/70"
          style={{ top: hoveredRect.top, left: hoveredRect.left, width: hoveredRect.width, height: hoveredRect.height }}
        />
      )}
      {selectedRect && (
        <div
          className="pointer-events-none fixed z-[200] rounded-md ring-2 ring-primary shadow-[0_0_0_9999px_rgba(27,58,107,0.08)]"
          style={{ top: selectedRect.top, left: selectedRect.left, width: selectedRect.width, height: selectedRect.height }}
        />
      )}
    </div>
  )
}

// Must be rendered inside a `SiteConfigProvider` + `EditorSelectionProvider`
// pair that the Visual Editor tab also shares with `EditorSidePanel` —
// both need the same provider instances (the preview-local draft config,
// and the currently-selected element id).
export default function EditorPreviewFrame({ pageKey }) {
  const PageEntry = PREVIEW_PAGES.find((p) => p.key === pageKey) || PREVIEW_PAGES[0]
  const PageComponent = PageEntry.Component

  useEffect(() => {
    const t = setTimeout(() => ScrollTrigger.refresh(), 200)
    return () => clearTimeout(t)
  }, [pageKey])

  return (
    <ClickCaptureLayer>
      {/* `transform` makes this the containing block for any `position:
          fixed` descendant (per CSS spec) — Navbar is `fixed` on the real
          site (pins to the viewport), and without this it would escape
          the preview box entirely and float over the admin's own chrome
          instead of pinning to the top of this preview. The hover/select
          highlight boxes and the side panel render OUTSIDE this div, so
          their viewport-relative getBoundingClientRect() coordinates
          stay correct. */}
      <div className="relative border border-divider rounded-3xl overflow-hidden bg-white [transform:translateZ(0)]">
        <Navbar />
        <main key={pageKey}>
          <PageComponent />
        </main>
        <Footer />
      </div>
    </ClickCaptureLayer>
  )
}
