'use client'
import { useRef } from 'react'
import { motion, useInView } from 'motion/react'
import SprocketStrip from './SprocketStrip'

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1]

export default function FooterCta() {
  const innerRef = useRef(null)
  const inView = useInView(innerRef, { once: true, margin: '0px 0px -48px 0px' })

  const stagger = (delay: number) => ({
    hidden: { opacity: 0, y: 40 },
    show: { opacity: 1, y: 0, transition: { duration: 0.85, ease, delay } },
  })

  return (
    <section className="footer-cta" aria-label="Call to action">
      <SprocketStrip id="sprockets-footer-top" />
      <motion.div
        ref={innerRef}
        className="footer-cta__inner"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.14 } } }}
        initial="hidden"
        animate={inView ? 'show' : 'hidden'}
      >
        <motion.h2 variants={stagger(0)}>
          Every layer of your event,<br /><em>finally visible.</em>
        </motion.h2>
        <motion.a className="btn btn--primary" href="#pricing" variants={stagger(0.14)}>
          Create Your Event — Free
        </motion.a>
        <motion.span className="footer-cta__footnote" variants={stagger(0.28)}>
          No credit card required &nbsp;·&nbsp; Works at any event &nbsp;·&nbsp; 3 minutes to set up
        </motion.span>
      </motion.div>
      <SprocketStrip id="sprockets-footer-bottom" />
    </section>
  )
}
