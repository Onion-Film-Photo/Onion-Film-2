'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useInView } from 'motion/react'

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1]

function DemoAssign() {
  const guests = [
    { num: '+1 555 0142', role: "Bride's Parents", active: false },
    { num: '+1 555 0198', role: 'First Dance', active: true },
    { num: '+1 555 0211', role: "Groom's Squad", active: false },
    { num: '+1 555 0334', role: 'Cake Cutting', active: false },
  ]
  return (
    <>
      <p className="demo-label">Host assigns roles</p>
      <ul className="demo-guest-list">
        {guests.map(g => (
          <li key={g.num} className={`demo-guest${g.active ? ' demo-guest--active' : ''}`}>
            <span className="demo-guest__num">{g.num}</span>
            <span className="demo-guest__role">{g.role}</span>
          </li>
        ))}
      </ul>
      <p className="demo-assign-hint">Tap a guest to assign their moment →</p>
    </>
  )
}

function DemoQR() {
  return (
    <>
      <p className="demo-label">Guest scans QR code</p>
      <div className="demo-qr-wrap">
        <svg viewBox="0 0 100 100" width="110" height="110" aria-hidden="true">
          <rect width="100" height="100" fill="white"/>
          <rect x="5" y="5" width="30" height="30" fill="none" stroke="#0A0A0A" strokeWidth="4"/>
          <rect x="13" y="13" width="14" height="14" fill="#0A0A0A"/>
          <rect x="65" y="5" width="30" height="30" fill="none" stroke="#0A0A0A" strokeWidth="4"/>
          <rect x="73" y="13" width="14" height="14" fill="#0A0A0A"/>
          <rect x="5" y="65" width="30" height="30" fill="none" stroke="#0A0A0A" strokeWidth="4"/>
          <rect x="13" y="73" width="14" height="14" fill="#0A0A0A"/>
          <rect x="42" y="5" width="5" height="5" fill="#0A0A0A"/>
          <rect x="50" y="5" width="5" height="5" fill="#0A0A0A"/>
          <rect x="42" y="13" width="5" height="5" fill="#0A0A0A"/>
          <rect x="55" y="13" width="5" height="5" fill="#0A0A0A"/>
          <rect x="50" y="20" width="5" height="5" fill="#0A0A0A"/>
          <rect x="42" y="42" width="5" height="5" fill="#0A0A0A"/>
          <rect x="50" y="42" width="5" height="5" fill="#0A0A0A"/>
          <rect x="58" y="42" width="5" height="5" fill="#0A0A0A"/>
          <rect x="42" y="50" width="5" height="5" fill="#0A0A0A"/>
          <rect x="58" y="55" width="5" height="5" fill="#0A0A0A"/>
          <rect x="65" y="42" width="5" height="5" fill="#0A0A0A"/>
          <rect x="73" y="42" width="5" height="5" fill="#0A0A0A"/>
          <rect x="65" y="50" width="5" height="5" fill="#0A0A0A"/>
          <rect x="80" y="50" width="5" height="5" fill="#0A0A0A"/>
          <rect x="73" y="58" width="5" height="5" fill="#0A0A0A"/>
          <rect x="42" y="65" width="5" height="5" fill="#0A0A0A"/>
          <rect x="50" y="73" width="5" height="5" fill="#0A0A0A"/>
          <rect x="42" y="80" width="5" height="5" fill="#0A0A0A"/>
          <rect x="58" y="80" width="5" height="5" fill="#0A0A0A"/>
        </svg>
        <p className="demo-qr-hint">Enter your phone number to see your role</p>
        <div className="demo-input-mock">+1 555&nbsp;</div>
      </div>
    </>
  )
}

function DemoReveal() {
  return (
    <>
      <p className="demo-label">Your assignment</p>
      <div className="demo-role-reveal-wrap">
        <span className="demo-role-tag">You&apos;re capturing</span>
        <p className="demo-role-name">First Dance</p>
        <p className="demo-role-hint-text">Point your camera at the couple when the song begins. You have 18 shots.</p>
        <div className="demo-shutter" />
      </div>
    </>
  )
}

const demoStates = [<DemoAssign key={0} />, <DemoQR key={1} />, <DemoReveal key={2} />]

const callouts = [
  {
    num: '01',
    title: 'Host assigns moments',
    body: "Add guest phone numbers before the event. Label each one with the moment they own — \"Cake cutting,\" \"Arrival shots,\" \"Kids' table.\" Any moment you care about, assigned to someone who'll be right there.",
  },
  {
    num: '02',
    title: 'Guest scans, app recognises them',
    body: 'No app download. No account creation. Guests scan the QR code at the venue, enter their phone number, and Onion surfaces their assignment instantly — along with their shot limit and a brief.',
  },
  {
    num: '03',
    title: 'Every moment has an owner',
    body: 'You planned 12 key moments. 12 guests are assigned. All 12 will be captured — not by chance, but by design. Guaranteed coverage, not hopeful coverage.',
  },
]

export default function Roles() {
  const [current, setCurrent] = useState(0)
  const headerRef = useRef(null)
  const phoneRef = useRef(null)
  const calloutsRef = useRef(null)
  const headerInView = useInView(headerRef, { once: true, margin: '0px 0px -48px 0px' })
  const phoneInView = useInView(phoneRef, { once: true, margin: '0px 0px -32px 0px' })
  const calloutsInView = useInView(calloutsRef, { once: true, margin: '0px 0px -48px 0px' })

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(c => (c + 1) % 3)
    }, 3200)
    return () => clearInterval(timer)
  }, [])

  return (
    <section className="roles" id="features">
      <div className="section-container">
        <motion.div
          ref={headerRef}
          className="roles__header"
          initial={{ opacity: 0, y: 20 }}
          animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease }}
        >
          <p className="eyebrow">The Onion Difference</p>
          <h2>Everyone arrives with a purpose.</h2>
          <p>Before your event begins, you assign every guest to a moment. They scan a QR code, enter their number, and their phone tells them exactly what they&apos;re there to capture.</p>
        </motion.div>

        <div className="roles__demo">
          <motion.div
            ref={phoneRef}
            className="phone-mockup"
            initial={{ opacity: 0, y: 20 }}
            animate={phoneInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease }}
          >
            <div className="phone-mockup__screen">
              <AnimatePresence mode="wait">
                <motion.div
                  key={current}
                  style={{ position: 'absolute', inset: 'var(--sp-3) var(--sp-2)', display: 'flex', flexDirection: 'column' }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35, ease }}
                >
                  {demoStates[current]}
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="phone-mockup__dots">
              {[0, 1, 2].map(i => (
                <button
                  key={i}
                  className={`demo-dot${current === i ? ' active' : ''}`}
                  aria-label={`Step ${i + 1}`}
                  onClick={() => setCurrent(i)}
                />
              ))}
            </div>
          </motion.div>

          <div ref={calloutsRef} className="roles__callouts">
            {callouts.map((c, i) => (
              <motion.div
                key={c.num}
                className="callout"
                initial={{ opacity: 0, y: 20 }}
                animate={calloutsInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.7, ease, delay: i * 0.1 }}
              >
                <span className="callout__num">{c.num}</span>
                <h3>{c.title}</h3>
                <p>{c.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
