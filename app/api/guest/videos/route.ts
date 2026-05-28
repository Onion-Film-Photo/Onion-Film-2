export const runtime = 'edge'

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { computeVisibility } from '@/lib/visibility'
import type { PhotoVisibility } from '@/lib/visibility'

type EventRow = {
  id: string
  status: string
  photo_visibility: PhotoVisibility
  photo_visible_after: string | null
}

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
      .select('id, status, photo_visibility, photo_visible_after')
      .eq('qr_token', token)
      .single()

    if (error?.code === '42703') {
      const { data: fb, error: fbErr } = await serviceClient
        .from('events')
        .select('id, status')
        .eq('qr_token', token)
        .single()
      if (fbErr || !fb) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      event = { ...fb, photo_visibility: 'after_event', photo_visible_after: null }
    } else if (error || !data) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    } else {
      event = data as EventRow
    }
  }

  const { data: session, error: sessErr } = await serviceClient
    .from('guest_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('event_id', event.id)
    .single()

  if (sessErr || !session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const { data: videos, error: videosErr } = await serviceClient
    .from('videos')
    .select('id, storage_path, filter, duration_seconds, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (videosErr) return NextResponse.json({ error: videosErr.message }, { status: 500 })

  const isVisible = event.status === 'ended' ? true : computeVisibility(event)

  type VideoRow = { id: string; storage_path: string; filter: string; duration_seconds: number; created_at: string }

  const videosWithUrls = await Promise.all(
    (videos ?? []).map(async (video: VideoRow) => {
      let url: string | null = null
      if (isVisible) {
        const { data: signed } = await serviceClient.storage
          .from('event-videos')
          .createSignedUrl(video.storage_path, 3600)
        url = signed?.signedUrl ?? null
      }
      return {
        id:               video.id,
        url,
        filter:           video.filter,
        duration_seconds: video.duration_seconds,
        created_at:       video.created_at,
      }
    }),
  )

  return NextResponse.json({ videos: videosWithUrls, isVisible })
}
