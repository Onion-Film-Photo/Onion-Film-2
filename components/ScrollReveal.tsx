'use client'
import { useRef, useEffect, useState } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import type { MotionValue } from 'motion/react'
import Image from 'next/image'

const EASE: [number, number, number, number] = [0.44, 0, 0, 1]

function BlurWord({
  word,
  progress,
  start,
  end,
}: {
  word: string
  progress: MotionValue<number>
  start: number
  end: number
}) {
  const opacity = useTransform(progress, [start, end], [0, 1])
  const filter  = useTransform(progress, [start, end], ['blur(14px)', 'blur(0px)'])
  return (
    <motion.span style={{ opacity, filter, display: 'inline-block', marginRight: '0.28em' }}>
      {word}
    </motion.span>
  )
}

export default function ScrollReveal() {
  const outerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: outerRef,
    offset: ['start start', 'end end'],
  })

  // Responsive x offset — on mobile (column layout) use smaller values
  // so the phrases fly just off the left/right edges, not into outer space
  const [xOffset, setXOffset] = useState(680)
  useEffect(() => {
    const calc = () => {
      const vw = window.innerWidth
      const offset = vw <= 640
        ? vw * 0.55          // mobile: slightly past edge
        : vw * 0.41          // desktop: land near viewport edges
      setXOffset(Math.max(offset, 220))
    }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [])

  // Section fade in/out
  const sectionOpacity = useTransform(
    scrollYProgress, [0, 0.06, 0.80, 0.94], [0, 1, 1, 0]
  )

  // Phrase split
  const leftX  = useTransform(scrollYProgress, [0.15, 0.65], [0, -xOffset])
  const rightX = useTransform(scrollYProgress, [0.15, 0.65], [0, xOffset])

  // Canister entrance
  const canisterOpacity = useTransform(scrollYProgress, [0.15, 0.44], [0, 1])
  const canisterScale   = useTransform(scrollYProgress, [0.15, 0.44], [0.82, 1])
  const canisterRotate  = useTransform(scrollYProgress, [0.18, 0.68], [0, -6])

  // Film strip grows upward from canister top
  const filmGrow = useTransform(scrollYProgress, [0.22, 0.60], [0, 1])

  // Word-by-word blur reveal
  const bodyText = 'Guests use their own phone to shoot their assigned moment through Onion. Every frame lands directly in your shared album the second it\'s taken — no app download, no transfers, no chasing anyone for files.'
  const words = bodyText.split(' ')
  const tStart = 0.40
  const tEnd   = 0.78
  const step   = (tEnd - tStart) / words.length

  return (
    <div ref={outerRef} className="sr-outer">
      <div className="sr-sticky">
        <motion.div className="sr-inner" style={{ opacity: sectionOpacity }}>

          {/* Split row: phrase | canister | phrase */}
          <div className="sr-split">

            <motion.span
              className="sr-phrase"
              style={{ x: leftX }}
              transition={{ ease: EASE, duration: 0.7 }}
            >
              Shot on any device.
            </motion.span>

            {/* Center: film strip growing up + canister at bottom */}
            <motion.div
              className="sr-center"
              style={{ opacity: canisterOpacity, scale: canisterScale }}
            >
              {/* Film strip container — overflow hidden so scaleY clips correctly */}
              <div className="sr-strip-wrap">
                <motion.div
                  className="sr-strip"
                  style={{ scaleY: filmGrow, transformOrigin: 'bottom center' }}
                  transition={{ ease: EASE }}
                />
              </div>

              {/* Kodak canister */}
              <motion.div style={{ rotate: canisterRotate }}>
                <Image
                  src="/kodak.png"
                  alt="Kodak film canister"
                  width={160}
                  height={160}
                  className="sr-canister"
                  priority
                />
              </motion.div>
            </motion.div>

            <motion.span
              className="sr-phrase"
              style={{ x: rightX }}
              transition={{ ease: EASE, duration: 0.7 }}
            >
              Shared with the host.
            </motion.span>

          </div>

          {/* Word-by-word blur reveal */}
          <p className="sr-body">
            {words.map((word, i) => (
              <BlurWord
                key={i}
                word={word}
                progress={scrollYProgress}
                start={tStart + i * step}
                end={tStart + i * step + step * 2.4}
              />
            ))}
          </p>

        </motion.div>
      </div>
    </div>
  )
}
