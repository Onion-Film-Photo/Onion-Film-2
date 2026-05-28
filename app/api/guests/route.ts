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

  // Try fetching with visibility columns; fall back if migration not yet applied
  let event: EventRow | null = null
  {
    const { data, error } = await serviceClient
      .from('events')
      .select('id, guest_limit, shots_per_guest, filter, status, photo_visibility, photo_visible_after, video_enabled, clips_per_guest, clip_duration_seconds')
      .eq('qr_token', event_token)
      .single()

    if (error?.code === '42703') {
      // photo_visibility columns don't exist yet — query without them
      const { data: fb, error: fbErr } = await serviceClient
        .from('events')
        .select('id, guest_limit, shots_per_guest, filter, status')
        .eq('qr_token', event_token)
        .single()
      if (fbErr || !fb) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      event = { ...fb, photo_visibility: 'after_event', photo_visible_after: null, video_enabled: false, clips_per_guest: 2, clip_duration_seconds: 10 }
    } else if (error || !data) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    } else {
      event = data as EventRow
    }
  }

  if (event.status !== 'active') return NextResponse.json({ error: 'Event has ended' }, { status: 403 })

  // Check for an existing session (returning guest) to avoid resetting shots_taken
  const { data: existingSession } = await serviceClient
    .from('guest_sessions')
    .select('id, shots_taken')
    .eq('event_id', event.id)
    .eq('email', email)
    .maybeSingle()

  let session: { id: string; shots_taken: number }

  if (existingSession) {
    session = existingSession
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
