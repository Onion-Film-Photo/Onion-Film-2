'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TIERS, getTier } from '@/lib/pricing'
import { FILTERS } from '@/lib/filters'
import type { FilterId } from '@/lib/filters'

type Step = 1 | 2 | 3

export default function NewEventPage() {
  const router = useRouter()
  const [step, setStep]         = useState<Step>(1)
  const [guestLimit, setGuestLimit] = useState(10)
  const [filter, setFilter]     = useState<FilterId>('natural')
  const [name, setName]         = useState('')
  const [shots, setShots]       = useState(10)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const tier = getTier(guestLimit)

  async function handleCreate() {
    setLoading(true)
    setError('')
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, guest_limit: guestLimit, filter, shots_per_guest: shots }),
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

  return (
    <div className="host-page">
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

          {/* Step 1 — Guest count + pricing */}
          {step === 1 && (
            <div className="wizard-panel">
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
            </div>
          )}

          {/* Step 2 — Filter selection */}
          {step === 2 && (
            <div className="wizard-panel">
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
                      style={{ filter: f.css === 'none' ? undefined : f.css }}
                    />
                    <span className="filter-card__label">{f.label}</span>
                  </button>
                ))}
              </div>

              <div className="wizard-nav">
                <button className="btn btn--ghost" onClick={() => setStep(1)}>← Back</button>
                <button className="btn btn--primary" onClick={() => setStep(3)}>Continue →</button>
              </div>
            </div>
          )}

          {/* Step 3 — Name + shots + review */}
          {step === 3 && (
            <div className="wizard-panel">
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
              </div>

              {error && <p className="auth-error" style={{ marginBottom: 'var(--sp-3)' }}>{error}</p>}

              <div className="wizard-nav">
                <button className="btn btn--ghost" onClick={() => setStep(2)}>← Back</button>
                <button
                  className="btn btn--primary"
                  onClick={handleCreate}
                  disabled={!name.trim() || loading}
                >
                  {loading ? 'Creating…' : tier.price === 0 ? 'Create Event — Free' : `Create Event — $${tier.price}`}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
