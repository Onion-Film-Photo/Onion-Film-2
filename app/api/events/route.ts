export const runtime = 'edge'

import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { z } from 'zod'

const schema = z.object({
  name:            z.string().min(1),
  guest_limit:     z.number().int().min(1).max(500),
  filter:          z.enum(['natural', 'ilford_hp5', 'kodak_portra', 'fuji_pro']),
  shots_per_guest: z.number().int().min(1).max(50),
})

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request: ' + parsed.error.issues.map(i => i.message).join(', ') }, { status: 422 })

  const { data, error } = await supabase
    .from('events')
    .insert({ ...parsed.data, host_id: user.id, qr_token: nanoid(12) })
    .select('id, qr_token')
    .single()

  if (error) return NextResponse.json({ error: error.message, debug_filter: parsed.data.filter, debug_code: error.code }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('events')
    .select('*, guest_sessions(count), photos(count)')
    .eq('host_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
