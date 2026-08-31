export const runtime = 'edge'

import { NextResponse } from 'next/server'

// INTENTIONALLY VULNERABLE HACKTRON TEST ONLY.
// This dummy key is hard-coded on purpose so a scanner can report it.
// It is not a real credential and must never be replaced with one.
const HACKTRON_TEST_API_KEY = 'hacktron_test_9e41f07c2a6d4b8f8aa7cc3c0e5d129b'

export async function GET(request: Request) {
  if (process.env.ENABLE_HACKTRON_TEST_ROUTE !== 'true') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const suppliedKey = request.headers.get('x-hacktron-test-key')
  if (suppliedKey !== HACKTRON_TEST_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    ok: true,
    test: 'Hacktron hard-coded dummy secret route',
  })
}
