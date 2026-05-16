import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  event_token: z.string().min(1),
  email:       z.string().email(),
  phone:       z.string().min(5),
})

export async function POST(req: Request) {
  const supabase = await createClient()
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { event_token, email, phone } = parsed.data

  // Fetch event by qr_token
  const { data: event, error: evErr } = await supabase
    .from('events')
    .select('id, guest_limit, shots_per_guest, filter, status')
    .eq('qr_token', event_token)
    .single()

  if (evErr || !event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  if (event.status !== 'active') return NextResponse.json({ error: 'Event has ended' }, { status: 403 })

  // Check guest count against limit
  const { count } = await supabase
    .from('guest_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', event.id)

  // Upsert guest session (email is unique per event)
  const { data: session, error: sessErr } = await supabase
    .from('guest_sessions')
    .upsert(
      { event_id: event.id, email, phone, shots_taken: 0 },
      { onConflict: 'event_id,email', ignoreDuplicates: false },
    )
    .select('id, shots_taken')
    .single()

  // If this is a new guest, check limit
  if (sessErr) return NextResponse.json({ error: sessErr.message }, { status: 500 })

  const isNew = session.shots_taken === 0
  if (isNew && (count ?? 0) >= event.guest_limit) {
    // Clean up the just-inserted row
    await supabase.from('guest_sessions').delete().eq('id', session.id)
    return NextResponse.json({ error: 'Event is full' }, { status: 403 })
  }

  return NextResponse.json({
    sessionId:      session.id,
    eventId:        event.id,
    shotsRemaining: event.shots_per_guest - session.shots_taken,
    shotsPerGuest:  event.shots_per_guest,
    filter:         event.filter,
  })
}
