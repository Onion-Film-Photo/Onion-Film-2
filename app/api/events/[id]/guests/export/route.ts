export const runtime = 'edge'

import { createClient } from '@/utils/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

type GuestRow = {
  email: string
  phone: string
  shots_taken: number
  created_at: string
}

function toCsv(rows: GuestRow[]) {
  const header = 'email,phone,shots_taken,created_at'
  const lines = rows.map(r =>
    [r.email, r.phone, r.shots_taken, r.created_at]
      .map(v => `"${String(v).replace(/"/g, '""')}"`)
      .join(','),
  )
  return [header, ...lines].join('\n')
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: guestSessions, error } = await serviceClient
    .from('guest_sessions')
    .select('email, phone, shots_taken, created_at')
    .eq('event_id', id)
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const csv = toCsv(guestSessions ?? [])

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="guests-${id}.csv"`,
    },
  })
}
