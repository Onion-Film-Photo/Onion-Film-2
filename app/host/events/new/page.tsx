'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TIERS, getTier } from '@/lib/pricing'
import { FILTERS } from '@/lib/filters'
import type { FilterId } from '@/lib/filters'
import { motion, AnimatePresence } from 'motion/react'

type Step = 1 | 2 | 3

export default function NewEventPage() {
  const router = useRouter()
  const [step, setStep]         = useState<Step>(1)
  const [guestLimit, setGuestLimit] = useState(10)
  const [filter, setFilter]     = useState<FilterId>('natural')
  const [name, setName]         = useState('')
  const [shots, setShots]             = useState(10)
  const [videoEnabled, setVideoEnabled] = useState(false)
  const [clipsPerGuest, setClipsPerGuest] = useState(2)
  const [clipDuration, setClipDuration] = useState<5 | 10 | 15>(10)
  const [photoVisibility, setPhotoVisibility] = useState<'after_event' | 'immediately' | 'after_date'>('after_event')
  const [photoVisibleAfter, setPhotoVisibleAfter] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const tier = getTier(guestLimit)

  async function handleCreate() {
    setLoading(true)
    setError('')
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        guest_limit:           guestLimit,
        filter,
        shots_per_guest:       shots,
        video_enabled:         videoEnabled,
        clips_per_guest:       clipsPerGuest,
        clip_duration_seconds: clipDuration,
        photo_visibility:      photoVisibility,
        photo_visible_after:   photoVisibility === 'after_date' && photoVisibleAfter ? photoVisibleAfter : null,
      }),
    })
    if (!res.ok) {
      const { error: msg } = await res.json()
      setError(msg ?? 'Something went wrong')
      setLoading(false)
      return
    }
    const { id } = await res.json()
    router.push(`/host/events/${id}`)
  }

  const panelAnim = {
    initial:    { opacity: 0, x: 24 },
    animate:    { opacity: 1, x: 0 },
    exit:       { opacity: 0, x: -24 },
    transition: { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] as const },
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
        <a className="btn btn--ghost btn--sm" href="/host/dashboard">← Dashboard</a>
      </header>

      <main className="host-main">
        <div className="wizard-container">
          {/* Step indicator */}
          <div className="wizard-steps">
            {(['Guest count', 'Filter', 'Details'] as const).map((label, i) => (
              <div key={label} className={`wizard-step${step === i + 1 ? ' wizard-step--active' : step > i + 1 ? ' wizard-step--done' : ''}`}>
                <span className="wizard-step__num">{i + 1}</span>
                <span className="wizard-step__label">{label}</span>
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
          {/* Step 1 — Guest count + pricing */}
          {step === 1 && (
            <motion.div className="wizard-panel" key="step-1" {...panelAnim}>
              <h2 className="wizard-title">How many guests?</h2>
              <p className="wizard-sub">This determines your pricing tier.</p>

              <div className="guest-slider-wrap">
                <input
                  type="range"
                  min={1}
                  max={300}
                  value={guestLimit}
                  onChange={e => setGuestLimit(Number(e.target.value))}
                  className="guest-slider"
                />
                <div className="guest-slider__value">{guestLimit} guests</div>
              </div>

              {/* Tier bar */}
              <div className="tier-bar">
                {TIERS.map(t => {
                  const isActive = tier.label === t.label
                  return (
                    <div key={t.label} className={`tier-bar__segment${isActive ? ' tier-bar__segment--active' : ''}`}>
                      <span className="tier-bar__label">{t.label}</span>
                      <span className="tier-bar__price">{t.price === 0 ? 'Free' : `$${t.price}`}</span>
                      <span className="tier-bar__range">
                        {t.max === Infinity ? '200+' : `≤ ${t.max}`} guests
                      </span>
                    </div>
                  )
                })}
              </div>

              <div className="wizard-nav">
                <button className="btn btn--primary" onClick={() => setStep(2)}>
                  Continue →
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 2 — Filter selection */}
          {step === 2 && (
            <motion.div className="wizard-panel" key="step-2" {...panelAnim}>
              <h2 className="wizard-title">Choose a filter</h2>
              <p className="wizard-sub">All guests will capture photos with this filter applied.</p>

              <div className="filter-grid">
                {FILTERS.map(f => (
                  <button
                    key={f.id}
                    className={`filter-card${filter === f.id ? ' filter-card--active' : ''}`}
                    onClick={() => setFilter(f.id as FilterId)}
                  >
                    <div
                      className="filter-card__preview"
                      style={f.previewImage
                        ? { backgroundImage: `url('${f.previewImage}')`, backgroundSize: 'cover', backgroundPosition: 'center' }
                        : { filter: f.css === 'none' ? undefined : f.css }
                      }
                    />
                    <span className="filter-card__label">{f.label}</span>
                    <span className="filter-card__desc">{f.description}</span>
                  </button>
                ))}
              </div>

              <div className="wizard-nav">
                <button className="btn btn--ghost" onClick={() => setStep(1)}>← Back</button>
                <button className="btn btn--primary" onClick={() => setStep(3)}>Continue →</button>
              </div>
            </motion.div>
          )}

          {/* Step 3 — Name + shots + review */}
          {step === 3 && (
            <motion.div className="wizard-panel" key="step-3" {...panelAnim}>
              <h2 className="wizard-title">Event details</h2>

              <label className="auth-label" style={{ marginBottom: 'var(--sp-4)' }}>
                Event name
                <input
                  className="auth-input"
                  type="text"
                  placeholder="e.g. Sarah & Tom's Wedding"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </label>

              <label className="auth-label" style={{ marginBottom: 'var(--sp-6)' }}>
                Shots per guest <span className="auth-label-hint">({shots})</span>
                <input
                  type="range"
                  min={1}
                  max={50}
                  value={shots}
                  onChange={e => setShots(Number(e.target.value))}
                  className="guest-slider"
                  style={{ marginTop: 'var(--sp-2)' }}
                />
              </label>

              {/* Video toggle */}
              <div className="auth-label" style={{ marginBottom: 'var(--sp-4)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={videoEnabled}
                    onChange={e => setVideoEnabled(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: 'var(--c-accent)' }}
                  />
                  Allow video clips <span style={{ color: 'var(--c-text-2)', fontWeight: 400, fontSize: '0.85em' }}>Super 8 filter</span>
                </label>
              </div>

              {videoEnabled && (
                <>
                  <label className="auth-label" style={{ marginBottom: 'var(--sp-4)' }}>
                    Clips per guest <span className="auth-label-hint">({clipsPerGuest})</span>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      value={clipsPerGuest}
                      onChange={e => setClipsPerGuest(Number(e.target.value))}
                      className="guest-slider"
                      style={{ marginTop: 'var(--sp-2)' }}
                    />
                  </label>

                  <div className="auth-label" style={{ marginBottom: 'var(--sp-6)' }}>
                    Max clip duration
                    <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-2)' }}>
                      {([5, 10, 15] as const).map(s => (
                        <button
                          key={s}
                          type="button"
                          className={`btn btn--sm${clipDuration === s ? ' btn--primary' : ' btn--ghost'}`}
                          onClick={() => setClipDuration(s)}
                        >
                          {s}s
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Photo reveal */}
              <div className="auth-label" style={{ marginBottom: 'var(--sp-6)' }}>
                Photo reveal
                <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-2)', flexWrap: 'wrap' }}>
                  {([
                    { value: 'after_event',  label: 'After event ends' },
                    { value: 'immediately',  label: 'Immediately' },
                    { value: 'after_date',   label: 'On a date' },
                  ] as const).map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`btn btn--sm${photoVisibility === opt.value ? ' btn--primary' : ' btn--ghost'}`}
                      onClick={() => setPhotoVisibility(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {photoVisibility === 'after_date' && (
                  <input
                    className="auth-input"
                    type="datetime-local"
                    value={photoVisibleAfter}
                    onChange={e => setPhotoVisibleAfter(e.target.value)}
                    style={{ marginTop: 'var(--sp-3)' }}
                    required
                  />
                )}
              </div>

              {/* Summary card */}
              <div className="review-card">
                <div className="review-row">
                  <span>Guest limit</span>
                  <strong>{guestLimit} guests</strong>
                </div>
                <div className="review-row">
                  <span>Pricing tier</span>
                  <strong>{tier.label} — {tier.price === 0 ? 'Free' : `$${tier.price}`}</strong>
                </div>
                <div className="review-row">
                  <span>Filter</span>
                  <strong>{FILTERS.find(f => f.id === filter)?.label}</strong>
                </div>
                <div className="review-row">
                  <span>Shots per guest</span>
                  <strong>{shots}</strong>
                </div>
                <div className="review-row">
                  <span>Video clips</span>
                  <strong>{videoEnabled ? `${clipsPerGuest} clips · ${clipDuration}s max · Super 8` : 'Off'}</strong>
                </div>
                <div className="review-row">
                  <span>Reveal photos</span>
                  <strong>
                    {photoVisibility === 'immediately' && 'Immediately'}
                    {photoVisibility === 'after_event' && 'After event ends'}
                    {photoVisibility === 'after_date' && photoVisibleAfter
                      ? `On ${new Date(photoVisibleAfter).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                      : photoVisibility === 'after_date' ? 'On a date — pick one above' : ''}
                  </strong>
                </div>
              </div>

              {error && <p className="auth-error" style={{ marginBottom: 'var(--sp-3)' }}>{error}</p>}

              <div className="wizard-nav">
                <button className="btn btn--ghost" onClick={() => setStep(2)}>← Back</button>
                <button
                  className="btn btn--primary"
                  onClick={handleCreate}
                  disabled={!name.trim() || loading || (photoVisibility === 'after_date' && !photoVisibleAfter)}
                >
                  {loading ? 'Creating…' : tier.price === 0 ? 'Create Event — Free' : `Create Event — $${tier.price}`}
                </button>
              </div>
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      </main>
    </motion.div>
  )
}
