'use client'
import { useRef } from 'react'
import { motion, useInView } from 'motion/react'

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1]

export default function SiteFooter() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px 0px 0px' })

  return (
    <motion.footer
      ref={ref}
      className="footer"
      initial={{ opacity: 0 }}
      animate={inView ? { opacity: 1 } : {}}
      transition={{ duration: 0.7, ease }}
    >
      <div className="footer__inner">
        <a className="footer__logo" href="#">Onion</a>
        <nav className="footer__nav" aria-label="Footer navigation">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Contact</a>
          <a href="#">Blog</a>
        </nav>
        <p className="footer__copy">&copy; 2026 Onion. All rights reserved.</p>
      </div>
    </motion.footer>
  )
}
