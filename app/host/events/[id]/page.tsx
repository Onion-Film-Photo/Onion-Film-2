'use client'
import { useEffect, useState, use } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { zipSync } from 'fflate'
import { getTier } from '@/lib/pricing'
import { getFilter } from '@/lib/filters'
import type { FilterId } from '@/lib/filters'
import { motion } from 'motion/react'

type GuestSession = {
  id: string
  email: string
  phone: string
  shots_taken: number
  created_at: string
}

type Event = {
  id: string
  name: string
  guest_limit: number
  filter: FilterId
  shots_per_guest: number
  video_enabled: boolean
  clips_per_guest: number
  clip_duration_seconds: number
  status: string
  qr_token: string
  photo_visibility: 'immediately' | 'after_event' | 'after_date'
  photo_visible_after: string | null
  guest_sessions: GuestSession[]
  photos: { count: number }[]
}

type Photo = {
  id: string
  url: string | null
  filter: string
  created_at: string
  guest_email: string | null
  storage_path: string
}

type Video = {
  id: string
  url: string | null
  duration_seconds: number
  filter: string
  created_at: string
  guest_email: string | null
  storage_path: string
}

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [event, setEvent]           = useState<Event | null>(null)
  const [photos, setPhotos]         = useState<Photo[]>([])
  const [videos, setVideos]         = useState<Video[]>([])
  const [loading, setLoading]       = useState(true)
  const [confirmEnd, setConfirmEnd]   = useState(false)
  const [ending, setEnding]           = useState(false)
  const [downloading, setDownloading] = useState(false)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? (typeof window !== 'undefined' ? window.location.origin : '')

  useEffect(() => {
    Promise.all([
      fetch(`/api/events/${id}`).then(r => r.json()),
      fetch(`/api/photos/${id}`).then(r => r.json()),
      fetch(`/api/videos/${id}`).then(r => r.json()),
    ]).then(([ev, ph, vi]) => {
      setEvent(ev)
      setPhotos(Array.isArray(ph) ? ph : [])
      setVideos(Array.isArray(vi) ? vi : [])
      setLoading(false)
    })
  }, [id])

  if (loading) return <div className="host-page"><p style={{ padding: 'var(--sp-8)', textAlign: 'center' }}>Loading…</p></div>
  if (!event)  return <div className="host-page"><p style={{ padding: 'var(--sp-8)', textAlign: 'center' }}>Event not found.</p></div>

  async function handleEndEvent() {
    setEnding(true)
    const res = await fetch(`/api/events/${id}`, { method: 'PATCH' })
    if (res.ok) {
      setEvent(e => e ? { ...e, status: 'ended' } : e)
      setConfirmEnd(false)
    }
    setEnding(false)
  }

  async function handleDownloadAll() {
    if (!photos.length && !videos.length) return
    setDownloading(true)
    try {
      const [photoFiles, videoFiles] = await Promise.all([
        Promise.all(
          photos.filter(p => p.url).map(async (p, i) => {
            const res = await fetch(p.url!)
            const buf = await res.arrayBuffer()
            const ext  = p.storage_path.split('.').pop() ?? 'jpg'
            const name = `photos/${String(i + 1).padStart(3, '0')}_${(p.guest_email ?? 'guest').replace(/[^a-z0-9]/gi, '_')}.${ext}`
            return [name, new Uint8Array(buf)] as [string, Uint8Array]
          }),
        ),
        Promise.all(
          videos.filter(v => v.url).map(async (v, i) => {
            const res = await fetch(v.url!)
            const buf = await res.arrayBuffer()
            const ext  = v.storage_path.split('.').pop() ?? 'webm'
            const name = `videos/${String(i + 1).padStart(3, '0')}_${(v.guest_email ?? 'guest').replace(/[^a-z0-9]/gi, '_')}.${ext}`
            return [name, new Uint8Array(buf)] as [string, Uint8Array]
          }),
        ),
      ])

      const zip  = zipSync(Object.fromEntries([...photoFiles, ...videoFiles]))
      const blob = new Blob([zip], { type: 'application/zip' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `${event!.name.replace(/[^a-z0-9]/gi, '_')}_roll.zip`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  const tier          = getTier(event.guest_limit)
  const filter        = getFilter(event.filter as FilterId)
  const guestSessions = event.guest_sessions ?? []
  const guests        = guestSessions.length
  const photoCount    = event.photos?.[0]?.count ?? 0
  const guestUrl      = `${appUrl}/event/${event.qr_token}`

  return (
    <motion.div
      className="host-page"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
    >
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
              <p className="event-detail-meta" style={{ marginTop: 'var(--sp-1)' }}>
                {event.photo_visibility === 'immediately' && '📷 Photos reveal immediately'}
                {event.photo_visibility === 'after_event' && '🔒 Photos reveal when you end the event'}
                {event.photo_visibility === 'after_date' && event.photo_visible_after &&
                  `📅 Photos reveal on ${new Date(event.photo_visible_after).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                }
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
              <span className={`event-card__status event-card__status--${event.status}`}>{event.status}</span>
              {event.status === 'active' && !confirmEnd && (
                <button className="btn btn--ghost btn--sm" onClick={() => setConfirmEnd(true)}>
                  End event
                </button>
              )}
              {event.status === 'active' && confirmEnd && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--c-text-2)' }}>Reveal photos to guests?</span>
                  <button className="btn btn--primary btn--sm" onClick={handleEndEvent} disabled={ending}>
                    {ending ? 'Ending…' : 'Confirm'}
                  </button>
                  <button className="btn btn--ghost btn--sm" onClick={() => setConfirmEnd(false)} disabled={ending}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
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

          {/* Guest list */}
          <div className="event-panel" style={{ marginTop: 'var(--sp-6)' }}>
            <h2 className="event-panel__title">Guests ({guests})</h2>
            {guestSessions.length === 0 ? (
              <p className="host-empty">No guests yet — they'll appear here when they scan in.</p>
            ) : (
              <table className="guest-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Shots taken</th>
                    <th>Shots remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {guestSessions.map(g => (
                    <tr key={g.id}>
                      <td>{g.email}</td>
                      <td>{g.phone}</td>
                      <td>{g.shots_taken}</td>
                      <td>{Math.max(0, event.shots_per_guest - g.shots_taken)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Photo gallery */}
          <div className="event-panel" style={{ marginTop: 'var(--sp-6)' }}>
            <div className="event-panel__header">
              <h2 className="event-panel__title">Photos ({photoCount})</h2>
              {(photos.length > 0 || videos.length > 0) && (
                <button
                  className="btn btn--outline btn--sm"
                  onClick={handleDownloadAll}
                  disabled={downloading}
                >
                  {downloading ? 'Zipping…' : `Download all${videos.length > 0 ? ' (photos + clips)' : ''}`}
                </button>
              )}
            </div>
            {photos.length === 0
              ? <p className="host-empty">No photos yet — guests will appear here in real time.</p>
              : (
                <div className="photo-gallery">
                  {photos.map(p => (
                    p.url ? (
                      <div key={p.id} className="photo-gallery__cell">
                        <img src={p.url} alt="" className="photo-gallery__item" loading="lazy" />
                        {p.guest_email && (
                          <span className="photo-gallery__attr">{p.guest_email}</span>
                        )}
                      </div>
                    ) : null
                  ))}
                </div>
              )
            }
          </div>

          {/* Video clips gallery (only shown if video is enabled for this event) */}
          {event.video_enabled && (
            <div className="event-panel" style={{ marginTop: 'var(--sp-6)' }}>
              <div className="event-panel__header">
                <h2 className="event-panel__title">Video Clips ({videos.length})</h2>
                <span style={{ fontSize: '0.8rem', color: 'var(--c-text-2)' }}>
                  Super 8 · {event.clips_per_guest} clips/guest · {event.clip_duration_seconds}s max
                </span>
              </div>
              {videos.length === 0
                ? <p className="host-empty">No clips yet — they&apos;ll appear here as guests record.</p>
                : (
                  <div className="photo-gallery">
                    {videos.map(v => (
                      v.url ? (
                        <div key={v.id} className="photo-gallery__cell">
                          <video
                            src={v.url}
                            className="photo-gallery__item"
                            controls
                            playsInline
                            preload="metadata"
                            style={{ objectFit: 'cover' }}
                          />
                          <span className="photo-gallery__attr">
                            {v.guest_email ?? 'Guest'} · {v.duration_seconds}s
                          </span>
                        </div>
                      ) : null
                    ))}
                  </div>
                )
              }
            </div>
          )}
        </div>
      </main>
    </motion.div>
  )
}
