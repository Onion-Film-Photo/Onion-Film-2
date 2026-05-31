'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { getTier } from '@/lib/pricing'
import { getFilter } from '@/lib/filters'
import type { FilterId } from '@/lib/filters'
import { motion } from 'motion/react'

type Event = {
  id: string
  name: string
  guest_limit: number
  filter: FilterId
  shots_per_guest: number
  status: string
  created_at: string
  qr_token: string
  guest_sessions: { count: number }[]
  photos: { count: number }[]
}

export default function DashboardPage() {
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/events')
      .then(r => r.json())
      .then(data => { setEvents(Array.isArray(data) ? data : []); setLoading(false) })
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/host/login')
    router.refresh()
  }

  return (
    <motion.div
      className="host-page"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <header className="host-header">
        <a className="auth-logo" href="/">Onion</a>
        <div className="host-header__actions">
          <a className="btn btn--primary btn--sm" href="/host/events/new">+ New Event</a>
          <button className="btn btn--ghost btn--sm" onClick={handleSignOut}>Sign out</button>
        </div>
      </header>

      <main className="host-main">
        <div className="section-container">
          <h1 className="host-page-title">Your Events</h1>

          {loading && <p className="host-empty">Loading…</p>}

          {!loading && events.length === 0 && (
            <div className="host-empty-state">
              <p>No events yet.</p>
              <a className="btn btn--primary" href="/host/events/new">Create your first event →</a>
            </div>
          )}

          {!loading && events.length > 0 && (
            <div className="event-grid">
              {events.map((ev, i) => {
                const tier   = getTier(ev.guest_limit)
                const filter = getFilter(ev.filter as FilterId)
                const guests = ev.guest_sessions?.[0]?.count ?? 0
                const photos = ev.photos?.[0]?.count ?? 0
                return (
                  <motion.a
                    key={ev.id}
                    className="event-card"
                    href={`/host/events/${ev.id}`}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: i * 0.07, ease: [0.25, 0.1, 0.25, 1] }}
                  >
                    <div className="event-card__header">
                      <span className="event-card__name">{ev.name}</span>
                      <span className={`event-card__status event-card__status--${ev.status}`}>
                        {ev.status}
                      </span>
                    </div>
                    <div className="event-card__meta">
                      <span>{filter.label}</span>
                      <span>·</span>
                      <span>{ev.guest_limit} guests max</span>
                      <span>·</span>
                      <span>{ev.shots_per_guest} shots/guest</span>
                    </div>
                    <div className="event-card__stats">
                      <div className="event-stat">
                        <span className="event-stat__num">{guests}</span>
                        <span className="event-stat__label">Guests joined</span>
                      </div>
                      <div className="event-stat">
                        <span className="event-stat__num">{photos}</span>
                        <span className="event-stat__label">Photos taken</span>
                      </div>
                      <div className="event-stat">
                        <span className="event-stat__num">{tier.price === 0 ? 'Free' : `$${tier.price}`}</span>
                        <span className="event-stat__label">{tier.label}</span>
                      </div>
                    </div>
                  </motion.a>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </motion.div>
  )
}
