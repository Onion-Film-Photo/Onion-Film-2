'use client'
import { useState, useEffect, useRef, use } from 'react'
import { getFilter, VIDEO_FILTER } from '@/lib/filters'
import { applyFilmGL } from '@/lib/webglFilm'
import type { FilterId } from '@/lib/filters'
import type { PhotoVisibility } from '@/lib/visibility'
import GuestGallery, { type GuestPhoto, type GuestVideo } from './GuestGallery'
import { motion } from 'motion/react'

type Phase = 'identify' | 'home' | 'camera' | 'error'
type CameraMode = 'photo' | 'video'

export default function GuestEventPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)

  // Identity phase
  const [restoring, setRestoring]  = useState(true)
  const [phase, setPhase]          = useState<Phase>('identify')
  const [email, setEmail]          = useState('')
  const [phone, setPhone]          = useState('')
  const [idError, setIdError]      = useState('')
  const [idLoading, setIdLoading]  = useState(false)

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

  // Film counter wheel animation
  const [wheelAngle, setWheelAngle]   = useState(0)
  const [counterTick, setCounterTick] = useState(0)
  const prevShotsRef = useRef(-1)

  // Zoom & lens selection
  const [zoomLevel, setZoomLevel]               = useState(1)
  const [zoomCapabilities, setZoomCapabilities] = useState<{ min: number; max: number } | null>(null)
  const [showZoomBadge, setShowZoomBadge]       = useState(false)
  const [rearCameras, setRearCameras]           = useState<{ deviceId: string; label: string; zoomLabel: string }[]>([])
  const [activeCameraId, setActiveCameraId]     = useState<string | undefined>(undefined)
  const [defaultCameraId, setDefaultCameraId]   = useState<string | undefined>(undefined)
  const viewfinderWrapRef  = useRef<HTMLDivElement>(null)
  const zoomLevelRef       = useRef(1)
  const zoomCapRef         = useRef<{ min: number; max: number } | null>(null)
  const pinchStartDistRef  = useRef<number | null>(null)
  const pinchStartZoomRef  = useRef(1)
  const zoomBadgeTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  const filter = getFilter(filterId)

  // Start / restart camera when phase, facingMode, or selected lens changes
  useEffect(() => {
    if (phase !== 'camera') return
    const constraints: MediaStreamConstraints = {
      video: activeCameraId ? { deviceId: { exact: activeCameraId } } : { facingMode },
      audio: false,
    }
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(stream => {
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream

        const track = stream.getVideoTracks()[0]
        const caps = (track as any).getCapabilities?.() as { zoom?: { min: number; max: number } } | undefined
        const zoneCaps = caps?.zoom ?? null
        zoomCapRef.current = zoneCaps
        setZoomCapabilities(zoneCaps)
        setZoomLevel(1)
        zoomLevelRef.current = 1

        if (facingMode === 'environment' && activeCameraId === undefined) {
          const currentId = track.getSettings().deviceId
          setDefaultCameraId(currentId)
          navigator.mediaDevices.enumerateDevices().then(devices => {
            const rear = devices.filter(d => {
              if (d.kind !== 'videoinput') return false
              const lbl = d.label.toLowerCase()
              return lbl.includes('back') || lbl.includes('rear') ||
                (!lbl.includes('front') && !lbl.includes('user') && !lbl.includes('face') && !lbl.includes('facetime'))
            })
            if (rear.length >= 2) {
              setRearCameras(rear.map((d, i) => ({
                deviceId: d.deviceId,
                label: d.label,
                zoomLabel: inferZoomLabel(d.label, i, rear.length),
              })))
            }
          })
        }
      })
      .catch(() => setPhase('error'))

    return () => { streamRef.current?.getTracks().forEach(t => t.stop()) }
  }, [phase, facingMode, activeCameraId])

  // Poll for photo reveal every 30s while locked
  useEffect(() => {
    if (isVisible || !sessionId || (phase !== 'camera' && phase !== 'home')) return
    const id = setInterval(() => fetchGallery(sessionId), 30_000)
    return () => clearInterval(id)
  }, [isVisible, phase, sessionId])

  // Block viewport pinch-zoom; route viewfinder pinch to camera zoom
  useEffect(() => {
    if (phase !== 'camera') return

    const blockViewport = (e: TouchEvent) => { if (e.touches.length > 1) e.preventDefault() }
    document.addEventListener('touchmove', blockViewport, { passive: false })

    const el = viewfinderWrapRef.current
    if (!el) return () => document.removeEventListener('touchmove', blockViewport)

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      pinchStartDistRef.current = Math.hypot(dx, dy)
      pinchStartZoomRef.current = zoomLevelRef.current
    }

    const onMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || pinchStartDistRef.current === null) return
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const ratio = Math.hypot(dx, dy) / pinchStartDistRef.current
      const caps = zoomCapRef.current
      const newZoom = Math.max(caps?.min ?? 1, Math.min(caps?.max ?? 5, pinchStartZoomRef.current * ratio))
      applyZoom(newZoom)
    }

    const onEnd = () => { pinchStartDistRef.current = null }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd)

    return () => {
      document.removeEventListener('touchmove', blockViewport)
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
    }
  }, [phase])

  // Spin the film counter wheel each time a shot is taken
  useEffect(() => {
    if (prevShotsRef.current >= 0 && shotsRemaining < prevShotsRef.current) {
      setWheelAngle(a => a + 30)
      setCounterTick(k => k + 1)
    }
    prevShotsRef.current = shotsRemaining
  }, [shotsRemaining])

  // Restore session from localStorage on mount (survives page refresh)
  useEffect(() => {
    const stored = localStorage.getItem(`onion_guest_${token}`)
    if (!stored) { setRestoring(false); return }

    fetch(`/api/guests?token=${token}&sessionId=${stored}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data) {
          localStorage.removeItem(`onion_guest_${token}`)
          setRestoring(false)
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
        setEventEnded(data.eventStatus !== 'active')
        fetchGallery(data.sessionId)
        setPhase('home')
        setRestoring(false)
      })
      .catch(() => {
        localStorage.removeItem(`onion_guest_${token}`)
        setRestoring(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

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

  function inferZoomLabel(label: string, index: number, total: number): string {
    const l = label.toLowerCase()
    if (l.includes('ultra wide') || l.includes('0.5')) return '0.5×'
    if (l.includes('telephoto') || l.includes('tele') || l.includes('2.')) return '2×'
    if (l.includes('wide') || l.includes('main') || l.includes('1.')) return '1×'
    if (total === 2) return index === 0 ? '1×' : '2×'
    if (total === 3) return (['0.5×', '1×', '2×'] as const)[index] ?? `${index + 1}×`
    return `${index + 1}×`
  }

  function applyZoom(level: number) {
    const rounded = Math.round(level * 10) / 10
    setZoomLevel(rounded)
    zoomLevelRef.current = rounded
    if (zoomCapRef.current) {
      streamRef.current?.getVideoTracks()[0]
        ?.applyConstraints({ advanced: [{ zoom: rounded } as any] })
        .catch(() => {})
    }
    setShowZoomBadge(true)
    if (zoomBadgeTimerRef.current) clearTimeout(zoomBadgeTimerRef.current)
    zoomBadgeTimerRef.current = setTimeout(() => setShowZoomBadge(false), 1200)
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

    localStorage.setItem(`onion_guest_${token}`, data.sessionId)

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

  if (restoring) return null

  // ── Identify ──────────────────────────────────────────────────────────────
  const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.38, ease: [0.25, 0.1, 0.25, 1] as const } }

  if (phase === 'identify') {
    return (
      <motion.div className="guest-identify" {...fadeUp}>
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
      </motion.div>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <motion.div className="guest-identify" {...fadeUp}>
        <div className="guest-identify__card">
          <a className="auth-logo" href="/">Onion</a>
          <h1 className="guest-identify__title">Camera unavailable</h1>
          <p className="guest-identify__sub">We couldn&apos;t access your camera. Please allow camera permission and reload.</p>
          <button className="btn btn--outline btn--full" onClick={() => setPhase('home')} style={{ marginTop: 'var(--sp-4)' }}>
            Back to album
          </button>
        </div>
      </motion.div>
    )
  }

  // ── Home / album ──────────────────────────────────────────────────────────
  if (phase === 'home') {
    return (
      <motion.div className="guest-home" {...fadeUp}>
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
      </motion.div>
    )
  }

  // ── Camera ────────────────────────────────────────────────────────────────
  const activeFilter = cameraMode === 'video' ? VIDEO_FILTER : filter
  const viewfinderCss = activeFilter.css === 'none' ? undefined : activeFilter.css

  return (
    <div className="camera-screen">
      <div className="camera-top">
        <button className="camera-back-btn" onClick={() => { stopRecording(); setPhase('home') }} aria-label="Back to album">
          &#8592; Back
        </button>
        <button
          className="camera-flip-btn"
          onClick={() => {
            if (!recording) {
              setFacingMode(f => f === 'environment' ? 'user' : 'environment')
              setActiveCameraId(undefined)
              setRearCameras([])
              setZoomLevel(1)
              zoomLevelRef.current = 1
            }
          }}
          aria-label="Flip camera"
          disabled={recording}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 7h-3l-2-3H9L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
            <path d="M15 11a3.5 3.5 0 0 1 0 5" />
            <polyline points="13.7,15 15,16.2 16,14.8" />
            <path d="M9 16a3.5 3.5 0 0 1 0-5" />
            <polyline points="10.3,12 9,10.8 8,12.2" />
          </svg>
        </button>
      </div>

      <div className="camera-viewfinder-wrap" ref={viewfinderWrapRef}>
        <div className="camera-grain" aria-hidden="true" />
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="camera-video"
          style={{
            filter: viewfinderCss,
            ...(!zoomCapabilities && zoomLevel !== 1 ? { transform: `scale(${zoomLevel})`, transformOrigin: 'center' } : {}),
          }}
        />
        <div className="camera-frame" aria-hidden="true">
          <div className="camera-frame__corner camera-frame__corner--tl" />
          <div className="camera-frame__corner camera-frame__corner--tr" />
          <div className="camera-frame__corner camera-frame__corner--bl" />
          <div className="camera-frame__corner camera-frame__corner--br" />
        </div>
        {flash && <div className="camera-flash" aria-hidden="true" />}
        {recording && <div className="camera-rec-badge" aria-hidden="true">&#9679; REC</div>}
        {showZoomBadge && (
          <div className="camera-zoom-badge">{zoomLevel.toFixed(1)}×</div>
        )}
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

      {/* Lens selector */}
      {facingMode === 'environment' && rearCameras.length >= 2 && (
        <div className="camera-lens-selector">
          {rearCameras.map(cam => {
            const isActive = activeCameraId === cam.deviceId ||
              (!activeCameraId && defaultCameraId === cam.deviceId)
            return (
              <button
                key={cam.deviceId}
                className={`camera-lens-btn${isActive ? ' camera-lens-btn--active' : ''}`}
                onClick={() => {
                  setActiveCameraId(cam.deviceId)
                  setZoomLevel(1)
                  zoomLevelRef.current = 1
                }}
                disabled={recording}
              >
                {cam.zoomLabel}
              </button>
            )
          })}
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
            {!capturing && (
              <motion.span
                className="shutter-shimmer"
                initial={{ x: '-70%' }}
                animate={{ x: '170%' }}
                transition={{
                  duration: 0.5,
                  ease: 'easeInOut',
                  repeat: Infinity,
                  repeatType: 'loop',
                  repeatDelay: 2.5,
                }}
              />
            )}
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
        <div className="film-counter">
          <div className="film-counter__dial">
            <div
              className="film-counter__ring"
              style={{ transform: `rotate(${wheelAngle}deg)` }}
            />
            <div className="film-counter__face">
              <span key={counterTick} className="film-counter__num">
                {cameraMode === 'video' ? clipsRemaining : shotsRemaining}
              </span>
            </div>
          </div>
          <span className="film-counter__label">
            of {cameraMode === 'video' ? clipsPerGuest : shotsPerGuest}
          </span>
        </div>
        <span className="camera-filter-pill">&#128274; {activeFilter.label}</span>
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}
