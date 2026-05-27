'use client'
import { useState, useEffect, useRef, use } from 'react'
import { getFilter } from '@/lib/filters'
import type { FilterId } from '@/lib/filters'
import type { PhotoVisibility } from '@/lib/visibility'
import GuestGallery, { type GuestPhoto } from './GuestGallery'

type Phase = 'identify' | 'home' | 'camera' | 'error'

export default function GuestEventPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)

  // Identity phase
  const [phase, setPhase]         = useState<Phase>('identify')
  const [email, setEmail]         = useState('')
  const [phone, setPhone]         = useState('')
  const [idError, setIdError]     = useState('')
  const [idLoading, setIdLoading] = useState(false)

  // Session
  const [sessionId, setSessionId]           = useState('')
  const [eventId, setEventId]               = useState('')
  const [filterId, setFilterId]             = useState<FilterId>('natural')
  const [shotsRemaining, setShotsRemaining] = useState(0)
  const [shotsPerGuest, setShotsPerGuest]   = useState(0)

  // Gallery & visibility
  const [galleryPhotos, setGalleryPhotos]         = useState<GuestPhoto[]>([])
  const [isVisible, setIsVisible]                 = useState(false)
  const [photoVisibility, setPhotoVisibility]     = useState<PhotoVisibility>('after_event')
  const [photoVisibleAfter, setPhotoVisibleAfter] = useState<string | null>(null)

  // Camera
  const videoRef  = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [facingMode, setFacingMode]   = useState<'environment' | 'user'>('environment')
  const [capturing, setCapturing]     = useState(false)
  const [flash, setFlash]             = useState(false)
  const [uploadError, setUploadError] = useState('')

  const filter = getFilter(filterId)

  // Start / restart camera when phase or facingMode changes
  useEffect(() => {
    if (phase !== 'camera') return
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode }, audio: false })
      .then(stream => {
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      })
      .catch(() => setPhase('error'))

    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [phase, facingMode])

  // Poll for photo reveal every 30s while locked
  useEffect(() => {
    if (isVisible || !sessionId || (phase !== 'camera' && phase !== 'home')) return
    const id = setInterval(() => fetchGallery(sessionId), 30_000)
    return () => clearInterval(id)
  }, [isVisible, phase, sessionId])

  async function fetchGallery(sid: string) {
    const res = await fetch(`/api/guest/photos?token=${token}&sessionId=${sid}`)
    if (!res.ok) return
    const data = await res.json()
    setGalleryPhotos(data.photos)
    setIsVisible(data.isVisible)
    setPhotoVisibility(data.photoVisibility)
    setPhotoVisibleAfter(data.photoVisibleAfter)
  }

  async function handleIdentify(e: React.FormEvent) {
    e.preventDefault()
    setIdLoading(true)
    setIdError('')

    const res = await fetch('/api/guests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_token: token, email, phone }),
    })
    const data = await res.json()

    if (!res.ok) {
      setIdError(data.error ?? 'Something went wrong')
      setIdLoading(false)
      return
    }

    setSessionId(data.sessionId)
    setEventId(data.eventId)
    setFilterId(data.filter as FilterId)
    setShotsRemaining(data.shotsRemaining)
    setShotsPerGuest(data.shotsPerGuest)
    setIsVisible(data.isVisible)
    setPhotoVisibility(data.photoVisibility)
    setPhotoVisibleAfter(data.photoVisibleAfter)

    await fetchGallery(data.sessionId)

    setPhase('home')
    setIdLoading(false)
  }

  async function handleCapture() {
    if (capturing || shotsRemaining <= 0) return
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    setCapturing(true)
    setFlash(true)
    setTimeout(() => setFlash(false), 200)

    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')!
    ctx.filter = filter.css === 'none' ? 'none' : filter.css
    ctx.drawImage(video, 0, 0)

    canvas.toBlob(async blob => {
      if (!blob) { setCapturing(false); return }
      const fd = new FormData()
      fd.append('photo',     blob, 'photo.jpg')
      fd.append('sessionId', sessionId)
      fd.append('eventId',   eventId)
      fd.append('filter',    filterId)

      setUploadError('')
      const res = await fetch('/api/photos', { method: 'POST', body: fd })
      const data = await res.json()

      if (!res.ok) {
        setUploadError(data.error ?? 'Upload failed')
        setCapturing(false)
        return
      }

      const remaining = data.shotsRemaining
      setShotsRemaining(remaining)
      await fetchGallery(sessionId)

      if (remaining <= 0) setPhase('home')
      setCapturing(false)
    }, 'image/jpeg', 0.95)
  }

  // ── Identify ──────────────────────────────────────────────────────────────
  if (phase === 'identify') {
    return (
      <div className="guest-identify">
        <div className="guest-identify__card">
          <a className="auth-logo" href="/">Onion</a>
          <h1 className="guest-identify__title">You&apos;re in.</h1>
          <p className="guest-identify__sub">Enter your details to access your camera and see how many shots you have.</p>
          <form onSubmit={handleIdentify} className="auth-form">
            <label className="auth-label">
              Email
              <input className="auth-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </label>
            <label className="auth-label">
              Phone number
              <input className="auth-input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} required placeholder="+1 555 0100" />
            </label>
            {idError && <p className="auth-error">{idError}</p>}
            <button type="submit" className="btn btn--primary btn--full" disabled={idLoading}>
              {idLoading ? 'Joining…' : 'Open my camera →'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div className="guest-identify">
        <div className="guest-identify__card">
          <a className="auth-logo" href="/">Onion</a>
          <h1 className="guest-identify__title">Camera unavailable</h1>
          <p className="guest-identify__sub">We couldn&apos;t access your camera. Please allow camera permission and reload.</p>
          <button className="btn btn--outline btn--full" onClick={() => setPhase('home')} style={{ marginTop: 'var(--sp-4)' }}>
            Back to album
          </button>
        </div>
      </div>
    )
  }

  // ── Home / album ──────────────────────────────────────────────────────────
  if (phase === 'home') {
    return (
      <div className="guest-home">
        <div className="guest-home__header">
          <a className="auth-logo guest-home__logo" href="/">Onion</a>
          <span className="guest-home__album-label">Your Album</span>
        </div>

        <div className="guest-home__gallery">
          {galleryPhotos.length === 0 ? (
            <div className="guest-home__empty">
              <p>Your shots will appear here after you take them.</p>
            </div>
          ) : (
            <GuestGallery
              photos={galleryPhotos}
              isVisible={isVisible}
              photoVisibility={photoVisibility}
              photoVisibleAfter={photoVisibleAfter}
            />
          )}
        </div>

        <div className="guest-home__bottom">
          {shotsRemaining > 0 ? (
            <>
              <span className="guest-home__shots-label">{shotsRemaining} shots remaining</span>
              <button className="guest-home__camera-btn" onClick={() => setPhase('camera')}>
                <span className="guest-home__camera-dot" />
                Camera
              </button>
            </>
          ) : (
            <p className="guest-home__film-full-msg">
              Film&apos;s full — the host will reveal your photos soon.
            </p>
          )}
        </div>
      </div>
    )
  }

  // ── Camera ────────────────────────────────────────────────────────────────
  return (
    <div className="camera-screen">
      <div className="camera-top">
        <span className="camera-filter-badge">&#128274; {filter.label}</span>
        <span className="camera-shots">
          {shotsRemaining} / {shotsPerGuest} <span className="camera-shots__label">left</span>
        </span>
      </div>

      <div className="camera-viewfinder-wrap">
        <div className="camera-grain" aria-hidden="true" />
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="camera-video"
          style={{ filter: filter.css === 'none' ? undefined : filter.css }}
        />
        <div className="camera-frame" aria-hidden="true">
          <div className="camera-frame__corner camera-frame__corner--tl" />
          <div className="camera-frame__corner camera-frame__corner--tr" />
          <div className="camera-frame__corner camera-frame__corner--bl" />
          <div className="camera-frame__corner camera-frame__corner--br" />
        </div>
        {flash && <div className="camera-flash" aria-hidden="true" />}
      </div>

      <div className="camera-shutter-area">
        {uploadError && <p className="camera-error">{uploadError}</p>}
        <button
          className={`shutter-pill${capturing ? ' shutter-pill--capturing' : ''}`}
          onClick={handleCapture}
          disabled={capturing || shotsRemaining <= 0}
          aria-label="Take photo"
        >
          <span className="shutter-pill__dot" />
        </button>
      </div>

      <div className="camera-nav">
        <button className="camera-nav__btn" onClick={() => setPhase('home')} aria-label="Back to album">
          &#8592;
        </button>
        <span className="camera-filter-pill">&#128274; {filter.label}</span>
        <button
          className="camera-nav__btn"
          onClick={() => setFacingMode(f => f === 'environment' ? 'user' : 'environment')}
          aria-label="Flip camera"
        >
          &#8635;
        </button>
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}
