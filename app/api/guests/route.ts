import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { computeVisibility } from '@/lib/visibility'

const schema = z.object({
  event_token: z.string().min(1),
  email:       z.string().email(),
  phone:       z.string().min(5),
})

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { event_token, email, phone } = parsed.data

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: event, error: evErr } = await serviceClient
    .from('events')
    .select('id, guest_limit, shots_per_guest, filter, status, photo_visibility, photo_visible_after')
    .eq('qr_token', event_token)
    .single()

  if (evErr || !event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  if (event.status !== 'active') return NextResponse.json({ error: 'Event has ended' }, { status: 403 })

  // Check for an existing session first (returning guest) to avoid resetting shots_taken
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

  return NextResponse.json({
    sessionId:         session.id,
    eventId:           event.id,
    shotsRemaining:    event.shots_per_guest - session.shots_taken,
    shotsPerGuest:     event.shots_per_guest,
    filter:            event.filter,
    isVisible,
    photoVisibility:   event.photo_visibility,
    photoVisibleAfter: event.photo_visible_after,
    eventStatus:       event.status,
  })
}
