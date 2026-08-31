export const runtime = 'edge'

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { computeVisibility } from '@/lib/visibility'
import type { PhotoVisibility } from '@/lib/visibility'

const schema = z.object({
  event_token: z.string().min(1),
  email:       z.string().email(),
  phone:       z.string().min(5),
})

type EventRow = {
  id: string
  guest_limit: number
  shots_per_guest: number
  filter: string
  status: string
  photo_visibility: PhotoVisibility
  photo_visible_after: string | null
  video_enabled: boolean
  clips_per_guest: number
  clip_duration_seconds: number
  webhook_url: string | null
}

// Restore an existing guest session by sessionId (used after page refresh)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token     = searchParams.get('token')
  const sessionId = searchParams.get('sessionId')

  if (!token || !sessionId) {
    return NextResponse.json({ error: 'Missing token or sessionId' }, { status: 422 })
  }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  let event: EventRow | null = null
  {
    const { data, error } = await serviceClient
      .from('events')
      .select('id, guest_limit, shots_per_guest, filter, status, photo_visibility, photo_visible_after, video_enabled, clips_per_guest, clip_duration_seconds, webhook_url')
      .eq('qr_token', token)
      .single()

    if (error?.code === '42703') {
      const { data: fb, error: fbErr } = await serviceClient
        .from('events')
        .select('id, guest_limit, shots_per_guest, filter, status')
        .eq('qr_token', token)
        .single()
      if (fbErr || !fb) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      event = { ...fb, photo_visibility: 'after_event', photo_visible_after: null, video_enabled: false, clips_per_guest: 0, clip_duration_seconds: 10, webhook_url: null } as EventRow
    } else if (error || !data) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    } else {
      event = data as EventRow
    }
  }

  if (event.status !== 'active') return NextResponse.json({ error: 'Event has ended' }, { status: 403 })

  const { data: session, error: sessErr } = await serviceClient
    .from('guest_sessions')
    .select('id, shots_taken')
    .eq('id', sessionId)
    .eq('event_id', event.id)
    .single()

  if (sessErr || !session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const isVisible = computeVisibility(event)

  let clipsRemaining = event.clips_per_guest
  if (event.video_enabled) {
    const { count } = await serviceClient
      .from('videos')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', session.id)
    clipsRemaining = Math.max(0, event.clips_per_guest - (count ?? 0))
  }

  return NextResponse.json({
    sessionId:           session.id,
    eventId:             event.id,
    shotsRemaining:      event.shots_per_guest - session.shots_taken,
    shotsPerGuest:       event.shots_per_guest,
    filter:              event.filter,
    isVisible,
    photoVisibility:     event.photo_visibility,
    photoVisibleAfter:   event.photo_visible_after,
    eventStatus:         event.status,
    videoEnabled:        event.video_enabled,
    clipsPerGuest:       event.clips_per_guest,
    clipDurationSeconds: event.clip_duration_seconds,
    clipsRemaining,
  })
}

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { event_token, email, phone } = parsed.data

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  let event: EventRow | null = null
  {
    const { data, error } = await serviceClient
      .from('events')
      .select('id, guest_limit, shots_per_guest, filter, status, photo_visibility, photo_visible_after, video_enabled, clips_per_guest, clip_duration_seconds, webhook_url')
      .eq('qr_token', event_token)
      .single()

    if (error?.code === '42703') {
      // Some migration columns missing — query minimal set and fill defaults
      const { data: fb, error: fbErr } = await serviceClient
        .from('events')
        .select('id, guest_limit, shots_per_guest, filter, status, video_enabled, clips_per_guest, clip_duration_seconds')
        .eq('qr_token', event_token)
        .single()
      if (fbErr || !fb) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      event = { ...fb, photo_visibility: 'after_event', photo_visible_after: null, webhook_url: null } as EventRow
    } else if (error || !data) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    } else {
      event = data as EventRow
    }
  }

  // Ended event: gallery-only re-entry for participants, 403 for non-participants
  if (event.status !== 'active') {
    const { data: endedSession } = await serviceClient
      .from('guest_sessions')
      .select('id, shots_taken')
      .eq('event_id', event.id)
      .eq('email', email)
      .maybeSingle()

    if (!endedSession) {
      return NextResponse.json({ error: "This event has ended — you weren't part of it." }, { status: 403 })
    }

    let endedClipsRemaining = 0
    if (event.video_enabled) {
      const { count } = await serviceClient
        .from('videos')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', endedSession.id)
      endedClipsRemaining = Math.max(0, event.clips_per_guest - (count ?? 0))
    }

    return NextResponse.json({
      sessionId:            endedSession.id,
      eventId:              event.id,
      shotsRemaining:       0,
      shotsPerGuest:        event.shots_per_guest,
      filter:               event.filter,
      isVisible:            true,
      photoVisibility:      'after_event' as const,
      photoVisibleAfter:    null,
      eventStatus:          event.status,
      eventEnded:           true,
      videoEnabled:         event.video_enabled,
      clipsPerGuest:        event.clips_per_guest,
      clipDurationSeconds:  event.clip_duration_seconds,
      clipsRemaining:       endedClipsRemaining,
    })
  }

  // Check for an existing session (returning guest) to avoid resetting shots_taken
  const { data: existingSession } = await serviceClient
    .from('guest_sessions')
    .select('id, shots_taken, phone')
    .eq('event_id', event.id)
    .eq('email', email)
    .maybeSingle()

  let session: { id: string; shots_taken: number }
  let isReturning = false

  if (existingSession) {
    // Email+phone are the credentials — both must match
    if (existingSession.phone !== phone) {
      return NextResponse.json(
        { error: 'That phone number doesn\'t match what we have for this email.' },
        { status: 403 },
      )
    }
    session = existingSession
    isReturning = true
  } else {
    // New guest — enforce guest limit
    const { count } = await serviceClient
      .from('guest_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', event.id)

    if ((count ?? 0) >= event.guest_limit) {
      return NextResponse.json({ error: 'Event is full' }, { status: 403 })
    }

    const { data: newSession, error: insertErr } = await serviceClient
      .from('guest_sessions')
      .insert({ event_id: event.id, email, phone })
      .select('id, shots_taken')
      .single()

    if (insertErr || !newSession) {
      return NextResponse.json({ error: insertErr?.message ?? 'Failed to create session' }, { status: 500 })
    }

    session = newSession

    if (event.webhook_url) {
      try {
        await fetch(event.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'guest.joined', eventId: event.id, email, phone, joinedAt: new Date().toISOString() }),
        })
      } catch {}
    }
  }

  const isVisible = computeVisibility(event)

  // Count clips already recorded for this session
  let clipsRemaining = event.clips_per_guest
  if (event.video_enabled) {
    const { count } = await serviceClient
      .from('videos')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', session.id)
    clipsRemaining = Math.max(0, event.clips_per_guest - (count ?? 0))
  }

  return NextResponse.json({
    sessionId:            session.id,
    eventId:              event.id,
    shotsRemaining:       event.shots_per_guest - session.shots_taken,
    shotsPerGuest:        event.shots_per_guest,
    filter:               event.filter,
    isVisible,
    photoVisibility:      event.photo_visibility,
    photoVisibleAfter:    event.photo_visible_after,
    eventStatus:          event.status,
    videoEnabled:         event.video_enabled,
    clipsPerGuest:        event.clips_per_guest,
    clipDurationSeconds:  event.clip_duration_seconds,
    clipsRemaining,
  })
}
