'use client'
import { useRef, useEffect } from 'react'
import { motion, useInView } from 'motion/react'

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1]

const frames = [
  { cls: 'frame__photo--wedding', title: 'Weddings', quote: '"Assign the ceremony, cocktail hour, and dancing — each to a different family member."' },
  { cls: 'frame__photo--birthday', title: 'Birthdays', quote: '"Every friend group owns a moment. The cake. The speeches. The chaos on the floor."' },
  { cls: 'frame__photo--trip', title: 'Group Trips', quote: '"One person owns mornings. One owns meals. One owns sunsets. The full trip, covered."' },
  { cls: 'frame__photo--corporate', title: 'Corporate Events', quote: '"Keynote, networking, team dinner — every session documented, no photographer needed."' },
  { cls: 'frame__photo--graduation', title: 'Graduations', quote: '"Family captures the ceremony. Friends capture the after. Nothing overlaps, nothing is missed."' },
]

export default function UseCases() {
  const sectionRef = useRef(null)
  const filmRef = useRef<HTMLDivElement>(null)
  const sectionInView = useInView(sectionRef, { once: true, margin: '0px 0px -80px 0px' })

  useEffect(() => {
    const el = filmRef.current
    if (!el) return
    let isDown = false, startX = 0, scrollLeft = 0
    const onDown = (e: MouseEvent) => { isDown = true; el.classList.add('dragging'); startX = e.pageX - el.offsetLeft; scrollLeft = el.scrollLeft }
    const onLeave = () => { isDown = false; el.classList.remove('dragging') }
    const onUp = () => { isDown = false; el.classList.remove('dragging') }
    const onMove = (e: MouseEvent) => { if (!isDown) return; e.preventDefault(); el.scrollLeft = scrollLeft - (e.pageX - el.offsetLeft - startX) * 1.4 }
    let touchStartX = 0, touchScrollLeft = 0
    const onTouchStart = (e: TouchEvent) => { touchStartX = e.touches[0].pageX; touchScrollLeft = el.scrollLeft }
    const onTouchMove = (e: TouchEvent) => { el.scrollLeft = touchScrollLeft - (e.touches[0].pageX - touchStartX) * 1.2 }
    el.addEventListener('mousedown', onDown)
    el.addEventListener('mouseleave', onLeave)
    el.addEventListener('mouseup', onUp)
    el.addEventListener('mousemove', onMove)
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    return () => {
      el.removeEventListener('mousedown', onDown)
      el.removeEventListener('mouseleave', onLeave)
      el.removeEventListener('mouseup', onUp)
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
    }
  }, [])

  return (
    <section className="usecases" ref={sectionRef}>
      <div className="section-container">
        <motion.p
          className="eyebrow"
          initial={{ opacity: 0, y: 16 }}
          animate={sectionInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease }}
        >
          Perfect for
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          animate={sectionInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease, delay: 0.1 }}
        >
          Any event worth remembering.
        </motion.h2>
      </div>
      <div className="filmstrip-outer">
        <div className="filmstrip-scroll" id="filmstrip" ref={filmRef}>
          <div className="filmstrip__track">
            {frames.map(f => (
              <div key={f.title} className="frame">
                <div className={`frame__photo ${f.cls}`} />
                <div className="frame__caption">
                  <h3>{f.title}</h3>
                  <p>{f.quote}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
