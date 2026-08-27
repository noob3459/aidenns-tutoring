import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SiteConfigProvider } from './context/SiteConfigContext.jsx'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Services from './pages/Services.jsx'
import Approach from './pages/Approach.jsx'
import AboutMe from './pages/AboutMe.jsx'
import Booking from './pages/Booking.jsx'
import Contact from './pages/Contact.jsx'
import Donate from './pages/Donate.jsx'
import PrivacyPolicy from './pages/PrivacyPolicy.jsx'
import Terms from './pages/Terms.jsx'
import Admin from './pages/Admin.jsx'
import ManageBooking from './pages/ManageBooking.jsx'
import './index.css'

gsap.registerPlugin(ScrollTrigger)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SiteConfigProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/services" element={<Services />} />
            <Route path="/approach" element={<Approach />} />
            <Route path="/about" element={<AboutMe />} />
            <Route path="/booking" element={<Booking />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/donate" element={<Donate />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />
          </Route>
          <Route path="/admin" element={<Admin />} />
          <Route path="/manage-booking" element={<ManageBooking />} />
        </Routes>
      </BrowserRouter>
    </SiteConfigProvider>
  </StrictMode>
)
