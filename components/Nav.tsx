'use client'
import { useState, useEffect } from 'react'

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const closeMenu = () => setOpen(false)

  return (
    <nav className={`nav${scrolled ? ' nav--scrolled' : ''}`} id="nav">
      <div className="nav__inner">
        <a className="nav__logo" href="#">Onion</a>
        <ul className="nav__links">
          <li><a href="#how-it-works">How It Works</a></li>
          <li><a href="#features">Features</a></li>
          <li><a href="#pricing">Pricing</a></li>
        </ul>
        <a className="btn btn--outline btn--sm" href="#pricing">Create Event</a>
        <button
          className={`nav__burger${open ? ' open' : ''}`}
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen(o => !o)}
        >
          <span /><span /><span />
        </button>
      </div>
      <div
        className="nav__mobile"
        aria-hidden={!open}
        style={{ maxHeight: open ? '300px' : '0' }}
      >
        <a href="#how-it-works" onClick={closeMenu}>How It Works</a>
        <a href="#features" onClick={closeMenu}>Features</a>
        <a href="#pricing" onClick={closeMenu}>Pricing</a>
        <a href="#pricing" onClick={closeMenu}>Create Event →</a>
      </div>
    </nav>
  )
}
