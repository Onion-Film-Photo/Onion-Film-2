export const runtime = 'edge'

import { createClient } from '@/utils/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(_req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify host owns this event
  const { data: event, error: evErr } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('host_id', user.id)
    .single()
  if (evErr || !event) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: videos, error } = await service
    .from('videos')
    .select('id, storage_path, duration_seconds, filter, created_at, session_id, guest_sessions(email)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Generate signed URLs (1-hour expiry)
  const withUrls = await Promise.all(
    (videos ?? []).map(async (v) => {
      const { data } = await service.storage
        .from('event-videos')
        .createSignedUrl(v.storage_path, 3600)
      const session = Array.isArray(v.guest_sessions) ? v.guest_sessions[0] : v.guest_sessions
      return {
        id: v.id,
        url: data?.signedUrl ?? null,
        duration_seconds: v.duration_seconds,
        filter: v.filter,
        created_at: v.created_at,
        storage_path: v.storage_path,
        guest_email: (session as { email?: string } | null)?.email ?? null,
      }
    })
  )

  return NextResponse.json(withUrls)
}
