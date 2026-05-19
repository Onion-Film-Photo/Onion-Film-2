'use client'
import { useRef } from 'react'
import { motion, useInView } from 'motion/react'

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1]

function useReveal(margin = '0px 0px -48px 0px') {
  const ref = useRef(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inView = useInView(ref, { once: true, margin: margin as any })
  return { ref, inView }
}

const staggerContainer = (stagger: number) => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger } },
})
const fadeUp = (y = 32, duration = 0.8) => ({
  hidden: { opacity: 0, y },
  show: { opacity: 1, y: 0, transition: { duration, ease } },
})
const slideLeft = {
  hidden: { opacity: 0, x: -28 },
  show: { opacity: 1, x: 0, transition: { duration: 0.85, ease } },
}

export default function Problem() {
  const { ref: bqRef, inView: bqInView } = useReveal()
  const { ref: bodyRef, inView: bodyInView } = useReveal()
  const { ref: statsRef, inView: statsInView } = useReveal()

  return (
    <section className="problem">
      <div className="section-container">
        <motion.div
          ref={bqRef}
          className="problem__blockquote"
          initial={{ opacity: 0, y: 60, scale: 0.96 }}
          animate={bqInView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 1.0, ease }}
        >
          <blockquote>&ldquo;Your guests captured 400 photos. You saw 12.&rdquo;</blockquote>
        </motion.div>

        <motion.div
          ref={bodyRef}
          className="problem__body"
          variants={staggerContainer(0.16)}
          initial="hidden"
          animate={bodyInView ? 'show' : 'hidden'}
        >
          <motion.div variants={slideLeft}>
            <h2>The coverage gap nobody talks about.</h2>
            <p>Shared camera apps let guests shoot freely. That sounds ideal — until you realise the dance floor got 200 shots and the grandparents got zero. No one coordinated. No one was responsible for anything.</p>
          </motion.div>
          <motion.div variants={slideLeft}>
            <p style={{ marginBottom: 'var(--sp-4)' }}>Disposable camera apps gave us the shared roll. That was step one. But a shared roll without direction is still chaos.</p>
            <p>Onion is step two: every guest arrives knowing exactly what they&apos;re there to capture. Directed photography. Complete coverage. No duplicates. No gaps.</p>
          </motion.div>
        </motion.div>

        <motion.div
          ref={statsRef}
          className="problem__stats"
          variants={staggerContainer(0.11)}
          initial="hidden"
          animate={statsInView ? 'show' : 'hidden'}
        >
          {[
            { num: '73%', label: "of couples report coverage gaps in their wedding photos — entire moments undocumented" },
            { num: '1 in 3', label: "guest photos are duplicates or unusable — undirected shooting wastes the roll" },
            { num: '0', label: "apps assign guests a specific moment to own before the event starts — until now" },
          ].map((s) => (
            <motion.div key={s.num} className="stat" variants={fadeUp(48)}>
              <span className="stat__num">{s.num}</span>
              <span className="stat__label">{s.label}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
