export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const redirectTo = next ? new URL(next, origin).toString() : `${origin}/host/dashboard`
      return NextResponse.redirect(redirectTo)
    }
  }

  return NextResponse.redirect(`${origin}/host/login?error=confirmation_failed`)
}
