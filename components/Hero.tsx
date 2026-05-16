'use client'
import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import SprocketStrip from './SprocketStrip'

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1]

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.13, delayChildren: 0.35 } },
}
const item = {
  hidden: { opacity: 0, y: 36 },
  show: { opacity: 1, y: 0, transition: { duration: 0.9, ease } },
}

export default function Hero() {
  const heroRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })
  const y = useTransform(scrollYProgress, [0, 1], [0, 90])

  return (
    <section className="hero" id="hero" ref={heroRef}>
      <SprocketStrip id="sprockets-top" className="hero__strip hero__strip--top sprocket-strip" />
      <motion.div className="hero__content" ref={contentRef} style={{ y }}>
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.p className="hero__eyebrow" variants={item}>
            Disposable camera · Intentional coverage
          </motion.p>
          <motion.h1 className="hero__headline" variants={item}>
            Every event<br /><em>has layers.</em>
          </motion.h1>
          <motion.p className="hero__sub" variants={item}>
            Onion assigns every guest a role before your event begins.
            No moment goes undocumented. No moment is left to chance.
          </motion.p>
          <motion.div className="hero__ctas" variants={item}>
            <a className="btn btn--primary" href="#pricing">Create Your Event</a>
            <a className="btn btn--ghost" href="#how-it-works">See How It Works</a>
          </motion.div>
          <motion.p className="hero__footnote" variants={item}>
            Free to start &nbsp;·&nbsp; No app download for guests &nbsp;·&nbsp; Takes 3 minutes
          </motion.p>
        </motion.div>
      </motion.div>
      <SprocketStrip id="sprockets-bottom" className="hero__strip hero__strip--bottom sprocket-strip" />
    </section>
  )
}
