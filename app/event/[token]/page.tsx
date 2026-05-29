'use client'
import { useState, useEffect, useRef, use } from 'react'
import { getFilter, VIDEO_FILTER } from '@/lib/filters'
import { applyFilmGL } from '@/lib/webglFilm'
import type { FilterId } from '@/lib/filters'
import type { PhotoVisibility } from '@/lib/visibility'
import GuestGallery, { type GuestPhoto, type GuestVideo } from './GuestGallery'

type Phase = 'identify' | 'home' | 'camera' | 'error'
type CameraMode = 'photo' | 'video'

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

  // Video
  const [videoEnabled, setVideoEnabled]           = useState(false)
  const [clipsPerGuest, setClipsPerGuest]         = useState(2)
  const [clipDurationSeconds, setClipDurationSeconds] = useState(10)
  const [clipsRemaining, setClipsRemaining]       = useState(0)
  const [cameraMode, setCameraMode]               = useState<CameraMode>('photo')
  const [recording, setRecording]                 = useState(false)
  const [uploadingClip, setUploadingClip]         = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const recordStartRef   = useRef<number>(0)
  const recordTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Gallery & visibility
  const [galleryPhotos, setGalleryPhotos]         = useState<GuestPhoto[]>([])
  const [galleryVideos, setGalleryVideos]         = useState<GuestVideo[]>([])
  const [isVisible, setIsVisible]                 = useState(false)
  const [photoVisibility, setPhotoVisibility]     = useState<PhotoVisibility>('after_event')
  const [photoVisibleAfter, setPhotoVisibleAfter] = useState<string | null>(null)
  const [eventEnded, setEventEnded]               = useState(false)

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
    const [photosRes, videosRes] = await Promise.all([
      fetch(`/api/guest/photos?token=${token}&sessionId=${sid}`),
      fetch(`/api/guest/videos?token=${token}&sessionId=${sid}`),
    ])

    if (photosRes.ok) {
      const data = await photosRes.json()
      setGalleryPhotos(data.photos)
      setIsVisible(data.isVisible)
      setPhotoVisibility(data.photoVisibility)
      setPhotoVisibleAfter(data.photoVisibleAfter)
      if (data.eventStatus === 'ended') {
        setEventEnded(true)
        setShotsRemaining(0)
      }
    }

    if (videosRes.ok) {
      const data = await videosRes.json()
      setGalleryVideos(data.videos ?? [])
    }
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
    setVideoEnabled(data.videoEnabled ?? false)
    setClipsPerGuest(data.clipsPerGuest ?? 2)
    setClipDurationSeconds(data.clipDurationSeconds ?? 10)
    setClipsRemaining(data.clipsRemaining ?? 0)
    setEventEnded(data.eventEnded ?? false)

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
    ctx.drawImage(video, 0, 0)

    // Apply film stock: WebGL if defined, otherwise plain canvas
    const processed = filter.gl
      ? applyFilmGL(canvas, filter.gl, canvas.width, canvas.height)
      : canvas

    processed.toBlob(async blob => {
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

  function startRecording() {
    if (recording || uploadingClip || clipsRemaining <= 0) return
    const stream = streamRef.current
    if (!stream) return

    // Guard against ended tracks (some browsers stop tracks when MediaRecorder.stop() is called)
    const tracks = stream.getVideoTracks()
    if (!tracks.length || tracks[0].readyState !== 'live') {
      setUploadError('Camera stopped. Flip camera or go back and return.')
      return
    }

    recordedChunksRef.current = []
    recordStartRef.current = Date.now()

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm')
      ? 'video/webm'
      : 'video/mp4'

    try {
      const mr = new MediaRecorder(stream, { mimeType })
      mr.ondataavailable = e => { if (e.data.size > 0) recordedChunksRef.current.push(e.data) }
      mr.onstop = handleRecordingStop
      mr.start(100)
      mediaRecorderRef.current = mr
      setRecording(true)
      recordTimerRef.current = setTimeout(() => stopRecording(), clipDurationSeconds * 1000)
    } catch {
      setUploadError('Could not start recording. Please reload.')
    }
  }

  function stopRecording() {
    if (recordTimerRef.current) { clearTimeout(recordTimerRef.current); recordTimerRef.current = null }
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop()
  }

  async function handleRecordingStop() {
    setRecording(false)

    // Nothing was captured (e.g. tracks ended before any data arrived) — don't waste a clip slot
    if (recordedChunksRef.current.length === 0) return

    setUploadingClip(true)
    setUploadError('')

    try {
      const duration = Math.max(1, Math.round((Date.now() - recordStartRef.current) / 1000))
      const mimeType = recordedChunksRef.current[0]?.type ?? 'video/webm'
      const blob = new Blob(recordedChunksRef.current, { type: mimeType })
      const ext  = mimeType.includes('mp4') ? 'mp4' : 'webm'

      const fd = new FormData()
      fd.append('video',     blob, `clip.${ext}`)
      fd.append('sessionId', sessionId)
      fd.append('eventId',   eventId)
      fd.append('filter',    'super8')
      fd.append('duration',  String(duration))

      const res  = await fetch('/api/videos', { method: 'POST', body: fd })
      const data = await res.json()

      if (!res.ok) {
        setUploadError(data.error ?? 'Upload failed')
      } else {
        setClipsRemaining(data.clipsRemaining)
        if (data.clipsRemaining <= 0) setCameraMode('photo')
        fetchGallery(sessionId)
      }
    } catch {
      setUploadError('Upload failed — please try again.')
    } finally {
      setUploadingClip(false)
    }
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
          {galleryPhotos.length === 0 && galleryVideos.length === 0 ? (
            <div className="guest-home__empty">
              <p>Your shots will appear here after you take them.</p>
            </div>
          ) : (
            <GuestGallery
              photos={galleryPhotos}
              videos={galleryVideos}
              isVisible={isVisible}
              photoVisibility={photoVisibility}
              photoVisibleAfter={photoVisibleAfter}
            />
          )}
        </div>

        <div className="guest-home__bottom">
          {eventEnded ? (
            <p className="guest-home__film-full-msg">
              Your film is developed — enjoy your shots.
            </p>
          ) : shotsRemaining > 0 ? (
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
  const activeFilter = cameraMode === 'video' ? VIDEO_FILTER : filter
  const viewfinderCss = activeFilter.css === 'none' ? undefined : activeFilter.css

  return (
    <div className="camera-screen">
      <div className="camera-top">
        <span className="camera-filter-badge">&#128274; {activeFilter.label}</span>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
          <span className="camera-shots">
            {shotsRemaining} / {shotsPerGuest} <span className="camera-shots__label">left</span>
          </span>
          {videoEnabled && cameraMode === 'video' && (
            <span className="camera-shots" style={{ fontSize: '0.75rem' }}>
              {clipsRemaining} / {clipsPerGuest} <span className="camera-shots__label">clips</span>
            </span>
          )}
        </div>
      </div>

      <div className="camera-viewfinder-wrap">
        <div className="camera-grain" aria-hidden="true" />
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="camera-video"
          style={{ filter: viewfinderCss }}
        />
        <div className="camera-frame" aria-hidden="true">
          <div className="camera-frame__corner camera-frame__corner--tl" />
          <div className="camera-frame__corner camera-frame__corner--tr" />
          <div className="camera-frame__corner camera-frame__corner--bl" />
          <div className="camera-frame__corner camera-frame__corner--br" />
        </div>
        {flash && <div className="camera-flash" aria-hidden="true" />}
        {recording && <div className="camera-rec-badge" aria-hidden="true">&#9679; REC</div>}
      </div>

      {/* Photo / Video mode toggle */}
      {videoEnabled && (
        <div className="camera-mode-toggle">
          <button
            className={`camera-mode-btn${cameraMode === 'photo' ? ' camera-mode-btn--active' : ''}`}
            onClick={() => { if (!recording) setCameraMode('photo') }}
          >
            Photo
          </button>
          <button
            className={`camera-mode-btn${cameraMode === 'video' ? ' camera-mode-btn--active' : ''}`}
            onClick={() => { if (!recording && clipsRemaining > 0) setCameraMode('video') }}
            disabled={clipsRemaining <= 0}
          >
            Video
          </button>
        </div>
      )}

      <div className="camera-shutter-area">
        {uploadError && <p className="camera-error">{uploadError}</p>}

        {cameraMode === 'photo' ? (
          <button
            className={`shutter-pill${capturing ? ' shutter-pill--capturing' : ''}`}
            onClick={handleCapture}
            disabled={capturing || shotsRemaining <= 0}
            aria-label="Take photo"
          >
            <span className="shutter-pill__dot" />
          </button>
        ) : (
          <button
            className={`shutter-pill shutter-pill--video${recording ? ' shutter-pill--recording' : ''}`}
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={stopRecording}
            onTouchStart={e => { e.preventDefault(); startRecording() }}
            onTouchEnd={e => { e.preventDefault(); stopRecording() }}
            disabled={uploadingClip || clipsRemaining <= 0}
            aria-label={recording ? 'Recording… release to stop' : 'Hold to record'}
          >
            <span className="shutter-pill__dot" />
          </button>
        )}

        {cameraMode === 'video' && !recording && !uploadingClip && clipsRemaining > 0 && (
          <p className="camera-hint">Hold to record · {clipDurationSeconds}s max</p>
        )}
        {uploadingClip && <p className="camera-hint">Saving clip…</p>}
      </div>

      <div className="camera-nav">
        <button className="camera-nav__btn" onClick={() => { stopRecording(); setPhase('home') }} aria-label="Back to album">
          &#8592;
        </button>
        <span className="camera-filter-pill">&#128274; {activeFilter.label}</span>
        <button
          className="camera-nav__btn"
          onClick={() => { if (!recording) setFacingMode(f => f === 'environment' ? 'user' : 'environment') }}
          aria-label="Flip camera"
        >
          &#8635;
        </button>
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}
