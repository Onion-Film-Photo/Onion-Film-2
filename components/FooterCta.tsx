'use client'
import { useRef } from 'react'
import { motion, useInView } from 'motion/react'

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1]

export default function FooterCta() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -48px 0px' })

  const fadeUp = (delay: number) => ({
    initial: { opacity: 0, y: 20 },
    animate: inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 },
    transition: { duration: 0.7, ease, delay },
  })

  return (
    <section className="footer-cta" aria-label="Call to action">
      <div ref={ref} className="footer-cta__inner">
        <motion.h2 {...fadeUp(0)}>
          Every layer of your event,<br /><em>finally visible.</em>
        </motion.h2>
        <motion.a className="btn btn--primary" href="/host/signup" {...fadeUp(0.1)}>
          Create Your Event — Free
        </motion.a>
        <motion.span className="footer-cta__footnote" {...fadeUp(0.2)}>
          No credit card required &nbsp;·&nbsp; Works at any event &nbsp;·&nbsp; 3 minutes to set up
        </motion.span>
      </div>
    </section>
  )
}
