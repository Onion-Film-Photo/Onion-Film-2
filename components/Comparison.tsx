'use client'
import { useRef } from 'react'
import { motion, useInView } from 'motion/react'

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1]

const rows = [
  { feature: 'Shared photo roll', other: '✓', onion: '✓', diff: false },
  { feature: 'No guest app required', other: '✓', onion: '✓', diff: false },
  { feature: 'Delayed photo reveal', other: '✓', onion: '✓', diff: false },
  { feature: 'QR code access', other: '✓', onion: '✓', diff: false },
  { feature: 'Shot limits per guest', other: 'Some', onion: '✓', diff: false },
  { feature: 'Photo attribution', other: 'Some', onion: '✓', diff: false },
  { feature: 'Guest role assignment', note: 'Every guest has a moment to own before the event', other: '✗', onion: '✓', diff: true },
  { feature: 'Guaranteed event coverage', note: 'No gaps, no over-duplication, no missed moments', other: '✗', onion: '✓', diff: true },
]

export default function Comparison() {
  const sectionRef = useRef(null)
  const tableRef = useRef(null)
  const sectionInView = useInView(sectionRef, { once: true, margin: '0px 0px -80px 0px' })
  const tableInView = useInView(tableRef, { once: true, margin: '0px 0px -48px 0px' })

  return (
    <section className="comparison" ref={sectionRef}>
      <div className="section-container">
        <motion.p
          className="eyebrow"
          initial={{ opacity: 0, y: 16 }}
          animate={sectionInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease }}
        >
          Why Onion
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          animate={sectionInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease, delay: 0.1 }}
        >
          Everything they offer.<br />And one thing they don&apos;t.
        </motion.h2>
        <motion.div
          ref={tableRef}
          className="table-wrap"
          style={{ marginTop: 'var(--sp-8)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={tableInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease }}
        >
          <table className="compare-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Feature</th>
                <th>Other apps</th>
                <th className="col-onion">Onion</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.feature} className={r.diff ? 'row-diff' : ''}>
                  <td>
                    {r.diff ? <strong>{r.feature}</strong> : r.feature}
                    {r.note && <span className="row-note">{r.note}</span>}
                  </td>
                  <td className={r.other === '✗' ? 'col-no' : ''}>{r.other}</td>
                  <td className="col-onion">{r.onion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>
    </section>
  )
}
