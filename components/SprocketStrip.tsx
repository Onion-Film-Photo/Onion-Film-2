'use client'
import { useRef, useEffect } from 'react'

export default function SprocketStrip({ id, className }: { id: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const holesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = holesRef.current
    const parent = containerRef.current
    if (!el || !parent) return
    const HOLE_W = 14, HOLE_H = 20, HOLE_GAP = 32, RADIUS = 3
    const w = parent.offsetWidth
    const count = Math.ceil(w / HOLE_GAP) + 4
    el.style.width = HOLE_W + 'px'
    el.style.height = HOLE_H + 'px'
    el.style.borderRadius = RADIUS + 'px'
    el.style.background = 'var(--paper-warm)'
    el.style.position = 'absolute'
    el.style.left = '12px'
    el.style.top = '50%'
    el.style.transform = 'translateY(-50%)'
    const shadows: string[] = []
    for (let i = 1; i < count; i++) {
      shadows.push(`${i * HOLE_GAP}px 0 0 var(--paper-warm)`)
    }
    el.style.boxShadow = shadows.join(', ')
  }, [])

  return (
    <div ref={containerRef} className={className || 'sprocket-strip'}>
      <div ref={holesRef} className="sprocket-strip__holes" id={id} />
    </div>
  )
}
