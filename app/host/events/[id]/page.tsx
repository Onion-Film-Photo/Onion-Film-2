'use client'
import { useEffect, useState, use } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { getTier } from '@/lib/pricing'
import { getFilter } from '@/lib/filters'
import type { FilterId } from '@/lib/filters'

type Event = {
  id: string
  name: string
  guest_limit: number
  filter: FilterId
  shots_per_guest: number
  status: string
  qr_token: string
  guest_sessions: { count: number }[]
  photos: { count: number }[]
}

type Photo = {
  id: string
  url: string | null
  filter: string
  created_at: string
}

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [event, setEvent]   = useState<Event | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? (typeof window !== 'undefined' ? window.location.origin : '')

  useEffect(() => {
    Promise.all([
      fetch(`/api/events/${id}`).then(r => r.json()),
      fetch(`/api/photos/${id}`).then(r => r.json()),
    ]).then(([ev, ph]) => {
      setEvent(ev)
      setPhotos(Array.isArray(ph) ? ph : [])
      setLoading(false)
    })
  }, [id])

  if (loading) return <div className="host-page"><p style={{ padding: 'var(--sp-8)', textAlign: 'center' }}>Loading…</p></div>
  if (!event)  return <div className="host-page"><p style={{ padding: 'var(--sp-8)', textAlign: 'center' }}>Event not found.</p></div>

  const tier       = getTier(event.guest_limit)
  const filter     = getFilter(event.filter as FilterId)
  const guests     = event.guest_sessions?.[0]?.count ?? 0
  const photoCount = event.photos?.[0]?.count ?? 0
  const guestUrl   = `${appUrl}/event/${event.qr_token}`

  return (
    <div className="host-page">
      <header className="host-header">
        <a className="auth-logo" href="/">Onion</a>
        <a className="btn btn--ghost btn--sm" href="/host/dashboard">← Dashboard</a>
      </header>

      <main className="host-main">
        <div className="section-container">
          <div className="event-detail-header">
            <div>
              <h1 className="host-page-title">{event.name}</h1>
              <p className="event-detail-meta">
                {filter.label} · {event.guest_limit} guests max · {event.shots_per_guest} shots/guest · {tier.label}
              </p>
            </div>
            <span className={`event-card__status event-card__status--${event.status}`}>{event.status}</span>
          </div>

          <div className="event-detail-grid">
            {/* QR Code panel */}
            <div className="event-panel">
              <h2 className="event-panel__title">Guest QR Code</h2>
              <p className="event-panel__sub">Share this with guests. They&apos;ll scan it to access the camera.</p>
              <div className="qr-wrap">
                <QRCodeSVG value={guestUrl} size={200} />
              </div>
              <p className="qr-url">{guestUrl}</p>
              <a
                className="btn btn--outline btn--sm"
                href={guestUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ marginTop: 'var(--sp-3)' }}
              >
                Open guest link ↗
              </a>
            </div>

            {/* Stats panel */}
            <div className="event-panel">
              <h2 className="event-panel__title">Event Stats</h2>
              <div className="event-stats-grid">
                <div className="event-stat-lg">
                  <span className="event-stat-lg__num">{guests}</span>
                  <span className="event-stat-lg__label">Guests joined</span>
                </div>
                <div className="event-stat-lg">
                  <span className="event-stat-lg__num">{photoCount}</span>
                  <span className="event-stat-lg__label">Photos taken</span>
                </div>
                <div className="event-stat-lg">
                  <span className="event-stat-lg__num">{event.guest_limit - guests}</span>
                  <span className="event-stat-lg__label">Spots remaining</span>
                </div>
                <div className="event-stat-lg">
                  <span className="event-stat-lg__num">{guests * event.shots_per_guest - photoCount}</span>
                  <span className="event-stat-lg__label">Shots remaining</span>
                </div>
              </div>
            </div>
          </div>

          {/* Photo gallery */}
          <div className="event-panel" style={{ marginTop: 'var(--sp-6)' }}>
            <h2 className="event-panel__title">Photos ({photoCount})</h2>
            {photos.length === 0
              ? <p className="host-empty">No photos yet — guests will appear here in real time.</p>
              : (
                <div className="photo-gallery">
                  {photos.map(p => (
                    p.url
                      ? <img key={p.id} src={p.url} alt="" className="photo-gallery__item" loading="lazy" />
                      : null
                  ))}
                </div>
              )
            }
          </div>
        </div>
      </main>
    </div>
  )
}
