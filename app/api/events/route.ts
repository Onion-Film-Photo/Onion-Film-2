export const runtime = 'edge'

import { createClient } from '@/utils/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { z } from 'zod'

const schema = z.object({
  name:                  z.string().min(1),
  guest_limit:           z.number().int().min(1).max(500),
  filter:                z.enum(['natural', 'ilford_hp5', 'kodak_portra', 'fuji_pro']),
  shots_per_guest:       z.number().int().min(1).max(50),
  video_enabled:         z.boolean().default(false),
  clips_per_guest:       z.number().int().min(1).max(5).default(2),
  clip_duration_seconds: z.union([z.literal(5), z.literal(10), z.literal(15)]).default(10),
  photo_visibility:      z.enum(['after_event', 'immediately', 'after_date']).default('after_event'),
  photo_visible_after:   z.string().nullable().optional(),
})

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request: ' + parsed.error.issues.map(i => i.message).join(', ') }, { status: 422 })

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data, error } = await service
    .from('events')
    .insert({ ...parsed.data, host_id: user.id, qr_token: nanoid(12) })
    .select('id, qr_token')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .eq('host_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!events?.length) return NextResponse.json([])

  const eventIds = events.map(e => e.id)

  const [{ data: guestCounts }, { data: photoCounts }] = await Promise.all([
    service
      .from('guest_sessions')
      .select('event_id')
      .in('event_id', eventIds),
    service
      .from('photos')
      .select('event_id')
      .in('event_id', eventIds),
  ])

  const guestMap = (guestCounts ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.event_id] = (acc[r.event_id] ?? 0) + 1
    return acc
  }, {})
  const photoMap = (photoCounts ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.event_id] = (acc[r.event_id] ?? 0) + 1
    return acc
  }, {})

  const result = events.map(e => ({
    ...e,
    guest_sessions: [{ count: guestMap[e.id] ?? 0 }],
    photos:         [{ count: photoMap[e.id] ?? 0 }],
  }))

  return NextResponse.json(result)
}
