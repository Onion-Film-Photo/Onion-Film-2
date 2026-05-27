export const runtime = 'edge'

import { createClient } from '@/utils/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .eq('host_id', user.id)
    .single()

  if (error || !event) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const [{ data: guestSessions }, { count: photoCount }] = await Promise.all([
    serviceClient
      .from('guest_sessions')
      .select('id, email, phone, shots_taken, created_at')
      .eq('event_id', id)
      .order('created_at'),
    serviceClient
      .from('photos')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', id),
  ])

  return NextResponse.json({
    ...event,
    guest_sessions: guestSessions ?? [],
    photos: [{ count: photoCount ?? 0 }],
  })
}

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('events')
    .update({ status: 'ended' })
    .eq('id', id)
    .eq('host_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ status: 'ended' })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id)
    .eq('host_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
