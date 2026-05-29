export const runtime = 'edge'

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const formData = await req.formData()

  const video    = formData.get('video') as File | null
  const sessionId = formData.get('sessionId') as string | null
  const eventId   = formData.get('eventId') as string | null
  const filter    = formData.get('filter') as string | null
  const durationRaw = formData.get('duration') as string | null

  if (!video || !sessionId || !eventId || !filter || !durationRaw) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 422 })
  }

  const duration = parseInt(durationRaw, 10)
  if (isNaN(duration) || duration <= 0) {
    return NextResponse.json({ error: 'Invalid duration' }, { status: 422 })
  }

  // Verify session exists and event has video enabled with clips remaining
  const { data: session, error: sessErr } = await supabase
    .from('guest_sessions')
    .select('id, events(video_enabled, clips_per_guest)')
    .eq('id', sessionId)
    .eq('event_id', eventId)
    .single()

  if (sessErr || !session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const event = (Array.isArray(session.events) ? session.events[0] : session.events) as
    { video_enabled: boolean; clips_per_guest: number } | null
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  if (!event.video_enabled) return NextResponse.json({ error: 'Video not enabled for this event' }, { status: 403 })

  // Count clips already taken for this session
  const { count } = await supabase
    .from('videos')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId)

  if ((count ?? 0) >= event.clips_per_guest) {
    return NextResponse.json({ error: 'Clip limit reached' }, { status: 403 })
  }

  const ext = video.type === 'video/mp4' ? 'mp4' : 'webm'
  const storagePath = `events/${eventId}/${sessionId}/${Date.now()}.${ext}`
  const bytes = await video.arrayBuffer()

  const { error: uploadErr } = await supabase.storage
    .from('event-videos')
    .upload(storagePath, bytes, { contentType: video.type, upsert: false })

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

  await supabase.from('videos').insert({
    event_id: eventId,
    session_id: sessionId,
    storage_path: storagePath,
    duration_seconds: duration,
    filter,
  })

  const clipsRemaining = event.clips_per_guest - ((count ?? 0) + 1)
  return NextResponse.json({ storagePath, clipsRemaining }, { status: 201 })
}
