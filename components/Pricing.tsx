'use client'
import { useRef } from 'react'
import { motion, useInView } from 'motion/react'

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1]

const tiers = [
  {
    name: 'Snapshot', price: '0', cadence: 'Free forever', featured: false,
    features: ['Up to 20 guests', 'Up to 100 photos', '3 role assignments', '48-hour reveal window', 'Standard download'],
    cta: { label: 'Start Free', style: 'btn--outline' },
  },
  {
    name: 'Ceremony', price: '19', cadence: 'per event', featured: true,
    badge: 'Most popular',
    features: ['Unlimited guests', 'Unlimited photos', 'Unlimited role assignments', 'Custom reveal timer', 'HD download pack', 'Print-quality export'],
    cta: { label: 'Create Your Event', style: 'btn--primary' },
  },
  {
    name: 'Archive', price: '49', cadence: 'per event', featured: false,
    features: ['Everything in Ceremony', 'Permanent cloud archive', 'Printed photo book (shipped)', 'Custom branded QR card', 'Priority support'],
    cta: { label: 'Order Archive', style: 'btn--outline' },
  },
]

export default function Pricing() {
  const sectionRef = useRef(null)
  const gridRef = useRef(null)
  const sectionInView = useInView(sectionRef, { once: true, margin: '0px 0px -80px 0px' })
  const gridInView = useInView(gridRef, { once: true, margin: '0px 0px -48px 0px' })

  return (
    <section className="pricing" id="pricing" ref={sectionRef}>
      <div className="section-container">
        <motion.p
          className="eyebrow"
          initial={{ opacity: 0, y: 16 }}
          animate={sectionInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease }}
        >
          Simple pricing
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          animate={sectionInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease, delay: 0.1 }}
        >
          One event. One price.<br />No subscriptions.
        </motion.h2>
        <motion.p
          className="pricing__sub"
          initial={{ opacity: 0, y: 16 }}
          animate={sectionInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease, delay: 0.18 }}
        >
          Pay once per event. Keep your photos forever.
        </motion.p>
        <div ref={gridRef} className="tier-grid">
          {tiers.map((t, i) => (
            <motion.div
              key={t.name}
              className={`tier${t.featured ? ' tier--featured' : ''}`}
              initial={{ opacity: 0, y: 20 }}
              animate={gridInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, ease, delay: i * 0.08 }}
            >
              {t.badge && <p className="tier__badge">{t.badge}</p>}
              <p className="tier__name">{t.name}</p>
              <div className="tier__price"><span className="tier__currency">$</span>{t.price}</div>
              <p className="tier__cadence">{t.cadence}</p>
              <ul className="tier__features">
                {t.features.map(f => <li key={f}>{f}</li>)}
              </ul>
              <a className={`btn ${t.cta.style} btn--full`} href="/host/signup">{t.cta.label}</a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
