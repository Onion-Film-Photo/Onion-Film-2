'use client'
import { useRef } from 'react'
import { motion, useInView } from 'motion/react'

export default function CinematicQuote() {
  const ref = useRef<HTMLParagraphElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inView = useInView(ref, { once: true, margin: '0px 0px -80px 0px' as any })

  return (
    <section className="cinematic">
      <motion.p
        ref={ref}
        className="cinematic__quote"
        initial={{ opacity: 0, y: 32 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 32 }}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
      >
        Remember when every shot<br />was a moment to cherish?
      </motion.p>
      <div className="scroll-pill">Keep scrolling</div>
    </section>
  )
}
