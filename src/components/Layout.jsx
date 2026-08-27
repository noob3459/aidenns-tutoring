import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Navbar from './Navbar.jsx'
import Footer from './Footer.jsx'

export default function Layout() {
  const { pathname } = useLocation()

  useEffect(() => {
    // `behavior: 'instant'` (not 'auto') is required here — the site sets
    // `scroll-behavior: smooth` globally in index.css, and 'auto' defers to
    // that CSS property instead of jumping immediately.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    const t1 = setTimeout(() => ScrollTrigger.refresh(), 150)
    const t2 = setTimeout(() => ScrollTrigger.refresh(), 700)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [pathname])

  return (
    <div className="relative">
      <div className="noise-overlay" />
      <Navbar />
      <main key={pathname} className="page-enter">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
