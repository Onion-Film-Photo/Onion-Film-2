import { createClient } from '@/utils/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const formData = await req.formData()

  const photo     = formData.get('photo') as File | null
  const sessionId = formData.get('sessionId') as string | null
  const eventId   = formData.get('eventId') as string | null
  const filter    = formData.get('filter') as string | null

  if (!photo || !sessionId || !eventId || !filter) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 422 })
  }

  // Verify session exists and has shots remaining
  const { data: session, error: sessErr } = await supabase
    .from('guest_sessions')
    .select('shots_taken, events(shots_per_guest)')
    .eq('id', sessionId)
    .eq('event_id', eventId)
    .single()

  if (sessErr || !session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const event = (Array.isArray(session.events) ? session.events[0] : session.events) as { shots_per_guest: number } | null
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  if (session.shots_taken >= event.shots_per_guest) {
    return NextResponse.json({ error: 'No shots remaining' }, { status: 403 })
  }

  // Upload photo using service-role client (bypasses RLS on storage)
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const storagePath = `events/${eventId}/${sessionId}/${Date.now()}.jpg`
  const bytes = await photo.arrayBuffer()

  const { error: uploadErr } = await serviceClient.storage
    .from('event-photos')
    .upload(storagePath, bytes, { contentType: 'image/jpeg', upsert: false })

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

  // Insert photo row
  await serviceClient.from('photos').insert({
    event_id: eventId, session_id: sessionId, storage_path: storagePath, filter,
  })

  // Increment shots_taken
  const { data: updated } = await serviceClient
    .from('guest_sessions')
    .update({ shots_taken: session.shots_taken + 1 })
    .eq('id', sessionId)
    .select('shots_taken')
    .single()

  const shotsRemaining = event.shots_per_guest - (updated?.shots_taken ?? session.shots_taken + 1)

  return NextResponse.json({ storagePath, shotsRemaining }, { status: 201 })
}
